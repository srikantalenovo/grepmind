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

export function requireRole(allowed = []) {
  return (req, res, next) => {
    const role = (req.headers['x-user-role'] || '').toLowerCase();
    if (!role) return res.status(401).json({ error: 'Missing x-user-role header' });
    if (!allowed.length || allowed.includes(role)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}