// src/services/clusterService.js
import { coreV1Api } from '../config/k8sClient.js';

/**
 * List all namespaces in the cluster
 */
export const listNamespaces = async () => {
  try {
    const res = await coreV1Api.listNamespace();
    return res.body.items.map(ns => ({
      name: ns.metadata?.name || 'unknown',
      status: ns.status?.phase || 'Unknown'
    }));
  } catch (err) {
    console.error('[ERROR] Failed to list namespaces:', err.message);
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
      name: node.metadata?.name || 'unknown',
      status: node.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady'
    }));
  } catch (err) {
    console.error('[ERROR] Failed to list nodes:', err.message);
    throw err;
  }
};
