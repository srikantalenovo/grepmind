// src/pages/Resources.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

// --- API helpers (self-contained) ---
async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      'x-user-role': 'viewer', // satisfy RBAC for read-only
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

async function fetchNamespaces() {
  const data = await apiFetch('/api/cluster/namespaces');
  // Prefer array of strings; fallback to detailed mapping if provided
  if (Array.isArray(data?.namespaces)) return data.namespaces;
  if (Array.isArray(data?.namespacesDetailed)) return data.namespacesDetailed.map(n => n.name);
  return [];
}

async function fetchNodes() {
  const data = await apiFetch('/api/cluster/nodes');
  return Array.isArray(data?.nodes) ? data.nodes : [];
}

async function fetchResources({ namespace, type, search }) {
  const params = new URLSearchParams();
  // backend treats '' as ALL namespaces
  params.set('namespace', namespace ?? '');
  params.set('type', type);
  if (search) params.set('search', search);
  const data = await apiFetch(`/api/resources?${params.toString()}`);
  return Array.isArray(data?.items) ? data.items : [];
}

// --- UI constants ---
const RESOURCE_TYPES = [
  { key: 'pods', label: 'Pods' },
  { key: 'deployments', label: 'Deployments' },
  { key: 'services', label: 'Services' },
  { key: 'statefulsets', label: 'StatefulSets' },
  { key: 'daemonsets', label: 'DaemonSets' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'cronjobs', label: 'CronJobs' },
  { key: 'configmaps', label: 'ConfigMaps' },
  { key: 'persistentvolumeclaims', label: 'PVCs' },
  { key: 'ingress', label: 'Ingress' },
  { key: 'helmreleases', label: 'Helm Releases' },
  { key: 'sparkapplications', label: 'SparkApplications' },
];

function statusColor(status) {
  if (!status) return 'bg-gray-500';
  const s = String(status).toLowerCase();
  if (['running', 'ready', 'succeeded'].includes(s)) return 'bg-green-600';
  if (['pending'].includes(s)) return 'bg-yellow-500';
  if (['failed', 'notready'].includes(s)) return 'bg-red-600';
  return 'bg-gray-500';
}

export default function Resources() {
  const [namespaces, setNamespaces] = useState([]);
  const [namespace, setNamespace] = useState(''); // '' => All
  const [nodes, setNodes] = useState([]);

  const [type, setType] = useState('pods');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState([]);

  const [loadingNs, setLoadingNs] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const searchTimer = useRef(null);

  // Load namespaces
  useEffect(() => {
    (async () => {
      try {
        setLoadingNs(true);
        const ns = await fetchNamespaces();
        setNamespaces(ns);
        setNamespace(ns.includes('default') ? 'default' : '');
      } catch (err) {
        console.error('Namespaces fetch failed:', err);
        setErrMsg('Failed to load namespaces from cluster.');
      } finally {
        setLoadingNs(false);
      }
    })();
  }, []);

  // Load nodes
  useEffect(() => {
    (async () => {
      try {
        setLoadingNodes(true);
        const n = await fetchNodes();
        setNodes(n);
      } catch (err) {
        console.error('Nodes fetch failed:', err);
      } finally {
        setLoadingNodes(false);
      }
    })();
  }, []);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(searchDraft.trim()), 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchDraft]);

  // Load resources
  const loadResources = async () => {
    setLoadingData(true);
    setErrMsg('');
    try {
      const items = await fetchResources({ namespace, type, search });
      setData(items);
    } catch (err) {
      console.error('Resources fetch failed:', err);
      setErrMsg(err.message || 'Failed to fetch resources.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, type, search]);

  const subtitle = useMemo(() => {
    const typeLabel = RESOURCE_TYPES.find(t => t.key === type)?.label || type;
    return `${typeLabel} · ${namespace ? namespace : 'All Namespaces'}`;
  }, [type, namespace]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Resources</h1>
          <p className="text-gray-600">{subtitle}</p>
        </div>

        {/* Filters Card */}
        <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-md shadow-sm p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Resource type segmented buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {RESOURCE_TYPES.map(rt => (
                <button
                  key={rt.key}
                  onClick={() => setType(rt.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition
                    ${type === rt.key
                      ? 'bg-indigo-600 text-white shadow-inner'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                >
                  {rt.label}
                </button>
              ))}
            </div>

            <div className="hidden md:block h-6 w-px bg-gray-200 mx-2" />

            {/* Namespace + Search + Refresh */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <select
                className="px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={namespace}
                onChange={e => setNamespace(e.target.value)}
                disabled={loadingNs}
              >
                <option value="">All Namespaces</option>
                {namespaces.map(ns => (
                  <option key={ns} value={ns}>{ns}</option>
                ))}
              </select>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name…"
                  className="w-64 px-3 py-2 rounded-lg bg-white text-gray-800 placeholder-gray-400 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={searchDraft}
                  onChange={e => setSearchDraft(e.target.value)}
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</div>
              </div>

              <button
                onClick={loadResources}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 transition"
                title="Refresh"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid: table + nodes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table */}
        <div className="lg:col-span-9">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 backdrop-blur-md bg-white/70">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-indigo-700 text-white text-xs uppercase tracking-wide">
                    {['Name', 'Namespace', 'Status', 'Age'].map(h => (
                      <th key={h} className="px-4 py-3 text-left border-b border-indigo-200/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!loadingData && data.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-gray-600 text-center">
                        No resources found.
                      </td>
                    </tr>
                  )}

                  {data.map((row, idx) => (
                    <tr
                      key={`${row.namespace}-${row.name}-${idx}`}
                      className={idx % 2 === 0
                        ? 'bg-white hover:bg-indigo-50'
                        : 'bg-indigo-50/50 hover:bg-indigo-100/70'
                      }
                    >
                      <td className="px-4 py-3 border-b border-gray-200 text-gray-900 font-medium">{row.name}</td>
                      <td className="px-4 py-3 border-b border-gray-200 text-gray-900">{row.namespace || '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-200">
                        <span className={`px-2 py-1 rounded-full text-xs text-white ${statusColor(row.status)}`}>
                          {row.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-200 text-gray-900">{row.age || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loadingData && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 rounded-full border-2 border-indigo-200 border-t-indigo-700" />
                <span className="ml-3 text-gray-800">Loading…</span>
              </div>
            )}
          </div>
        </div>

        {/* Nodes side card */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-md shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 bg-indigo-700 text-white rounded-t-2xl">
              <div className="text-sm font-semibold">Cluster Nodes</div>
            </div>
            <div className="p-4 space-y-3">
              {loadingNodes && (
                <div className="flex items-center text-gray-700">
                  <div className="animate-spin h-5 w-5 rounded-full border-2 border-indigo-200 border-t-indigo-700 mr-2" />
                  Loading nodes…
                </div>
              )}

              {!loadingNodes && nodes.length === 0 && (
                <div className="text-sm text-gray-600">No nodes found.</div>
              )}

              {nodes.map((n) => (
                <div key={n.name} className="rounded-lg border border-gray-200 bg-white/70 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{n.name}</div>
                    <span className={`px-2 py-0.5 rounded-full text-xs text-white ${statusColor(n.status)}`}>
                      {n.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {n.kubeletVersion ? `${n.kubeletVersion} · ` : ''}
                    {n.osImage || ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {errMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          {errMsg}
        </div>
      )}
    </div>
  );
}
