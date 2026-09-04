/**
 * Middleware to enforce self-scoping for student endpoints.
 * It ignores any client-supplied ID in params or body and injects
 * req.user._id as the sole identifier (req.studentId) for downstream queries.
 */
module.exports = (req, res, next) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Forcefully remove any IDs the client might try to pass
  if (req.params.id) {
    req.params.id = null; // Prevent using route param as an ID target
  }
  if (req.body.studentId) {
    req.body.studentId = req.user._id; // Override with the authenticated user's ID
  }

  // Inject the authenticated user ID for downstream services to use
  req.studentId = req.user._id;

  next();
};
