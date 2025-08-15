import { Router } from 'express';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { audit } from '../middleware/audit.js';
import {
  listNamespaces,
  listPods,
  listDeployments,
  listServices,
  problemScan,
  restartResource,
  scaleDeployment,
  deleteResource,
  getYaml,
  putYaml
} from '../controllers/analyzerController.js';

const router = Router();

// Read-only (viewer+)
router.get('/namespaces', requireRole(['viewer','editor','admin']), listNamespaces);
router.get('/pods',        requireRole(['viewer','editor','admin']), listPods);
router.get('/deployments', requireRole(['viewer','editor','admin']), listDeployments);
router.get('/services',    requireRole(['viewer','editor','admin']), listServices);
router.get('/problems',    requireRole(['viewer','editor','admin']), problemScan);

// Actions (editor+)
router.post('/restart', requireRole(['editor','admin']), audit('restart'), restartResource);
router.post('/scale',   requireRole(['editor','admin']), audit('scale'),   scaleDeployment);
router.delete('/resource', requireRole(['editor','admin']), audit('delete'), deleteResource);

// YAML (editor+ for replace, viewer+ for get)
router.get('/resource/:type/:namespace/:name/yaml', requireRole(['viewer','editor','admin']), getYaml);
router.put('/resource/:type/:namespace/:name/yaml', requireRole(['editor','admin']), audit('yaml.replace'), putYaml);

export default router;
