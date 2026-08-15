const crypto = require('crypto');
const { ethers } = require('ethers');
const { supabaseAdmin } = require('../config/supabaseAdmin');

const pendingNonces = new Map();

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

async function createNonce(req, res) {
  const { address } = req.body;
  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  const normalized = normalizeAddress(address);
  const nonce = crypto.randomBytes(16).toString('hex');
  pendingNonces.set(normalized, nonce);

  return res.json({ nonce });
}

async function linkWallet(req, res) {
  const { address, signature } = req.body;
  if (!address || !signature) {
    return res.status(400).json({ error: 'Address and signature are required' });
  }

  const normalized = normalizeAddress(address);
  const nonce = pendingNonces.get(normalized);
  if (!nonce) {
    return res.status(400).json({ error: 'Missing or expired nonce for this address' });
  }

  let recovered;
  try {
    recovered = ethers.verifyMessage(nonce, signature);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid signature format' });
  }

  if (normalizeAddress(recovered) !== normalized) {
    return res.status(401).json({ error: 'Signature does not match address' });
  }

  pendingNonces.delete(normalized);

  const { data: profile, error: selectError } = await supabaseAdmin
    .from('profiles')
    .select('user_id,wallet_verified')
    .ilike('wallet_address', address)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    return res.status(500).json({ error: selectError.message });
  }

  if (!profile) {
    return res.status(404).json({ error: 'No profile found for this wallet address' });
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ wallet_address: normalized, wallet_verified: true })
    .eq('user_id', profile.user_id);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  return res.json({ success: true, wallet_verified: true });
}

async function getWalletStatus(req, res) {
  const address = typeof req.query.address === 'string' ? req.query.address : null;
  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('wallet_verified')
    .ilike('wallet_address', address)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ wallet_verified: profile?.wallet_verified === true });
}

module.exports = {
  createNonce,
  linkWallet,
  getWalletStatus,
};
