// src/config/k8sClient.js
import k8s from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();

/**
 * Unified logger for consistent output
 */
function log(level, message) {
  console.log(`[${level}] ${new Date().toISOString()} - ${message}`);
}

/**
 * Load Kubernetes configuration
 */
function loadK8sConfig() {
  try {
    log("INFO", "🔍 Attempting to load Kubernetes config from in-cluster environment...");
    kc.loadFromCluster();
    log("INFO", "✅ Successfully loaded in-cluster configuration.");
  } catch (err) {
    log("WARN", `⚠️ In-cluster config failed: ${err.message}`);
    const kubeconfigPath = process.env.KUBECONFIG || undefined;
    log("INFO", `🔍 Attempting to load Kubernetes config from ${kubeconfigPath || "default location"}...`);
    kc.loadFromDefault();
    log("INFO", "✅ Successfully loaded kubeconfig.");
  }

  const cluster = kc.getCurrentCluster();
  if (cluster) {
    log("INFO", `🌐 Connected to cluster "${cluster.name}" at ${cluster.server}`);
  } else {
    log("ERROR", "❌ No active cluster configuration found.");
    process.exit(1);
  }
}

loadK8sConfig();

/**
 * Export Kubernetes API clients
 */
export const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);              // Pods, Services, ConfigMaps, PVCs, Namespaces, Nodes
export const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);              // Deployments, StatefulSets, DaemonSets
export const batchV1Api = kc.makeApiClient(k8s.BatchV1Api);            // Jobs, CronJobs
export const networkingV1Api = kc.makeApiClient(k8s.NetworkingV1Api);  // Ingress
export const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);// CRDs like Helm releases

/**
 * Helper functions for Namespaces & Nodes
 */
export async function listNamespaces() {
  log("INFO", "📜 Fetching available namespaces...");
  const res = await coreV1Api.listNamespace();
  return res.body.items.map(ns => ns.metadata.name);
}

export async function listNodes() {
  log("INFO", "📡 Fetching available nodes...");
  const res = await coreV1Api.listNode();
  return res.body.items.map(node => ({
    name: node.metadata.name,
    status: node.status.conditions.find(c => c.type === "Ready")?.status === "True" ? "Ready" : "NotReady"
  }));
}
