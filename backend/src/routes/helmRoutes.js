import express from 'express';
import { rbac } from '../middleware/rbacMiddleware.js';
import {
  getHelmReleases,
  getHelmReleaseDetails,
  upgradeHelmRelease,
  rollbackHelmRelease,
  deleteHelmRelease
} from '../controllers/helmController.js';

const router = express.Router();

router.get('/releases', rbac(['editor','admin']), getHelmReleases);
router.get('/releases/:namespace/:name', rbac(['editor','admin']), getHelmReleaseDetails);
router.post('/releases/:namespace/:name/upgrade', rbac(['admin']), upgradeHelmRelease);
router.post('/releases/:namespace/:name/rollback', rbac(['admin']), rollbackHelmRelease);
router.delete('/releases/:namespace/:name', rbac(['admin']), deleteHelmRelease);

export default router;
