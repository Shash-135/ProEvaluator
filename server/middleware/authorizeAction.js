const { hasPermission } = require('../config/permissions');

const authorizeAction = (action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is not authenticated.' });
    }

    if (!hasPermission(req.user.role, action)) {
      return res.status(403).json({
        error: `Access forbidden. Role '${req.user.role}' is not authorized to perform action '${action}'.`
      });
    }

    next();
  };
};

module.exports = authorizeAction;
