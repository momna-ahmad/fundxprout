// backend/controllers/biddingController.js
// Handles the auction-style bidding system for the secondary marketplace.
// Buyers post bids on sell listings; sellers review and accept; winning buyer
// calls fillOrder() on-chain. This file does NOT touch any existing functions.

const { supabaseAdmin } = require('../config/supabaseAdmin');
const { ethers } = require('ethers');

// ─────────────────────────────────────────────
// POST /api/marketplace/bids
// Buyer places a bid on an open sell listing
// ─────────────────────────────────────────────
async function placeBid(req, res) {
  const buyerId = req.user?.id;
  const { listing_id, bid_price_per_token, quantity, buyer_wallet, bid_expires_days = 7 } = req.body;

  if (!listing_id || !bid_price_per_token || !quantity || !buyer_wallet) {
    return res.status(400).json({ error: 'listing_id, bid_price_per_token, quantity, and buyer_wallet are required' });
  }

  if (!ethers.isAddress(buyer_wallet)) {
    return res.status(400).json({ error: 'Invalid buyer_wallet address' });
  }

  if (Number(bid_price_per_token) <= 0 || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'bid_price_per_token and quantity must be positive numbers' });
  }

  try {
    // 1. Verify the listing exists, is a sell order, and is still open
    const { data: listing, error: listingErr } = await supabaseAdmin
      .from('token_orders')
      .select('id, campaign_id, investor_id, side, status, quantity_remaining, price')
      .eq('id', listing_id)
      .single();

    if (listingErr || !listing) {
      return res.status(404).json({ error: 'Sell listing not found' });
    }
    if (listing.side !== 'sell') {
      return res.status(400).json({ error: 'You can only bid on sell listings' });
    }
    if (!['open', 'partially_filled'].includes(listing.status)) {
      return res.status(400).json({ error: 'This listing is no longer active' });
    }
    if (Number(quantity) > Number(listing.quantity_remaining)) {
      return res.status(400).json({
        error: `Requested quantity ${quantity} exceeds available ${listing.quantity_remaining} tokens`,
      });
    }

    // 2. Buyer cannot bid on their own listing
    if (listing.investor_id === buyerId) {
      return res.status(400).json({ error: 'You cannot bid on your own listing' });
    }

    // 3. Verify buyer is KYC verified
    const { data: buyerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('identity_verified, profile_complete, trading_restricted')
      .eq('user_id', buyerId)
      .single();

    if (profileErr || !buyerProfile) {
      return res.status(404).json({ error: 'Buyer profile not found' });
    }
    if (!buyerProfile.identity_verified) {
      return res.status(403).json({ error: 'Identity verification (KYC) required before placing bids' });
    }
    if (!buyerProfile.profile_complete) {
      return res.status(403).json({ error: 'Complete your profile before placing bids' });
    }
    if (buyerProfile.trading_restricted) {
      return res.status(403).json({ error: 'Your account is restricted from trading' });
    }

    // 4. Calculate bid expiry
    const bidExpiresAt = new Date();
    bidExpiresAt.setDate(bidExpiresAt.getDate() + Number(bid_expires_days));

    // 5. Insert the bid
    const { data: bid, error: insertErr } = await supabaseAdmin
      .from('token_bids')
      .insert([{
        listing_id,
        campaign_id: listing.campaign_id,
        buyer_id: buyerId,
        buyer_wallet: buyer_wallet.toLowerCase(),
        bid_price_per_token: Number(bid_price_per_token),
        quantity: Number(quantity),
        status: 'pending',
        bid_expires_at: bidExpiresAt.toISOString(),
      }])
      .select()
      .single();

    if (insertErr) throw insertErr;

    return res.status(201).json({ bid, message: 'Bid placed successfully. The seller will be notified.' });
  } catch (err) {
    console.error('[placeBid] error:', err);
    return res.status(500).json({ error: 'Failed to place bid' });
  }
}

