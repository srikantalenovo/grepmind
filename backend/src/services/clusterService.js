// src/services/clusterService.js
import { coreV1Api } from '../config/k8sClient.js';

/**
 * List all namespaces in the cluster
 */
export const listNamespaces = async () => {
  try {
    const res = await coreV1Api.listNamespace();
    return res.body.items.map(ns => ({
      name: ns.metadata?.name || 'Unnamed',
      status: ns.status?.phase || 'Unknown',
      age: getAge(ns.metadata?.creationTimestamp),
    }));
  } catch (err) {
    console.error(`[ERROR] Failed to list namespaces: ${err.message}`);
    throw err;
  }
};

/**
 * List all nodes in the cluster
 */
export const listNodes = async () => {
  try {
    const res = await coreV1Api.listNode();
    return res.body.items.map(node => ({
      name: node.metadata?.name || 'Unnamed',
      status: getNodeStatus(node),
      age: getAge(node.metadata?.creationTimestamp),
      roles: getNodeRoles(node),
      version: node.status?.nodeInfo?.kubeletVersion || 'Unknown',
    }));
  } catch (err) {
    console.error(`[ERROR] Failed to list nodes: ${err.message}`);
    throw err;
  }
};

/**
 * Determine node roles
 */
function getNodeRoles(node) {
  const labels = node.metadata?.labels || {};
  return Object.keys(labels)
    .filter(label => label.startsWith('node-role.kubernetes.io/'))
    .map(label => label.replace('node-role.kubernetes.io/', ''))
    .join(', ') || 'worker';
}

/**
 * Determine node status
 */
function getNodeStatus(node) {
  const conditions = node.status?.conditions || [];
  const readyCondition = conditions.find(c => c.type === 'Ready');
  return readyCondition?.status === 'True' ? 'Ready' : 'NotReady';
}

/**
 * Calculate age from creation timestamp
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
