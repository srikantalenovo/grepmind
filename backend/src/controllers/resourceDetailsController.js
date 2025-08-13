// src/controllers/resourceDetailsController.js
import {
  coreV1Api,
  appsV1Api,
  customObjectsApi
} from '../config/k8sClient.js';
import yaml from 'js-yaml';

/**
 * GET /api/resources/:namespace/:resourceType/:name/details
 */
export const getResourceDetails = async (req, res) => {
  const { namespace, resourceType, name } = req.params;

  try {
    let resource;
    switch (resourceType) {
      case 'pods':
        resource = (await coreV1Api.readNamespacedPod(name, namespace)).body;
        break;
      case 'services':
        resource = (await coreV1Api.readNamespacedService(name, namespace)).body;
        break;
      case 'deployments':
        resource = (await appsV1Api.readNamespacedDeployment(name, namespace)).body;
        break;
      case 'statefulsets':
        resource = (await appsV1Api.readNamespacedStatefulSet(name, namespace)).body;
        break;
      case 'daemonsets':
        resource = (await appsV1Api.readNamespacedDaemonSet(name, namespace)).body;
        break;
      case 'persistentvolumeclaims':
        resource = (await coreV1Api.readNamespacedPersistentVolumeClaim(name, namespace)).body;
        break;
      case 'configmaps':
        resource = (await coreV1Api.readNamespacedConfigMap(name, namespace)).body;
        break;
      case 'helmreleases':
        resource = (await customObjectsApi.getNamespacedCustomObject(
          'helm.toolkit.fluxcd.io',
          'v2beta1',
          namespace,
          'helmreleases',
          name
        )).body;
        break;
      case 'ingresses':
        resource = (await customObjectsApi.getNamespacedCustomObject(
          'networking.k8s.io', 'v1', namespace, 'ingresses', name
        )).body;
        break;
      default:
        return res.status(400).json({ error: `Unsupported resource type: ${resourceType}` });
    }

    res.json({
      kind: resource.kind,
      metadata: resource.metadata,
      spec: resource.spec,
      status: resource.status
    });
  } catch (err) {
    console.error(`[ERROR] Failed to get details for ${resourceType}/${name}:`, err.message);
    res.status(500).json({ error: `Failed to fetch resource details: ${err.message}` });
  }
};

/**
 * GET /api/resources/:namespace/:resourceType/:name/yaml
 */
export const getResourceYaml = async (req, res) => {
  const { namespace, resourceType, name } = req.params;

  try {
    let resource;
    switch (resourceType) {
      case 'pods':
        resource = (await coreV1Api.readNamespacedPod(name, namespace)).body;
        break;
      case 'services':
        resource = (await coreV1Api.readNamespacedService(name, namespace)).body;
        break;
      case 'deployments':
        resource = (await appsV1Api.readNamespacedDeployment(name, namespace)).body;
        break;
      case 'statefulsets':
        resource = (await appsV1Api.readNamespacedStatefulSet(name, namespace)).body;
        break;
      case 'daemonsets':
        resource = (await appsV1Api.readNamespacedDaemonSet(name, namespace)).body;
        break;
      case 'persistentvolumeclaims':
        resource = (await coreV1Api.readNamespacedPersistentVolumeClaim(name, namespace)).body;
        break;
      case 'configmaps':
        resource = (await coreV1Api.readNamespacedConfigMap(name, namespace)).body;
        break;
      case 'helmreleases':
        resource = (await customObjectsApi.getNamespacedCustomObject(
          'helm.toolkit.fluxcd.io',
          'v2beta1',
          namespace,
          'helmreleases',
          name
        )).body;
        break;
      case 'ingresses':
        resource = (await customObjectsApi.getNamespacedCustomObject(
          'networking.k8s.io', 'v1', namespace, 'ingresses', name
        )).body;
        break;
      default:
        return res.status(400).json({ error: `Unsupported resource type: ${resourceType}` });
    }

    const yamlData = yaml.dump(resource);
    res.setHeader('Content-Type', 'text/yaml');
    res.send(yamlData);
  } catch (err) {
    console.error(`[ERROR] Failed to get YAML for ${resourceType}/${name}:`, err.message);
    res.status(500).json({ error: `Failed to fetch resource YAML: ${err.message}` });
  }
};

/**
 * GET /api/resources/:namespace/:name/events
 */
export const getResourceEvents = async (req, res) => {
  const { namespace, name } = req.params;

  try {
    const events = (await coreV1Api.listNamespacedEvent(namespace)).body.items
      .filter(ev => ev.involvedObject?.name === name)
      .map(ev => ({
        type: ev.type,
        reason: ev.reason,
        message: ev.message,
        firstTimestamp: ev.firstTimestamp,
        lastTimestamp: ev.lastTimestamp
      }));

    res.json(events);
  } catch (err) {
    console.error(`[ERROR] Failed to get events for ${name}:`, err.message);
    res.status(500).json({ error: `Failed to fetch resource events: ${err.message}` });
  }
};

/**
 * GET /api/resources/:namespace/:podName/:container/logs
 */
export const getPodLogs = async (req, res) => {
  let { namespace, podName, container } = req.params;

  try {
    // If 'container' looks like a namespace, swap variables
    // (namespace names can't contain uppercase letters; pod names often have hyphens & numbers)
    if (container && (container === 'default' || /^[a-z0-9-]+$/.test(container) && !/^[a-z0-9-]+$/.test(namespace))) {
      // This means frontend sent /namespace/podName/namespace/logs by mistake
      namespace = container;
      container = undefined;
    }

    const logs = (await coreV1Api.readNamespacedPodLog(
      podName,
      namespace,
      container
    )).body;

    res.setHeader('Content-Type', 'text/plain');
    res.send(logs);
  } catch (err) {
    console.error(`[ERROR] Failed to get logs for ${podName}/${container || 'no-container'} in namespace ${namespace}:`, err.message);
    res.status(500).json({ error: `Failed to fetch pod logs: ${err.message}` });
  }
};
