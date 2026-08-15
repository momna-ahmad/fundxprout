// backend/middleware/requireWallet.js
const { supabaseAdmin } = require('../config/supabaseAdmin');

module.exports = async function requireWallet(req, res, next) {
  const investorId = req.user?.id || req.body?.investor_id;
  const wallet = req.headers['x-wallet-address'] || req.body?.wallet_address;

  if (!investorId) return res.status(401).json({ error: 'Authentication required' });
  if (!wallet) return res.status(400).json({ error: 'Wallet address required' });

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('wallet_address, wallet_verified')
    .eq('user_id', investorId)
    .single();

  if (error || !profile) return res.status(404).json({ error: 'Profile not found' });
  if (!profile.wallet_verified) {
    return res.status(403).json({ error: 'Wallet not verified — sign the linking message first' });
  }
  if (profile.wallet_address?.toLowerCase() !== String(wallet).toLowerCase()) {
    return res.status(403).json({ error: 'Connected wallet does not match your verified wallet' });
  }

  req.wallet = { address: wallet };
  return next();
};