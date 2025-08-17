// src/services/analyzerService.js
import {
  coreV1Api,
  appsV1Api,
  batchV1Api,
  networkingV1Api,
} from '../config/k8sClient.js';

function toAge(ts) {
  if (!ts) return 'Unknown';
  const dms = Date.now() - new Date(ts).getTime();
  const d = Math.floor(dms / (1000 * 60 * 60 * 24));
  if (d > 0) return `${d}d`;
  const h = Math.floor(dms / (1000 * 60 * 60));
  if (h > 0) return `${h}h`;
  const m = Math.floor(dms / (1000 * 60));
  return `${m}m`;
}

function sevLabel(level) {
  switch (level) {
    case 'critical':
    case 'warning':
    case 'info':
    case 'ok':
      return level;
    default:
      return 'info';
  }
}

function podIssue(pod) {
  // Default: OK
  let issue = '';
  let severity = 'ok';

  const phase = pod?.status?.phase || 'Unknown';
  const conditions = pod?.status?.conditions || [];
  const creation = pod?.metadata?.creationTimestamp;

  const ready = conditions.find(c => c.type === 'Ready');
  const cs = pod?.status?.containerStatuses || [];

  // Waiting/Terminated reasons
  for (const c of cs) {
    const waitingReason = c?.state?.waiting?.reason || '';
    const termReason = c?.state?.terminated?.reason || '';

    if (/CrashLoopBackOff/i.test(waitingReason)) {
      issue = 'CrashLoopBackOff';
      severity = 'critical';
      break;
    }
    if (/ImagePullBackOff|ErrImagePull/i.test(waitingReason)) {
      issue = waitingReason;
      severity = 'critical';
      break;
    }
    if (/OOMKilled/i.test(termReason)) {
      issue = 'OOMKilled';
      severity = 'critical';
      break;
    }
  }

  if (!issue) {
    if (/Failed/i.test(phase)) {
      issue = 'Failed';
      severity = 'critical';
    } else if (/Pending/i.test(phase)) {
      // Pending > 10m -> warning
      const created = creation ? new Date(creation).getTime() : 0;
      if (created && Date.now() - created > 10 * 60 * 1000) {
        issue = 'Pending >10m';
        severity = 'warning';
      } else {
        issue = 'Pending';
        severity = 'info';
      }
    } else if (ready && ready.status !== 'True') {
      issue = 'NotReady';
      severity = 'warning';
    } else if (/Unknown/i.test(phase)) {
      issue = 'Unknown';
      severity = 'warning';
    }
  }

  return { issue, severity: sevLabel(severity) };
}

function deploymentIssue(dep) {
  const desired = dep?.spec?.replicas ?? 1;
  const available = dep?.status?.availableReplicas ?? 0;
  if (available < desired) {
    return {
      issue: `Unavailable: ${available}/${desired} ready`,
      severity: available === 0 ? 'critical' : 'warning',
    };
  }
  return { issue: '', severity: 'ok' };
}

function daemonSetIssue(ds) {
  const desired = ds?.status?.desiredNumberScheduled ?? 0;
  const available = ds?.status?.numberAvailable ?? 0;
  if (available < desired) {
    return {
      issue: `Unavailable: ${available}/${desired} available`,
      severity: available === 0 ? 'critical' : 'warning',
    };
  }
  return { issue: '', severity: 'ok' };
}

function statefulSetIssue(ss) {
  const desired = ss?.spec?.replicas ?? 1;
  const ready = ss?.status?.readyReplicas ?? 0;
  if (ready < desired) {
    return {
      issue: `Not Ready: ${ready}/${desired}`,
      severity: ready === 0 ? 'critical' : 'warning',
    };
  }
  return { issue: '', severity: 'ok' };
}

function jobIssue(job) {
  const failed = job?.status?.failed ?? 0;
  if (failed > 0) return { issue: `Failed: ${failed}`, severity: 'critical' };
  return { issue: '', severity: 'ok' };
}

function cronJobIssue(_cj) {
  // Basic pass-through — can extend later
  return { issue: '', severity: 'ok' };
}

function genericOk() {
  return { issue: '', severity: 'ok' };
}

const TYPE_ORDER = [
  'Pod', 'Deployment', 'StatefulSet', 'DaemonSet',
  'Job', 'CronJob', 'Service', 'Ingress', 'ConfigMap', 'Secret',
  'PersistentVolumeClaim',
];

