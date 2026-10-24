// backend/services/notificationService.js
// Shared helper: saves a notification to Supabase AND emits it live via Socket.IO.
// Call this from any controller after a bid/trade event occurs.

const { supabaseAdmin } = require('../config/supabaseAdmin');

/**
 * @param {Object} params
 * @param {string} params.userId      - Supabase user_id of the recipient
 * @param {string} params.type        - Event type: 'bid_received', 'bid_accepted', etc.
 * @param {string} params.title       - Short notification title
 * @param {string} params.message     - Full notification message
 * @param {string} [params.link]      - Dashboard link to navigate to on click
 * @param {Object} [params.metadata]  - Extra data (bid_id, campaign_id, etc.)
 */
async function createNotification({ userId, type, title, message, link, metadata = {} }) {
  try {
    if (!userId) return null;

    // 1. De-duplicate: check if a matching notification was already inserted in the last 10 seconds (e.g. by DB trigger)
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from('notifications')
      .select('id, user_id, type, title, message, link, metadata, is_read, created_at')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('message', message)
      .gte('created_at', tenSecondsAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let notification = existing;

    if (!notification) {
      // Persist to Supabase if not already inserted by DB trigger
      const { data: inserted, error } = await supabaseAdmin
        .from('notifications')
        .insert([{ user_id: userId, type, title, message, link, metadata }])
        .select()
        .single();

      if (error) {
        console.error('[notificationService] DB insert error:', error.message);
        return null;
      }
      notification = inserted;
    }

    // 2. Emit live via Socket.IO to the user's private room
    const { emitNotificationToUser } = require('../sockets/marketplaceSocket');
    emitNotificationToUser(userId, notification);

    return notification;
  } catch (err) {
    // Non-fatal: never crash a controller because of a notification failure
    console.error('[notificationService] Unexpected error:', err.message);
    return null;
  }
}

module.exports = { createNotification };
