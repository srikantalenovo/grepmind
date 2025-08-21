// src/routes/metricsDashboardRoutes.js
import express from 'express';
import prisma from '../prismaClient.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Get dashboards
router.get('/', authenticate, async (req, res) => {
  try {
    const dashboards = await prisma.metricsDashboard.findMany();
    res.json(dashboards);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Create dashboard (admin)
router.post('/', authenticate, rbac(['admin']), async (req, res) => {
  const { name, panels, createdBy } = req.body;
  try {
    const dashboard = await prisma.metricsDashboard.create({
      data: { name, panels, createdBy }
    });
    res.json(dashboard);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Update dashboard (admin/editor)
router.put('/:id', authenticate, rbac(['admin','editor']), async (req, res) => {
  const { id } = req.params;
  const { name, panels } = req.body;
  try {
    const dashboard = await prisma.metricsDashboard.update({
      where: { id },
      data: { name, panels }
    });
    res.json(dashboard);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Delete dashboard (admin)
router.delete('/:id', authenticate, rbac(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.metricsDashboard.delete({ where: { id } });
    res.json({ message: 'Dashboard deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
