import { Router } from 'express';
import { audit } from '../middleware/audit.js';
import {
  scanProblems,
  restartPod,
  scaleWorkload,
  applyManifest,
  deleteResource,
  viewSecret,
  editYaml
} from '../controllers/analyzerController.js';
import { rbac } from '../middleware/rbacMiddleware.js';

const router = Router();

// Read
router.get('/problems', rbac(['viewer', 'editor', 'admin']), scanProblems);
router.get('/secrets/:namespace/:name', rbac(['admin']), viewSecret);

// Write (editor/admin) + audit
router.post('/restart', rbac(['editor', 'admin']), audit('restartPod'), restartPod);
router.post('/scale', rbac(['editor', 'admin']), audit('scaleWorkload'), scaleWorkload);
router.post('/apply', rbac(['editor', 'admin']), audit('applyManifest'), applyManifest);
router.delete('/resource', rbac(['admin']), audit('deleteResource'), deleteResource);
router.put('/edit-yaml', rbac(['admin']), audit('editYaml'), editYaml);

export default router;
