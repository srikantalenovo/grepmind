// routes/resourcesRoutes.js
import express from 'express';
import { listResources } from '../controllers/resourcesController.js';
import { rbac } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.get('/',
  rbac(['viewer', 'editor', 'admin']), // Read-only for all roles
  listResources
);

export default router;
