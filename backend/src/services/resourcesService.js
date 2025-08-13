// src/services/resourcesService.js
import {
  coreV1Api,
  appsV1Api,
  batchV1Api,
  networkingV1Api,
  customObjectsApi
} from '../config/k8sClient.js';

const resourceHandlers = {
  pods: {
    ns: (ns) => coreV1Api.listNamespacedPod(ns),
    all: () => coreV1Api.listPodForAllNamespaces()
  },
  services: {
    ns: (ns) => coreV1Api.listNamespacedService(ns),
    all: () => coreV1Api.listServiceForAllNamespaces()
  },
  configmaps: {
    ns: (ns) => coreV1Api.listNamespacedConfigMap(ns),
    all: () => coreV1Api.listConfigMapForAllNamespaces()
  },
  persistentvolumeclaims: {
    ns: (ns) => coreV1Api.listNamespacedPersistentVolumeClaim(ns),
    all: () => coreV1Api.listPersistentVolumeClaimForAllNamespaces()
  },
  deployments: {
    ns: (ns) => appsV1Api.listNamespacedDeployment(ns),
    all: () => appsV1Api.listDeploymentForAllNamespaces()
  },
  statefulsets: {
    ns: (ns) => appsV1Api.listNamespacedStatefulSet(ns),
    all: () => appsV1Api.listStatefulSetForAllNamespaces()
  },
  daemonsets: {
    ns: (ns) => appsV1Api.listNamespacedDaemonSet(ns),
    all: () => appsV1Api.listDaemonSetForAllNamespaces()
  },
  jobs: {
    ns: (ns) => batchV1Api.listNamespacedJob(ns),
    all: () => batchV1Api.listJobForAllNamespaces()
  },
  cronjobs: {
    ns: (ns) => batchV1Api.listNamespacedCronJob(ns),
    all: () => batchV1Api.listCronJobForAllNamespaces()
  },
  ingress: {
    ns: (ns) => networkingV1Api.listNamespacedIngress(ns),
    all: () => networkingV1Api.listIngressForAllNamespaces()
  },
  sparkapplications: {
    ns: (ns) =>
      customObjectsApi.listNamespacedCustomObject(
        'sparkoperator.k8s.io',
        'v1beta2',
        ns,
        'sparkapplications'
      ),
    all: async () => {
      const namespaces = (await coreV1Api.listNamespace()).body.items.map(ns => ns.metadata.name);
      let allItems = [];
      for (const ns of namespaces) {
        const res = await customObjectsApi.listNamespacedCustomObject(
          'sparkoperator.k8s.io',
          'v1beta2',
          ns,
          'sparkapplications'
        );
        allItems = allItems.concat(res.body.items || []);
      }
      return { body: { items: allItems } };
    }
  }
};

export const getResources = async (namespace, resourceType, search) => {
  try {
    const handler = resourceHandlers[resourceType];
    if (!handler) {
      throw new Error(`Unsupported resource type: ${resourceType}`);
    }

    const isAll = namespace?.toLowerCase() === 'all';
    const res = isAll
      ? await handler.all()
      : await handler.ns(namespace);

    let items = res.body.items || [];

    if (search) {
      items = items.filter(item =>
        item.metadata?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return items.map(item => ({
      name: item.metadata?.name || 'Unnamed',
      namespace: item.metadata?.namespace || (isAll ? 'unknown' : namespace),
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
    case 'pods':
      return item.status?.phase || 'Unknown';
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
