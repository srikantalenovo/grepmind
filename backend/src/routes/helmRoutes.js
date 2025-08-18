// routes/helmRoutes.js
import express from 'express';
import {
  getHelmReleases,
  getHelmReleaseDetails,
  installHelmRelease,
  upgradeHelmRelease,
  uninstallHelmRelease
} from '../controllers/helmController.js';

const router = express.Router();

router.get('/releases', getHelmReleases);
router.get('/releases/:namespace/:release', getHelmReleaseDetails);
router.post('/releases/install', installHelmRelease);
router.post('/releases/upgrade', upgradeHelmRelease);
router.delete('/releases/:namespace/:release', uninstallHelmRelease);

export default router;
