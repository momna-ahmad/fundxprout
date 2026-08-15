const express = require('express');
const router = express.Router();
const { createOrder, getOrderBook, getTradeHistory, getHoldings } = require('../controllers/marketplaceController');
const authenticate = require('../middleware/authenticate');
const requireVerified = require('../middleware/requireVerified');
const requireWallet = require('../middleware/requireWallet');

router.post('/orders', authenticate, requireWallet, requireVerified, createOrder);
router.get('/orders/book/:campaignId', getOrderBook);
router.get('/trades/:campaignId', getTradeHistory);
router.get('/holdings/:campaignId', authenticate, getHoldings);

module.exports = router;