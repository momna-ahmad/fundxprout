const express = require('express');
const { createNonce, linkWallet, getWalletStatus } = require('../controllers/walletController');
const router = express.Router();

router.use(express.json());
router.post('/nonce', createNonce);
router.post('/link', linkWallet);
router.get('/status', getWalletStatus);

module.exports = router;
