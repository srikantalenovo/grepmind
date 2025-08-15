import k8s from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const core = kc.makeApiClient(k8s.CoreV1Api);
const apps = kc.makeApiClient(k8s.AppsV1Api);

// Utility to determine if a pod has issues
function getPodIssue(pod) {
  const phase = pod?.status?.phase;
  const cs = pod?.status?.containerStatuses || [];
  const restarts = cs.reduce((sum, c) => sum + (c.restartCount || 0), 0);

  // Collect possible failure reasons
  const reasons = new Set(
    cs
      .map((c) => [
        c?.state?.waiting?.reason,
        c?.state?.terminated?.reason,
        c?.lastState?.terminated?.reason,
        c?.lastState?.waiting?.reason,
      ])
      .flat()
      .filter(Boolean)
  );

  // Readiness condition check
  const cond = (pod.status?.conditions || []).find(c => c.type === 'Ready');
  const readyProblem =
    cond && (cond.status === 'False' || cond.status === 'Unknown')
      ? cond.reason || 'NotReady'
      : null;

  if (phase !== 'Running') return phase || 'NotRunning';
  if (restarts > 3) return `High restarts: ${restarts}`;
  if (reasons.size) return Array.from(reasons).join(', ');
  if (readyProblem) return readyProblem;

  return null;
}

export async function problemScan(req, res) {
  try {
    const issues = [];

    // --- Scan Pods ---
    const podsResp = await core.listPodForAllNamespaces();
    for (const pod of podsResp.body.items) {
      const issue = getPodIssue(pod);
      if (issue) {
        issues.push({
          type: 'Pod',
          name: pod.metadata?.name,
          namespace: pod.metadata?.namespace,
          issue,
          nodeName: pod.spec?.nodeName || null,
        });
      }
    }

    // --- Scan Deployments ---
    const depResp = await apps.listDeploymentForAllNamespaces();
    for (const dep of depResp.body.items) {
      const desired = dep.spec?.replicas ?? 0;
      const available = dep.status?.availableReplicas ?? 0;
      const updated = dep.status?.updatedReplicas ?? 0;

      if (available < desired) {
        issues.push({
          type: 'Deployment',
          name: dep.metadata?.name,
          namespace: dep.metadata?.namespace,
          issue: `Unhealthy: ${available}/${desired} available (updated ${updated})`,
        });
      }
    }

    // --- Optional: Include Warning Events ---
    try {
      const evtResp = await core.listEventForAllNamespaces();
      for (const e of evtResp.body.items || []) {
        const involved = e.involvedObject || {};
        if (e.type === 'Warning' && involved.kind && involved.name) {
          issues.push({
            type: `Event/${involved.kind}`,
            name: involved.name,
            namespace: involved.namespace || 'default',
            issue: e.reason || 'Warning',
            message: e.message?.slice(0, 200),
          });
        }
      }
    } catch {
      // Ignore if cluster restricts Events API
    }

    res.json({ issues });
  } catch (err) {
    console.error('Problem Scan Error:', err);
    res.status(500).json({ error: err.message });
  }
}
