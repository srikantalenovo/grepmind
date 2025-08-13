// src/services/resourceDetailsService.js
import { coreV1Api, appsV1Api, batchV1Api, networkingV1Api, customObjectsApi } from '../config/kube.js';

export const getResourceDetails = async (namespace, type, name) => {
  switch (type) {
    case 'pods':
      return (await coreV1Api.readNamespacedPod(name, namespace)).body;
    case 'services':
      return (await coreV1Api.readNamespacedService(name, namespace)).body;
    case 'configmaps':
      return (await coreV1Api.readNamespacedConfigMap(name, namespace)).body;
    case 'persistentvolumeclaims':
      return (await coreV1Api.readNamespacedPersistentVolumeClaim(name, namespace)).body;
    case 'deployments':
      return (await appsV1Api.readNamespacedDeployment(name, namespace)).body;
    case 'statefulsets':
      return (await appsV1Api.readNamespacedStatefulSet(name, namespace)).body;
    case 'daemonsets':
      return (await appsV1Api.readNamespacedDaemonSet(name, namespace)).body;
    case 'jobs':
      return (await batchV1Api.readNamespacedJob(name, namespace)).body;
    case 'cronjobs':
      return (await batchV1Api.readNamespacedCronJob(name, namespace)).body;
    case 'ingress':
      return (await networkingV1Api.readNamespacedIngress(name, namespace)).body;
    case 'sparkapplications':
      return (await customObjectsApi.getNamespacedCustomObject(
        'sparkoperator.k8s.io',
        'v1beta2',
        namespace,
        'sparkapplications',
        name
      )).body;
    default:
      throw new Error(`Unsupported resource type: ${type}`);
  }
};

export const getResourceEvents = async (namespace, name) => {
  const res = await coreV1Api.listNamespacedEvent(namespace);
  return res.body.items.filter(
    e => e.involvedObject?.name === name
  );
};

export const getResourceLogs = async (namespace, podName, container) => {
  const res = await coreV1Api.readNamespacedPodLog(
    podName,
    namespace,
    container
  );
  return res.body || '';
};
