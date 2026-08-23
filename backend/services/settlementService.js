// backend/services/settlementService.js
// Records a matched trade. The buyer must subsequently settle it on-chain;
// Supabase never moves the ERC-20 token balance itself.

const { supabaseAdmin } = require('../config/supabaseAdmin');
const { emitTradeExecuted } = require('../sockets/marketplaceSocket');

/**
 * Execute settlement for a matched trade.
 * @param {Object} match - { buy, sell, quantity, price }
 */
async function settle(match) {
  const buy = match.buy;
  const sell = match.sell;
  const qty = Number(match.quantity);
  const price = Number(match.price);
  const campaignId = buy.campaign_id || sell.campaign_id;

  // Insert a pending trade. ERC-20 ownership changes only in settleTrade().
  let trade;
  try {
    const payload = {
      campaign_id: campaignId,
      buy_order_id: buy.id || null,
      sell_order_id: sell.id || null,
      buyer_id: buy.investor_id,
      seller_id: sell.investor_id,
      price,
      quantity: qty,
      fee_amount: 0,
      tx_hash: null,
      settlement_status: 'pending'
    };

    const { data, error } = await supabaseAdmin.from('token_trades').insert([payload]).select().single();
    if (error) throw error;
    trade = data;
  } catch (err) {
    console.error('[settle] failed to insert token_trades', { err: err.message, match });
    throw err;
  }

  try {
    emitTradeExecuted(campaignId, trade);
  } catch (err) {
    console.warn('[settle] emitTradeExecuted failed', err.message);
  }
  return { success: true, trade };
}

module.exports = { settle };
