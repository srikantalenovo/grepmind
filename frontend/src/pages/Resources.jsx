import React, { useEffect, useMemo, useRef, useState } from 'react';

// --- API Helpers ---
async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      'x-user-role': 'viewer', // optional if you still use RBAC middleware
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json();
}

async function fetchNamespaces() {
  const data = await apiFetch('/api/cluster/namespaces');
  return (data?.namespaces || []).map(n => n.name || n);
}

async function fetchResources({ namespace, type, search }) {
  const params = new URLSearchParams();
  if (namespace) params.set('namespace', namespace);
  if (type) params.set('type', type);
  if (search) params.set('search', search);
  const data = await apiFetch(`/api/resources?${params.toString()}`);
  return data?.items || [];
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
  if (['running', 'ready', 'succeeded'].includes(s)) return 'bg-green-500';
  if (['pending'].includes(s)) return 'bg-yellow-500';
  if (['failed', 'notready'].includes(s)) return 'bg-red-500';
  return 'bg-gray-500';
}

function Badge({ children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full text-white ${statusColor(children)}`}>
      {children}
    </span>
  );
}

function GlassCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg ${className}`}>
      {children}
    </div>
  );
}

// --- Main Component ---
export default function Resources() {
  const [namespaces, setNamespaces] = useState([]);
  const [namespace, setNamespace] = useState('');
  const [type, setType] = useState('services');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const searchTimer = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ns = await fetchNamespaces();
        if (!mounted) return;
        setNamespaces(ns);
        setNamespace(ns.includes('default') ? 'default' : (ns[0] || ''));
      } catch (err) {
        console.error('Failed to load namespaces:', err);
        setErrMsg('Failed to load namespaces from cluster.');
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(searchDraft.trim());
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchDraft]);

  const loadResources = async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const items = await fetchResources({ namespace, type, search });
      setData(items);
    } catch (err) {
      console.error('Failed to load resources:', err);
      setErrMsg(err.message || 'Failed to fetch resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, [namespace, type, search]);

  const headerSubtitle = useMemo(() => {
    const typeLabel = RESOURCE_TYPES.find(t => t.key === type)?.label || type;
    return `${typeLabel}${namespace ? ` · ${namespace}` : ' · all namespaces'}`;
  }, [type, namespace]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white/90">Resources</h1>
          <p className="text-white/60">{headerSubtitle}</p>
        </div>
        {/* Filters */}
        <GlassCard className="p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Resource Type buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {RESOURCE_TYPES.map(rt => (
                <button
                  key={rt.key}
                  onClick={() => setType(rt.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition
                    ${type === rt.key
                      ? 'bg-white/20 text-white shadow-inner'
                      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  {rt.label}
                </button>
              ))}
            </div>
            <div className="hidden md:block h-6 w-px bg-white/10 mx-2" />
            {/* Namespace & Search */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <select
                className="px-3 py-2 rounded-lg bg-white/5 text-white/90 border border-white/10"
                value={namespace}
                onChange={e => setNamespace(e.target.value)}
              >
                <option value="">All Namespaces</option>
                {namespaces.map(ns => (
                  <option key={ns} value={ns}>{ns}</option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search…"
                  className="w-64 px-3 py-2 rounded-lg bg-white/5 text-white/90 border border-white/10"
                  value={searchDraft}
                  onChange={e => setSearchDraft(e.target.value)}
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">⌕</div>
              </div>
              <button
                onClick={loadResources}
                className="px-4 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30"
              >
                Refresh
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      {errMsg && (
        <GlassCard className="p-3 border-red-400/20">
          <div className="text-red-300 text-sm">{errMsg}</div>
        </GlassCard>
      )}

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-white/70 text-xs uppercase tracking-wide">
                {['Name', 'Namespace', 'Status', 'Age'].map(h => (
                  <th key={h} className="px-4 py-3 bg-white/5 sticky top-0 backdrop-blur-md">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-white/50">No resources found.</td>
                </tr>
              )}
              {data.map((row, idx) => (
                <tr
                  key={`${row.namespace}-${row.name}-${idx}`}
                  className="text-white/90 hover:bg-white/10 transition"
                >
                  <td className="px-4 py-3 border-t border-white/10">{row.name}</td>
                  <td className="px-4 py-3 border-t border-white/10">{row.namespace || '—'}</td>
                  <td className="px-4 py-3 border-t border-white/10"><Badge>{row.status || 'Unknown'}</Badge></td>
                  <td className="px-4 py-3 border-t border-white/10">{row.age || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 rounded-full border-2 border-white/30 border-t-white" />
            <span className="ml-3 text-white/70">Loading…</span>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
