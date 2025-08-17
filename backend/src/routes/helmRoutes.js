// src/routes/helmRoutes.js
import express from 'express';
import { rbac } from '../middleware/rbacMiddleware.js';
import {
  getHelmReleases,
  getHelmReleaseYaml,
  upgradeHelmRelease,
  rollbackHelmRelease,
  deleteHelmRelease,
  getHelmReleaseStatus,
  editHelmValues,
} from '../controllers/helmController.js';

const router = express.Router();

// Fetch all releases in a namespace, with optional search
router.get('/:namespace/releases', rbac(['viewer', 'editor', 'admin']), getHelmReleases);

// Fetch YAML of a release
router.get('/:namespace/:releaseName/yaml', rbac(['editor', 'admin']), getHelmReleaseYaml);

// Upgrade release
router.post('/:namespace/:releaseName/upgrade', rbac(['editor', 'admin']), upgradeHelmRelease);

// Rollback release
router.post('/:namespace/:releaseName/rollback', rbac(['editor', 'admin']), rollbackHelmRelease);

// Delete release
router.delete('/:namespace/:releaseName', rbac(['admin']), deleteHelmRelease);

// Get release status (healthy/pods)
router.get('/:namespace/:releaseName/status', rbac(['viewer', 'editor', 'admin']), getHelmReleaseStatus);

// Edit values.yaml
router.put('/:namespace/:releaseName/values', rbac(['editor', 'admin']), editHelmValues);

export default router;
