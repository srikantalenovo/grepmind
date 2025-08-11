import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public route
router.get('/public', (req, res) => {
  res.json({ message: 'Anyone can see this' });
});

// Protected dashboard (all roles)
router.get(
  '/dashboard',
  authenticate,
  authorizeRoles('admin', 'editor', 'viewer'),
  (req, res) => {
    res.json({ message: `Welcome ${req.user.name}, role: ${req.user.role}` });
  }
);

// Admin-only
router.get('/admin', authenticate, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Welcome Admin!' });
});

// Editor + Admin
router.get(
  '/editor-tools',
  authenticate,
  authorizeRoles('admin', 'editor'),
  (req, res) => {
    res.json({ message: 'Editor tools access granted' });
  }
);

export default router;
