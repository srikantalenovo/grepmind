// src/components/YamlEditorTab.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  ChevronDown,
  Loader2,
  RefreshCcw,
  FileDown,
  Save,
  Search,
  Edit3,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const DEFAULT_ROLE = 'editor';

// --------------- API helper ---------------
async function apiFetch(path, opts = {}, role = DEFAULT_ROLE) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      'x-user-role': role,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} - ${text || res.statusText}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text; // raw YAML or plain string
  }
}

// --------------- Kinds ---------------
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
  // Secret intentionally not listed in the table for safety
];
const LISTABLE_KINDS = new Set(KIND_OPTIONS.map(k => k.value));

// --------------- Small helpers ---------------
const fmtAge = (iso) => {
  try {
    const t = new Date(iso).getTime();
    const d = Math.max(0, Date.now() - t);
    const mins = Math.floor(d / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  } catch {
    return '-';
  }
};

// --------------- Component ---------------
export default function YamlEditorTab({ role = DEFAULT_ROLE }) {
  // selection
  const [kind, setKind] = useState('deployment');
  const [namespace, setNamespace] = useState('');

  // data
  const [namespaces, setNamespaces] = useState([]);
  const [rows, setRows] = useState([]); // table rows [{name, namespace, age, ready, ...}]
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');

  // selection -> editor
  const [selectedName, setSelectedName] = useState('');
  const [yaml, setYaml] = useState('');

  // status flags
  const [loadingNs, setLoadingNs] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null); // {type,msg}

  // ----------------------------------------------------------------
  // load namespaces once
  useEffect(() => {
    (async () => {
      try {
        setLoadingNs(true);
        const resp = await apiFetch('/api/cluster/namespaces', {}, role);
        const list = Array.isArray(resp) ? resp : resp?.namespaces || [];
        setNamespaces(list);
        // prefer 'default' if present
        const next = list.includes('default') ? 'default' : (list[0] || '');
        setNamespace(next);
      } catch (e) {
        setToast({ type: 'error', msg: `Namespaces: ${e.message}` });
      } finally {
        setLoadingNs(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kindMeta = useMemo(() => KIND_OPTIONS.find(k => k.value === kind), [kind]);

  // ----------------------------------------------------------------
  // list resources for selected kind+namespace
  const loadRows = useCallback(async () => {
    if (!namespace || !LISTABLE_KINDS.has(kind)) return;
    try {
      setLoadingRows(true);
      setSelectedName(''); // reset selection when listing changes
      setYaml('');
      const q = new URLSearchParams({ namespace });
      const payload = await apiFetch(`/api/analyzer/${kindMeta.plural}?${q.toString()}`, {}, role);

      // normalize to an array of items with metadata.name, metadata.namespace, status etc.
      let items = [];
      if (Array.isArray(payload)) {
        items = payload;
      } else if (Array.isArray(payload?.items)) {
        items = payload.items;
      }

      const mapped = (items || [])
        .map(it => {
          if (typeof it === 'string') {
            return { name: it, namespace, age: '-', ready: '-', obj: null };
          }
          const name = it?.metadata?.name;
          if (!name) return null;
          const ns = it?.metadata?.namespace || namespace;
          const creationTs = it?.metadata?.creationTimestamp;
          // compute a generic "ready" if present
          let ready = '-';
          // Pods
          if (kind === 'pod') {
            const cs = it?.status?.containerStatuses;
            if (Array.isArray(cs) && cs.length > 0) {
              const total = cs.length;
              const readyCnt = cs.filter(c => c.ready).length;
              ready = `${readyCnt}/${total}`;
            } else {
              ready = it?.status?.phase || '-';
            }
          }
          // Deployments
          if (kind === 'deployment') {
            const rs = it?.status;
            const readyCnt = rs?.readyReplicas ?? 0;
            const total = rs?.replicas ?? 0;
            ready = `${readyCnt}/${total}`;
          }
          // StatefulSets/DaemonSets/Jobs/etc. fall back to basic numbers when available
          if (['statefulset','daemonset','job','cronjob'].includes(kind)) {
            const rs = it?.status;
            const readyCnt = rs?.readyReplicas ?? rs?.numberReady ?? rs?.active ?? 0;
            const total = rs?.replicas ?? rs?.desiredNumberScheduled ?? rs?.succeeded ?? rs?.active ?? 0;
            if (total !== 0 || readyCnt !== 0) ready = `${readyCnt}/${total}`;
          }
          return { name, namespace: ns, age: fmtAge(creationTs), ready, obj: it };
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));

      setRows(mapped);
    } catch (e) {
      setRows([]);
      setToast({ type: 'error', msg: `List ${kindMeta.label}s: ${e.message}` });
    } finally {
      setLoadingRows(false);
    }
  }, [kind, namespace, role, kindMeta]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // simple client-side filter
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setFiltered(rows); return; }
    setFiltered(rows.filter(r => r.name.toLowerCase().includes(q)));
  }, [rows, query]);

  // ----------------------------------------------------------------
  // load YAML for a row
  const loadYaml = useCallback(async (name) => {
    try {
      setBusy(true);
      const y = await apiFetch(`/api/analyzer/resource/${kind}/${namespace}/${name}/yaml`, {}, role);
      const text = typeof y === 'string' ? y : (y?.yaml || '');
      setYaml(text || '');
      setSelectedName(name);
      setToast({ type: 'success', msg: `Loaded ${kind} ${name}` });
    } catch (e) {
      setToast({ type: 'error', msg: `Load YAML: ${e.message}` });
    } finally {
      setBusy(false);
    }
  }, [kind, namespace, role]);

  // save YAML (replace)
  const replaceYaml = useCallback(async () => {
    if (!selectedName || !yaml.trim()) return;
    try {
      setBusy(true);
      await apiFetch(
        `/api/analyzer/resource/${kind}/${namespace}/${selectedName}/yaml`,
        { method: 'PUT', body: JSON.stringify({ yaml }) },
        role
      );
      setToast({ type: 'success', msg: 'YAML replaced successfully.' });
      // Optionally reload the list to reflect any spec-driven changes
      // await loadRows();
    } catch (e) {
      setToast({ type: 'error', msg: `Replace YAML: ${e.message}` });
    } finally {
      setBusy(false);
    }
  }, [kind, namespace, selectedName, yaml, role]);

  const downloadYaml = () => {
    const blob = new Blob([yaml || ''], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind}-${namespace}-${selectedName || 'resource'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const nsBadge = selectedName
    ? `Selected: ${selectedName}`
    : namespace ? `Namespace: ${namespace}` : '';

  // ----------------------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-indigo-700">YAML Editor</h2>
        </div>
        <div className="text-xs text-gray-500 italic">{nsBadge}</div>
      </div>

      {/* Controls */}
      <div className="grid gap-3 md:grid-cols-5">
        {/* Kind */}
        <div className="relative">
          <select
            value={kind}
            onChange={(e) => { setKind(e.target.value); setSelectedName(''); setYaml(''); }}
            className="w-full border rounded-2xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {KIND_OPTIONS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Namespace */}
        <div className="relative">
          <select
            value={namespace}
            onChange={(e) => { setNamespace(e.target.value); setSelectedName(''); setYaml(''); }}
            className="w-full border rounded-2xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {namespaces.map(ns => <option key={ns} value={ns}>{ns}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          {loadingNs && <Loader2 className="w-4 h-4 animate-spin absolute right-8 top-1/2 -translate-y-1/2 text-indigo-400" />}
        </div>

        {/* Search */}
        <div className="col-span-2">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${kindMeta?.label}s…`}
              className="w-full border rounded-2xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Reload list */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadRows}
            disabled={loadingRows}
            className="w-full px-3 py-2 rounded-2xl border inline-flex items-center justify-center gap-2 hover:bg-gray-50 transition disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCcw className="w-4 h-4" />
            {loadingRows ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-indigo-50/60 text-indigo-900">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Name</th>
                <th className="text-left px-4 py-2 font-semibold">Namespace</th>
                <th className="text-left px-4 py-2 font-semibold">Ready</th>
                <th className="text-left px-4 py-2 font-semibold">Age</th>
                <th className="text-right px-4 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {loadingRows && (
                  [...Array(6)].map((_, i) => (
                    <tr key={`sk-${i}`} className="border-t">
                      <td className="px-4 py-3"><div className="h-3 w-40 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-16 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-3 w-10 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3 text-right"><div className="h-8 w-24 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                    </tr>
                  ))
                )}
                {!loadingRows && filtered.length === 0 && (
                  <tr className="border-t">
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      No {kindMeta?.label}s found in <span className="font-medium">{namespace}</span>.
                    </td>
                  </tr>
                )}
                {!loadingRows && filtered.map(r => (
                  <motion.tr
                    key={r.name}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`border-t hover:bg-indigo-50/40 transition ${selectedName === r.name ? 'bg-indigo-50/60' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-indigo-900">{r.name}</td>
                    <td className="px-4 py-3">{r.namespace}</td>
                    <td className="px-4 py-3">{r.ready}</td>
                    <td className="px-4 py-3">{r.age}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end">
                        <button
                          onClick={() => loadYaml(r.name)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-2 transition"
                        >
                          {busy && selectedName === r.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                          Edit YAML
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor */}
      <AnimatePresence>
        {selectedName && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-white/80 backdrop-blur rounded-2xl border border-indigo-100 shadow-sm"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="text-sm">
                <span className="font-semibold text-indigo-700">{kind}</span>
                <span className="mx-2 text-gray-400">/</span>
                <span className="font-semibold">{selectedName}</span>
                <span className="mx-2 text-gray-400">in</span>
                <span className="font-semibold">{namespace}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadYaml(selectedName)}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-xl border inline-flex items-center gap-2 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <RefreshCcw className="w-4 h-4" /> Reload
                </button>
                <button
                  onClick={downloadYaml}
                  className="px-3 py-1.5 rounded-xl border inline-flex items-center gap-2 hover:bg-gray-50 transition"
                >
                  <FileDown className="w-4 h-4" /> Download
                </button>
                <button
                  onClick={replaceYaml}
                  disabled={busy || !yaml.trim()}
                  className="px-3 py-1.5 rounded-xl bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2 transition disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Replace
                </button>
              </div>
            </div>

            <textarea
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              rows={22}
              placeholder="YAML will appear here…"
              className="w-full rounded-2xl p-4 font-mono text-sm outline-none"
            />

            <div className="px-4 pb-4 text-xs text-gray-500 italic">
              {yaml ? `${(yaml.split('\n') || []).length} lines` : 'No content loaded'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onAnimationComplete={() => {
              // auto-hide after 2.5s
              const t = setTimeout(() => setToast(null), 2500);
              return () => clearTimeout(t);
            }}
            className={`fixed bottom-5 right-5 rounded-2xl px-4 py-3 shadow-lg border
              ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
                toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                'bg-indigo-50 border-indigo-200 text-indigo-700'}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
