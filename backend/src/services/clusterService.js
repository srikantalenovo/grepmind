// src/services/clusterService.js
import { coreV1Api } from '../config/k8sClient.js';

/**
 * Get all namespaces in the cluster
 */
export const getNamespaces = async () => {
  try {
    const res = await coreV1Api.listNamespace();
    return res.body.items.map(ns => ({
      name: ns.metadata?.name || 'Unnamed',
      status: ns.status?.phase || 'Unknown',
      age: getAge(ns.metadata?.creationTimestamp)
    }));
  } catch (err) {
    console.error(`[ERROR] Failed to fetch namespaces:`, err.message);
    throw err;
  }
};

/**
 * Get all nodes in the cluster
 */
export const getNodes = async () => {
  try {
    const res = await coreV1Api.listNode();
    return res.body.items.map(node => ({
      name: node.metadata?.name || 'Unnamed',
      status: getNodeStatus(node),
      age: getAge(node.metadata?.creationTimestamp)
    }));
  } catch (err) {
    console.error(`[ERROR] Failed to fetch nodes:`, err.message);
    throw err;
  }
};

/**
 * Determine node readiness status
 */
function getNodeStatus(node) {
  const readyCondition = node.status?.conditions?.find(c => c.type === 'Ready');
  return readyCondition?.status === 'True' ? 'Ready' : 'NotReady';
}

/**
 * Convert creationTimestamp to "age" string.
 */
function getAge(creationTimestamp) {
  if (!creationTimestamp) return 'Unknown';
  const created = new Date(creationTimestamp);
  const diffMs = Date.now() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 0) return `${diffDays}d`;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHrs > 0) return `${diffHrs}h`;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  return `${diffMin}m`;
}
