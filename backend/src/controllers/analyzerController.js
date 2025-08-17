// src/controllers/analyzerController.js
import yaml from 'js-yaml'; 
import {
  coreV1Api,
  appsV1Api,
  batchV1Api,
  networkingV1Api,
} from '../config/k8sClient.js';
import { scanResources } from '../services/analyzerService.js';

// Map plural resource to PascalCase kind
const RESOURCE_TO_KIND = {
  pods: 'Pod',
  services: 'Service',
  configmaps: 'ConfigMap',
  secrets: 'Secret',
  persistentvolumeclaims: 'PersistentVolumeClaim',
  deployments: 'Deployment',
  statefulsets: 'StatefulSet',
  daemonsets: 'DaemonSet',
  jobs: 'Job',
  cronjobs: 'CronJob',
  ingresses: 'Ingress',
};


// ---------- SCAN ----------
export const analyzerScan = async (req, res) => {
  const namespace = (req.query.namespace ?? 'all').trim() || 'all';
  const resourceType = (req.query.resourceType || req.query.type || 'all').toLowerCase();
  const search = (req.query.search ?? '').trim();
  const problemsOnly = String(req.query.problemsOnly || req.query.only || 'false').toLowerCase() === 'true';

  try {
    const items = await scanResources({ namespace, resourceType, search, problemsOnly });
    res.status(200).json({
      namespace,
      resourceType,
      problemsOnly,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error('[ERROR] analyzerScan:', err);
    res.status(500).json({ error: 'Failed to scan resources', details: err.message || String(err) });
  }
};

// ---------- ACTIONS ----------

// POST /analyzer/:namespace/pods/:name/restart  (Editor+)
export const restartPod = async (req, res) => {
  const { namespace, name } = req.params;
  try {
    await coreV1Api.deleteNamespacedPod(name, namespace);
    res.json({ ok: true, message: `Pod ${name} deleted; controller will restart it.` });
  } catch (err) {
    console.error(`[ERROR] restartPod ${namespace}/${name}:`, err.body?.message || err.message);
    res.status(500).json({ error: 'Failed to restart pod', details: err.body?.message || err.message });
  }
};

// DELETE /analyzer/:namespace/pods/:name  (Admin)
export const deletePod = async (req, res) => {
  const { namespace, name } = req.params;
  try {
    await coreV1Api.deleteNamespacedPod(name, namespace);
    res.json({ ok: true, message: `Pod ${name} deleted.` });
  } catch (err) {
    console.error(`[ERROR] deletePod ${namespace}/${name}:`, err.body?.message || err.message);
    res.status(500).json({ error: 'Failed to delete pod', details: err.body?.message || err.message });
  }
};

// DELETE /analyzer/:namespace/:kind/:name  (Admin)
export const deleteResource = async (req, res) => {
  const { namespace, kind, name } = req.params;
  try {
    const k = kind.toLowerCase();
    switch (k) {
      case 'pods':
      case 'pod':
        await coreV1Api.deleteNamespacedPod(name, namespace);
        break;
      case 'services':
      case 'service':
        await coreV1Api.deleteNamespacedService(name, namespace);
        break;
      case 'configmaps':
      case 'configmap':
        await coreV1Api.deleteNamespacedConfigMap(name, namespace);
        break;
      case 'secrets':
      case 'secret':
        await coreV1Api.deleteNamespacedSecret(name, namespace);
        break;
      case 'persistentvolumeclaims':
      case 'pvc':
        await coreV1Api.deleteNamespacedPersistentVolumeClaim(name, namespace);
        break;
      case 'deployments':
      case 'deployment':
        await appsV1Api.deleteNamespacedDeployment(name, namespace);
        break;
      case 'statefulsets':
      case 'statefulset':
        await appsV1Api.deleteNamespacedStatefulSet(name, namespace);
        break;
      case 'daemonsets':
      case 'daemonset':
        await appsV1Api.deleteNamespacedDaemonSet(name, namespace);
        break;
      case 'jobs':
      case 'job':
        await batchV1Api.deleteNamespacedJob(name, namespace);
        break;
      case 'cronjobs':
      case 'cronjob':
        await batchV1Api.deleteNamespacedCronJob(name, namespace);
        break;
      case 'ingress':
      case 'ingresses':
        await networkingV1Api.deleteNamespacedIngress(name, namespace);
        break;
      default:
        return res.status(400).json({ error: `Unsupported kind for delete: ${kind}` });
    }
    res.json({ ok: true, message: `${kind} ${name} deleted.` });
  } catch (err) {
    console.error(`[ERROR] deleteResource ${namespace}/${kind}/${name}:`, err.body?.message || err.message);
    res.status(500).json({ error: `Failed to delete ${kind}`, details: err.body?.message || err.message });
  }
};

// GET /analyzer/:namespace/secrets/:name/view  (Admin)
export const viewSecret = async (req, res) => {
  const { namespace, name } = req.params;
  try {
    const sec = (await coreV1Api.readNamespacedSecret(name, namespace)).body;
    const data = sec.data || {};
    const decoded = {};
    // decode base64 -> utf8 (best-effort)
    for (const k of Object.keys(data)) {
      try {
        decoded[k] = Buffer.from(data[k], 'base64').toString('utf8');
      } catch {
        decoded[k] = '<binary>';
      }
    }
    res.json({
      metadata: { name: sec.metadata?.name, namespace: sec.metadata?.namespace, type: sec.type },
      data: decoded,
    });
  } catch (err) {
    console.error(`[ERROR] viewSecret ${namespace}/${name}:`, err.body?.message || err.message);
    res.status(500).json({ error: 'Failed to view secret', details: err.body?.message || err.message });
  }
};

/**
 * GET /api/analyzer/:namespace/:resourceType/:name/details
 */
export const getAnalyzerDetails = async (req, res) => {
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
      case 'jobs':
        resource = (await batchV1Api.readNamespacedJob(name, namespace)).body;
        break;
      case 'cronjobs':
        resource = (await batchV1Api.readNamespacedCronJob(name, namespace)).body;
        break;
      case 'persistentvolumeclaims':
        resource = (await coreV1Api.readNamespacedPersistentVolumeClaim(name, namespace)).body;
        break;
      case 'configmaps':
        resource = (await coreV1Api.readNamespacedConfigMap(name, namespace)).body;
        break;
      case 'secrets':
        resource = (await coreV1Api.readNamespacedSecret(name, namespace)).body;
        break;
      case 'ingresses':
        resource = (await networkingV1Api.getNamespacedCustomObject(
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
      status: resource.status,
    });
  } catch (err) {
    console.error(`[ERROR] Analyzer getDetails ${resourceType}/${name}:`, err.message);
    res.status(500).json({ error: `Failed to fetch resource details: ${err.message}` });
  }
};

/**
 * GET /api/analyzer/:namespace/:resourceType/:name/yaml
 */
export const getAnalyzerYaml = async (req, res) => {
  const { namespace, resourceType, name } = req.params;

  try {
    // reuse same switch above
    // (extract into helper if you want)
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
      // ... repeat cases from getAnalyzerDetails
      case 'statefulsets':
        resource = (await appsV1Api.readNamespacedStatefulSet(name, namespace)).body;
        break;
      case 'daemonsets':
        resource = (await appsV1Api.readNamespacedDaemonSet(name, namespace)).body;
        break;
      case 'jobs':
        resource = (await batchV1Api.readNamespacedJob(name, namespace)).body;
        break;
      case 'cronjobs':
        resource = (await batchV1Api.readNamespacedCronJob(name, namespace)).body;
        break;
      case 'persistentvolumeclaims':
        resource = (await coreV1Api.readNamespacedPersistentVolumeClaim(name, namespace)).body;
        break;
      case 'configmaps':
        resource = (await coreV1Api.readNamespacedConfigMap(name, namespace)).body;
        break;
      case 'secrets':
        resource = (await coreV1Api.readNamespacedSecret(name, namespace)).body;
        break;
      case 'ingresses':
        resource = (await networkingV1Api.getNamespacedCustomObject(
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
    console.error(`[ERROR] Analyzer getYaml ${resourceType}/${name}:`, err.message);
    res.status(500).json({ error: `Failed to fetch resource YAML: ${err.message}` });
  }
};

/**
 * GET /api/analyzer/:namespace/:name/events
 */
export const getAnalyzerEvents = async (req, res) => {
  const { namespace, name } = req.params;

  try {
    const events = (await coreV1Api.listNamespacedEvent(namespace)).body.items
      .filter(ev => ev.involvedObject?.name === name)
      .map(ev => ({
        type: ev.type,
        reason: ev.reason,
        message: ev.message,
        firstTimestamp: ev.firstTimestamp,
        lastTimestamp: ev.lastTimestamp,
      }));

    res.json(events);
  } catch (err) {
    console.error(`[ERROR] Analyzer getEvents ${name}:`, err.message);
    res.status(500).json({ error: `Failed to fetch events: ${err.message}` });
  }
};



// ---------- SCALE ----------
export const scaleResource = async (req, res) => {
  const { namespace, resourceType, name } = req.params;
  const rt = (resourceType || '').toLowerCase();

  try {
    const replicasRaw = req.body?.replicas ?? req.body?.spec?.replicas;
    const replicas = Number.parseInt(replicasRaw, 10);
    if (!Number.isFinite(replicas) || replicas < 0) {
      return res.status(400).json({ error: 'Invalid replicas value' });
    }

    if (rt !== 'deployments') {
      return res.status(400).json({ error: `Scaling not supported for resourceType: ${resourceType}` });
    }

    // Strategic merge patch works well for replicas
    const patch = { spec: { replicas } };

    const resp = await appsV1Api.patchNamespacedDeployment(
      name,
      namespace,
      patch,
      undefined, // pretty
      undefined, // dryRun
      undefined, // fieldManager
      undefined, // fieldValidation
      { headers: { 'content-type': 'application/strategic-merge-patch+json' } }
    );

    return res.json({
      ok: true,
      message: `Deployment ${name} scaled to ${replicas}.`,
      deployment: resp.body,
    });
  } catch (err) {
    console.error('[ERROR] scaleResource:', err.body?.message || err.message);
    return res.status(500).json({
      error: 'Failed to scale deployment',
      details: err.body?.message || err.message,
    });
  }
};

// ---------- EDIT YAML ----------
export const editYaml = async (req, res) => {
  const { namespace, resourceType, name } = req.params;
  const rt = (resourceType || '').toLowerCase();
  const yamlText = req.body?.yaml;

  if (!yamlText || typeof yamlText !== 'string') {
    return res.status(400).json({ error: 'YAML is required in body' });
  }

  try {
    const obj = yaml.load(yamlText);
    if (!obj || typeof obj !== 'object') {
      return res.status(400).json({ error: 'Invalid YAML content' });
    }
    const yamlKind = obj?.kind;
    const yamlName = obj?.metadata?.name;
    const yamlNs = obj?.metadata?.namespace ?? namespace;

    if (!yamlKind) return res.status(400).json({ error: 'YAML must include kind' });
    if (!yamlName) return res.status(400).json({ error: 'YAML must include metadata.name' });

    // Validate name + namespace
    if (yamlName !== name) {
      return res.status(400).json({
        error: `YAML name (${yamlName}) does not match path param (${name})`,
      });
    }
    if (yamlNs !== namespace) {
      return res.status(400).json({
        error: `YAML namespace (${yamlNs}) does not match path param (${namespace})`,
      });
    }

    // Validate kind matches resourceType
    const expectedKind = RESOURCE_TO_KIND[rt];
    if (!expectedKind) {
      return res.status(400).json({ error: `Unsupported resourceType: ${resourceType}` });
    }
    if (yamlKind !== expectedKind) {
      return res.status(400).json({
        error: `YAML kind (${yamlKind}) does not match path kind (${resourceType})`,
      });
    }

    // Apply (replace full resource)
    let result;
    switch (rt) {
      case 'pods':
        result = await coreV1Api.replaceNamespacedPod(name, namespace, obj);
        break;
      case 'services':
        result = await coreV1Api.replaceNamespacedService(name, namespace, obj);
        break;
      case 'configmaps':
        result = await coreV1Api.replaceNamespacedConfigMap(name, namespace, obj);
        break;
      case 'secrets':
        result = await coreV1Api.replaceNamespacedSecret(name, namespace, obj);
        break;
      case 'persistentvolumeclaims':
        result = await coreV1Api.replaceNamespacedPersistentVolumeClaim(name, namespace, obj);
        break;
      case 'deployments':
        result = await appsV1Api.replaceNamespacedDeployment(name, namespace, obj);
        break;
      case 'statefulsets':
        result = await appsV1Api.replaceNamespacedStatefulSet(name, namespace, obj);
        break;
      case 'daemonsets':
        result = await appsV1Api.replaceNamespacedDaemonSet(name, namespace, obj);
        break;
      case 'jobs':
        result = await batchV1Api.replaceNamespacedJob(name, namespace, obj);
        break;
      case 'cronjobs':
        result = await batchV1Api.replaceNamespacedCronJob(name, namespace, obj);
        break;
      case 'ingresses':
        result = await networkingV1Api.replaceNamespacedIngress(name, namespace, obj);
        break;
      default:
        return res.status(400).json({ error: `Unsupported resourceType: ${resourceType}` });
    }

    return res.json({
      ok: true,
      message: `${yamlKind} ${name} updated`,
      resource: result.body,
    });
  } catch (err) {
    console.error(`[ERROR] editYaml ${namespace}/${resourceType}/${name}:`, err.body?.message || err.message);
    return res.status(500).json({
      error: 'Failed to apply YAML',
      details: err.body?.message || err.message,
    });
  }
};


export const scaleDeployment = async (req, res) => {
  try {
    const { namespace, name } = req.params;
    const { replicas } = req.body;

    if (replicas == null || isNaN(replicas)) {
      return res.status(400).json({ error: 'Invalid replicas value' });
    }

    const patch = { spec: { replicas: parseInt(replicas, 10) } };

    const options = {
      headers: { 'Content-Type': 'application/merge-patch+json' },
    };

    const resp = await appsV1Api.patchNamespacedDeployment(
      name,
      namespace,
      patch,
      undefined, // pretty
      undefined, // dryRun
      undefined, // fieldManager
      undefined, // fieldValidation
      options
    );

    res.json({
      success: true,
      scaled: resp.body.spec?.replicas,
    });
  } catch (err) {
    console.error('[ERROR] scaleDeployment:', err.response?.body || err.message);
    res.status(500).json({
      error: 'Failed to scale deployment',
      details: err.response?.body?.message || err.message,
    });
  }
};
