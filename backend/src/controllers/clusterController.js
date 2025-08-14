// src/controllers/clusterController.js
import { coreV1Api } from '../config/k8sClient.js';

export const getNamespaces = async (_req, res) => {
  try {
    const result = await coreV1Api.listNamespace();
    const namespaces = result.body.items
      .map(ns => ns.metadata?.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    // Prepend "all" so UI has both
    res.json(['all', ...namespaces]);
  } catch (err) {
    console.error('[ERROR] Failed to fetch namespaces:', err);
    res.status(500).json({
      error: 'Failed to fetch namespaces',
      details: err.message || String(err),
    });
  }
};

export const getNodes = async (_req, res) => {
  try {
    const result = await coreV1Api.listNode();
    const nodes = result.body.items.map(node => {
      const name = node.metadata?.name || 'Unnamed';
      const creationTimestamp = node.metadata?.creationTimestamp;

      const addresses = node.status?.addresses || [];
      const internalIP = addresses.find(a => a.type === 'InternalIP')?.address || 'N/A';
      const externalIP = addresses.find(a => a.type === 'ExternalIP')?.address || 'N/A';
      const hostname = addresses.find(a => a.type === 'Hostname')?.address || 'N/A';

      const capacity = node.status?.capacity || {};
      const allocatable = node.status?.allocatable || {};

      const cpuCapacity = capacity.cpu || 'N/A';
      const cpuAllocatable = allocatable.cpu || 'N/A';
      const memCapacity = capacity.memory || 'N/A';
      const memAllocatable = allocatable.memory || 'N/A';

      const nodeInfo = node.status?.nodeInfo || {};
      const kubeletVersion = nodeInfo.kubeletVersion || 'Unknown';
      const osImage = nodeInfo.osImage || 'Unknown';
      const architecture = nodeInfo.architecture || 'Unknown';
      const containerRuntime = nodeInfo.containerRuntimeVersion || 'Unknown';

      const conditions = node.status?.conditions || [];
      const readyCondition = conditions.find(c => c.type === 'Ready');
      const status = readyCondition?.status === 'True' ? 'Ready' : 'NotReady';

      return {
        name,
        hostname,
        internalIP,
        externalIP,
        cpuCapacity,
        cpuAllocatable,
        memCapacity,
        memAllocatable,
        kubeletVersion,
        osImage,
        architecture,
        containerRuntime,
        status,
        age: getAge(creationTimestamp),
      };
    });

    res.json(nodes);
  } catch (err) {
    console.error('[ERROR] Failed to fetch nodes:', err);
    res.status(500).json({
      error: 'Failed to fetch nodes',
      details: err.message || String(err),
    });
  }
};

function getAge(creationTimestamp) {
  if (!creationTimestamp) return 'Unknown';
  const created = new Date(creationTimestamp);
  const diffMs = Date.now() - created.getTime();
  const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (d > 0) return `${d}d`;
  const h = Math.floor(diffMs / (1000 * 60 * 60));
  if (h > 0) return `${h}h`;
  const m = Math.floor(diffMs / (1000 * 60));
  return `${m}m`;
}

export const getNodeDetails = async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({ error: 'Node name is required' });
    }

    const result = await coreV1Api.readNode(name);
    const node = result.body;

    // Build a pod-like structure so the drawer doesn't break
    const details = {
      metadata: {
        name: node.metadata?.name || name,
        labels: node.metadata?.labels || {},
        annotations: node.metadata?.annotations || {},
        creationTimestamp: node.metadata?.creationTimestamp,
      },
      spec: {
        // Nodes don’t have containers, but we map allocatable/capacity
        taints: node.spec?.taints || [],
        podCIDR: node.spec?.podCIDR,
        providerID: node.spec?.providerID,
      },
      status: {
        conditions: node.status?.conditions || [],
        addresses: node.status?.addresses || [],
        capacity: node.status?.capacity || {},
        allocatable: node.status?.allocatable || {},
        nodeInfo: node.status?.nodeInfo || {},
      },
    };

    res.json(details);
  } catch (err) {
    console.error(`[ERROR] Failed to fetch node details for ${req.params.name}:`, err);
    res.status(500).json({
      error: `Failed to fetch node details for ${req.params.name}`,
      details: err.message || String(err),
    });
  }
};

export const getNodeLogs = async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({ error: 'Node name is required' });
    }

    // Note: Kubernetes doesn’t expose generic “node logs” directly.
    // This example assumes you want kubelet logs via node proxy.
    const kubeletLogs = await coreV1Api.connectGetNodeProxyWithPath(name, 'logs/kubelet.log');

    res.setHeader('Content-Type', 'text/plain');
    res.send(kubeletLogs.body);
  } catch (err) {
    console.error(`[ERROR] Failed to fetch logs for node ${req.params.name}:`, err);
    res.status(500).json({
      error: `Failed to fetch logs for node ${req.params.name}`,
      details: err.message || String(err),
    });
  }
};