const express = require('express');
const { createNonce, linkWallet, getWalletStatus } = require('../controllers/walletController');
const authenticate = require('../middleware/authenticate');
const router = express.Router();

router.use(express.json());
router.post('/nonce', authenticate, createNonce);
router.post('/link', authenticate, linkWallet);
router.get('/status', getWalletStatus);

module.exports = router;
