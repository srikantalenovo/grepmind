// src/routes/clusterRoutes.js
import express from 'express';
import { getNamespaces, getNodes } from '../controllers/clusterController.js';
import { rbac } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get('/namespaces', rbac(['viewer', 'editor', 'admin']), getNamespaces);
router.get('/nodes', rbac(['viewer', 'editor', 'admin']), getNodes);

export default router;
