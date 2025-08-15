// src/components/YamlEditorTab.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileDown,
  Save,
  Search,
  Layers,
  Loader2,
  ShieldAlert,
  RefreshCcw,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Info,
  Filter,
} from 'lucide-react';

// ---------- Config ----------
const API_BASE = import.meta.env.VITE_API_BASE || '';
const DEFAULT_ROLE = 'editor';

// Centralized fetch with role header + resilient payload parsing (JSON or text)
async function apiFetch(path, opts = {}, role = DEFAULT_ROLE) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      'x-user-role': role,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

// Kubernetes kinds + list endpoints
const KIND_OPTIONS = [
  { value: 'deployment',  label: 'Deployment',   plural: 'deployments' },
  { value: 'pod',         label: 'Pod',          plural: 'pods' },
  { value: 'service',     label: 'Service',      plural: 'services' },
  { value: 'configmap',   label: 'ConfigMap',    plural: 'configmaps' },
  { value: 'ingress',     label: 'Ingress',      plural: 'ingresses' },
  { value: 'job',         label: 'Job',          plural: 'jobs' },
  { value: 'statefulset', label: 'StatefulSet',  plural: 'statefulsets' },
  { value: 'daemonset',   label: 'DaemonSet',    plural: 'daemonsets' },
  { value: 'cronjob',     label: 'CronJob',      plural: 'cronjobs' },
  // Intentionally excluding Secret from table listing for safety (manual only)
];

const LISTABLE_KINDS = new Set(KIND_OPTIONS.map(k => k.value));

