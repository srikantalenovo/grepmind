// src/controllers/analyzerController.js
import yaml from 'js-yaml';
import {
  coreV1Api,
  appsV1Api,
  batchV1Api,
  networkingV1Api,
} from '../config/k8sClient.js';
import { scanResources } from '../services/analyzerService.js';

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

// POST /analyzer/:ns/pods/:name/restart  (Editor+)
export const restartPod = async (req, res) => {
  const { ns, name } = req.params;
  try {
    await coreV1Api.deleteNamespacedPod(name, ns);
    res.json({ ok: true, message: `Pod ${name} deleted; controller will restart it.` });
  } catch (err) {
    console.error(`[ERROR] restartPod ${ns}/${name}:`, err.body?.message || err.message);
    res.status(500).json({ error: 'Failed to restart pod', details: err.body?.message || err.message });
  }
};

// DELETE /analyzer/:ns/pods/:name  (Admin)
export const deletePod = async (req, res) => {
  const { ns, name } = req.params;
  try {
    await coreV1Api.deleteNamespacedPod(name, ns);
    res.json({ ok: true, message: `Pod ${name} deleted.` });
  } catch (err) {
    console.error(`[ERROR] deletePod ${ns}/${name}:`, err.body?.message || err.message);
    res.status(500).json({ error: 'Failed to delete pod', details: err.body?.message || err.message });
  }
};

// POST /analyzer/:ns/deployments/:name/scale  { replicas } (Editor+)
export const scaleDeployment = async (req, res) => {
  const { ns, name } = req.params;
  let { replicas } = req.body || {};
  try {
    replicas = parseInt(replicas, 10);
    if (Number.isNaN(replicas) || replicas < 0) {
      return res.status(400).json({ error: 'Invalid replicas value' });
    }
    // Patch deployment replicas
    const patch = { spec: { replicas } };
    await appsV1Api.patchNamespacedDeployment(
      name,
      ns,
      patch,
      undefined, undefined, undefined, undefined,
      { headers: { 'Content-Type': 'application/merge-patch+json' } }
    );
    res.json({ ok: true, message: `Deployment ${name} scaled to ${replicas}.` });
  } catch (err) {
    console.error(`[ERROR] scaleDeployment ${ns}/${name}:`, err.body?.message || err.message);
    res.status(500).json({ error: 'Failed to scale deployment', details: err.body?.message || err.message });
  }
};

// DELETE /analyzer/:ns/:kind/:name  (Admin)
export const deleteResource = async (req, res) => {
  const { ns, kind, name } = req.params;
  try {
    const k = kind.toLowerCase();
    switch (k) {
      case 'pods':
      case 'pod':
        await coreV1Api.deleteNamespacedPod(name, ns);
        break;
      case 'services':
      case 'service':
        await coreV1Api.deleteNamespacedService(name, ns);
        break;
      case 'configmaps':
      case 'configmap':
        await coreV1Api.deleteNamespacedConfigMap(name, ns);
        break;
      case 'secrets':
      case 'secret':
        await coreV1Api.deleteNamespacedSecret(name, ns);
        break;
      case 'persistentvolumeclaims':
      case 'pvc':
        await coreV1Api.deleteNamespacedPersistentVolumeClaim(name, ns);
        break;
      case 'deployments':
      case 'deployment':
        await appsV1Api.deleteNamespacedDeployment(name, ns);
        break;
      case 'statefulsets':
      case 'statefulset':
        await appsV1Api.deleteNamespacedStatefulSet(name, ns);
        break;
      case 'daemonsets':
      case 'daemonset':
        await appsV1Api.deleteNamespacedDaemonSet(name, ns);
        break;
      case 'jobs':
      case 'job':
        await batchV1Api.deleteNamespacedJob(name, ns);
        break;
      case 'cronjobs':
      case 'cronjob':
        await batchV1Api.deleteNamespacedCronJob(name, ns);
        break;
      case 'ingress':
      case 'ingresses':
        await networkingV1Api.deleteNamespacedIngress(name, ns);
        break;
      default:
        return res.status(400).json({ error: `Unsupported kind for delete: ${kind}` });
    }
    res.json({ ok: true, message: `${kind} ${name} deleted.` });
  } catch (err) {
    console.error(`[ERROR] deleteResource ${ns}/${kind}/${name}:`, err.body?.message || err.message);
    res.status(500).json({ error: `Failed to delete ${kind}`, details: err.body?.message || err.message });
  }
};

