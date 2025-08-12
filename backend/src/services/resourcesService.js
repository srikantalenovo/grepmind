// services/resourcesService.js
import {
  k8sApi, appsApi, batchApi, batchBetaApi, networkingApi, customObjectsApi,
  helmList
} from '../config/k8sClient.js';

export const getPods = (namespace) => k8sApi.listNamespacedPod(namespace);
export const getDeployments = (namespace) => appsApi.listNamespacedDeployment(namespace);
export const getServices = (namespace) => k8sApi.listNamespacedService(namespace);
export const getStatefulSets = (namespace) => appsApi.listNamespacedStatefulSet(namespace);
export const getDaemonSets = (namespace) => appsApi.listNamespacedDaemonSet(namespace);
export const getJobs = (namespace) => batchApi.listNamespacedJob(namespace);
export const getCronJobs = (namespace) => batchBetaApi.listNamespacedCronJob(namespace);
export const getConfigMaps = (namespace) => k8sApi.listNamespacedConfigMap(namespace);
export const getPVCs = (namespace) => k8sApi.listNamespacedPersistentVolumeClaim(namespace);
export const getIngress = (namespace) => networkingApi.listNamespacedIngress(namespace);
export const getHelmReleases = (namespace) => helmList(namespace);

// SparkApplications (CustomResource)
export const getSparkApps = async (namespace) => {
  return customObjectsApi.listNamespacedCustomObject(
    'sparkoperator.k8s.io', 'v1beta2', namespace, 'sparkapplications'
  );
};
