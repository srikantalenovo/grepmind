import { verifyAccessToken } from '../utils/tokens.js';

export default function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Missing authorization header' });
    const parts = auth.split(' ');
    if (parts[0] !== 'Bearer' || !parts[1]) return res.status(401).json({ error: 'Invalid authorization format' });
    const payload = verifyAccessToken(parts[1]);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
