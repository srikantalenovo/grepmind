// src/routes/dataSourceRoutes.js
import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { getDataSources, upsertPrometheus } from '../controllers/dataSourceController.js';

const router = express.Router();

router.get('/', authenticate, rbac(['viewer','editor','admin']), getDataSources);
router.post('/prometheus', authenticate, rbac(['admin']), upsertPrometheus);

export default router;
