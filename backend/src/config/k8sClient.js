// config/k8sClient.js
import k8s from '@kubernetes/client-node';
import { execSync } from 'child_process';
import logger from '../utils/logger.js';

const kc = new k8s.KubeConfig();

function tryLoadInCluster() {
  logger.info("🔍 Attempting to load Kubernetes config from in-cluster environment...");
  try {
    kc.loadFromCluster();
    logger.info("✅ Successfully loaded in-cluster configuration.");
    return true;
  } catch (err) {
    logger.error(`❌ In-cluster configuration failed: ${err.message}`);
    return false;
  }
}

function tryLoadKubeconfig() {
  logger.info("🔍 Attempting to load Kubernetes config from local kubeconfig (~/.kube/config)...");
  try {
    kc.loadFromDefault();
    const currentContext = kc.getCurrentContext();
    logger.info(`✅ Successfully loaded kubeconfig. Current context: ${currentContext}`);
    return true;
  } catch (err) {
    logger.error(`❌ Local kubeconfig load failed: ${err.message}`);
    return false;
  }
}

// Attempt connections in order
if (!tryLoadInCluster()) {
  if (!tryLoadKubeconfig()) {
    logger.error("🚨 Failed to load any Kubernetes configuration. Backend will not be able to connect to cluster.");
  }
}

// Show API server URL for clarity
const cluster = kc.getCurrentCluster();
if (cluster) {
  logger.info(`🌐 Connected to cluster API server: ${cluster.server}`);
} else {
  logger.error("⚠ No active cluster configuration found.");
}

// Kubernetes API Clients
export const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
export const appsApi = kc.makeApiClient(k8s.AppsV1Api);
export const batchApi = kc.makeApiClient(k8s.BatchV1Api);
export const batchBetaApi = kc.makeApiClient(k8s.BatchV1beta1Api);
export const networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
export const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);

// Helm helper functions
export const helmList = (namespace) => {
  logger.info(`📦 Fetching Helm releases ${namespace ? `in namespace '${namespace}'` : 'across all namespaces'}...`);
  const cmd = namespace
    ? `helm list -n ${namespace} --output json`
    : `helm list --all-namespaces --output json`;
  return JSON.parse(execSync(cmd).toString());
};

export const helmInstall = (releaseName, chart, namespace) => {
  logger.info(`📦 Installing Helm release '${releaseName}' from chart '${chart}' in namespace '${namespace}'...`);
  const cmd = `helm install ${releaseName} ${chart} -n ${namespace}`;
  return execSync(cmd).toString();
};

export const helmUninstall = (releaseName, namespace) => {
  logger.info(`🗑 Uninstalling Helm release '${releaseName}' from namespace '${namespace}'...`);
  const cmd = `helm uninstall ${releaseName} -n ${namespace}`;
  return execSync(cmd).toString();
};
