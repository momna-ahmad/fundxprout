// backend/middleware/requireVerified.js
const { validateInvestor, ValidationError } = require('../services/orderValidationService');

module.exports = async function requireVerified(req, res, next) {
  // Adjust this line if your auth layer sets the investor id somewhere else
  // (e.g. req.user.id from a Supabase JWT middleware) — investor_id must
  // match profiles.user_id.
  const investorId = req.user?.id || req.body?.investor_id;

  if (!investorId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    await validateInvestor(investorId);
    req.investorId = investorId;
    return next();
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(403).json({ error: err.message, code: err.code });
    }
    console.error('[requireVerified] unexpected error', err);
    return res.status(500).json({ error: 'Verification check failed' });
  }
};