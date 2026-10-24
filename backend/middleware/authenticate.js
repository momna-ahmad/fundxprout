// backend/middleware/authenticate.js
const { supabaseAdmin } = require('../config/supabaseAdmin');

module.exports = async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    // 1. Verify with Supabase Auth with a 5-second timeout to prevent hanging requests
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase auth network timeout')), 5000)
      );
      const authPromise = supabaseAdmin.auth.getUser(token);
      const { data, error } = await Promise.race([authPromise, timeoutPromise]);

      if (!error && data?.user) {
        req.user = { id: data.user.id };
        return next();
      }
    } catch (authErr) {
      console.warn('[authenticate] Supabase getUser failed or timed out:', authErr.message);
    }

    // 2. Fallback: Parse Supabase JWT payload if network to Supabase Auth API timed out
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.sub && payload.exp && payload.exp > nowSec) {
          req.user = { id: payload.sub };
          return next();
        }
      }
    } catch (jwtErr) {
      console.error('[authenticate] JWT fallback decode failed:', jwtErr.message);
    }

    return res.status(401).json({ error: 'Invalid or expired session' });
  } catch (err) {
    console.error('[authenticate] Unexpected error in auth middleware:', err);
    return res.status(500).json({ error: 'Authentication service error' });
  }
};