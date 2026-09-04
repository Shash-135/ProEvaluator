const { ROLES } = require('../constants');

/**
 * Middleware to evaluate scope for evaluator access to teams and metrics.
 * Attaches the resolved `scopeFilter` to `req.scopeFilter`.
 */
const scopeEvaluator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Admin has global scope, but shouldn't hit evaluator routes directly
  if (req.user.role === ROLES.ADMIN) {
    req.scopeFilter = {};
    return next();
  }

  if (req.user.role === ROLES.TEACHER) {
    req.scopeFilter = { assignedTeacherId: req.user._id };
    return next();
  }

  if (req.user.role === ROLES.EXTERNAL) {
    if (!req.user.linkedExternalTo) {
      return res.status(403).json({ message: 'Forbidden: External evaluator is not linked to any teacher' });
    }
    req.scopeFilter = { assignedTeacherId: req.user.linkedExternalTo };
    return next();
  }

  return res.status(403).json({ message: 'Forbidden: Invalid role for this operation' });
};

module.exports = scopeEvaluator;
