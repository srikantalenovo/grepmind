// src/routes/helmRoutes.js
import { Router } from 'express';
import { rbac } from '../middleware/rbacMiddleware.js';
import { audit } from '../middleware/audit.js';
import {
  listReleases,
  releaseStatus,
  releaseValues,
  installRelease,
  upgradeRelease,
  rollbackRelease,
  uninstallRelease,
  listRepos,
  addRepo,
  removeRepo
} from '../controllers/helmController.js';

const router = Router();

// Read
router.get('/releases', rbac(['viewer', 'editor', 'admin']), listReleases);
router.get('/releases/:namespace/:name/status', rbac(['viewer', 'editor', 'admin']), releaseStatus);
router.get('/releases/:namespace/:name/values', rbac(['viewer', 'editor', 'admin']), releaseValues);

// Write (editor/admin)
router.post('/install', rbac(['editor', 'admin']), audit('helmInstall'), installRelease);
router.post('/upgrade', rbac(['editor', 'admin']), audit('helmUpgrade'), upgradeRelease);
router.post('/rollback', rbac(['editor', 'admin']), audit('helmRollback'), rollbackRelease);

// Admin-only
router.post('/uninstall', rbac(['admin']), audit('helmUninstall'), uninstallRelease);
router.get('/repos', rbac(['admin']), listRepos);
router.post('/repos/add', rbac(['admin']), audit('helmRepoAdd'), addRepo);
router.post('/repos/remove', rbac(['admin']), audit('helmRepoRemove'), removeRepo);

export default router;
