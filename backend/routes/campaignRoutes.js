const express = require('express');
const router = express.Router();
const multer = require('multer');
const campaignController = require('../controllers/campaignController');
const riskController = require('../controllers/riskController');

// Multer Config (Temp storage before IPFS)
const upload = multer({ dest: 'uploads/' });

// Route: POST /api/campaigns/draft
// Expects: 'image' file + JSON body fields
router.post('/draft', upload.single('image'), campaignController.createDraft);

// Route: PUT /api/campaigns/link
router.put('/link', campaignController.linkContract);

// Evaluate a draft through the existing AI scorer without saving scores.
router.post('/prelaunch-evaluate', riskController.evaluatePrelaunch);

module.exports = router;
