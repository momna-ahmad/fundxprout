// backend/controllers/marketplaceController.js
const { supabaseAdmin } = require('../config/supabaseAdmin');
const { validateOrder, ValidationError } = require('../services/orderValidationService');
const { processOrder } = require('../services/matchingEngine');
const { getOrCreateBook } = require('../services/orderBookService');

async function createOrder(req, res) {
  const investorId = req.investorId || req.user?.id;
  const { campaign_id, side, price, quantity, wallet_address } = req.body;

  if (!campaign_id || !side || !price || !quantity) {
    return res.status(400).json({ error: 'campaign_id, side, price, and quantity are required' });
  }
  if (!['buy', 'sell'].includes(side)) {
    return res.status(400).json({ error: "side must be 'buy' or 'sell'" });
  }

  try {
    // Validate campaign and order rules. Identity/profile completion is not a
    // marketplace requirement in this development flow; MetaMask connection is
    // enforced by the frontend and Supabase login identifies the order owner.

    // validate before sending request to backend by calling the smart contract function and state (completed)
    // await validateOrder(
    //   { campaign_id, investor_id: investorId, side, price, quantity },
    //   { skipInvestorValidation: true }
    // );

    // Keep tokens in the seller's wallet. Prevent over-listing by accounting
    // for the user's unfilled sell orders in Supabase; final ownership is
    // verified by ERC-20 transferFrom during on-chain settlement.
    if (side === 'sell') {
      const [{ data: tokenRows, error: tokenError }, { data: openOrders, error: orderError }] = await Promise.all([
        supabaseAdmin.from('tokens').select('amount').eq('user_id', investorId).eq('campaign_id', campaign_id),
        supabaseAdmin.from('token_orders').select('quantity_remaining').eq('investor_id', investorId).eq('campaign_id', campaign_id).eq('side', 'sell').in('status', ['open', 'partially_filled']),
      ]);
      if (tokenError || orderError) throw tokenError || orderError;
      const owned = (tokenRows ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      const listed = (openOrders ?? []).reduce((sum, row) => sum + Number(row.quantity_remaining ?? 0), 0);
      if (Number(quantity) > owned - listed) {
        return res.status(400).json({ error: 'Insufficient unlisted token balance' });
      }
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
        status: 'open',
        seller_wallet_address: wallet_address

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
    console.error('[createOrder] unexpected error', err);
    return res.status(500).json({ error: 'Failed to place order' });
  }
}

function getOrderBook(req, res) {
  const book = getOrCreateBook(req.params.campaignId);
  return res.json(book.getBookSnapshot(20));
}

/**
 * Public marketplace inventory.  A sell order is the item an investor can buy;
 * campaign and seller wallet data are attached so the frontend can settle it
 * with EquitySecondaryMarketplace.settleTrade().
 */
async function getOpenSellOrders(req, res) {
  try {
    const { data: orders, error: orderError } = await supabaseAdmin
      .from('token_orders')
      .select('id, campaign_id, investor_id, price, quantity, quantity_remaining, created_at, seller_wallet_address')
      .eq('side', 'sell')
      .in('status', ['open', 'partially_filled'])
      .gt('quantity_remaining', 0)
      .order('created_at', { ascending: false });

    if (orderError) throw orderError;
    if (!orders?.length) return res.json({ orders: [] });

    const campaignIds = [...new Set(orders.map((order) => order.campaign_id))];
    const sellerIds = [...new Set(orders.map((order) => order.investor_id))];
    const [{ data: campaigns, error: campaignError }, { data: sellers, error: sellerError }] = await Promise.all([
      supabaseAdmin
        .from('campaigns')
        .select('id, title, category, token_contract_address, secondary_trading_enabled')
        .in('id', campaignIds),
      supabaseAdmin
        .from('profiles')
        .select('user_id, wallet_address')
        .in('user_id', sellerIds),
    ]);

    if (campaignError || sellerError) throw campaignError || sellerError;

    const campaignById = new Map((campaigns ?? []).map((campaign) => [String(campaign.id), campaign]));
    const sellerById = new Map((sellers ?? []).map((seller) => [String(seller.user_id), seller]));
    const listings = orders
      .map((order) => ({
        ...order,
        campaign: campaignById.get(String(order.campaign_id)) ?? null,
        //seller_wallet_address: sellerById.get(String(order.investor_id))?.wallet_address ?? null,
      }))
      // A missing seller wallet prevents settlement, but do not hide the order:
      // buyers should be able to see why it is temporarily unavailable.
      .filter((order) => order.campaign?.secondary_trading_enabled && order.campaign?.token_contract_address);

    return res.json({ orders: listings });
  } catch (err) {
    console.error('[getOpenSellOrders] failed', err);
    return res.status(500).json({ error: 'Failed to load marketplace listings' });
  }
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

module.exports = { createOrder, getOrderBook, getOpenSellOrders, getTradeHistory, getHoldings };
