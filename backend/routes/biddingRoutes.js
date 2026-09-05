// backend/routes/biddingRoutes.js
// All auction-style bidding endpoints. Mounted at /api/marketplace/
// Does NOT modify any existing marketplaceRoutes.js routes.

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  placeBid,
  getListingBids,
  acceptBid,
  cancelBid,
  getMyBids,
  signListing,
  confirmBid,
  completeBid,
  getKycSignature,
} = require('../controllers/biddingController');

// ── Buyer routes ──────────────────────────────────────────────────────────────
router.post('/bids', authenticate, placeBid);                            // Place a bid on a listing
router.get('/bids/my', authenticate, getMyBids);                         // View all my bids
router.post('/bids/:bidId/cancel', authenticate, cancelBid);             // Cancel a pending bid
router.post('/bids/:bidId/confirm', authenticate, confirmBid);           // Confirm accepted bid → get settlement data
router.post('/bids/:bidId/complete', authenticate, completeBid);         // Mark bid complete after on-chain tx succeeds
router.post('/bids/:bidId/accept', authenticate, acceptBid);             // Accept a bid (shortcut for buyer-side too)

// ── KYC signature — REQUIRED for on-chain fillOrder() settlement ─────────────
router.post('/kyc-signature', authenticate, getKycSignature);            // Backend signs KYC ticket for fillOrder()

// ── Seller routes ─────────────────────────────────────────────────────────────
router.get('/listings/:listingId/bids', authenticate, getListingBids);   // View all bids on a listing
router.post('/listings/:listingId/accept-bid/:bidId', authenticate, acceptBid); // Accept via full path
router.post('/listings/:listingId/sign', authenticate, signListing);     // Store EIP-712 seller signature

module.exports = router;
