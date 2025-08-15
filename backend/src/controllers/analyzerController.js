// src/controllers/analyzerController.js
import { core, apps, objectApi, k8s } from '../utils/k8sClient.js';
import yaml from 'js-yaml';

/** Scan for problematic pods and enrich with owner + current replicas */
export async function scanProblems(_req, res) {
  try {
    const podsResp = await core.listPodForAllNamespaces();
    const problems = [];

    for (const pod of podsResp.body.items) {
      const phase = pod?.status?.phase;
      const cs = pod?.status?.containerStatuses || [];
      const restarts = cs.reduce((s, c) => s + (c.restartCount || 0), 0);

      // Consider pod problematic if not Running, or high restarts, or not Ready
      let isProblem = phase !== 'Running' || restarts > 3;
      const readyCond = (pod.status?.conditions || []).find(c => c.type === 'Ready');
      if (readyCond && (readyCond.status === 'False' || readyCond.status === 'Unknown')) isProblem = true;

      if (!isProblem) continue;

      let ownerKind = null;
      let ownerName = null;
      let currentReplicas = null;

      const ns = pod.metadata?.namespace;
      const ownerRef = pod.metadata?.ownerReferences?.[0];

      if (ownerRef) {
        ownerKind = ownerRef.kind;
        ownerName = ownerRef.name;

        try {
          if (ownerKind === 'ReplicaSet') {
            const rs = await apps.readNamespacedReplicaSet(ownerName, ns);
            const depOwner = rs.body.metadata?.ownerReferences?.find(o => o.kind === 'Deployment');
            if (depOwner) {
              ownerKind = 'Deployment';
              ownerName = depOwner.name;
              const scale = await apps.readNamespacedDeploymentScale(ownerName, ns);
              currentReplicas = scale.body?.spec?.replicas ?? null;
            }
          } else if (ownerKind === 'StatefulSet') {
            const scale = await apps.readNamespacedStatefulSetScale(ownerName, ns);
            currentReplicas = scale.body?.spec?.replicas ?? null;
          } else if (ownerKind === 'DaemonSet') {
            // DaemonSets are not user-scalable
            currentReplicas = null;
          }
        } catch {
          // ignore owner resolution errors
        }
      }

      problems.push({
        name: pod.metadata?.name,
        namespace: ns,
        status: phase,
        issue: pod.status?.reason || readyCond?.reason || (restarts > 3 ? `High restarts: ${restarts}` : 'NotHealthy'),
        error: pod.status?.message || null,
        ownerKind,
        ownerName,
        currentReplicas
      });
    }

    res.json({ issues: problems });
  } catch (err) {
    console.error('scanProblems error:', err);
    res.status(500).json({ error: err.message });
  }
}

/** Restart pod: delete it and let controller recreate */
export async function restartPod(req, res) {
  const { namespace, name } = req.body || {};
  if (!namespace || !name) return res.status(400).json({ error: 'namespace and name are required' });

  try {
    await core.deleteNamespacedPod(name, namespace);
    res.json({ ok: true, message: `Pod ${name} deleted (restart triggered)` });
  } catch (err) {
    console.error('restartPod error:', err);
    res.status(500).json({ error: err.message });
  }
}

/** Scale workload (Deployment or StatefulSet) */
export async function scaleWorkload(req, res) {
  const { namespace, kind, name, replicas } = req.body || {};
  if (!namespace || !kind || !name || typeof replicas !== 'number')
    return res.status(400).json({ error: 'namespace, kind, name, replicas are required' });

  try {
    if (kind === 'Deployment') {
      const sc = await apps.readNamespacedDeploymentScale(name, namespace);
      sc.body.spec.replicas = replicas;
      await apps.replaceNamespacedDeploymentScale(name, namespace, sc.body);
      return res.json({ ok: true, message: `Deployment ${name} scaled to ${replicas}` });
    }
    if (kind === 'StatefulSet') {
      const sc = await apps.readNamespacedStatefulSetScale(name, namespace);
      sc.body.spec.replicas = replicas;
      await apps.replaceNamespacedStatefulSetScale(name, namespace, sc.body);
      return res.json({ ok: true, message: `StatefulSet ${name} scaled to ${replicas}` });
    }
    // DaemonSet not supported for scaling
    return res.status(400).json({ error: `Scaling kind ${kind} is not supported` });
  } catch (err) {
    console.error('scaleWorkload error:', err);
    res.status(500).json({ error: err.message });
  }
}

