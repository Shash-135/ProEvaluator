const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is not authenticated.' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access forbidden. Role '${req.user.role}' is not authorized for this resource.`
      });
    }

    next();
  };
};

module.exports = authorize;
