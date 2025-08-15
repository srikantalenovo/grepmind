import { core, apps, k8sYaml } from '../utils/k8sClient.js';

// ---------- Helpers ----------
function getPodIssue(pod) {
  const phase = pod?.status?.phase;
  const cs = pod?.status?.containerStatuses || [];
  const restarts = cs.reduce((sum, c) => sum + (c.restartCount || 0), 0);

  const reasons = new Set(
    cs.flatMap((c) => [
      c?.state?.waiting?.reason,
      c?.state?.terminated?.reason,
      c?.lastState?.terminated?.reason,
      c?.lastState?.waiting?.reason,
    ]).filter(Boolean)
  );

  const cond = (pod.status?.conditions || []).find((c) => c.type === 'Ready');
  const readyProblem = cond && (cond.status === 'False' || cond.status === 'Unknown')
    ? cond.reason || 'NotReady'
    : null;

  if (phase !== 'Running') return phase || 'NotRunning';
  if (restarts > 3) return `High restarts: ${restarts}`;
  if (reasons.size) return Array.from(reasons).join(', ');
  if (readyProblem) return readyProblem;
  return null;
}

function toIssueRow(obj) {
  return {
    type: obj.type,
    name: obj.name,
    namespace: obj.namespace,
    issue: obj.issue || 'Unknown',
    nodeName: obj.nodeName || null,
    details: obj.details || null,
  };
}

// ---------- Namespaces ----------
export async function listNamespaces(req, res) {
  try {
    const r = await core.listNamespace();
    const items = r.body.items.map(n => n.metadata?.name).filter(Boolean);
    res.json({ namespaces: ['all', ...items] });
  } catch (e) {
    console.error('listNamespaces error', e);
    res.status(500).json({ error: e.message });
  }
}

// ---------- Pods with issues ----------
export async function listPods(req, res) {
  try {
    const ns = req.query.namespace || 'all';
    const issuesOnly = (req.query.issuesOnly ?? 'true') === 'true';

    const r = ns === 'all'
      ? await core.listPodForAllNamespaces()
      : await core.listNamespacedPod(ns);

    const rows = [];
    for (const pod of r.body.items || []) {
      const issue = getPodIssue(pod);
      if (issuesOnly && !issue) continue;
      if (!issue) continue; // Analyzer Resources tab only shows issues
      rows.push(toIssueRow({
        type: 'Pod',
        name: pod.metadata?.name,
        namespace: pod.metadata?.namespace,
        issue,
        nodeName: pod.spec?.nodeName || null,
        details: {
          phase: pod?.status?.phase,
          restarts: (pod?.status?.containerStatuses || []).reduce((s, c) => s + (c.restartCount || 0), 0),
          reasons: (pod?.status?.containerStatuses || []).map(c => c?.state?.waiting?.reason || c?.state?.terminated?.reason).filter(Boolean),
        },
      }));
    }
    res.json({ items: rows, scannedAt: new Date().toISOString() });
  } catch (e) {
    console.error('listPods error', e);
    res.status(500).json({ error: e.message });
  }
}

// ---------- Deployments with issues ----------
export async function listDeployments(req, res) {
  try {
    const ns = req.query.namespace || 'all';
    const r = ns === 'all'
      ? await apps.listDeploymentForAllNamespaces()
      : await apps.listNamespacedDeployment(ns);

    const rows = [];
    for (const dep of r.body.items || []) {
      const desired = dep.spec?.replicas ?? 0;
      const available = dep.status?.availableReplicas ?? 0;
      const updated = dep.status?.updatedReplicas ?? 0;
      if (available < desired) {
        rows.push(toIssueRow({
          type: 'Deployment',
          name: dep.metadata?.name,
          namespace: dep.metadata?.namespace,
          issue: `Unhealthy: ${available}/${desired} available (updated ${updated})`,
          details: { desired, available, updated },
        }));
      }
    }
    res.json({ items: rows, scannedAt: new Date().toISOString() });
  } catch (e) {
    console.error('listDeployments error', e);
    res.status(500).json({ error: e.message });
  }
}

