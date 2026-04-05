const express = require('express');
const router = express.Router();
const multer = require('multer');
const campaignController = require('../controllers/campaignController');

// Multer Config (Temp storage before IPFS)
const upload = multer({ dest: 'uploads/' });

// Route: POST /api/campaigns/draft
// Expects: 'image' file + JSON body fields
router.post('/draft', upload.single('image'), campaignController.createDraft);

// Route: PUT /api/campaigns/link
router.put('/link', campaignController.linkContract);

module.exports = router;