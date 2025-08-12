// middlewares/rbacMiddleware.js
export const rbac = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role']; // Example: 'admin', 'editor', 'viewer'
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: Insufficient role" });
    }
    next();
  };
};
