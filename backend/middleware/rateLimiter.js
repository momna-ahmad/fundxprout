// backend/middleware/rateLimiter.js
// In-memory sliding window rate limiter for marketplace and bidding endpoints.
// Limits abuse, bot spamming, and DoS attempts without requiring external services.

// shafqaat implemented — Rate limiting middleware for bidding and marketplace actions
function createRateLimiter({ windowMs = 60 * 1000, max = 30, message = 'Too many requests, please try again later.' } = {}) {
  const requests = new Map();

  // Periodic cleanup of stale IP/user buckets every 5 minutes to avoid memory leak
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < windowMs);
      if (validTimestamps.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, validTimestamps);
      }
    }
  }, 5 * 60 * 1000);

  return function rateLimiter(req, res, next) {
    // Key by user ID if authenticated, else by client IP
    const clientKey = req.user?.id || req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    const clientTimestamps = requests.get(clientKey) || [];
    const recentRequests = clientTimestamps.filter((timestamp) => now - timestamp < windowMs);

    if (recentRequests.length >= max) {
      const oldestInWindow = recentRequests[0];
      const retryAfterSeconds = Math.ceil((oldestInWindow + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retryAfterSeconds,
      });
    }

    recentRequests.push(now);
    requests.set(clientKey, recentRequests);
    return next();
  };
}

// Stricter limiter for critical mutating actions: placing bids, countering, accepting (30 req / min)
const biddingActionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Bidding rate limit exceeded. Please wait a moment before taking further bidding actions.',
});

// Standard limiter for reading order books and bid history (120 req / min)
const biddingReadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many marketplace queries. Please slow down.',
});

module.exports = {
  createRateLimiter,
  biddingActionLimiter,
  biddingReadLimiter,
};
