// src/pages/Analyzer.jsx
import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import AnalyzerDetailsDrawer from '../components/AnalyzerDetailsDrawer.jsx';
import { AuthContext } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || ''; // e.g. ''

async function apiFetch(path, opts = {}, role = 'editor') {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      'x-user-role': role, // RBAC header
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

async function fetchNamespaces(role) {
  return apiFetch('/api/cluster/namespaces', {}, role);
}

// async function scanAnalyzer({ namespace, resourceType, search, problemsOnly }, role) {
//   const params = new URLSearchParams();
//   if (namespace) params.set('namespace', namespace);
//   if (resourceType) params.set('resourceType', resourceType);
//   if (search) params.set('search', search);
//   params.set('problemsOnly', problemsOnly ? 'true' : 'false');
//   //if (problemsOnly) params.set('problemsOnly', 'true');
//   return apiFetch(`/analyzer/scan?${params.toString()}`, {}, role);
// }


async function scanAnalyzer({ namespace, resourceType, search, problemsOnly }) {
  const params = new URLSearchParams();
  params.set('namespace', namespace ?? 'all');   // ✅ default to "all"
  if (resourceType) params.set('resourceType', resourceType);
  if (search) params.set('search', search);
  params.set('problemsOnly', problemsOnly ? 'true' : 'false');

  const data = await apiFetch(`/api/analyzer/scan?${params.toString()}`);  // ✅ match /api prefix
  return Array.isArray(data?.items) ? data.items : [];  // ✅ unwrap items
}


const RESOURCE_TYPES = [
  { key: 'all', label: 'All Types' },
  { key: 'pods', label: 'Pods' },
  { key: 'deployments', label: 'Deployments' },
  { key: 'statefulsets', label: 'StatefulSets' },
  { key: 'daemonsets', label: 'DaemonSets' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'cronjobs', label: 'CronJobs' },
  { key: 'services', label: 'Services' },
  { key: 'ingress', label: 'Ingress' },
  { key: 'configmaps', label: 'ConfigMaps' },
  { key: 'secrets', label: 'Secrets' },
  { key: 'persistentvolumeclaims', label: 'PVCs' },
];

function badgeColor(sev) {
  switch (String(sev || '').toLowerCase()) {
    case 'critical': return 'bg-red-600';
    case 'warning':  return 'bg-yellow-500 text-black';
    case 'info':     return 'bg-orange-500';
    case 'ok':       return 'bg-green-600';
    default:         return 'bg-gray-500';
  }
}

function rowColor(item) {
  const sev = (item.severity || '').toLowerCase();
  if (sev === 'critical') return 'bg-red-50';
  if (sev === 'warning')  return 'bg-yellow-50';
  if (sev === 'ok')       return 'bg-green-50';
  return 'bg-orange-50';
}

export default function Analyzer() {
  const { user } = useContext(AuthContext);
  const role = user?.role || 'editor';

  const [namespaces, setNamespaces] = useState(['all']);
  const [namespace, setNamespace] = useState('all');
  const [type, setType] = useState('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [problemsOnly, setProblemsOnly] = useState(false);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const searchTimer = useRef(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null); // { type, name, namespace, ... }

  useEffect(() => {
    (async () => {
      try {
        const ns = await fetchNamespaces(role);
        setNamespaces(ns);
        setNamespace(ns.includes('all') ? 'all' : ns[0]);
      } catch (e) {
        console.error('Failed to load namespaces', e);
        setErrMsg('Failed to load namespaces');
      }
    })();
  }, [role]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(searchDraft.trim()), 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchDraft]);

  const load = async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const res = await scanAnalyzer({ namespace, resourceType: type, search, problemsOnly }, role);
      setData(res.items || []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Analyzer scan failed', e);
      setErrMsg(e.message || 'Failed to scan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, type, search, problemsOnly, role]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 5 * 60 * 1000); // 5 min
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, namespace, type, search, problemsOnly, role]);

  const subtitle = useMemo(() => {
    const label = RESOURCE_TYPES.find(t => t.key === type)?.label || type;
    return `${label} · ${namespace === 'all' ? 'All Namespaces' : namespace}`;
  }, [type, namespace]);

  const onRowClick = (row) => {
    setSelected(row); // includes {type, name, namespace}
    setDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-100 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Analyzer</h1>
          <p className="text-sm text-gray-600">{subtitle}</p>
          {lastUpdated && (
            <p className="text-sm text-gray-500">Last updated: {lastUpdated.toLocaleString()}</p>
          )}
        </div>

        {/* Controls */}
        <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-md shadow-sm p-3 w-full md:w-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
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

            <select
              className="px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={namespace}
              onChange={e => setNamespace(e.target.value)}
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

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={problemsOnly}
                onChange={() => setProblemsOnly(v => !v)}
              />
              Show only problematic
            </label>

            <button
              onClick={load}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 transition"
              title="Refresh"
            >
              Refresh
            </button>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={() => setAutoRefresh(v => !v)}
              />
              Auto-refresh (5m)
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 backdrop-blur-md bg-white/70">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">
            <thead>
              <tr className="bg-indigo-700 text-white text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left border-b border-indigo-200/40 w-[10%]">Type</th>
                <th className="px-4 py-3 text-left border-b border-indigo-200/40 w-[25%]">Name</th>
                <th className="px-4 py-3 text-left border-b border-indigo-200/40 w-[15%]">Namespace</th>
                <th className="px-4 py-3 text-left border-b border-indigo-200/40 w-[10%]">Status</th>
                <th className="px-4 py-3 text-left border-b border-indigo-200/40 w-[20%]">Issue</th>
                <th className="px-4 py-3 text-left border-b border-indigo-200/40 w-[10%]">Severity</th>
                <th className="px-4 py-3 text-left border-b border-indigo-200/40 w-[10%]">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-gray-600 text-center">
                    {errMsg || 'No resources found.'}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-gray-700 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 rounded-full border-2 border-indigo-200 border-t-indigo-700" />
                      <span className="ml-3">Scanning…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && data.map((row, idx) => (
                <tr
                  key={`${row.namespace}-${row.type}-${row.name}-${idx}`}
                  className={`transition hover:bg-indigo-50 cursor-pointer ${rowColor(row)}`}
                  onClick={() => onRowClick(row)}
                >
                  <td className="px-4 py-3 border-b border-gray-200 text-gray-900 whitespace-nowrap">{row.type}</td>
                  <td className="px-4 py-3 border-b border-gray-200 text-gray-900 font-medium whitespace-nowrap">
                    <div className="truncate" title={row.name}>{row.name}</div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 text-gray-900 whitespace-nowrap">
                    {row.namespace}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 text-gray-900 whitespace-nowrap">
                    {row.status || '—'}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 text-gray-900">
                    <div className="truncate" title={row.issue || '—'}>
                      {row.issue || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200">
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${badgeColor(row.severity)}`}>
                      {row.severity?.toUpperCase() || 'OK'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 text-gray-900 whitespace-nowrap">
                    {row.lastSeen ? new Date(row.lastSeen).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <AnalyzerDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        resource={selected}     // { type, name, namespace }
        role={role}
        onActionDone={load}     // refresh after actions
      />
    </div>
  );
}