function mapItem(kind, ns, name, status, issueObj, createdAt, lastSeen) {
  return {
    type: kind,
    name,
    namespace: ns || 'default',
    status,
    age: toAge(createdAt),
    issue: issueObj.issue,
    severity: issueObj.severity, // ok | info | warning | critical
    lastSeen: lastSeen || null,
  };
}

export async function scanResources({
  namespace = 'all',
  resourceType = 'all',
  search = '',
  problemsOnly = false,
}) {
  const items = [];
  const isAll = (namespace || '').toLowerCase() === 'all';

  // Preload events per namespace once (for lastSeen); best-effort
  const nsList = isAll
    ? (await coreV1Api.listNamespace()).body.items.map(n => n.metadata?.name).filter(Boolean)
    : [namespace];

  const lastSeenMap = {}; // key: `${ns}|${kind}|${name}` -> ISO timestamp
  await Promise.all(
    nsList.map(async (ns) => {
      try {
        const evs = (await coreV1Api.listNamespacedEvent(ns)).body.items || [];
        for (const ev of evs) {
          const k = `${ev.involvedObject?.namespace || ns}|${ev.involvedObject?.kind}|${ev.involvedObject?.name}`;
          const ts = ev.lastTimestamp || ev.eventTime || ev.firstTimestamp;
          if (ts) {
            if (!lastSeenMap[k] || new Date(ts) > new Date(lastSeenMap[k])) {
              lastSeenMap[k] = ts;
            }
          }
        }
      } catch (e) {
        console.warn('[WARN] events fetch failed for ns=', ns, e?.body?.message || e.message);
      }
    })
  );

  const match = (name) =>
    !search || String(name || '').toLowerCase().includes(search.toLowerCase());

  const pickLastSeen = (ns, kind, name) => lastSeenMap[`${ns}|${kind}|${name}`];

  // Helper to push with filter
  const push = (entry) => {
    if (!match(entry.name)) return;
    if (problemsOnly && (entry.severity === 'ok' || entry.issue === '')) return;
    items.push(entry);
  };

  // Decide what to scan
  const scans = (resourceType === 'all'
    ? ['pods', 'deployments', 'statefulsets', 'daemonsets', 'jobs', 'cronjobs',
       'services', 'ingress', 'configmaps', 'secrets', 'persistentvolumeclaims']
    : [resourceType.toLowerCase()]
  );

  // Pods
  if (scans.includes('pods')) {
    const res = isAll
      ? await coreV1Api.listPodForAllNamespaces()
      : await coreV1Api.listNamespacedPod(namespace);
    for (const p of res.body.items || []) {
      const ns = p.metadata?.namespace;
      const name = p.metadata?.name;
      const status = p.status?.phase || 'Unknown';
      const issueObj = podIssue(p);
      push(
        mapItem(
          'Pod', ns, name, status, issueObj,
          p.metadata?.creationTimestamp,
          pickLastSeen(ns, 'Pod', name),
        )
      );
    }
  }

  // Deployments
  if (scans.includes('deployments')) {
    const res = isAll
      ? await appsV1Api.listDeploymentForAllNamespaces()
      : await appsV1Api.listNamespacedDeployment(namespace);
    for (const d of res.body.items || []) {
      const ns = d.metadata?.namespace;
      const name = d.metadata?.name;
      const issueObj = deploymentIssue(d);
      push(
        mapItem(
          'Deployment', ns, name, '—',
          issueObj, d.metadata?.creationTimestamp,
          pickLastSeen(ns, 'Deployment', name),
        )
      );
    }
  }

  // StatefulSets
  if (scans.includes('statefulsets')) {
    const res = isAll
      ? await appsV1Api.listStatefulSetForAllNamespaces()
      : await appsV1Api.listNamespacedStatefulSet(namespace);
    for (const s of res.body.items || []) {
      const ns = s.metadata?.namespace;
      const name = s.metadata?.name;
      const issueObj = statefulSetIssue(s);
      push(
        mapItem(
          'StatefulSet', ns, name, '—',
          issueObj, s.metadata?.creationTimestamp,
          pickLastSeen(ns, 'StatefulSet', name),
        )
      );
    }
  }

  // DaemonSets
  if (scans.includes('daemonsets')) {
    const res = isAll
      ? await appsV1Api.listDaemonSetForAllNamespaces()
      : await appsV1Api.listNamespacedDaemonSet(namespace);
    for (const d of res.body.items || []) {
      const ns = d.metadata?.namespace;
      const name = d.metadata?.name;
      const issueObj = daemonSetIssue(d);
      push(
        mapItem(
          'DaemonSet', ns, name, '—',
          issueObj, d.metadata?.creationTimestamp,
          pickLastSeen(ns, 'DaemonSet', name),
        )
      );
    }
  }

  // Jobs
  if (scans.includes('jobs')) {
    const res = isAll
      ? await batchV1Api.listJobForAllNamespaces()
      : await batchV1Api.listNamespacedJob(namespace);
    for (const j of res.body.items || []) {
      const ns = j.metadata?.namespace;
      const name = j.metadata?.name;
      const issueObj = jobIssue(j);
      push(
        mapItem(
          'Job', ns, name, '—',
          issueObj, j.metadata?.creationTimestamp,
          pickLastSeen(ns, 'Job', name),
        )
      );
    }
  }

  // CronJobs
  if (scans.includes('cronjobs')) {
    const res = isAll
      ? await batchV1Api.listCronJobForAllNamespaces()
      : await batchV1Api.listNamespacedCronJob(namespace);
    for (const cj of res.body.items || []) {
      const ns = cj.metadata?.namespace;
      const name = cj.metadata?.name;
      const issueObj = cronJobIssue(cj);
      push(
        mapItem(
          'CronJob', ns, name, '—',
          issueObj, cj.metadata?.creationTimestamp,
          pickLastSeen(ns, 'CronJob', name),
        )
      );
    }
  }

  // Services
  if (scans.includes('services')) {
    const res = isAll
      ? await coreV1Api.listServiceForAllNamespaces()
      : await coreV1Api.listNamespacedService(namespace);
    for (const s of res.body.items || []) {
      const ns = s.metadata?.namespace;
      const name = s.metadata?.name;
      push(
        mapItem(
          'Service', ns, name, '—',
          genericOk(), s.metadata?.creationTimestamp,
          pickLastSeen(ns, 'Service', name),
        )
      );
    }
  }

  // Ingress
  if (scans.includes('ingress')) {
    const res = isAll
      ? await networkingV1Api.listIngressForAllNamespaces()
      : await networkingV1Api.listNamespacedIngress(namespace);
    for (const ing of res.body.items || []) {
      const ns = ing.metadata?.namespace;
      const name = ing.metadata?.name;
      push(
        mapItem(
          'Ingress', ns, name, '—',
          genericOk(), ing.metadata?.creationTimestamp,
          pickLastSeen(ns, 'Ingress', name),
        )
      );
    }
  }

  // ConfigMaps
  if (scans.includes('configmaps')) {
    const res = isAll
      ? await coreV1Api.listConfigMapForAllNamespaces()
      : await coreV1Api.listNamespacedConfigMap(namespace);
    for (const cm of res.body.items || []) {
      const ns = cm.metadata?.namespace;
      const name = cm.metadata?.name;
      push(
        mapItem(
          'ConfigMap', ns, name, '—',
          genericOk(), cm.metadata?.creationTimestamp,
          pickLastSeen(ns, 'ConfigMap', name),
        )
      );
    }
  }

  // Secrets
  if (scans.includes('secrets')) {
    const res = isAll
      ? await coreV1Api.listSecretForAllNamespaces()
      : await coreV1Api.listNamespacedSecret(namespace);
    for (const sec of res.body.items || []) {
      const ns = sec.metadata?.namespace;
      const name = sec.metadata?.name;
      push(
        mapItem(
          'Secret', ns, name, '—',
          genericOk(), sec.metadata?.creationTimestamp,
          pickLastSeen(ns, 'Secret', name),
        )
      );
    }
  }

  // PVC
  if (scans.includes('persistentvolumeclaims')) {
    const res = isAll
      ? await coreV1Api.listPersistentVolumeClaimForAllNamespaces()
      : await coreV1Api.listNamespacedPersistentVolumeClaim(namespace);
    for (const pvc of res.body.items || []) {
      const ns = pvc.metadata?.namespace;
      const name = pvc.metadata?.name;
      push(
        mapItem(
          'PersistentVolumeClaim', ns, name, '—',
          genericOk(), pvc.metadata?.creationTimestamp,
          pickLastSeen(ns, 'PersistentVolumeClaim', name),
        )
      );
    }
  }

  // sort by TYPE_ORDER then namespace then name
  const typeRank = (t) => {
    const i = TYPE_ORDER.indexOf(t);
    return i >= 0 ? i : 999;
  };
  items.sort((a, b) =>
    typeRank(a.type) - typeRank(b.type) ||
    a.namespace.localeCompare(b.namespace) ||
    a.name.localeCompare(b.name)
  );

  return items;
}
