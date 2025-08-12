// src/services/resourcesService.js
import {
  coreV1Api,
  appsV1Api,
  batchV1Api,
  networkingV1Api,
  customObjectsApi,
} from '../config/k8sClient.js';

/**
 * Get Kubernetes resources by type, cluster namespace, and optional search term.
 * @param {string} namespace - Namespace to filter resources.
 * @param {string} resourceType - Type of Kubernetes resource.
 * @param {string} search - Optional search term to filter resource names.
 */
export const getResources = async (namespace, resourceType, search) => {
  let items = [];

  try {
    switch (resourceType) {
      case 'pods':
        items = (await coreV1Api.listNamespacedPod(namespace)).body.items;
        break;

      case 'deployments':
        items = (await appsV1Api.listNamespacedDeployment(namespace)).body.items;
        break;

      case 'services':
        items = (await coreV1Api.listNamespacedService(namespace)).body.items;
        break;

      case 'statefulsets':
        items = (await appsV1Api.listNamespacedStatefulSet(namespace)).body.items;
        break;

      case 'daemonsets':
        items = (await appsV1Api.listNamespacedDaemonSet(namespace)).body.items;
        break;

      case 'jobs':
        items = (await batchV1Api.listNamespacedJob(namespace)).body.items;
        break;

      case 'cronjobs':
        items = (await batchV1Api.listNamespacedCronJob(namespace)).body.items;
        break;

      case 'configmaps':
        items = (await coreV1Api.listNamespacedConfigMap(namespace)).body.items;
        break;

      case 'persistentvolumeclaims':
        items = (await coreV1Api.listNamespacedPersistentVolumeClaim(namespace)).body.items;
        break;

      case 'ingress':
        items = (await networkingV1Api.listNamespacedIngress(namespace)).body.items;
        break;

      case 'helmreleases':
        // Helm releases via Helm SDK are not in Kubernetes API directly — stored as secrets/configmaps in kube-system
        const secrets = (await coreV1Api.listNamespacedSecret(namespace)).body.items;
        items = secrets.filter(s => s.metadata?.labels?.owner === 'helm');
        break;

      case 'sparkapplications':
        // SparkApplications are a CRD
        items = (await customObjectsApi.listNamespacedCustomObject(
          'sparkoperator.k8s.io',
          'v1beta2',
          namespace,
          'sparkapplications'
        )).body.items;
        break;

      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }

    // Optional search filter
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
    console.error(`[ERROR] Failed to fetch ${resourceType} in ${namespace}:`, err.message);
    throw err;
  }
};

/**
 * Determine resource status for badge coloring.
 */
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