// ─────────────────────────────────────────────
// GET /api/marketplace/listings/:listingId/bids
// Seller views all bids on their listing (ranked by price)
// ─────────────────────────────────────────────
async function getListingBids(req, res) {
  const sellerId = req.user?.id;
  const { listingId } = req.params;

  try {
    // 1. Verify this listing belongs to the seller
    const { data: listing, error: listingErr } = await supabaseAdmin
      .from('token_orders')
      .select('id, investor_id, campaign_id, price, quantity_remaining, status')
      .eq('id', listingId)
      .eq('side', 'sell')
      .single();

    if (listingErr || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.investor_id !== sellerId) {
      return res.status(403).json({ error: 'You are not the owner of this listing' });
    }

    // 2. Fetch all bids, join buyer profile info
    const { data: bids, error: bidsErr } = await supabaseAdmin
      .from('token_bids')
      .select(`
        id, buyer_id, buyer_wallet, bid_price_per_token, quantity, status,
        bid_expires_at, accept_deadline, tx_hash, created_at,
        profiles:buyer_id ( full_name, display_name, identity_verified )
      `)
      .eq('listing_id', listingId)
      .in('status', ['pending', 'accepted', 'confirmed', 'completed', 'rejected', 'expired'])
      .order('bid_price_per_token', { ascending: false }); // highest bid first

    if (bidsErr) throw bidsErr;

    return res.json({ listing, bids: bids || [] });
  } catch (err) {
    console.error('[getListingBids] error:', err);
    return res.status(500).json({ error: 'Failed to load bids' });
  }
}

