// src/services/resourcesService.js
import {
  coreV1Api,
  appsV1Api,
  batchV1Api,
  networkingV1Api,
  customObjectsApi
} from '../config/k8sClient.js';

const resourceHandlers = {
  pods: (ns) => coreV1Api.listNamespacedPod(ns),
  services: (ns) => coreV1Api.listNamespacedService(ns),
  configmaps: (ns) => coreV1Api.listNamespacedConfigMap(ns),
  persistentvolumeclaims: (ns) => coreV1Api.listNamespacedPersistentVolumeClaim(ns),

  deployments: (ns) => appsV1Api.listNamespacedDeployment(ns),
  statefulsets: (ns) => appsV1Api.listNamespacedStatefulSet(ns),
  daemonsets: (ns) => appsV1Api.listNamespacedDaemonSet(ns),

  jobs: (ns) => batchV1Api.listNamespacedJob(ns),
  cronjobs: (ns) => batchV1Api.listNamespacedCronJob(ns),

  ingress: (ns) => networkingV1Api.listNamespacedIngress(ns),

  sparkapplications: (ns) =>
    customObjectsApi.listNamespacedCustomObject(
      'sparkoperator.k8s.io',
      'v1beta2',
      ns,
      'sparkapplications'
    ),
};

export const getResources = async (namespace, resourceType, search) => {
  try {
    if (!resourceHandlers[resourceType]) {
      throw new Error(`Unsupported resource type: ${resourceType}`);
    }

    const res = await resourceHandlers[resourceType](namespace);
    let items = res.body.items || [];

    if (search) {
      items = items.filter(item =>
        item.metadata?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return items.map(item => ({
      name: item.metadata?.name || 'Unnamed',
      namespace: item.metadata?.namespace || namespace,
      status: getResourceStatus(resourceType, item),
      age: getAge(item.metadata?.creationTimestamp),
    }));
  } catch (err) {
    console.error(`[ERROR] Failed to fetch ${resourceType} in ${namespace}: ${err.message}`);
    throw err;
  }
};

function getResourceStatus(resourceType, item) {
  switch (resourceType) {
    case 'pods': return item.status?.phase || 'Unknown';
    case 'deployments':
    case 'statefulsets':
    case 'daemonsets':
      return item.status?.availableReplicas > 0 ? 'Running' : 'Pending';
    case 'jobs':
    case 'cronjobs':
      return item.status?.succeeded > 0 ? 'Succeeded' : 'Running';
    default:
      return 'Running';
  }
}

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
