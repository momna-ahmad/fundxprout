// backend/services/matchingEngine.js
const { getOrCreateBook } = require('./orderBookService');
const { settle } = require('./settlementService');
const { emitBookUpdate } = require('../sockets/marketplaceSocket');
const { supabaseAdmin } = require('../config/supabaseAdmin');

function getOrderStatus(quantityRemaining) {
  return quantityRemaining <= 0 ? 'filled' : 'partially_filled';
}

async function persistOrderState(order) {
  const quantityRemaining = Number(order.quantity_remaining ?? 0);
  const quantity = Number(order.quantity ?? 0);
  const quantityFilled = quantity - quantityRemaining;
  const status = getOrderStatus(quantityRemaining);

  const { error } = await supabaseAdmin
    .from('token_orders')
    .update({
      quantity_filled: quantityFilled,
      quantity_remaining: quantityRemaining,
      status,
    })
    .eq('id', order.id);

  if (error) {
    console.error('[matchingEngine] failed to persist token_orders state', {
      orderId: order.id,
      error: error.message,
    });
  }
}

/**
 * Processes a validated, already-reserved order: inserts it into its campaign's
 * book, then matches against the opposite side using strict price-time priority,
 * correctly skipping (not aborting on) the investor's own resting orders.
 *
 * @param {Object} order - validated order, already balance-reserved
 * @returns {Promise<Object>} the resting/remaining state of the incoming order
 */
async function processOrder(order) {
  const book = getOrCreateBook(order.campaign_id);
  const incoming = book.addOrder(order);
  const isBuy = incoming.side === 'buy';
  const opposingSide = isBuy ? 'sell' : 'buy';

  while (incoming.quantity_remaining > 0) {
    const resting = book.getBestOpposingOrder(opposingSide, incoming.investor_id);
    if (!resting) break;

    const canCross = isBuy ? incoming.price >= resting.price : incoming.price <= resting.price;
    if (!canCross) break;

    const matchQty = Math.min(incoming.quantity_remaining, resting.quantity_remaining);
    const match = {
      buy: isBuy ? incoming : resting,
      sell: isBuy ? resting : incoming,
      quantity: matchQty,
      price: resting.price // resting order (maker) gets price priority
    };

    incoming.quantity_remaining -= matchQty;
    resting.quantity_remaining -= matchQty;

    await settle(match);
    await persistOrderState(resting);

    if (resting.quantity_remaining <= 0) {
      book.removeOrder(resting.id);
    }
    if (incoming.quantity_remaining <= 0) {
      book.removeOrder(incoming.id);
    }
  }

  if (incoming.quantity_remaining !== Number(order.quantity)) {
    await persistOrderState(incoming);
  }

  try {
    emitBookUpdate(order.campaign_id, book.getBookSnapshot(10));
  } catch (err) {
    console.warn('[matchingEngine] failed to emit book update', err.message);
  }

  return incoming;
}

module.exports = { processOrder };