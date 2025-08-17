// src/pages/Resources.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      'x-user-role': 'viewer',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

async function fetchNamespaces() {
  return apiFetch('/api/cluster/namespaces');
}
async function fetchNodes() {
  return apiFetch('/api/cluster/nodes');
}
async function fetchResources({ namespace, resourceType, search }) {
  const params = new URLSearchParams();
  params.set('namespace', namespace ?? 'all');
  params.set('resourceType', resourceType);
  if (search) params.set('search', search);
  const data = await apiFetch(`/api/resources?${params.toString()}`);
  return Array.isArray(data?.items) ? data.items : [];
}

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
  const [namespaces, setNamespaces] = useState(['all']);
  const [namespace, setNamespace] = useState('all');
  const [nodes, setNodes] = useState([]);
  const [type, setType] = useState('pods');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState([]);
  const [loadingNs, setLoadingNs] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingNs(true);
        const ns = await fetchNamespaces();
        if (Array.isArray(ns) && ns.length > 0) {
          setNamespaces(ns);
          setNamespace(ns.includes('all') ? 'all' : ns[0]);
        }
      } catch (err) {
        console.error('Failed to fetch namespaces', err);
        setErrMsg('Failed to load namespaces from cluster.');
      } finally {
        setLoadingNs(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoadingNodes(true);
        const n = await fetchNodes();
        setNodes(Array.isArray(n) ? n : []);
      } catch (err) {
        console.error('Failed to fetch nodes', err);
      } finally {
        setLoadingNodes(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(searchDraft.trim()), 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchDraft]);

  const loadResources = async () => {
    setLoadingData(true);
    setErrMsg('');
    try {
      const items = await fetchResources({ namespace, resourceType: type, search });
      setData(items);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch resources', err);
      setErrMsg(err.message || 'Failed to fetch resources.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, [namespace, type, search]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadResources();
    }, 30 * 60 * 1000); // 30 minutes in ms

    return () => clearInterval(intervalId);
  }, [namespace, type, search]);

  const subtitle = useMemo(() => {
    const typeLabel = RESOURCE_TYPES.find(t => t.key === type)?.label || type;
    return `${typeLabel} · ${namespace === 'all' ? 'All Namespaces' : namespace}`;
  }, [type, namespace]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">{subtitle}</h1>
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>

        {/* Filters Card */}
        <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-md shadow-sm p-3 w-full md:w-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Resource type dropdown */}
            <select
              className="px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              {RESOURCE_TYPES.map(rt => (
                <option key={rt.key} value={rt.key}>{rt.label}</option>
              ))}
            </select>

            <div className="hidden md:block h-6 w-px bg-gray-200 mx-2" />

            {/* Namespace + Search + Refresh */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <select
                className="px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={namespace}
                onChange={e => setNamespace(e.target.value)}
                disabled={loadingNs}
              >
                {namespaces.map(ns => (
                  <option key={ns} value={ns}>{ns === 'all' ? 'All Namespaces' : ns}</option>
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Resource Table */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-md shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Namespace</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loadingData ? (
                  <tr><td colSpan="4" className="px-6 py-4 text-center">Loading...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-4 text-center">No resources found.</td></tr>
                ) : (
                  data.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.namespace}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${statusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.age}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nodes Panel */}
        <div>
          <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-md shadow overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 font-semibold">Cluster Nodes</div>
            <div className="divide-y divide-gray-200">
              {loadingNodes ? (
                <div className="px-6 py-4">Loading...</div>
              ) : nodes.length === 0 ? (
                <div className="px-6 py-4">No nodes found.</div>
              ) : (
                nodes.map((node, idx) => (
                  <div key={idx} className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">{node.name}</div>
                    <div className="text-gray-500">CPU: {node.cpu} | Memory: {node.memory}</div>
                    <div className="text-gray-500">Internal IP: {node.internalIP}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {errMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          {errMsg}
        </div>
      )}
    </div>
  );
}
