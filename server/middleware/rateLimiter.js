const rateLimit = require('express-rate-limit');

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP / user to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

const githubSyncRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit manual forced GitHub metric refreshes to 10 per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many GitHub metric sync requests. Please wait a minute before retrying.' }
});

module.exports = {
  apiRateLimiter,
  githubSyncRateLimiter
};
