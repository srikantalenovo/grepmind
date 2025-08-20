// src/controllers/dataSourceController.js
import prisma from '../prismaClient.js';

/** List configured data sources */
export const getDataSources = async (_req, res) => {
  const items = await prisma.dataSource.findMany();
  res.json(items);
};

/** Upsert Prometheus URL (admin only) */
export const upsertPrometheus = async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ message: 'url is required' });
  const ds = await prisma.dataSource.upsert({
    where: { type: 'prometheus' },
    update: { url },
    create: { type: 'prometheus', url }
  });
  res.json(ds);
};
