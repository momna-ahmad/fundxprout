// backend/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { getNotifications, markOneRead, markAllRead, emitSystemNotification } = require('../controllers/notificationController');
const authenticate = require('../middleware/authenticate');

router.get('/', authenticate, getNotifications);
router.post('/read-all', authenticate, markAllRead);
router.post('/system-emit', emitSystemNotification);
router.post('/:id/read', authenticate, markOneRead);

module.exports = router;

