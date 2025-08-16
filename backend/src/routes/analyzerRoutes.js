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
} from '../controllers/analyzerController.js'; //  analyzerScan, removed from list

const router = express.Router();

// Scan endpoint (Viewer+)
router.get('/scan', rbac(['editor', 'admin']), analyzerScan);

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


// router.get('/scan', rbac('viewer'), async (req, res) => {
//   try {
//     const { namespace, resourceType, search, problemsOnly } = req.query;

//     const items = await scanResources({
//       namespace: namespace || 'all',
//       resourceType: resourceType || 'all',
//       search: search || '',
//       problemsOnly: problemsOnly === 'true',
//     });

//     res.json(items);
//   } catch (err) {
//     console.error('[ERROR] analyzer scan failed', err);
//     res.status(500).json({ error: err.message });
//   }
// });

export default router;

