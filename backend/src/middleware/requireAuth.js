// import { verifyAccessToken } from '../utils/tokens.js';

// export default function requireAuth(req, res, next) {
//   try {
//     const auth = req.headers.authorization;
//     if (!auth) return res.status(401).json({ error: 'Missing authorization header' });
//     const parts = auth.split(' ');
//     if (parts[0] !== 'Bearer' || !parts[1]) return res.status(401).json({ error: 'Invalid authorization format' });
//     const payload = verifyAccessToken(parts[1]);
//     req.user = payload;
//     next();
//   } catch (err) {
//     return res.status(401).json({ error: 'Invalid or expired token' });
//   }
// }


// backend/src/middleware/requireAuth.js
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
if (!ACCESS_SECRET) throw new Error('ACCESS_TOKEN_SECRET (or JWT_SECRET) is required');

export default async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, ACCESS_SECRET);

    if (!payload?.userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, email: true, name: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err.message || err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
