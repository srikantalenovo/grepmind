// src/services/resourcesService.js
import {
  coreV1Api,
  appsV1Api,
  batchV1Api,
  networkingV1Api,
  customObjectsApi
} from '../config/k8sClient.js';

// Handlers for per-namespace vs all-namespaces
const resourceHandlers = {
  pods: {
    ns: (ns) => coreV1Api.listNamespacedPod(ns),
    all: () => coreV1Api.listPodForAllNamespaces(),
  },
  services: {
    ns: (ns) => coreV1Api.listNamespacedService(ns),
    all: () => coreV1Api.listServiceForAllNamespaces(),
  },
  configmaps: {
    ns: (ns) => coreV1Api.listNamespacedConfigMap(ns),
    all: () => coreV1Api.listConfigMapForAllNamespaces(),
  },
  persistentvolumeclaims: {
    ns: (ns) => coreV1Api.listNamespacedPersistentVolumeClaim(ns),
    all: () => coreV1Api.listPersistentVolumeClaimForAllNamespaces(),
  },
  deployments: {
    ns: (ns) => appsV1Api.listNamespacedDeployment(ns),
    all: () => appsV1Api.listDeploymentForAllNamespaces(),
  },
  statefulsets: {
    ns: (ns) => appsV1Api.listNamespacedStatefulSet(ns),
    all: () => appsV1Api.listStatefulSetForAllNamespaces(),
  },
  daemonsets: {
    ns: (ns) => appsV1Api.listNamespacedDaemonSet(ns),
    all: () => appsV1Api.listDaemonSetForAllNamespaces(),
  },
  jobs: {
    ns: (ns) => batchV1Api.listNamespacedJob(ns),
    all: () => batchV1Api.listJobForAllNamespaces(),
  },
  cronjobs: {
    ns: (ns) => batchV1Api.listNamespacedCronJob(ns),
    all: () => batchV1Api.listCronJobForAllNamespaces(),
  },
  ingress: {
    ns: (ns) => networkingV1Api.listNamespacedIngress(ns),
    all: () => networkingV1Api.listIngressForAllNamespaces(),
  },
  helmreleases: {
    // Helm stores release metadata in Secrets OR ConfigMaps with label: owner=helm
    ns: async (ns) => {
      const [sec, cm] = await Promise.all([
        coreV1Api.listNamespacedSecret(ns),
        coreV1Api.listNamespacedConfigMap(ns),
      ]);
      const items = [
        ...(sec.body.items || []),
        ...(cm.body.items || []),
      ].filter(x => x.metadata?.labels?.owner === 'helm');
      return { body: { items } };
    },
    all: async () => {
      const [sec, cm] = await Promise.all([
        coreV1Api.listSecretForAllNamespaces(),
        coreV1Api.listConfigMapForAllNamespaces(),
      ]);
      const items = [
        ...(sec.body.items || []),
        ...(cm.body.items || []),
      ].filter(x => x.metadata?.labels?.owner === 'helm');
      return { body: { items } };
    },
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
      const nsList = await coreV1Api.listNamespace();
      const namespaces = nsList.body.items.map(n => n.metadata.name);
      let allItems = [];
      for (const ns of namespaces) {
        try {
          const res = await customObjectsApi.listNamespacedCustomObject(
            'sparkoperator.k8s.io',
            'v1beta2',
            ns,
            'sparkapplications'
          );
          allItems = allItems.concat(res.body.items || []);
        } catch (e) {
          // If CRD not installed in some namespaces, ignore those errors
          console.warn(`[WARN] SparkApplications not available in ns=${ns}:`, e?.body?.message || e.message);
        }
      }
      return { body: { items: allItems } };
    },
  },
};

export const getResources = async (namespace, resourceType, search) => {
  const handler = resourceHandlers[resourceType];
  if (!handler) {
    throw new Error(`Unsupported resource type: ${resourceType}`);
  }

  const isAll = (namespace ?? '').toLowerCase() === 'all';
  const res = isAll ? await handler.all() : await handler.ns(namespace);
  let items = res.body.items || [];

  // Some CRDs (customObjectsApi) return { items } differently; normalize if needed
  if (!Array.isArray(items) && res.body?.items) items = res.body.items;

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
    // Read-only types we mark as "Running" if present
    case 'services':
    case 'configmaps':
    case 'persistentvolumeclaims':
    case 'ingress':
    case 'helmreleases':
    case 'sparkapplications':
      return 'Running';
    default:
      return 'Unknown';
  }
}

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