// ---------- Small helpers ----------
const toAge = (ts) => {
  if (!ts) return '-';
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return `${Math.floor(d)}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
};

const statusIcon = (kind, item) => {
  // Very light inference for status column
  if (kind === 'pod') {
    const phase = item?.status?.phase || '';
    if (phase === 'Running') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (phase === 'Failed')  return <AlertCircle className="w-4 h-4 text-rose-600" />;
    if (phase)               return <Info className="w-4 h-4 text-amber-600" />;
  }
  if (kind === 'deployment') {
    const desired = item?.spec?.replicas ?? 0;
    const available = item?.status?.availableReplicas ?? 0;
    if (desired > 0 && available === desired) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (desired > 0 && available === 0)       return <AlertCircle className="w-4 h-4 text-rose-600" />;
    return <Info className="w-4 h-4 text-amber-600" />;
  }
  return <Info className="w-4 h-4 text-gray-400" />;
};

const extractName = (x) =>
  typeof x === 'string' ? x : x?.metadata?.name || '';

// ---------- Component ----------
export default function YamlEditorTab({ role = DEFAULT_ROLE }) {
  // selectors
  const [kind, setKind] = useState('deployment');
  const [namespace, setNamespace] = useState('default');

  // data state
  const [namespaces, setNamespaces] = useState([]);
  const [items, setItems] = useState([]); // full objects for table
  const [loadingNs, setLoadingNs] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  // table tooling
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name | age
  const [sortDir, setSortDir] = useState('asc'); // asc | desc

  // selection + editor
  const [selected, setSelected] = useState(null); // object {metadata:{name...}, ...}
  const [yaml, setYaml] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // toast
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  const kindMeta = useMemo(() => KIND_OPTIONS.find(k => k.value === kind), [kind]);

  // ----- Load namespaces on mount
  useEffect(() => {
    (async () => {
      try {
        setLoadingNs(true);
        const resp = await apiFetch('/api/cluster/namespaces', {}, role);
        const list = Array.isArray(resp) ? resp : resp?.namespaces || [];
        setNamespaces(list);
        if (!list.includes(namespace) && list.length) {
          setNamespace(list.includes('default') ? 'default' : list[0]);
        }
      } catch (e) {
        console.error('namespaces error', e);
        setStatus({ type: 'error', msg: e.message });
      } finally {
        setLoadingNs(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Load resources when kind or namespace changes
  const fetchItems = useCallback(async () => {
    if (!namespace || !LISTABLE_KINDS.has(kind)) {
      setItems([]);
      setSelected(null);
      setYaml('');
      return;
    }
    try {
      setLoadingItems(true);
      setSelected(null);
      setYaml('');
      const q = new URLSearchParams({ namespace });
      const resp = await apiFetch(`/api/analyzer/${kindMeta.plural}?${q.toString()}`, {}, role);

      // Normalize: accept array of objects, {items: []}, or array of names
      let list = [];
      if (Array.isArray(resp)) {
        list = resp.map((x) => (typeof x === 'string' ? { metadata: { name: x, namespace } } : x));
      } else if (Array.isArray(resp?.items)) {
        list = resp.items;
      } else if (Array.isArray(resp?.names)) {
        list = resp.names.map((n) => ({ metadata: { name: n, namespace } }));
      }
      setItems(list.filter(Boolean));
    } catch (e) {
      console.warn(`list ${kind} error`, e);
      setItems([]);
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setLoadingItems(false);
    }
  }, [kind, namespace, role, kindMeta]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ----- When a row is selected, load YAML
  const fetchYaml = useCallback(
    async (name) => {
      if (!name) return;
      try {
        setBusy(true);
        setStatus(null);
        const y = await apiFetch(`/api/analyzer/resource/${kind}/${namespace}/${name}/yaml`, {}, role);
        const text = typeof y === 'string' ? y : (y.yaml || '');
        setYaml(text);
        setLastLoadedAt(new Date());
        setStatus({ type: 'success', msg: 'YAML loaded.' });
      } catch (e) {
        setYaml('');
        setStatus({ type: 'error', msg: e.message });
      } finally {
        setBusy(false);
      }
    },
    [kind, namespace, role]
  );

  useEffect(() => {
    if (selected?.metadata?.name) {
      fetchYaml(selected.metadata.name);
    }
  }, [selected, fetchYaml]);

  // ----- Replace YAML
  const replaceYaml = useCallback(async () => {
    const name = selected?.metadata?.name;
    if (!name) {
      setStatus({ type: 'error', msg: 'Select a resource from the table first.' });
      return;
    }
    if (!yaml?.trim()) {
      setStatus({ type: 'error', msg: 'Paste YAML before replacing.' });
      return;
    }
    try {
      setBusy(true);
      setStatus(null);
      await apiFetch(
        `/api/analyzer/resource/${kind}/${namespace}/${name}/yaml`,
        { method: 'PUT', body: JSON.stringify({ yaml }) },
        role
      );
      setStatus({ type: 'success', msg: 'YAML replaced successfully.' });
      // Optionally refresh YAML or list after replace:
      // await fetchYaml(name);
      // await fetchItems();
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  }, [yaml, kind, namespace, role, selected]);

  // ----- Download YAML
  const downloadYaml = useCallback(() => {
    const name = selected?.metadata?.name || 'resource';
    const blob = new Blob([yaml || ''], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${kind}-${namespace}-${name}.yaml`; a.click();
    URL.revokeObjectURL(url);
  }, [yaml, selected, namespace, kind]);

  // ----- Filter + sort items for table
  const tableItems = useMemo(() => {
    let rows = items;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((it) => {
        const n = (it?.metadata?.name || '').toLowerCase();
        const ns = (it?.metadata?.namespace || '').toLowerCase();
        const labels = Object.entries(it?.metadata?.labels || {})
          .map(([k, v]) => `${k}=${v}`.toLowerCase())
          .join(' ');
        return n.includes(q) || ns.includes(q) || labels.includes(q);
      });
    }
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'age') {
        const da = new Date(a?.metadata?.creationTimestamp || 0).getTime();
        const db = new Date(b?.metadata?.creationTimestamp || 0).getTime();
        return sortDir === 'asc' ? da - db : db - da;
      }
      // default: name
      const na = (a?.metadata?.name || '').localeCompare(b?.metadata?.name || '');
      return sortDir === 'asc' ? na : -na;
    });
    return rows;
  }, [items, query, sortBy, sortDir]);

  const nsBadge = lastLoadedAt
    ? `Last loaded: ${new Date(lastLoadedAt).toLocaleTimeString()}`
    : 'Not loaded yet';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-indigo-700">YAML Editor</h2>
        </div>
        <div className="text-xs text-gray-500 italic">{nsBadge}</div>
      </div>

      {/* Controls: Kind / Namespace / Search / Refresh */}
      <div className="grid gap-3 md:grid-cols-5">
        {/* Kind */}
        <div className="relative md:col-span-1">
          <select
            value={kind}
            onChange={(e) => { setKind(e.target.value); setSelected(null); setYaml(''); }}
            className="w-full border rounded-2xl px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {KIND_OPTIONS.map(k => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Namespace */}
        <div className="relative md:col-span-1">
          <select
            value={namespace}
            onChange={(e) => { setNamespace(e.target.value); setSelected(null); setYaml(''); }}
            className="w-full border rounded-2xl px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {namespaces.map(ns => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          {loadingNs && <Loader2 className="w-4 h-4 animate-spin absolute right-9 top-1/2 -translate-y-1/2 text-indigo-400" />}
        </div>

        {/* Search */}
        <div className="md:col-span-2 relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name / namespace / label"
            className="w-full border rounded-2xl px-3 py-2 pl-9 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Sort + Refresh */}
        <div className="flex gap-2 md:col-span-1">
          <div className="relative flex-1">
            <select
              value={`${sortBy}:${sortDir}`}
              onChange={(e) => {
                const [sb, sd] = e.target.value.split(':');
                setSortBy(sb); setSortDir(sd);
              }}
              className="w-full border rounded-2xl px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="name:asc">Name ↑</option>
              <option value="name:desc">Name ↓</option>
              <option value="age:asc">Age ↑ (oldest)</option>
              <option value="age:desc">Age ↓ (newest)</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button
            onClick={fetchItems}
            className="px-3 py-2 rounded-2xl border inline-flex items-center gap-2 hover:bg-gray-50 transition"
            title="Refresh list"
          >
            {loadingItems ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            List
          </button>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="overflow-hidden rounded-2xl border border-indigo-100 bg-white/70 backdrop-blur"
      >
        <div className="max-h-[360px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-indigo-50 text-indigo-800 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Namespace</th>
                <th className="text-left px-4 py-2">Age</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Labels</th>
              </tr>
            </thead>
            <tbody>
              {loadingItems && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading {kindMeta?.label}s…
                    </div>
                  </td>
                </tr>
              )}
              {!loadingItems && tableItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No resources found for <span className="font-semibold">{kindMeta?.label}</span> in <span className="font-semibold">{namespace}</span>.
                  </td>
                </tr>
              )}
              {!loadingItems && tableItems.map((it) => {
                const n = extractName(it);
                const ns = it?.metadata?.namespace || namespace;
                const age = toAge(it?.metadata?.creationTimestamp);
                const labels = it?.metadata?.labels || {};
                const isSelected = selected?.metadata?.name === n && selected?.metadata?.namespace === ns;
                return (
                  <tr
                    key={`${ns}/${n}`}
                    onClick={() => setSelected(it)}
                    className={`cursor-pointer hover:bg-indigo-50/60 transition ${
                      isSelected ? 'bg-indigo-50/80' : ''
                    }`}
                  >
                    <td className="px-4 py-2 font-medium text-gray-800">{n}</td>
                    <td className="px-4 py-2 text-gray-600">{ns}</td>
                    <td className="px-4 py-2 text-gray-600">{age}</td>
                    <td className="px-4 py-2">{statusIcon(kind, it)}</td>
                    <td className="px-4 py-2 text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(labels).slice(0, 4).map(([k, v]) => (
                          <span key={k} className="text-[11px] bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
                            {k}:{v}
                          </span>
                        ))}
                        {Object.keys(labels).length > 4 && (
                          <span className="text-[11px] text-gray-400">+{Object.keys(labels).length - 4}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Secret caution (if you later add Secret to KIND_OPTIONS) */}
      <AnimatePresence>
        {kind === 'secret' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2"
          >
            <ShieldAlert className="w-5 h-5 mt-0.5" />
            <p className="text-sm">
              Editing <span className="font-semibold">Secrets</span> may expose sensitive data. Ensure your RBAC allows this.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YAML Editor */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="bg-white/80 backdrop-blur rounded-2xl border border-indigo-100 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="text-sm text-gray-700">
                Editing YAML for&nbsp;
                <span className="font-semibold">{selected?.metadata?.name}</span>
                <span className="text-gray-400"> ({kindMeta?.label} in {selected?.metadata?.namespace || namespace})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selected?.metadata?.name && fetchYaml(selected.metadata.name)}
                  className="px-3 py-1.5 rounded-2xl border inline-flex items-center gap-2 hover:bg-gray-50 transition"
                  title="Reload YAML"
                >
                  <RefreshCcw className="w-4 h-4" /> Reload
                </button>
                <button
                  onClick={downloadYaml}
                  className="px-3 py-1.5 rounded-2xl border inline-flex items-center gap-2 hover:bg-gray-50 transition"
                  title="Download YAML"
                >
                  <FileDown className="w-4 h-4" /> Download
                </button>
              </div>
            </div>

            <textarea
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              rows={22}
              placeholder="YAML will appear here…"
              className="w-full rounded-none p-4 font-mono text-sm outline-none"
            />

            <div className="flex items-center justify-between px-4 pb-4">
              <div className="text-xs text-gray-500 italic">
                {yaml ? `${(yaml.split('\n') || []).length} lines` : 'No content loaded'}
              </div>
              <button
                disabled={busy || !yaml?.trim()}
                onClick={replaceYaml}
                className="bg-green-600 text-white px-4 py-2 rounded-2xl hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2 transition"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Replace
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`fixed bottom-5 right-5 rounded-2xl px-4 py-3 shadow-lg border
              ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
                status.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                'bg-indigo-50 border-indigo-200 text-indigo-700'}`}
          >
            {status.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
