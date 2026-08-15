// backend/services/orderBookService.js
// In-memory, per-campaign order book. CommonJS to match the rest of backend/.

class OrderBook {
  constructor() {
    this.bids = [];
    this.asks = [];
    this.orders = new Map();
  }

  _priorityCompare(a, b, side) {
    if (a.price !== b.price) {
      return side === 'buy' ? b.price - a.price : a.price - b.price;
    }
    return a.created_at - b.created_at;
  }

  _swap(array, i, j) {
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  _bubbleUp(array, index, side) {
    let currentIndex = index;
    let parentIndex = Math.floor((currentIndex - 1) / 2);
    while (currentIndex > 0) {
      const current = array[currentIndex];
      const parent = array[parentIndex];
      if (this._priorityCompare(current, parent, side) >= 0) break;
      this._swap(array, currentIndex, parentIndex);
      currentIndex = parentIndex;
      parentIndex = Math.floor((currentIndex - 1) / 2);
    }
  }

  _bubbleDown(array, index, side) {
    let currentIndex = index;
    const length = array.length;
    while (true) {
      let swapIndex = -1;
      const leftChildIndex = 2 * currentIndex + 1;
      const rightChildIndex = 2 * currentIndex + 2;

      if (leftChildIndex < length) {
        const candidate = swapIndex === -1 ? array[currentIndex] : array[swapIndex];
        if (this._priorityCompare(array[leftChildIndex], candidate, side) < 0) {
          swapIndex = leftChildIndex;
        }
      }
      if (rightChildIndex < length) {
        const candidate = swapIndex === -1 ? array[currentIndex] : array[swapIndex];
        if (this._priorityCompare(array[rightChildIndex], candidate, side) < 0) {
          swapIndex = rightChildIndex;
        }
      }
      if (swapIndex === -1) break;
      this._swap(array, currentIndex, swapIndex);
      currentIndex = swapIndex;
    }
  }

  _insert(array, order, side) {
    array.push(order);
    this._bubbleUp(array, array.length - 1, side);
  }

  _removeAt(array, index, side) {
    const last = array.pop();
    if (index < array.length) {
      array[index] = last;
      this._bubbleUp(array, index, side);
      this._bubbleDown(array, index, side);
    }
  }

  addOrder(order) {
    const normalized = {
      ...order,
      quantity_remaining: order.quantity_remaining ?? order.quantity,
      created_at: order.created_at ? new Date(order.created_at).getTime() : Date.now()
    };
    Object.assign(order, normalized);

    if (order.side === 'buy') {
      this._insert(this.bids, order, 'buy');
    } else {
      this._insert(this.asks, order, 'sell');
    }
    this.orders.set(order.id, order);
    return order;
  }

  removeOrder(orderId) {
    const existing = this.orders.get(orderId);
    if (!existing) return null;

    const array = existing.side === 'buy' ? this.bids : this.asks;
    const side = existing.side === 'buy' ? 'buy' : 'sell';
    const index = array.findIndex((item) => item.id === orderId);
    if (index === -1) return null;

    this._removeAt(array, index, side);
    this.orders.delete(orderId);
    return existing;
  }

  getBestBid() {
    return this.bids.length > 0 ? this.bids[0] : null;
  }

  getBestAsk() {
    return this.asks.length > 0 ? this.asks[0] : null;
  }

  /**
   * Finds the best resting order on `side` whose investor_id !== excludeInvestorId,
   * WITHOUT losing/reordering any skipped orders. This fixes the old self-match bug,
   * where hitting your own order at the top of book stopped matching entirely instead
   * of looking past it.
   *
   * @param {'buy'|'sell'} side - which side of the book to search
   * @param {string} excludeInvestorId - investor id to skip (the incoming order's owner)
   * @returns {Object|null} the best eligible order, still present in the book
   */
  getBestOpposingOrder(side, excludeInvestorId) {
    const array = side === 'buy' ? this.bids : this.asks;
    const skipped = [];
    let found = null;

    while (array.length > 0) {
      const top = array[0];
      if (top.investor_id !== excludeInvestorId) {
        found = top;
        break;
      }
      // temporarily pull this one aside and keep looking
      this._removeAt(array, 0, side);
      skipped.push(top);
    }

    // reinsert whatever we set aside, preserving heap order
    for (const order of skipped) {
      this._insert(array, order, side);
    }

    return found;
  }

  getBookSnapshot(depth = 10) {
    const topN = (array, side) =>
      [...array].sort((a, b) => this._priorityCompare(a, b, side)).slice(0, depth);
    return {
      bids: topN(this.bids, 'buy'),
      asks: topN(this.asks, 'sell')
    };
  }

  clear() {
    this.bids = [];
    this.asks = [];
    this.orders = new Map();
  }
}

const registry = new Map();

function getOrCreateBook(campaignId) {
  if (!registry.has(campaignId)) {
    registry.set(campaignId, new OrderBook());
  }
  return registry.get(campaignId);
}

module.exports = { OrderBook, getOrCreateBook };