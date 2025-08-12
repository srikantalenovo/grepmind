// src/config/k8sClient.js
import k8s from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();

/**
 * Load Kubernetes configuration (in-cluster first, fallback to local kubeconfig)
 */
function loadK8sConfig() {
  try {
    console.log(`[INFO] ${new Date().toISOString()} - 🔍 Attempting to load Kubernetes config from in-cluster environment...`);
    kc.loadFromCluster();
    console.log(`[INFO] ${new Date().toISOString()} - ✅ Successfully loaded in-cluster configuration.`);
  } catch (err) {
    console.log(`[WARN] ${new Date().toISOString()} - ⚠️ In-cluster config failed: ${err.message}`);
    console.log(`[INFO] ${new Date().toISOString()} - 🔍 Attempting to load Kubernetes config from default kubeconfig...`);
    kc.loadFromDefault();
    console.log(`[INFO] ${new Date().toISOString()} - ✅ Successfully loaded kubeconfig from default location.`);
  }

  const cluster = kc.getCurrentCluster();
  if (cluster) {
    console.log(`[INFO] ${new Date().toISOString()} - 🌐 Connected to cluster API server: ${cluster.server}`);
  } else {
    console.error(`[ERROR] ${new Date().toISOString()} - ❌ No active cluster configuration found.`);
    process.exit(1);
  }
}

loadK8sConfig();

/**
 * Export Kubernetes API clients
 */
export const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);            // Pods, Services, ConfigMaps, PVCs
export const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);            // Deployments, StatefulSets, DaemonSets
export const batchV1Api = kc.makeApiClient(k8s.BatchV1Api);          // Jobs & CronJobs
export const networkingV1Api = kc.makeApiClient(k8s.NetworkingV1Api); // Ingress
export const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi); // Helm releases, SparkApplications
