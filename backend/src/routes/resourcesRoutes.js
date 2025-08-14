// // src/routes/resourcesRoutes.js
// import express from 'express';
// import { listResources } from '../controllers/resourcesController.js';
// import { rbac } from '../middleware/rbacMiddleware.js';

// const router = express.Router();

// // Read-only listing for viewer/editor/admin
// router.get('/', rbac(['viewer', 'editor', 'admin']), listResources);

// export default router;



// src/routes/resourcesRoutes.js
import express from 'express';
import { listResources } from '../controllers/resourcesController.js';
import {
  getResourceDetails,
  getResourceYaml,
  getResourceEvents,
  getPodLogs,
  getNodeKubeletLogs
} from '../controllers/resourceDetailsController.js';
import { rbac } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// ---------------------
// Existing Endpoint
// ---------------------
router.get('/', rbac(['viewer', 'editor', 'admin']), listResources);

// ---------------------
// New Resource Details Endpoints
// ---------------------

// Get overview details for a specific resource
router.get(
  '/:namespace/:resourceType/:name/details',
  rbac(['viewer', 'editor', 'admin']),
  getResourceDetails
);

// Get YAML for a specific resource
router.get(
  '/:namespace/:resourceType/:name/yaml',
  rbac(['viewer', 'editor', 'admin']),
  getResourceYaml
);

// Get events for a specific resource (namespace + name)
router.get(
  '/:namespace/:name/events',
  rbac(['viewer', 'editor', 'admin']),
  getResourceEvents
);

// Get logs for a specific pod/container
router.get(
  '/:namespace/:podName/:container/logs',
  rbac(['viewer', 'editor', 'admin']),
  getPodLogs
);

// Get logs for a specific pod/
router.get(
  '/:namespace/:podName/logs',
  rbac(['viewer', 'editor', 'admin']),
  getPodLogs
);

// Get logs for a specific pod/
router.get(
  '/nodes/:nodeName/logs/kubelet',
  rbac(['viewer', 'editor', 'admin']),
  getNodeKubeletLogs
);

export default router;