// ─────────────────────────────────────────────
// POST /api/marketplace/bids/:bidId/accept
// Seller accepts a specific bid → 24hr window opens for buyer
// ─────────────────────────────────────────────
async function acceptBid(req, res) {
  const sellerId = req.user?.id;
  const { bidId } = req.params;

  try {
    // 1. Load the bid with its listing info
    const { data: bid, error: bidErr } = await supabaseAdmin
      .from('token_bids')
      .select(`
        id, listing_id, buyer_id, buyer_wallet, quantity, bid_price_per_token, status, bid_expires_at,
        token_orders:listing_id ( investor_id, quantity_remaining, status, seller_signature, seller_nonce, price, campaign_id )
      `)
      .eq('id', bidId)
      .single();

    if (bidErr || !bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // 2. Authorization: only the listing's seller can accept
    if (bid.token_orders?.investor_id !== sellerId) {
      return res.status(403).json({ error: 'You are not the seller for this listing' });
    }

    // 3. Validate bid state
    if (bid.status !== 'pending') {
      return res.status(400).json({ error: `Cannot accept a bid with status: ${bid.status}` });
    }
    if (new Date(bid.bid_expires_at) < new Date()) {
      return res.status(400).json({ error: 'This bid has already expired' });
    }
    if (!['open', 'partially_filled'].includes(bid.token_orders?.status)) {
      return res.status(400).json({ error: 'The sell listing is no longer active' });
    }

    // 4. Seller must have signed the listing before accepting a bid
    if (!bid.token_orders?.seller_signature) {
      return res.status(400).json({
        error: 'You must sign your listing before accepting bids. Update your listing with a signature.',
        code: 'SIGNATURE_REQUIRED',
      });
    }

    // 5. Set 24-hour accept deadline and update bid status
    const acceptDeadline = new Date();
    acceptDeadline.setHours(acceptDeadline.getHours() + 24);

    const { data: updatedBid, error: updateErr } = await supabaseAdmin
      .from('token_bids')
      .update({
        status: 'accepted',
        accept_deadline: acceptDeadline.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bidId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return res.json({
      bid: updatedBid,
      accept_deadline: acceptDeadline.toISOString(),
      message: 'Bid accepted. Buyer has 24 hours to confirm the purchase.',
    });
  } catch (err) {
    console.error('[acceptBid] error:', err);
    return res.status(500).json({ error: 'Failed to accept bid' });
  }
}

// ─────────────────────────────────────────────
// POST /api/marketplace/bids/:bidId/cancel
// Buyer cancels their own pending bid
// ─────────────────────────────────────────────
async function cancelBid(req, res) {
  const buyerId = req.user?.id;
  const { bidId } = req.params;

  try {
    const { data: bid, error: bidErr } = await supabaseAdmin
      .from('token_bids')
      .select('id, buyer_id, status')
      .eq('id', bidId)
      .single();

    if (bidErr || !bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }
    if (bid.buyer_id !== buyerId) {
      return res.status(403).json({ error: 'You can only cancel your own bids' });
    }
    if (!['pending'].includes(bid.status)) {
      return res.status(400).json({
        error: `Cannot cancel a bid with status: ${bid.status}. Only pending bids can be cancelled.`,
      });
    }

    const { data: updatedBid, error: updateErr } = await supabaseAdmin
      .from('token_bids')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', bidId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return res.json({ bid: updatedBid, message: 'Bid cancelled successfully.' });
  } catch (err) {
    console.error('[cancelBid] error:', err);
    return res.status(500).json({ error: 'Failed to cancel bid' });
  }
}

// ─────────────────────────────────────────────
// GET /api/marketplace/bids/my
// Buyer views all their own bids across all listings
// ─────────────────────────────────────────────
async function getMyBids(req, res) {
  const buyerId = req.user?.id;

  try {
    const { data: bids, error } = await supabaseAdmin
      .from('token_bids')
      .select(`
        id, listing_id, campaign_id, bid_price_per_token, quantity, status,
        bid_expires_at, accept_deadline, tx_hash, created_at, updated_at,
        token_orders:listing_id (
          price, quantity_remaining, seller_wallet_address, seller_signature, seller_nonce,
          campaigns:campaign_id ( title, category, token_contract_address, token_symbol )
        )
      `)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ bids: bids || [] });
  } catch (err) {
    console.error('[getMyBids] error:', err);
    return res.status(500).json({ error: 'Failed to load your bids' });
  }
}

// ─────────────────────────────────────────────
// POST /api/marketplace/listings/:listingId/sign
// Seller signs their listing (stores EIP-712 seller signature)
// Called when seller creates or updates listing — off-chain, no gas
// ─────────────────────────────────────────────
async function signListing(req, res) {
  const sellerId = req.user?.id;
  const { listingId } = req.params;
  const { seller_signature, seller_nonce } = req.body;

  if (!seller_signature || seller_nonce === undefined) {
    return res.status(400).json({ error: 'seller_signature and seller_nonce are required' });
  }

  try {
    // Verify ownership
    const { data: listing, error: listingErr } = await supabaseAdmin
      .from('token_orders')
      .select('id, investor_id')
      .eq('id', listingId)
      .eq('side', 'sell')
      .single();

    if (listingErr || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.investor_id !== sellerId) {
      return res.status(403).json({ error: 'You are not the owner of this listing' });
    }

    // Store the signature
    const { error: updateErr } = await supabaseAdmin
      .from('token_orders')
      .update({
        seller_signature,
        seller_nonce: Number(seller_nonce),
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId);

    if (updateErr) throw updateErr;

    return res.json({ message: 'Listing signed successfully. Buyers can now bid.' });
  } catch (err) {
    console.error('[signListing] error:', err);
    return res.status(500).json({ error: 'Failed to save listing signature' });
  }
}

// ─────────────────────────────────────────────
// POST /api/marketplace/bids/:bidId/confirm
// Buyer confirms accepted bid → marks as confirmed
// Called BEFORE the on-chain fillOrder() transaction
// ─────────────────────────────────────────────
async function confirmBid(req, res) {
  const buyerId = req.user?.id;
  const { bidId } = req.params;

  try {
    const { data: bid, error: bidErr } = await supabaseAdmin
      .from('token_bids')
      .select(`
        id, buyer_id, listing_id, quantity, bid_price_per_token, status, accept_deadline,
        token_orders:listing_id (
          seller_wallet_address, seller_signature, seller_nonce, price,
          campaigns:campaign_id ( token_contract_address )
        )
      `)
      .eq('id', bidId)
      .single();

    if (bidErr || !bid) return res.status(404).json({ error: 'Bid not found' });
    if (bid.buyer_id !== buyerId) return res.status(403).json({ error: 'Not your bid' });
    if (bid.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted bids can be confirmed' });
    }
    if (bid.accept_deadline && new Date(bid.accept_deadline) < new Date()) {
      // Expire the bid automatically
      await supabaseAdmin
        .from('token_bids')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', bidId);
      return res.status(400).json({ error: 'The 24-hour confirm window has expired. Bid is now expired.' });
    }

    const listing = bid.token_orders;
    if (!listing?.seller_signature) {
      return res.status(400).json({ error: 'Seller signature not found for this listing. Contact the seller.' });
    }

    // Mark bid as confirmed
    await supabaseAdmin
      .from('token_bids')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', bidId);

    // Return all the data needed by the frontend to call fillOrder() on-chain
    return res.json({
      message: 'Bid confirmed. Proceed with the on-chain transaction.',
      settlement_data: {
        seller_wallet: listing.seller_wallet_address,
        seller_signature: listing.seller_signature,
        seller_nonce: listing.seller_nonce,
        token_contract_address: listing.campaigns?.token_contract_address,
        quantity: bid.quantity,
        price_per_token: bid.bid_price_per_token,
      },
    });
  } catch (err) {
    console.error('[confirmBid] error:', err);
    return res.status(500).json({ error: 'Failed to confirm bid' });
  }
}

// ─────────────────────────────────────────────
// POST /api/marketplace/bids/:bidId/complete
// Called by buyer's frontend AFTER fillOrder() on-chain tx succeeds
// Updates bid + listing status in the DB
// ─────────────────────────────────────────────
async function completeBid(req, res) {
  const buyerId = req.user?.id;
  const { bidId } = req.params;
  const { tx_hash, block_number } = req.body;

  if (!tx_hash) {
    return res.status(400).json({ error: 'tx_hash is required' });
  }

  try {
    const { data: bid, error: bidErr } = await supabaseAdmin
      .from('token_bids')
      .select('id, buyer_id, listing_id, campaign_id, quantity, status')
      .eq('id', bidId)
      .single();

    if (bidErr || !bid) return res.status(404).json({ error: 'Bid not found' });
    if (bid.buyer_id !== buyerId) return res.status(403).json({ error: 'Not your bid' });
    if (bid.status !== 'confirmed') {
      return res.status(400).json({ error: 'Only confirmed bids can be marked as completed' });
    }

    // Mark bid as completed
    const { error: bidUpdateErr } = await supabaseAdmin
      .from('token_bids')
      .update({
        status: 'completed',
        tx_hash,
        block_number: block_number ? Number(block_number) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bidId);

    if (bidUpdateErr) throw bidUpdateErr;

    // Reduce quantity_remaining on the listing
    const { data: listing } = await supabaseAdmin
      .from('token_orders')
      .select('quantity_remaining, quantity_filled')
      .eq('id', bid.listing_id)
      .single();

    if (listing) {
      const newRemaining = Number(listing.quantity_remaining) - Number(bid.quantity);
      const newFilled = Number(listing.quantity_filled || 0) + Number(bid.quantity);
      await supabaseAdmin
        .from('token_orders')
        .update({
          quantity_remaining: Math.max(0, newRemaining),
          quantity_filled: newFilled,
          status: newRemaining <= 0 ? 'filled' : 'open',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bid.listing_id);
    }

    return res.json({ message: 'Trade completed successfully!', tx_hash });
  } catch (err) {
    console.error('[completeBid] error:', err);
    return res.status(500).json({ error: 'Failed to complete bid' });
  }
}

// ─────────────────────────────────────────────
// POST /api/marketplace/kyc-signature
// Returns a backend-signed EIP-712 KYC ticket so buyer can call fillOrder()
// Both parties must be KYC-verified in the DB before the signature is issued
// ─────────────────────────────────────────────
async function getKycSignature(req, res) {
  const { buyer_wallet, seller_wallet, chain_id = 11155111 } = req.body;

  if (!buyer_wallet || !seller_wallet) {
    return res.status(400).json({ error: 'buyer_wallet and seller_wallet are required' });
  }

  try {
    const { generateKycSignature } = require('../services/kycSignerService');
    const { kycSignature, kycDeadline } = await generateKycSignature(buyer_wallet, seller_wallet, chain_id);
    return res.json({ kycSignature, kycDeadline });
  } catch (err) {
    console.error('[getKycSignature] error:', err);
    // Return the specific KYC error to the frontend so buyer knows what to fix
    return res.status(403).json({ error: err.message || 'KYC authorization failed' });
  }
}

module.exports = {
  placeBid,
  getListingBids,
  acceptBid,
  cancelBid,
  getMyBids,
  signListing,
  confirmBid,
  completeBid,
  getKycSignature,
};