// GET /analyzer/:ns/secrets/:name/view  (Admin)
export const viewSecret = async (req, res) => {
  const { ns, name } = req.params;
  try {
    const sec = (await coreV1Api.readNamespacedSecret(name, ns)).body;
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
    console.error(`[ERROR] viewSecret ${ns}/${name}:`, err.body?.message || err.message);
    res.status(500).json({ error: 'Failed to view secret', details: err.body?.message || err.message });
  }
};

// PUT /analyzer/:ns/:kind/:name/edit  { yaml } (Admin)
export const editYaml = async (req, res) => {
  const { ns, kind, name } = req.params;
  const { yaml: yamlText } = req.body || {};
  if (!yamlText || typeof yamlText !== 'string') {
    return res.status(400).json({ error: 'yaml is required in body' });
  }
  try {
    const obj = yaml.load(yamlText);
    if (!obj || typeof obj !== 'object') {
      return res.status(400).json({ error: 'Invalid YAML content' });
    }
    if (!obj.kind || !obj.metadata?.name) {
      return res.status(400).json({ error: 'YAML must include kind and metadata.name' });
    }
    const yKind = obj.kind.toLowerCase();
    const yName = obj.metadata.name;
    const yNs = obj.metadata?.namespace || ns;

    if (yName !== name) {
      return res.status(400).json({ error: `YAML name (${yName}) does not match path param (${name})` });
    }
    if (yNs !== ns) {
      return res.status(400).json({ error: `YAML namespace (${yNs}) does not match path param (${ns})` });
    }
    if (yKind !== kind.toLowerCase() && !(kind.toLowerCase() === 'pvc' && yKind === 'persistentvolumeclaim')) {
      return res.status(400).json({ error: `YAML kind (${obj.kind}) does not match path kind (${kind})` });
    }

    // Use replace for full object updates
    switch (yKind) {
      case 'pod':
        return res.json((await coreV1Api.replaceNamespacedPod(name, ns, obj)).body);
      case 'service':
        return res.json((await coreV1Api.replaceNamespacedService(name, ns, obj)).body);
      case 'configmap':
        return res.json((await coreV1Api.replaceNamespacedConfigMap(name, ns, obj)).body);
      case 'secret':
        return res.json((await coreV1Api.replaceNamespacedSecret(name, ns, obj)).body);
      case 'persistentvolumeclaim':
        return res.json((await coreV1Api.replaceNamespacedPersistentVolumeClaim(name, ns, obj)).body);
      case 'deployment':
        return res.json((await appsV1Api.replaceNamespacedDeployment(name, ns, obj)).body);
      case 'statefulset':
        return res.json((await appsV1Api.replaceNamespacedStatefulSet(name, ns, obj)).body);
      case 'daemonset':
        return res.json((await appsV1Api.replaceNamespacedDaemonSet(name, ns, obj)).body);
      case 'job':
        return res.json((await batchV1Api.replaceNamespacedJob(name, ns, obj)).body);
      case 'cronjob':
        return res.json((await batchV1Api.replaceNamespacedCronJob(name, ns, obj)).body);
      case 'ingress':
        return res.json((await networkingV1Api.replaceNamespacedIngress(name, ns, obj)).body);
      default:
        return res.status(400).json({ error: `Unsupported kind for edit: ${obj.kind}` });
    }
  } catch (err) {
    console.error(`[ERROR] editYaml ${ns}/${kind}/${name}:`, err.body?.message || err.message);
    res.status(500).json({ error: 'Failed to apply YAML', details: err.body?.message || err.message });
  }
};
