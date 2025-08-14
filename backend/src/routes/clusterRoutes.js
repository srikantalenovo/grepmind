// src/routes/clusterRoutes.js
import express from 'express';
import { getNamespaces, getNodes, getNodeDetails, getNodeLogs } from '../controllers/clusterController.js';
import { rbac } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.get('/namespaces', rbac(['viewer', 'editor', 'admin']), getNamespaces);
router.get('/nodes', rbac(['viewer', 'editor', 'admin']), getNodes);
router.get('/nodes/:name/details',  rbac(['viewer', 'editor', 'admin']), getNodeDetails);
router.get('/nodes/:name/logs',  rbac(['viewer', 'editor', 'admin']), getNodeLogs);

export default router;
