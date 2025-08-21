// PATCH: Prometheus-enhanced endpoints additions
import { coreV1Api, appsV1Api, customObjectsApi, networkingV1Api } from '../config/k8sClient.js';
import jwt from 'jsonwebtoken';
import { promQuery, getPrometheusUrl } from '../utils/prometheusClient.js';

/** Return which data sources are active */
export const getAnalyticsDataSources = async (_req, res) => {
  const prom = await getPrometheusUrl();
  res.json({ k8s: true, prometheus: !!prom });
};

/** Network metrics via Prometheus if available; fallback to K8s topology */
export const getNetworkMetrics = async (req, res) => {
  try {
    const promUrl = await getPrometheusUrl();
    if (promUrl) {
      const rx = await promQuery('sum(rate(container_network_receive_bytes_total[5m]))');
      const tx = await promQuery('sum(rate(container_network_transmit_bytes_total[5m]))');
      // p95 latency example (if http metrics exist)
      const p95 = await promQuery('histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))');
      const rxVal = parseFloat(rx?.[0]?.value?.[1] || 0);
      const txVal = parseFloat(tx?.[0]?.value?.[1] || 0);
      const p95Val = parseFloat(p95?.[0]?.value?.[1] || 0);
      return res.json({
        source: 'prometheus',
        throughput: { rxBytesPerSec: rxVal, txBytesPerSec: txVal },
        latencyP95: p95Val
      });
    } else {
      // call existing getNetworkOverview
      const ns = req.query?.namespace;
      req.query = { namespace: ns || 'all' };
      const result = await new Promise((resolve) =>
        getNetworkOverview(req, { json: resolve, status: () => ({ json: resolve }) })
      );
      return res.json({ source: 'k8s', ...result });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
};

/** Filesystem IO via Prometheus (cAdvisor) */
export const getFilesystemMetrics = async (_req, res) => {
  try {
    const promUrl = await getPrometheusUrl();
    if (!promUrl) {
      return res.json({ source: 'k8s', filesystemIO: 'Not available without Prometheus' });
    }
    const read = await promQuery('sum(rate(container_fs_reads_bytes_total[5m]))');
    const write = await promQuery('sum(rate(container_fs_writes_bytes_total[5m]))');
    const readBps = parseFloat(read?.[0]?.value?.[1] || 0);
    const writeBps = parseFloat(write?.[0]?.value?.[1] || 0);
    res.json({ source: 'prometheus', filesystemIO: { readBps, writeBps } });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
};


/**
 * Parse Kubernetes resource quantity strings into numbers.
 * - CPU: returns cores (Number)
 * - Memory: returns bytes (Number)
 */
function parseQuantity(q) {
  if (!q && q !== 0) return 0;
  const s = String(q).trim();
  // CPU forms: "123456n", "250m", "1", "2"
  if (/^[0-9.]+n$/.test(s)) {
    const n = parseFloat(s.replace('n',''));
    return n / 1e9; // cores
  }
  if (/^[0-9.]+m$/.test(s)) {
    const m = parseFloat(s.replace('m',''));
    return m / 1000; // cores
  }
  if (/^[0-9.]+$/.test(s)) {
    return parseFloat(s); // cores if CPU, bytes if memory (best-effort)
  }
  // Memory forms: Ki, Mi, Gi, Ti (binary) or K, M, G (SI)
  const units = {
    Ki: 1024, Mi: 1024**2, Gi: 1024**3, Ti: 1024**4,
    K: 1000,  M: 1000**2,  G: 1000**3,  T: 1000**4,
  };
  const match = s.match(/^([0-9.]+)\s*([KMGTP]i?)$/i);
  if (match) {
    const val = parseFloat(match[1]);
    const unit = match[2];
    const mult = units[unit] || 1;
    return val * mult;
  }
  // Fallback: try float
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
}

function sum(arr) { return arr.reduce((a,b)=>a + (b || 0), 0); }

// -- Metrics helpers (metrics.k8s.io) --
async function listNodeMetrics() {
  try {
    const res = await customObjectsApi.listClusterCustomObject('metrics.k8s.io', 'v1beta1', 'nodes');
    // res.body.items[].usage.{cpu, memory}
    const items = res.body.items || [];
    return items.map(n => ({
      name: n.metadata?.name,
      cpuCores: parseQuantity(n.usage?.cpu),
      memoryBytes: parseQuantity(n.usage?.memory),
      timestamp: n.timestamp,
      window: n.window,
    }));
  } catch (err) {
    return { error: 'metrics_unavailable', detail: err.message || String(err) };
  }
}

async function listPodMetricsAllNs() {
  try {
    const res = await customObjectsApi.listClusterCustomObject('metrics.k8s.io', 'v1beta1', 'pods');
    // res.body.items[].containers[].usage
    const items = res.body.items || [];
    return items.map(p => {
      const containers = (p.containers || []).map(c => ({
        name: c.name,
        cpuCores: parseQuantity(c.usage?.cpu),
        memoryBytes: parseQuantity(c.usage?.memory),
      }));
      return {
        namespace: p.metadata?.namespace,
        name: p.metadata?.name,
        cpuCores: sum(containers.map(c => c.cpuCores)),
        memoryBytes: sum(containers.map(c => c.memoryBytes)),
        containers,
        timestamp: p.timestamp,
        window: p.window,
      };
    });
  } catch (err) {
    return { error: 'metrics_unavailable', detail: err.message || String(err) };
  }
}

// ---- Controllers ----

export const getClusterNodes = async (_req, res) => {
  try {
    // Node status (Ready/NotReady)
    const nodesRes = await coreV1Api.listNode();
    const nodeStatus = (nodesRes.body.items || []).map(node => ({
      name: node.metadata?.name,
      ready: node.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True',
      labels: node.metadata?.labels || {},
    }));
    const metrics = await listNodeMetrics();
    let metricsMap = new Map();
    if (!metrics.error) {
      metricsMap = new Map(metrics.map(m => [m.name, m]));
    }

    const nodes = nodeStatus.map(n => {
      const m = metricsMap.get(n.name);
      return {
        name: n.name,
        ready: n.ready,
        cpuCores: m?.cpuCores ?? null,
        memoryBytes: m?.memoryBytes ?? null,
        timestamp: m?.timestamp ?? null,
      };
    });

    const cluster = {
      nodeCount: nodes.length,
      readyCount: nodes.filter(n => n.ready).length,
      totalCpuCores: sum(nodes.map(n => n.cpuCores || 0)),
      totalMemoryBytes: sum(nodes.map(n => n.memoryBytes || 0)),
      metricsAvailable: !metrics.error,
    };

    res.json({ cluster, nodes });
  } catch (err) {
    console.error('[analytics] getClusterNodes failed:', err);
    res.status(500).json({ message: 'Failed to fetch cluster nodes', error: err.message || String(err) });
  }
};

export const getPodMetrics = async (req, res) => {
  try {
    const all = await listPodMetricsAllNs();
    if (all.error) return res.status(503).json(all);
    const { namespace } = req.query;
    const items = namespace && namespace !== 'all'
      ? all.filter(p => p.namespace === namespace)
      : all;
    res.json({ count: items.length, items });
  } catch (err) {
    console.error('[analytics] getPodMetrics failed:', err);
    res.status(500).json({ message: 'Failed to fetch pod metrics', error: err.message || String(err) });
  }
};

export const getDeploymentsStatus = async (req, res) => {
  try {
    const { namespace } = req.query;
    const listFn = namespace && namespace !== 'all'
      ? () => appsV1Api.listNamespacedDeployment(namespace)
      : () => appsV1Api.listDeploymentForAllNamespaces();

    const result = await listFn();
    const items = (result.body.items || []).map(d => ({
      namespace: d.metadata?.namespace,
      name: d.metadata?.name,
      replicas: d.spec?.replicas || 0,
      availableReplicas: d.status?.availableReplicas || 0,
      readyReplicas: d.status?.readyReplicas || 0,
      updatedReplicas: d.status?.updatedReplicas || 0,
      conditions: d.status?.conditions || [],
    }));
    res.json({ count: items.length, items });
  } catch (err) {
    console.error('[analytics] getDeploymentsStatus failed:', err);
    res.status(500).json({ message: 'Failed to fetch deployments', error: err.message || String(err) });
  }
};

export const getNetworkOverview = async (req, res) => {
  try {
    // Without Prometheus, provide NetworkPolicy/Service/Endpoint overview as a proxy.
    const { namespace } = req.query;
    const ns = namespace && namespace !== 'all' ? namespace : undefined;

    // Count services & network policies
    const servicesRes = ns
      ? await coreV1Api.listNamespacedService(ns)
      : await coreV1Api.listServiceForAllNamespaces();
    const policiesRes = ns
      ? await networkingV1Api.listNamespacedNetworkPolicy(ns)
      : await networkingV1Api.listNetworkPolicyForAllNamespaces();

    const services = (servicesRes.body.items || []).map(s => ({
      namespace: s.metadata?.namespace,
      name: s.metadata?.name,
      type: s.spec?.type,
      clusterIP: s.spec?.clusterIP,
      ports: s.spec?.ports || [],
    }));
    const policies = (policiesRes.body.items || []).map(p => ({
      namespace: p.metadata?.namespace,
      name: p.metadata?.name,
      podSelector: p.spec?.podSelector || {},
      policyTypes: p.spec?.policyTypes || [],
    }));

    res.json({
      metricsAvailable: false,
      summary: {
        totalServices: services.length,
        totalNetworkPolicies: policies.length,
      },
      services,
      policies,
      note: 'Network traffic/latency requires Prometheus/CNI metrics; showing topology objects instead.',
    });
  } catch (err) {
    console.error('[analytics] getNetworkOverview failed:', err);
    res.status(500).json({ message: 'Failed to fetch network overview', error: err.message || String(err) });
  }
};

// ---- SSE Stream ----
export const streamAnalytics = async (req, res) => {
  // Support token & role via query string for EventSource compatibility
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  const role = req.headers['x-user-role'] || req.query.role;

  if (!token) {
    res.status(401).json({ message: 'Missing token' });
    return;
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    res.status(403).json({ message: 'Invalid token' });
    return;
  }
  if (!['editor','admin','viewer'].includes(role)) {
    res.status(403).json({ message: 'Forbidden: invalid role' });
    return;
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let closed = false;
  req.on('close', () => { closed = true; });

  async function push() {
    try {
      const nodesRes = await getClusterNodes(req, { json: (d)=>d, status: () => ({ json: (d)=>d }) });
      const pods = await listPodMetricsAllNs();
      const topPods = Array.isArray(pods) ? pods
        .filter(Boolean)
        .sort((a,b)=> (b.cpuCores||0) - (a.cpuCores||0))
        .slice(0, 10) : [];

      const payload = {
        ts: Date.now(),
        cluster: nodesRes?.cluster || null,
        nodes: nodesRes?.nodes || [],
        topPods,
      };
      res.write(`event: metrics\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: 'stream error', error: err.message || String(err) })}\n\n`);
    }
  }

  // Initial push and interval
  await push();
  const id = setInterval(() => { if (!closed) push(); else clearInterval(id); }, 5000);
};


/* -------------------- DASHBOARDS -------------------- */

// GET all dashboards with panels
export const getDashboards = async (req, res) => {
  try {
    const dashboards = await prisma.dashboard.findMany({
      include: { panels: true },
    });
    res.json(dashboards);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dashboards", details: err.message });
  }
};

// CREATE dashboard
export const createDashboard = async (req, res) => {
  try {
    const { name, description } = req.body;
    const dashboard = await prisma.dashboard.create({
      data: { name, description },
    });
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: "Failed to create dashboard", details: err.message });
  }
};

// UPDATE dashboard
export const updateDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const updated = await prisma.dashboard.update({
      where: { id: parseInt(id) },
      data: { name, description },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update dashboard", details: err.message });
  }
};

// DELETE dashboard
export const deleteDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.dashboard.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Dashboard deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete dashboard", details: err.message });
  }
};

/* -------------------- PANELS -------------------- */

// GET panels for a dashboard
export const getPanels = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const panels = await prisma.panel.findMany({
      where: { dashboardId: parseInt(dashboardId) },
    });
    res.json(panels);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch panels", details: err.message });
  }
};

// CREATE panel in a dashboard
export const createPanel = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const { title, promql, chartType, thresholds } = req.body;

    const panel = await prisma.panel.create({
      data: {
        title,
        promql,
        chartType,
        thresholds,
        dashboardId: parseInt(dashboardId),
      },
    });

    res.json(panel);
  } catch (err) {
    res.status(500).json({ error: "Failed to create panel", details: err.message });
  }
};

// UPDATE panel
export const updatePanel = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, promql, chartType, thresholds } = req.body;

    const updated = await prisma.panel.update({
      where: { id: parseInt(id) },
      data: { title, promql, chartType, thresholds },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update panel", details: err.message });
  }
};

// DELETE panel
export const deletePanel = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.panel.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Panel deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete panel", details: err.message });
  }
};