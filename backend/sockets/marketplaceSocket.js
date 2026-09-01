// backend/sockets/marketplaceSocket.js
const { Server } = require('socket.io');

let io = null;

function initMarketplaceSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' },
  });

  const marketplace = io.of('/marketplace');

  marketplace.on('connection', (socket) => {
    socket.on('joinCampaign', (campaignId) => socket.join(String(campaignId)));
    socket.on('leaveCampaign', (campaignId) => socket.leave(String(campaignId)));
  });

  return io;
}

function formatSide(orders) {
  return orders.map((o) => ({
    price: o.price,
    quantity: o.quantity_remaining,
    total: o.price * o.quantity_remaining,
  }));
}

function emitBookUpdate(campaignId, rawSnapshot) {
  if (!io) return;
  const snapshot = { bids: formatSide(rawSnapshot.bids), asks: formatSide(rawSnapshot.asks) };
  io.of('/marketplace').to(String(campaignId)).emit('bookUpdate', { campaignId: String(campaignId), snapshot });
}

function emitTradeExecuted(campaignId, trade) {
  if (!io) return;
  const formatted = {
    id: trade.id,
    side: trade.buyer_id ? 'buy' : 'sell', // whichever side you want the ticker to reflect — adjust if you track this explicitly
    price: trade.price,
    quantity: trade.quantity,
    total: trade.price * trade.quantity,
    buyer: trade.buyer_id,
    seller: trade.seller_id,
    timestamp: trade.executed_at,
  };
  io.of('/marketplace').to(String(campaignId)).emit('tradeExecuted', { campaignId: String(campaignId), trade: formatted });
}

module.exports = { initMarketplaceSocket, emitBookUpdate, emitTradeExecuted };