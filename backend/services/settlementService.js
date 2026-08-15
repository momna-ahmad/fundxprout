// backend/services/settlementService.js
// Settles matched trades: commits the token transfer, records the trade,
// triggers on-chain settlement (stubbed), and emits real-time updates.

const { supabaseAdmin } = require('../config/supabaseAdmin');
const { commitTransfer, InsufficientBalanceError } = require('./balanceReservationService');
const { emitTradeExecuted } = require('../sockets/marketplaceSocket');

/**
 * Stub for calling the on-chain marketplace contract. Replace with a real
 * call to EquitySecondaryMarketplace.fillOrder once the buyer-signs flow
 * is wired up.
 * @param {Object} match
 */
async function callTokenMarketplaceContract(match) {
  // TODO: implement on-chain settlement via EquitySecondaryMarketplace.fillOrder
  return { success: true, txHash: null };
}

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

  // 1) Commit transfer in DB (seller.locked -> buyer.available)
  try {
    await commitTransfer(sell.investor_id, buy.investor_id, campaignId, qty);
  } catch (err) {
    console.error('[settle] commitTransfer failed', { err: err.message, match });
    throw err;
  }

  // 2) Insert token_trades row with pending status
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
    console.error('[settle] failed to insert token_trades, attempting rollback', { err: err.message, match });
    await rollbackTransfer(buy, sell, campaignId, qty);
    throw err;
  }

  // 3) Call on-chain settlement (stubbed)
  try {
    const onchain = await callTokenMarketplaceContract(match);

    await supabaseAdmin
      .from('token_trades')
      .update({ settlement_status: 'settled', tx_hash: onchain.txHash })
      .eq('id', trade.id);

    await supabaseAdmin
      .from('campaigns')
      .update({ last_traded_price: price })
      .eq('id', campaignId);

    try {
      emitTradeExecuted(campaignId, trade);
    } catch (err) {
      console.warn('[settle] emitTradeExecuted failed', err.message);
    }

    return { success: true, trade };
  } catch (err) {
    console.error('[settle] on-chain settlement failed, marking trade failed and attempting rollback', {
      err: err.message,
      trade,
      match
    });

    try {
      await supabaseAdmin.from('token_trades').update({ settlement_status: 'failed' }).eq('id', trade.id);
    } catch (updErr) {
      console.error('[settle] failed to mark trade as failed', updErr.message, { trade });
    }

    await rollbackTransfer(buy, sell, campaignId, qty);

    return { success: false, error: err.message };
  }
}

/**
 * Reverses a committed transfer when a later settlement step fails.
 */
async function rollbackTransfer(buy, sell, campaignId, qty) {
  try {
    const { error } = await supabaseAdmin.rpc('rollback_token_transfer', {
      p_seller: sell.investor_id,
      p_buyer: buy.investor_id,
      p_campaign_id: campaignId,
      p_qty: qty,
    });
    if (error) throw error;
  } catch (rbErr) {
    console.error('[settle] rollback failed', rbErr.message, { buy, sell, campaignId, qty });
  }
}

module.exports = { settle };
