// src/controllers/analyzerController.js
import yaml from 'js-yaml'; 
import {
  coreV1Api,
  appsV1Api,
  batchV1Api,
  networkingV1Api,
} from '../config/k8sClient.js';
import { scanResources } from '../services/analyzerService.js';

// helper: plural resourceType in URL -> singular kind
const toSingularKind = (rt = '') => {
  const k = String(rt).toLowerCase();
  const map = {
    pods: 'pod',
    services: 'service',
    configmaps: 'configmap',
    secrets: 'secret',
    persistentvolumeclaims: 'persistentvolumeclaim',
    deployments: 'deployment',
    statefulsets: 'statefulset',
    daemonsets: 'daemonset',
    jobs: 'job',
    cronjobs: 'cronjob',
    ingresses: 'ingress',
  };
  return map[k] || k.replace(/s$/, '');
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

// POST /analyzer/:namespace/deployments/:name/scale
// export const scaleDeployment = async (req, res) => {
//   try {
//     const { namespace, name } = req.params;
//     let { replicas } = req.body || {};
//     replicas = Number(replicas);
//     if (!Number.isInteger(replicas) || replicas < 0) {
//       return res.status(400).json({ error: 'Invalid replicas value' });
//     }

//     const patch = { spec: { replicas } };

//     // Use JSON Merge Patch to avoid 415
//     const resp = await appsV1Api.patchNamespacedDeployment(
//       name,
//       namespace,
//       patch,
//       undefined, undefined, undefined, undefined,
//       { headers: { 'Content-Type': 'application/merge-patch+json' } }
//     );

//     res.json({ ok: true, replicas: resp.body?.spec?.replicas ?? replicas });
//   } catch (err) {
//     console.error('[ERROR] scaleDeployment:', err.body?.message || err.message);
//     res.status(500).json({
//       error: 'Failed to scale deployment',
//       details: err.body?.message || err.message,
//     });
//   }
// };


export const scaleDeployment = async (req, res) => {
  const { namespace, name } = req.params;
  const { replicas } = req.body || {};

  if (typeof replicas !== 'number' || replicas < 0) {
    return res.status(400).json({ error: 'Invalid replicas value' });
  }

  try {
    const body = {
      apiVersion: 'autoscaling/v1',
      kind: 'Scale',
      metadata: { name, namespace },
      spec: { replicas },
    };

    const result = await appsV1Api.replaceNamespacedDeploymentScale(
      name,
      namespace,
      body
    );

    res.json(result.body);
  } catch (err) {
    console.error(`[ERROR] scaleDeployment ${namespace}/${name}:`, err.body?.message || err.message);
    res.status(500).json({ error: 'Failed to scale deployment', details: err.body?.message || err.message });
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

// PUT /analyzer/:namespace/:resourceType/:name/edit  { yaml }
export const editYaml = async (req, res) => {
  const { namespace, resourceType, name } = req.params;
  const { yaml: yamlText } = req.body || {};
  try {
    if (!yamlText || typeof yamlText !== 'string') {
      return res.status(400).json({ error: 'yaml is required in body' });
    }

    const obj = yaml.load(yamlText); // <— use `yaml.load` here
    if (!obj || typeof obj !== 'object') {
      return res.status(400).json({ error: 'Invalid YAML content' });
    }
    if (!obj.kind || !obj.metadata?.name) {
      return res.status(400).json({ error: 'YAML must include kind and metadata.name' });
    }

    // Validate name/namespace
    if (obj.metadata.name !== name) {
      return res.status(400).json({ error: `YAML name (${obj.metadata.name}) does not match path param (${name})` });
    }
    // default YAML namespace if omitted
    if (!obj.metadata.namespace) obj.metadata.namespace = namespace;
    if (obj.metadata.namespace !== namespace) {
      return res.status(400).json({ error: `YAML namespace (${obj.metadata.namespace}) does not match path param (${namespace})` });
    }

    // Validate kind against path resourceType
    const yamlKindLower = String(obj.kind).toLowerCase();
    const expectedKindLower = toSingularKind(resourceType);
    if (yamlKindLower !== expectedKindLower) {
      return res.status(400).json({ error: `YAML kind (${obj.kind}) does not match path kind (${resourceType})` });
    }

    // Replace full object by kind
    let result;
    switch (yamlKindLower) {
      case 'pod':
        result = await coreV1Api.replaceNamespacedPod(name, namespace, obj); break;
      case 'service':
        result = await coreV1Api.replaceNamespacedService(name, namespace, obj); break;
      case 'configmap':
        result = await coreV1Api.replaceNamespacedConfigMap(name, namespace, obj); break;
      case 'secret':
        result = await coreV1Api.replaceNamespacedSecret(name, namespace, obj); break;
      case 'persistentvolumeclaim':
        result = await coreV1Api.replaceNamespacedPersistentVolumeClaim(name, namespace, obj); break;
      case 'deployment':
        result = await appsV1Api.replaceNamespacedDeployment(name, namespace, obj); break;
      case 'statefulset':
        result = await appsV1Api.replaceNamespacedStatefulSet(name, namespace, obj); break;
      case 'daemonset':
        result = await appsV1Api.replaceNamespacedDaemonSet(name, namespace, obj); break;
      case 'job':
        result = await batchV1Api.replaceNamespacedJob(name, namespace, obj); break;
      case 'cronjob':
        result = await batchV1Api.replaceNamespacedCronJob(name, namespace, obj); break;
      case 'ingress':
        result = await networkingV1Api.replaceNamespacedIngress(name, namespace, obj); break;
      default:
        return res.status(400).json({ error: `Unsupported kind for edit: ${obj.kind}` });
    }

    res.json({ ok: true, message: `${obj.kind} ${name} updated`, resource: result.body });
  } catch (err) {
    console.error(`[ERROR] editYaml ${namespace}/${resourceType}/${name}:`, err.body?.message || err.message);
    res.status(500).json({ error: 'Failed to apply YAML', details: err.body?.message || err.message });
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



export const scaleResource = async (req, res) => {
  const { namespace, kind, name } = req.params;
  const { replicas } = req.body || {};

  if (typeof replicas !== 'number' || replicas < 0) {
    return res.status(400).json({ error: 'Invalid replicas value' });
  }

  try {
    // Correct Scale object (must use autoscaling/v1)
    const body = {
      apiVersion: 'autoscaling/v1',
      kind: 'Scale',
      metadata: { name, namespace },
      spec: { replicas },
    };

    const kindLower = kind.toLowerCase();
    let result;

    switch (kindLower) {
      case 'deployment':
      case 'deployments':
        result = await appsV1Api.replaceNamespacedDeploymentScale(name, namespace, body);
        break;

      case 'statefulset':
      case 'statefulsets':
        result = await appsV1Api.replaceNamespacedStatefulSetScale(name, namespace, body);
        break;

      case 'replicaset':
      case 'replicasets':
        result = await appsV1Api.replaceNamespacedReplicaSetScale(name, namespace, body);
        break;

      case 'daemonset':
      case 'daemonsets':
        return res.status(400).json({
          error: 'DaemonSets cannot be scaled via replicas (they run one pod per node).',
        });

      default:
        return res.status(400).json({ error: `Scaling not supported for kind: ${kind}` });
    }

    res.json(result.body);
  } catch (err) {
    console.error(
      `[ERROR] scaleResource ${namespace}/${kind}/${name}:`,
      err.body?.message || err.message
    );
    res.status(500).json({
      error: `Failed to scale ${kind}`,
      details: err.body?.message || err.message,
    });
  }
};
