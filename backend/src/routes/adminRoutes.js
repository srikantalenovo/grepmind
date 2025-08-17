// backend/src/routes/adminRoutes.js
import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

// Example: only admin can view stats
router.get('/stats', requireAuth, requireRole('admin'), async (req, res) => {
  res.json({
    message: 'Admin stats access granted',
    stats: {
      totalUsers: 100,
      revenue: '$5000',
    },
  });
});

// Example: admin + editor can create content
router.post('/content', requireAuth, requireRole('admin', 'editor'), async (req, res) => {
  res.json({ message: 'Content created successfully' });
});

export default router;
