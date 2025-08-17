import express from 'express';
import { rbac } from '../middleware/rbacMiddleware.js';
import {
  getAnalyzerDetails,
  getAnalyzerYaml,
  getAnalyzerEvents,
  analyzerScan,
  restartPod,
  deletePod,
  scaleResource,
  deleteResource,
  viewSecret,
  scaleDeployment,
  editYaml
} from '../controllers/analyzerController.js';

const router = express.Router();

// Resource inspection
router.get('/:namespace/:resourceType/:name/details', rbac(['editor', 'admin']), getAnalyzerDetails);
router.get('/:namespace/:resourceType/:name/yaml', rbac(['editor', 'admin']), getAnalyzerYaml);
router.get('/:namespace/:resourceType/:name/events', rbac(['editor', 'admin']), getAnalyzerEvents);

// Scan endpoint (Viewer+)
router.get('/scan', rbac(['editor', 'admin']), analyzerScan);

// Actions (RBAC)
router.post('/:namespace/pods/:name/restart', rbac(['editor', 'admin']), restartPod);
router.delete('/:namespace/pods/:name', rbac(['admin']), deletePod);

router.post('/:namespace/:kind/:name/scale', rbac(['editor', 'admin']), scaleResource);
router.post('/:namespace/deployments/:name/scale', rbac(['editor', 'admin']), scaleDeployment);

// Generic delete (use resourceType, not kind)
router.delete('/:namespace/:resourceType/:name', rbac(['admin']), deleteResource);

// Secrets view
router.get('/:namespace/secrets/:name/view', rbac(['admin']), viewSecret);

// YAML edit/apply
router.put('/:namespace/:resourceType/:name/edit', rbac(['admin']), editYaml);

export default router;
