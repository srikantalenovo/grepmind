// backend/src/middleware/requireRole.js
export default function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    const userRole = String(req.user.role).toLowerCase();
    const allowed = allowedRoles.map(r => String(r).toLowerCase());

    if (!allowed.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    next();
  };
}
