// src/components/AnalyzerDetailsDrawer.jsx
import React, { useEffect, useState } from 'react';
import YAML from 'js-yaml';


const API_BASE = import.meta.env.VITE_API_BASE || '';

// ---------- apiFetch ----------
async function apiFetch(path, opts = {}, role = 'editor') {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      'x-user-role': role,
      ...(!opts.headers?.['Content-Type'] && { 'Content-Type': 'application/json' }),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

// ---------- mapTypeKeys ----------
// function mapTypeKeys(displayType) {
//   const t = (displayType || '').toLowerCase();
//   switch (t) {
//     case 'pod': return { apiType: 'pods', kind: 'pods' };
//     case 'deployment': return { apiType: 'deployments', kind: 'deployments' };
//     case 'statefulset': return { apiType: 'statefulsets', kind: 'statefulsets' };
//     case 'daemonset': return { apiType: 'daemonsets', kind: 'daemonsets' };
//     case 'job': return { apiType: 'jobs', kind: 'jobs' };
//     case 'cronjob': return { apiType: 'cronjobs', kind: 'cronjobs' };
//     case 'service': return { apiType: 'services', kind: 'services' };
//     case 'ingress': return { apiType: 'ingresses', kind: 'ingresses' }; // ✅ fixed plural
//     case 'configmap': return { apiType: 'configmaps', kind: 'configmaps' };
//     case 'secret': return { apiType: 'secrets', kind: 'secrets' };
//     case 'persistentvolumeclaim':
//       return { apiType: 'persistentvolumeclaims', kind: 'persistentvolumeclaims' };
//     default:
//       return { apiType: t + 's', kind: t + 's' };
//   }
// }


function mapTypeKeys(displayType) {
  const t = (displayType || '').toLowerCase();
  switch (t) {
    case 'pod': return { apiType: 'pods', kind: 'Pod' };
    case 'deployment': return { apiType: 'deployments', kind: 'Deployment' };
    case 'statefulset': return { apiType: 'statefulsets', kind: 'StatefulSet' };
    case 'daemonset': return { apiType: 'daemonsets', kind: 'DaemonSet' };
    case 'job': return { apiType: 'jobs', kind: 'Job' };
    case 'cronjob': return { apiType: 'cronjobs', kind: 'CronJob' };
    case 'service': return { apiType: 'services', kind: 'Service' };
    case 'ingress': return { apiType: 'ingresses', kind: 'Ingress' };
    case 'configmap': return { apiType: 'configmaps', kind: 'ConfigMap' };
    case 'secret': return { apiType: 'secrets', kind: 'Secret' };
    case 'persistentvolumeclaim':
      return { apiType: 'persistentvolumeclaims', kind: 'PersistentVolumeClaim' };
    // Optional RBAC objects
    case 'role': return { apiType: 'roles', kind: 'Role' };
    case 'rolebinding': return { apiType: 'rolebindings', kind: 'RoleBinding' };
    case 'clusterrole': return { apiType: 'clusterroles', kind: 'ClusterRole' };
    case 'clusterrolebinding': return { apiType: 'clusterrolebindings', kind: 'ClusterRoleBinding' };
    default:
      return {
        apiType: t + 's',
        kind: t.charAt(0).toUpperCase() + t.slice(1),
      };
  }
}



// ---------- Component ----------
export default function AnalyzerDetailsDrawer({ open, onClose, resource, role, onActionDone }) {
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null);
  const [events, setEvents] = useState([]);
  const [yamlText, setYamlText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [scaleDraft, setScaleDraft] = useState('');

  const canEdit = role === 'editor' || role === 'admin';
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!open || !resource) return;
    const { apiType } = mapTypeKeys(resource.type);

    setLoading(true);
    (async () => {
      try {
        const [details, yamlRes, evs] = await Promise.all([
            apiFetch(`/api/analyzer/${resource.namespace}/${apiType}/${resource.name}/details`, {}, role),
            apiFetch(`/api/analyzer/${resource.namespace}/${apiType}/${resource.name}/yaml`, {}, role),
            apiFetch(`/api/analyzer/${resource.namespace}/${resource.name}/events`, {}, role),
        ]);
        setMeta(details);
        setYamlText(typeof yamlRes === 'string' ? yamlRes : '');
        setEvents(Array.isArray(evs) ? evs : []);
        // pre-set scaleDraft if deployment
        if (resource.type === 'Deployment') {
          const replicas = details?.spec?.replicas ?? '';
          setScaleDraft(String(replicas));
        } else {
          setScaleDraft('');
        }
      } catch (e) {
        console.error('Drawer load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, resource, role]);

  if (!open || !resource) return null;

  const { apiType, kind } = mapTypeKeys(resource.type);
  const confirm = (msg) => window.confirm(msg);

  // ---------- Actions ----------
  const doRestartPod = async () => {
    if (!confirm(`Restart pod ${resource.name}? This deletes the pod to let controller recreate it.`)) return;
    await apiFetch(`/api/analyzer/${resource.namespace}/pods/${resource.name}/restart`, { method: 'POST' }, role);
    onActionDone?.();
    onClose();
  };

  const doDelete = async () => {
    if (!confirm(`Delete ${resource.type} ${resource.name}? This cannot be undone.`)) return;
    const path = `/api/analyzer/${resource.namespace}/${apiType}/${resource.name}`;
    await apiFetch(path, { method: 'DELETE' }, role);
    onActionDone?.();
    onClose();
  };

// scale
const doScale = async () => {
  const replicas = parseInt(scaleDraft, 10);
  if (!Number.isInteger(replicas) || replicas < 0) {
    alert('Please enter a valid non-negative integer for replicas.');
    return;
  }
  try {
    await apiFetch(
      `/api/analyzer/${resource.namespace}/deployments/${resource.name}/scale`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replicas }),
      },
      role
    );
    onActionDone?.(); onClose();
  } catch (e) {
    console.error('Scale error:', e);
    alert(`Failed to scale: ${e.message}`);
  }
};

// apply YAML
const doApplyYaml = async () => {
  try {
    if (!yamlText?.trim()) {
      alert('YAML is empty'); return;
    }
    let parsed;
    try { parsed = YAML.load(yamlText); }  // <-- use YAML.load to match backend
    catch (err) { alert(`Invalid YAML: ${err.message}`); return; }

    const yamlKind = parsed?.kind;
    if (!yamlKind) { alert('YAML must include a kind'); return; }

    // name & namespace checks
    if (parsed?.metadata?.name !== resource.name) {
      alert(`YAML name (${parsed?.metadata?.name}) does not match resource name (${resource.name})`);
      return;
    }
    if (parsed?.metadata?.namespace && parsed.metadata.namespace !== resource.namespace) {
      alert(`YAML namespace (${parsed.metadata.namespace}) does not match resource namespace (${resource.namespace})`);
      return;
    }

    // path uses plural apiType derived from YAML.kind
    const { apiType: yamlApiType } = mapTypeKeys(yamlKind);

    await apiFetch(
      `/api/analyzer/${resource.namespace}/${yamlApiType}/${resource.name}/edit`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml: yamlText }),
      },
      role
    );
    onActionDone?.(); onClose();
  } catch (e) {
    console.error('Apply YAML failed:', e);
    alert(`Apply failed: ${e.message}`);
  }
};



  const doViewSecret = async () => {
    try {
      const sec = await apiFetch(`/api/analyzer/${resource.namespace}/secrets/${resource.name}/view`, {}, role);
      const pretty = JSON.stringify(sec, null, 2);
      alert(`Secret (decoded):\n\n${pretty}`);
    } catch (e) {
      alert(`Failed to view secret: ${e.message}`);
    }
  };

  
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full sm:w-[540px] bg-white shadow-2xl rounded-l-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-indigo-700 text-white">
          <div className="text-sm">Resource Details</div>
          <div className="text-lg font-semibold truncate">
            {resource?.type} · {resource?.namespace}/{resource?.name}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {loading && (
            <div className="flex items-center text-gray-700">
              <div className="animate-spin h-5 w-5 rounded-full border-2 border-indigo-200 border-t-indigo-700 mr-2" />
              Loading…
            </div>
          )}

          {!loading && meta && (
            <>
              {/* Overview */}
              <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
                <div className="font-medium text-gray-900 mb-1">Overview</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div><span className="font-semibold">Kind:</span> {meta.kind}</div>
                  <div><span className="font-semibold">Name:</span> {meta.metadata?.name}</div>
                  <div><span className="font-semibold">Namespace:</span> {meta.metadata?.namespace}</div>
                  <div><span className="font-semibold">Created:</span> {meta.metadata?.creationTimestamp}</div>
                </div>
              </div>

              {/* Events */}
              <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
                <div className="font-medium text-gray-900 mb-2">Events</div>
                {events.length === 0 ? (
                  <div className="text-sm text-gray-600">No recent events.</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {events.map((ev, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-800">{ev.type}</span>
                          <span className="font-semibold">{ev.reason}</span>
                          <span className="text-gray-500">{ev.lastTimestamp || ev.firstTimestamp}</span>
                        </div>
                        <div className="text-gray-700 ml-1">{ev.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* YAML */}
              <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">YAML</div>
                  {isAdmin && (
                    <button
                      className={`px-3 py-1 rounded-lg text-white ${editMode ? 'bg-gray-600' : 'bg-indigo-600'} hover:opacity-90`}
                      onClick={() => setEditMode(v => !v)}
                    >
                      {editMode ? 'Cancel Edit' : 'Edit YAML'}
                    </button>
                  )}
                </div>
                {editMode ? (
                  <textarea
                    className="mt-2 w-full h-56 font-mono text-sm p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={yamlText}
                    onChange={e => setYamlText(e.target.value)}
                  />
                ) : (
                  <pre className="mt-2 w-full h-56 overflow-auto bg-gray-50 p-2 rounded-lg text-xs">
                    {yamlText}
                  </pre>
                )}
                {editMode && isAdmin && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={doApplyYaml}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Validate & Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
                <div className="font-medium text-gray-900 mb-2">Actions</div>
                <div className="flex flex-wrap gap-2">
                  {/* Viewer: Details only (already showing) */}

                  {/* Editor+ */}
                  {(resource.type === 'Pod') && (role === 'editor' || role === 'admin') && (
                    <button
                      onClick={doRestartPod}
                      className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                      title="Delete pod so controller restarts it"
                    >
                      Restart Pod
                    </button>
                  )}

                  {(resource.type === 'Deployment') && (role === 'editor' || role === 'admin') && (
                    <>
                      <input
                        className="px-3 py-2 rounded-lg border"
                        placeholder="replicas"
                        value={scaleDraft}
                        onChange={e => setScaleDraft(e.target.value)}
                        style={{ width: 120 }}
                      />
                      <button
                        onClick={doScale}
                        className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                      >
                        Scale
                      </button>
                    </>
                  )}

                  {/* Admin */}
                  {role === 'admin' && resource.type === 'Secret' && (
                    <button
                      onClick={doViewSecret}
                      className="px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                    >
                      View Secret
                    </button>
                  )}

                  {role === 'admin' && (
                    <button
                      onClick={doDelete}
                      className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete {resource.type}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-white/80">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
