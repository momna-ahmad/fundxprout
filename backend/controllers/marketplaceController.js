// backend/controllers/marketplaceController.js
const { supabaseAdmin } = require('../config/supabaseAdmin');
const { validateOrder, ValidationError } = require('../services/orderValidationService');
const { reserveTokensForSell, InsufficientBalanceError } = require('../services/balanceReservationService');
const { processOrder } = require('../services/matchingEngine');
const { getOrCreateBook } = require('../services/orderBookService');

async function createOrder(req, res) {
  const investorId = req.investorId || req.user?.id;
  const { campaign_id, side, price, quantity } = req.body;

  if (!campaign_id || !side || !price || !quantity) {
    return res.status(400).json({ error: 'campaign_id, side, price, and quantity are required' });
  }
  if (!['buy', 'sell'].includes(side)) {
    return res.status(400).json({ error: "side must be 'buy' or 'sell'" });
  }

  try {
    // Rules 1,2,3,4,5,6,11,12,13,16
    await validateOrder({ campaign_id, investor_id: investorId, side, price, quantity });

    // Rule 8/9: reserve the asset actually being given up
    if (side === 'sell') {
      await reserveTokensForSell(investorId, campaign_id, quantity);
    } else {
      // Buy-side fiat reservation isn't implemented yet (no fiat_balances table).
      // SKIP_FUND_RESERVATION lets you exercise the rest of the pipeline in dev
      // without a real balance system — remove this before going live.
      if (process.env.SKIP_FUND_RESERVATION !== 'true') {
        return res.status(501).json({ error: 'Buy-order fund reservation not yet implemented' });
      }
    }

    // Persist the order as the source of truth, then feed it into the live book
    const { data: dbOrder, error: insertErr } = await supabaseAdmin
      .from('token_orders')
      .insert([{
        campaign_id,
        investor_id: investorId,
        side,
        price,
        quantity,
        quantity_remaining: quantity,
        status: 'open'
      }])
      .select()
      .single();

    if (insertErr) throw insertErr;

    const result = await processOrder({ ...dbOrder });

    return res.status(201).json({ order: result });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(403).json({ error: err.message, code: err.code });
    }
    if (err instanceof InsufficientBalanceError) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[createOrder] unexpected error', err);
    return res.status(500).json({ error: 'Failed to place order' });
  }
}

function getOrderBook(req, res) {
  const book = getOrCreateBook(req.params.campaignId);
  return res.json(book.getBookSnapshot(20));
}

async function getTradeHistory(req, res) {
  const { data, error } = await supabaseAdmin
    .from('token_trades')
    .select('*')
    .eq('campaign_id', req.params.campaignId)
    .order('executed_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ trades: data });
}

async function getHoldings(req, res) {
  const investorId = req.user?.id;
  const campaignId = req.params.campaignId;

  if (!campaignId) {
    return res.status(400).json({ error: 'campaignId is required' });
  }

  const { data, error } = await supabaseAdmin
    .from('tokens')
    .select('amount, locked_amount')
    .eq('campaign_id', campaignId)
    .eq('user_id', investorId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const balances = (data ?? []).reduce(
    (totals, token) => {
      const amount = Number(token.amount ?? 0);
      const locked = Number(token.locked_amount ?? 0);
      totals.available_balance += Math.max(0, amount - locked);
      totals.locked_balance += locked;
      return totals;
    },
    { available_balance: 0, locked_balance: 0 }
  );

  return res.json(balances);
}

module.exports = { createOrder, getOrderBook, getTradeHistory, getHoldings };