// ---------- Services with issues (very simple: no endpoints, just warn if no endpoints found) ----------
export async function listServices(req, res) {
  try {
    const ns = req.query.namespace || 'all';
    const svcResp = ns === 'all'
      ? await core.listServiceForAllNamespaces()
      : await core.listNamespacedService(ns);

    // Build Endpoints map
    const epResp = ns === 'all'
      ? await core.listEndpointsForAllNamespaces()
      : await core.listNamespacedEndpoints(ns);

    const byKey = new Map();
    for (const ep of epResp.body.items || []) {
      const k = `${ep.metadata?.namespace}/${ep.metadata?.name}`;
      const subsets = ep.subsets || [];
      const hasAddr = subsets.some(s => (s.addresses || []).length > 0);
      byKey.set(k, hasAddr);
    }

    const rows = [];
    for (const svc of svcResp.body.items || []) {
      const k = `${svc.metadata?.namespace}/${svc.metadata?.name}`;
      const hasEndpoints = byKey.get(k) === true;
      if (!hasEndpoints) {
        rows.push(toIssueRow({
          type: 'Service',
          name: svc.metadata?.name,
          namespace: svc.metadata?.namespace,
          issue: 'No ready endpoints',
          details: { type: svc.spec?.type, ports: svc.spec?.ports?.map(p => p.port) || [] },
        }));
      }
    }
    res.json({ items: rows, scannedAt: new Date().toISOString() });
  } catch (e) {
    console.error('listServices error', e);
    res.status(500).json({ error: e.message });
  }
}

// ---------- Problem scan (pods + deployments + warning events) ----------
export async function problemScan(req, res) {
  try {
    const issues = [];

    // Pods
    {
      const podsResp = await core.listPodForAllNamespaces();
      for (const pod of podsResp.body.items) {
        const issue = getPodIssue(pod);
        if (issue) {
          issues.push(toIssueRow({
            type: 'Pod',
            name: pod.metadata?.name,
            namespace: pod.metadata?.namespace,
            issue,
            nodeName: pod.spec?.nodeName || null,
          }));
        }
      }
    }

    // Deployments
    {
      const depResp = await apps.listDeploymentForAllNamespaces();
      for (const dep of depResp.body.items) {
        const desired = dep.spec?.replicas ?? 0;
        const available = dep.status?.availableReplicas ?? 0;
        const updated = dep.status?.updatedReplicas ?? 0;
        if (available < desired) {
          issues.push(toIssueRow({
            type: 'Deployment',
            name: dep.metadata?.name,
            namespace: dep.metadata?.namespace,
            issue: `Unhealthy: ${available}/${desired} available (updated ${updated})`,
            details: { desired, available, updated },
          }));
        }
      }
    }

    // Warning Events (best-effort)
    try {
      const evtResp = await core.listEventForAllNamespaces();
      for (const e of evtResp.body.items || []) {
        const involved = e.involvedObject || {};
        if (e.type === 'Warning' && involved.kind && involved.name) {
          issues.push(toIssueRow({
            type: `Event/${involved.kind}`,
            name: involved.name,
            namespace: involved.namespace || 'default',
            issue: e.reason || 'Warning',
            details: { message: e.message?.slice(0, 250) },
          }));
        }
      }
    } catch (_) {}

    res.json({ issues, scannedAt: new Date().toISOString() });
  } catch (e) {
    console.error('problemScan error', e);
    res.status(500).json({ error: e.message });
  }
}

