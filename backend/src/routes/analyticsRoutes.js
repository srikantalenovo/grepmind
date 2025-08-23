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
  streamAnalytics,
  getDashboards,
  createDashboard,
  updateDashboard,
  deleteDashboard, listDataSources, upsertPrometheus, queryPromQL,
  getPanels,
  createPanel, addPanel,
  updatePanel,
  deletePanel,       
} from '../controllers/analyticsController.js';

const router = express.Router();

// All routes use JWT
router.use(authenticate);

// // Cluster & node metrics
 router.get('/cluster/nodes', authenticate, rbac(['editor','admin']), getClusterNodes);

// // Pod metrics (optionally filter by ?namespace=ns)
 router.get('/cluster/pods', authenticate, rbac(['editor','admin']), getPodMetrics);

// // Deployments status (optionally filter by ?namespace=ns)
 router.get('/cluster/deployments', authenticate, rbac(['editor','admin']), getDeploymentsStatus);

// // Network objects overview (Services, NetworkPolicies)
 router.get('/cluster/network', authenticate, rbac(['editor','admin']), getNetworkOverview);

// // Real-time SSE stream (token/role supported via query for EventSource)
 router.get('/stream', streamAnalytics);

 router.get('/data-sources', authenticate, rbac(['viewer','editor','admin']), getAnalyticsDataSources);
 router.get('/network-metrics', authenticate, rbac(['editor','admin']), getNetworkMetrics);
 router.get('/filesystem-metrics', authenticate, rbac(['editor','admin']), getFilesystemMetrics);


// router.get("/dashboards", rbac(["admin", "editor", "viewer"]), getDashboards);
// router.post("/dashboards", rbac(["admin", "editor"]), createDashboard);
// router.put("/dashboards/:id", rbac(["admin", "editor"]), updateDashboard);
// router.delete("/dashboards/:id", rbac(["admin"]), deleteDashboard);

// /* PANELS (scoped under dashboards) */
 router.get("/dashboards/:dashboardId/panels", rbac(["admin", "editor", "viewer"]), getPanels);
// router.post("/dashboards/:dashboardId/panels", rbac(["admin", "editor"]), createPanel);

// /* PANELS (single operations by ID) */
// router.put("/panels/:id", rbac(["admin", "editor"]), updatePanel);
// router.delete("/panels/:id", rbac(["admin"]), deletePanel);

/** DataSource management (keeps your existing front-end expectations) */
router.get('/datasources', rbac(['admin','editor','viewer']), listDataSources);
router.post('/datasources/prometheus', rbac(['admin']), upsertPrometheus);

/** PromQL validation / explorer */
router.post('/analytics/query', rbac(['admin','editor','viewer']), queryPromQL);

/** Dashboards */
router.get('/dashboards', rbac(['admin','editor','viewer']), getDashboards);
router.post('/dashboards', rbac(['admin','editor']), createDashboard);
router.put('/dashboards/:id', rbac(['admin','editor']), updateDashboard);
router.delete('/dashboards/:id', rbac(['admin']), deleteDashboard);

/** Panels */
router.post('/dashboards/:id/panels', rbac(['admin','editor']), addPanel);
router.put('/panels/:id', rbac(['admin','editor']), updatePanel);
router.delete('/panels/:id', rbac(['admin']), deletePanel);

export default router;


