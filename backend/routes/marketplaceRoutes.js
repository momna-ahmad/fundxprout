const express = require('express');
const router = express.Router();
const { createOrder, getOrderBook, getOpenSellOrders, getTradeHistory, getHoldings } = require('../controllers/marketplaceController');
const authenticate = require('../middleware/authenticate');

// MetaMask connection is enforced by the frontend. Do not require a profile-linked
// and signed wallet before accepting an off-chain order-book listing.
router.post('/orders', authenticate, createOrder);
router.get('/orders/sell', getOpenSellOrders);
router.get('/orders/book/:campaignId', getOrderBook);
router.get('/trades/:campaignId', getTradeHistory);
router.get('/holdings/:campaignId', authenticate, getHoldings);

module.exports = router;
