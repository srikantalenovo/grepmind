import { Router } from 'express';
import { problemScan } from '../controllers/analyzerController.js';
import rbac from '../middleware/rbac.js';

const router = Router();

// Scan cluster for unhealthy resources (viewer/editor/admin)
router.get('/scan', rbac(['viewer', 'editor', 'admin']), problemScan);

export default router;
