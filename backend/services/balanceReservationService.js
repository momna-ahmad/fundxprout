// backend/services/balanceReservationService.js
// This service handles the reservation and transfer of token balances for buy/sell orders in the marketplace. It interacts with the Supabase database to perform atomic operations via RPC functions, ensuring that balance updates are consistent and safe under concurrent access.
const { supabaseAdmin } = require('../config/supabaseAdmin');

class InsufficientBalanceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

/**
 * Reserve tokens for a sell order by moving available_balance -> locked_balance.
 * NOTE: This implementation performs a SELECT then UPDATE. For production safety
 * this should be implemented as a DB-side transaction/function (SELECT FOR UPDATE
 * followed by UPDATE) and invoked via RPC to guarantee atomicity under concurrency.
 *
 * @param {string} investorId
 * @param {number} campaignId
 * @param {number} qty
 */
async function reserveTokensForSell(investorId, campaignId, qty) {
  // Use DB-side function for atomic reservation
  const { data, error } = await supabaseAdmin.rpc('reserve_tokens_for_sell', {
    p_investor: investorId,
    p_campaign_id: campaignId,
    p_qty: qty
  });

  if (error) {
    // map DB sentinel errors to typed errors
    if (String(error.message).includes('insufficient_balance')) {
      throw new InsufficientBalanceError('Insufficient available balance');
    }
    throw error;
  }

  // RPC returns an array of rows; return the first
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Reserve fiat/stablecoin funds for buy orders.
 *
 * NOTE: Fiat balance tracking is out-of-scope for this round. Keep the signature
 * so it can be implemented later once a `fiat_balances` (or equivalent) table
 * exists and a DB-side atomic reservation function is provided.
 *
 * @param {string} investorId
 * @param {number} price
 * @param {number} qty
 */
async function reserveFundsForBuy(investorId, price, qty) {
  // TODO: Implement fiat/stablecoin balance reservation once a balances table exists.
  // Signature retained for future integration: reserveFundsForBuy(investorId, price, qty)
  throw new Error('reserveFundsForBuy is not implemented - fiat balance tracking not present');
}

/**
 * Release a previously-created reservation moving locked_balance -> available_balance.
 *
 * @param {string} investorId
 * @param {number} campaignId
 * @param {number} qty
 */
async function releaseReservation(investorId, campaignId, qty) {
  const { data, error } = await supabaseAdmin.rpc('release_token_reservation', {
    p_investor: investorId,
    p_campaign_id: campaignId,
    p_qty: qty
  });

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Commit a token transfer from seller's locked_balance to buyer's available_balance.
 * WARNING: This should be executed atomically in the DB. Current implementation
 * performs multiple statements and is vulnerable to race conditions. Replace with
 * a DB function invoked via RPC for production.
 *
 * @param {string} sellerId
 * @param {string} buyerId
 * @param {number} campaignId
 * @param {number} qty
 */
async function commitTransfer(sellerId, buyerId, campaignId, qty) {
  const { data, error } = await supabaseAdmin.rpc('commit_token_transfer', {
    p_seller: sellerId,
    p_buyer: buyerId,
    p_campaign_id: campaignId,
    p_qty: qty
  });

  if (error) {
    // map common DB errors to typed errors
    const msg = String(error.message || '');
    if (msg.includes('seller_insufficient_locked_balance')) {
      throw new InsufficientBalanceError('Seller has insufficient locked balance');
    }
    throw error;
  }

  // RPC returns a JSON payload describing seller/buyer
  return Array.isArray(data) ? data[0] : data;
}

module.exports = {
  reserveTokensForSell,
  reserveFundsForBuy,
  releaseReservation,
  commitTransfer,
  InsufficientBalanceError
};
