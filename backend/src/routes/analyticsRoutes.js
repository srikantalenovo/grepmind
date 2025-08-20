// PATCH: add data-sources, network-metrics, filesystem-metrics
// src/routes/analyticsRoutes.js
import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { 
  getAnalyticsDataSources,
  getNetworkMetrics, 
  getFilesystemMetrics,
  getClusterNodes,
  getPodMetrics,
  getDeploymentsStatus,
  getNetworkOverview,
  streamAnalytics   
} from '../controllers/analyticsController.js';

const router = express.Router();

// Cluster & node metrics
router.get('/cluster/nodes', authenticate, rbac(['editor','admin']), getClusterNodes);

// Pod metrics (optionally filter by ?namespace=ns)
router.get('/cluster/pods', authenticate, rbac(['editor','admin']), getPodMetrics);

// Deployments status (optionally filter by ?namespace=ns)
router.get('/cluster/deployments', authenticate, rbac(['editor','admin']), getDeploymentsStatus);

// Network objects overview (Services, NetworkPolicies)
router.get('/cluster/network', authenticate, rbac(['editor','admin']), getNetworkOverview);

// Real-time SSE stream (token/role supported via query for EventSource)
router.get('/stream', streamAnalytics);

router.get('/data-sources', authenticate, rbac(['viewer','editor','admin']), getAnalyticsDataSources);
router.get('/network-metrics', authenticate, rbac(['editor','admin']), getNetworkMetrics);
router.get('/filesystem-metrics', authenticate, rbac(['editor','admin']), getFilesystemMetrics);

export default router;


