// services/clusterService.js
import { k8sCoreV1Api } from '../config/k8sClient.js';

export async function listNamespaces() {
  const res = await k8sCoreV1Api.listNamespace();
  return res.body.items.map(ns => ({
    name: ns.metadata.name,
    status: ns.status?.phase || 'Unknown',
  }));
}

export async function listNodes() {
  const res = await k8sCoreV1Api.listNode();
  return res.body.items.map(node => ({
    name: node.metadata.name,
    status: node.status.conditions?.find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
    roles: node.metadata.labels?.['kubernetes.io/role'] || 'worker',
    kubeletVersion: node.status.nodeInfo?.kubeletVersion || 'unknown',
  }));
}
