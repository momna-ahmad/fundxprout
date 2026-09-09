// backend/controllers/notificationController.js
// REST endpoints for the notification bell in the navbar.

const { supabaseAdmin } = require('../config/supabaseAdmin');

// GET /api/notifications — fetch latest 30 notifications for the logged-in user
async function getNotifications(req, res) {
  const userId = req.user?.id;
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('id, type, title, message, link, is_read, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    const unreadCount = (data || []).filter((n) => !n.is_read).length;
    return res.json({ notifications: data || [], unreadCount });
  } catch (err) {
    console.error('[getNotifications] error:', err);
    return res.status(500).json({ error: 'Failed to load notifications' });
  }
}

// POST /api/notifications/:id/read — mark one as read
async function markOneRead(req, res) {
  const userId = req.user?.id;
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId); // security: user can only mark their own

    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('[markOneRead] error:', err);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

// POST /api/notifications/read-all — mark all as read
async function markAllRead(req, res) {
  const userId = req.user?.id;
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('[markAllRead] error:', err);
    return res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
}

// POST /api/notifications/system-emit — bridge for internal/admin actions to send notifications
async function emitSystemNotification(req, res) {
  const systemKey = req.headers['x-system-key'];
  const expectedKey = process.env.SYSTEM_NOTIF_KEY || 'fxp-system-secret';

  if (systemKey !== expectedKey && !req.user) {
    return res.status(401).json({ error: 'Unauthorized system notification attempt' });
  }

  const { userId, type, title, message, link, metadata } = req.body;

  if (!userId || !type || !title || !message) {
    return res.status(400).json({ error: 'Missing required notification fields' });
  }

  const { createNotification } = require('../services/notificationService');
  const notification = await createNotification({ userId, type, title, message, link, metadata });

  return res.json({ success: true, notification });
}

module.exports = { getNotifications, markOneRead, markAllRead, emitSystemNotification };