/** Apply manifest (multi-doc YAML accepted) using KubernetesObjectApi */
export async function applyManifest(req, res) {
  const { yamlText } = req.body || {};
  if (!yamlText) return res.status(400).json({ error: 'yamlText is required' });

  try {
    const docs = yaml.loadAll(yamlText).filter(Boolean);
    const results = [];

    for (const doc of docs) {
      // server-side apply via PATCH (apply) could be used, but generic create/patch works well
      // Try create; if exists, patch
      try {
        // Ensure required fields
        if (!doc.apiVersion || !doc.kind || !doc.metadata?.name)
          throw new Error('Invalid manifest: apiVersion/kind/metadata.name required');
        // Namespace defaulting for namespaced kinds
        const namespaced = !['Namespace', 'Node', 'PersistentVolume', 'ClusterRole', 'ClusterRoleBinding', 'CustomResourceDefinition'].includes(doc.kind);
        if (namespaced && !doc.metadata.namespace) doc.metadata.namespace = 'default';

        const createRes = await objectApi.create(doc);
        results.push({ name: doc.metadata.name, kind: doc.kind, action: 'created', statusCode: createRes.response.statusCode });
      } catch (e) {
        if (e?.response?.statusCode === 409) {
          // Exists — patch it
          const patchRes = await objectApi.patch(
            doc,
            undefined,
            undefined,
            undefined,
            {
              headers: { 'Content-Type': 'application/merge-patch+json' }
            }
          );
          results.push({ name: doc.metadata.name, kind: doc.kind, action: 'patched', statusCode: patchRes.response.statusCode });
        } else {
          throw e;
        }
      }
    }

    res.json({ ok: true, results });
  } catch (err) {
    console.error('applyManifest error:', err);
    res.status(500).json({ error: err.message });
  }
}

/** Delete resource (generic) via KubernetesObjectApi */
export async function deleteResource(req, res) {
  const { apiVersion, kind, name, namespace } = req.body || {};
  if (!apiVersion || !kind || !name)
    return res.status(400).json({ error: 'apiVersion, kind, name are required' });

  try {
    const obj = { apiVersion, kind, metadata: { name, namespace } };
    const del = await objectApi.delete(obj);
    res.json({ ok: true, statusCode: del.response.statusCode });
  } catch (err) {
    console.error('deleteResource error:', err);
    res.status(500).json({ error: err.message });
  }
}

/** View secret (admin only) */
export async function viewSecret(req, res) {
  const { namespace, name } = req.params;
  if (!namespace || !name) return res.status(400).json({ error: 'namespace and name are required' });

  try {
    const sec = await core.readNamespacedSecret(name, namespace);
    const data = sec.body.data || {};
    // Decode base64 values
    const decoded = {};
    for (const [k, v] of Object.entries(data)) {
      decoded[k] = Buffer.from(v, 'base64').toString('utf8');
    }
    res.json({ metadata: sec.body.metadata, type: sec.body.type, data: decoded });
  } catch (err) {
    console.error('viewSecret error:', err);
    res.status(500).json({ error: err.message });
  }
}

/** Edit resource via YAML (replace) */
export async function editYaml(req, res) {
  const { yamlText } = req.body || {};
  if (!yamlText) return res.status(400).json({ error: 'yamlText is required' });

  try {
    const obj = yaml.load(yamlText);
    if (!obj?.apiVersion || !obj?.kind || !obj?.metadata?.name) {
      return res.status(400).json({ error: 'Invalid YAML: apiVersion, kind, metadata.name required' });
    }
    const namespaced = !['Namespace', 'Node', 'PersistentVolume', 'ClusterRole', 'ClusterRoleBinding', 'CustomResourceDefinition'].includes(obj.kind);
    if (namespaced && !obj.metadata.namespace) obj.metadata.namespace = 'default';

    // Try replace; if not found, create
    try {
      const replace = await objectApi.replace(obj);
      res.json({ ok: true, action: 'replaced', statusCode: replace.response.statusCode });
    } catch (e) {
      if (e?.response?.statusCode === 404) {
        const create = await objectApi.create(obj);
        res.json({ ok: true, action: 'created', statusCode: create.response.statusCode });
      } else {
        throw e;
      }
    }
  } catch (err) {
    console.error('editYaml error:', err);
    res.status(500).json({ error: err.message });
  }
}
