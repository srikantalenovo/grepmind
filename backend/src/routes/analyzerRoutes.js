// src/routes/analyzerRoutes.js
import express from 'express';
import { rbac } from '../middleware/rbacMiddleware.js';
import {
  analyzerScan,
  restartPod,
  deletePod,
  scaleDeployment,
  deleteResource,
  viewSecret,
  editYaml,
} from '../controllers/analyzerController.js';

const router = express.Router();

// Scan endpoint (Viewer+)
router.get('/scan', rbac(['viewer', 'editor', 'admin']), analyzerScan);

// Actions (RBAC)
router.post('/:ns/pods/:name/restart', rbac(['editor', 'admin']), restartPod);
router.delete('/:ns/pods/:name', rbac(['admin']), deletePod);

router.post('/:ns/deployments/:name/scale', rbac(['editor', 'admin']), scaleDeployment);

// Generic delete
router.delete('/:ns/:kind/:name', rbac(['admin']), deleteResource);

// Secrets view
router.get('/:ns/secrets/:name/view', rbac(['admin']), viewSecret);

// YAML edit/apply
router.put('/:ns/:kind/:name/edit', rbac(['admin']), editYaml);

export default router;

