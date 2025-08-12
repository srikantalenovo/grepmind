// routes/resourcesRoutes.js
import express from 'express';
import { listResources } from '../controllers/resourcesController.js';

const router = express.Router();

// No RBAC middleware — open access for now
router.get('/', listResources);

export default router;
