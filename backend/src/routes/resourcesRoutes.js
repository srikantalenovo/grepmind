// src/routes/resourcesRoutes.js
import express from 'express';
import { listResources } from '../controllers/resourcesController.js';
import { rbac } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Read-only listing for viewer/editor/admin
router.get('/', rbac(['viewer', 'editor', 'admin']), listResources);

export default router;
