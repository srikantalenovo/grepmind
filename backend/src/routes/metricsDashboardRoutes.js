import express from 'express';
import prisma from '../prismaClient.js';
import { promQuery } from '../utils/prometheusClient.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// List dashboards
router.get('/', authenticate, async (req, res) => {
  const dashboards = await prisma.metricsDashboard.findMany();
  res.json(dashboards);
});

// Get dashboard by ID
router.get('/:id', authenticate, async (req, res) => {
  const dashboard = await prisma.metricsDashboard.findUnique({
    where: { id: req.params.id },
  });
  res.json(dashboard);
});

// Create new dashboard
router.post('/', authenticate, async (req, res) => {
  const { name, panels } = req.body;
  const dashboard = await prisma.metricsDashboard.create({
    data: { name, panels, createdBy: req.user.userId },
  });
  res.json(dashboard);
});

// Update dashboard
router.put('/:id', authenticate, async (req, res) => {
  const { name, panels } = req.body;
  const dashboard = await prisma.metricsDashboard.update({
    where: { id: req.params.id },
    data: { name, panels },
  });
  res.json(dashboard);
});

// Validate PromQL query
router.post('/:id/query', authenticate, async (req, res) => {
  const { query } = req.body;
  try {
    const result = await promQuery(query);
    res.json({ success: true, result });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

export default router;
