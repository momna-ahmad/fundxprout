const express = require('express');
const router = express.Router();
const { createOrder, getOrderBook, getOpenSellOrders, cancelOrder, getTokenAnalytics, getTradeHistory, getHoldings } = require('../controllers/marketplaceController');
const authenticate = require('../middleware/authenticate');

router.post('/orders', authenticate, createOrder);
router.post('/orders/:orderId/cancel', authenticate, cancelOrder);
router.get('/orders/sell', getOpenSellOrders);
router.get('/orders/book/:campaignId', getOrderBook);
router.get('/analytics/:campaignId', getTokenAnalytics);
router.get('/trades/:campaignId', getTradeHistory);
router.get('/holdings/:campaignId', authenticate, getHoldings);

module.exports = router;