// ---------- Actions ----------
export async function restartResource(req, res) {
  try {
    const { type, namespace, name } = req.body || {};
    if (!type || !namespace || !name) return res.status(400).json({ error: 'type, namespace, name required' });

    if (type === 'Pod') {
      await core.deleteNamespacedPod(name, namespace);
      return res.json({ ok: true, message: `Pod ${namespace}/${name} deleted (restarted via controller)` });
    }

    if (type === 'Deployment') {
      // patch annotation to force rollout
      const patch = [
        {
          op: 'add',
          path: '/spec/template/metadata/annotations',
          value: { 'kubectl.kubernetes.io/restartedAt': new Date().toISOString() }
        }
      ];
      await apps.patchNamespacedDeployment(
        name, namespace, patch, undefined, undefined, undefined, undefined,
        { headers: { 'Content-Type': 'application/json-patch+json' } }
      );
      return res.json({ ok: true, message: `Deployment ${namespace}/${name} restarted` });
    }

    return res.status(400).json({ error: `Unsupported type for restart: ${type}` });
  } catch (e) {
    console.error('restartResource error', e);
    res.status(500).json({ error: e.message });
  }
}

export async function scaleDeployment(req, res) {
  try {
    const { namespace, name, replicas } = req.body || {};
    if (replicas == null) return res.status(400).json({ error: 'replicas required' });
    const body = { spec: { replicas: Number(replicas) } };
    const r = await apps.patchNamespacedDeploymentScale(
      name, namespace, body, undefined, undefined, undefined, undefined,
      { headers: { 'Content-Type': 'application/merge-patch+json' } }
    );
    res.json({ ok: true, scale: r.body.spec.replicas });
  } catch (e) {
    console.error('scaleDeployment error', e);
    res.status(500).json({ error: e.message });
  }
}

export async function deleteResource(req, res) {
  try {
    const { type, namespace, name } = req.body || {};
    if (!type || !namespace || !name) return res.status(400).json({ error: 'type, namespace, name required' });

    if (type === 'Pod') {
      await core.deleteNamespacedPod(name, namespace);
      return res.json({ ok: true });
    }
    if (type === 'Deployment') {
      await apps.deleteNamespacedDeployment(name, namespace);
      return res.json({ ok: true });
    }
    if (type === 'Service') {
      await core.deleteNamespacedService(name, namespace);
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: `Unsupported type for delete: ${type}` });
  } catch (e) {
    console.error('deleteResource error', e);
    res.status(500).json({ error: e.message });
  }
}

// ---------- YAML get/replace ----------
export async function getYaml(req, res) {
  try {
    const { type, namespace, name } = req.params;
    const kind = type.toLowerCase();

    if (kind === 'pod') {
      const r = await core.readNamespacedPod(name, namespace);
      return res.type('text/yaml').send(k8sYaml.dumpYaml(r.body));
    }
    if (kind === 'deployment') {
      const r = await apps.readNamespacedDeployment(name, namespace);
      return res.type('text/yaml').send(k8sYaml.dumpYaml(r.body));
    }
    if (kind === 'service') {
      const r = await core.readNamespacedService(name, namespace);
      return res.type('text/yaml').send(k8sYaml.dumpYaml(r.body));
    }
    return res.status(400).json({ error: 'Unsupported type' });
  } catch (e) {
    console.error('getYaml error', e);
    res.status(500).json({ error: e.message });
  }
}

export async function putYaml(req, res) {
  try {
    const { type, namespace, name } = req.params;
    const { yaml } = req.body || {};
    if (!yaml) return res.status(400).json({ error: 'yaml is required' });

    const obj = k8sYaml.loadYaml(yaml);
    const kind = type.toLowerCase();

    // Replace via put
    if (kind === 'pod') {
      const r = await core.replaceNamespacedPod(name, namespace, obj);
      return res.json({ ok: true, uid: r.body.metadata?.uid });
    }
    if (kind === 'deployment') {
      const r = await apps.replaceNamespacedDeployment(name, namespace, obj);
      return res.json({ ok: true, uid: r.body.metadata?.uid });
    }
    if (kind === 'service') {
      const r = await core.replaceNamespacedService(name, namespace, obj);
      return res.json({ ok: true, uid: r.body.metadata?.uid });
    }
    return res.status(400).json({ error: 'Unsupported type' });
  } catch (e) {
    console.error('putYaml error', e);
    res.status(500).json({ error: e.message });
  }
}
