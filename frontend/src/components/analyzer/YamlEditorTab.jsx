// src/components/YamlEditorTab.jsx
import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const DEFAULT_ROLE = 'editor';

// ---- API helper (kept local to this component)
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
  // This endpoint sometimes returns raw YAML; try JSON first, then fallback to text
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---- Kind metadata & endpoint mapping
const KIND_OPTIONS = [
  { value: 'deployment', label: 'Deployment', plural: 'deployments' },
  { value: 'pod',        label: 'Pod',        plural: 'pods' },
  { value: 'service',    label: 'Service',    plural: 'services' },
  { value: 'configmap',  label: 'ConfigMap',  plural: 'configmaps' },
  { value: 'ingress',    label: 'Ingress',    plural: 'ingresses' },
  { value: 'job',        label: 'Job',        plural: 'jobs' },
  { value: 'statefulset',label: 'StatefulSet',plural: 'statefulsets' },
  { value: 'daemonset',  label: 'DaemonSet',  plural: 'daemonsets' },
  { value: 'cronjob',    label: 'CronJob',    plural: 'cronjobs' },
  { value: 'secret',     label: 'Secret',     plural: 'secrets' }, // caution shown in UI
];

// Which kinds we expect the backend to support listing via /api/analyzer/<plural>?namespace=xxx
const LISTABLE_KINDS = new Set([
  'deployment','pod','service','configmap','ingress','job',
  'statefulset','daemonset','cronjob'
  // NOTE: 'secret' excluded by default for safety; falls back to manual input
]);

export default function YamlEditorTab({ role = DEFAULT_ROLE }) {
  const [kind, setKind] = useState('deployment');
  const [namespace, setNamespace] = useState('default');

  // data
  const [namespaces, setNamespaces] = useState([]);
  const [resources, setResources] = useState([]); // names only
  const [resourceName, setResourceName] = useState('');

  // editor
  const [yaml, setYaml] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingNs, setLoadingNs] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);

  // status
  const [status, setStatus] = useState(null); // {type:'success'|'error'|'info', msg:string}
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  // --- Load namespaces on mount
  useEffect(() => {
    (async () => {
      try {
        setLoadingNs(true);
        const ns = await apiFetch('/api/cluster/namespaces', {}, role);
        const list = Array.isArray(ns) ? ns : ns?.namespaces || [];
        setNamespaces(list);
        if (!list.includes(namespace) && list.length) setNamespace(list.includes('default') ? 'default' : list[0]);
      } catch (e) {
        console.error('namespaces error', e);
        setStatus({ type: 'error', msg: e.message });
      } finally {
        setLoadingNs(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Load resources when kind or namespace changes (if supported)
  useEffect(() => {
    if (!namespace) return;
    if (!LISTABLE_KINDS.has(kind)) {
      setResources([]);
      return;
    }
    (async () => {
      try {
        setLoadingResources(true);
        const meta = KIND_OPTIONS.find(k => k.value === kind);
        const q = new URLSearchParams({ namespace });
        const payload = await apiFetch(`/api/analyzer/${meta.plural}?${q.toString()}`, {}, role);

        // Accept a variety of shapes: array of items, or {items:[]}, or names directly
        let names = [];
        if (Array.isArray(payload)) {
          // Could be array of objects or of strings
          names = payload.map(x => (typeof x === 'string' ? x : x?.metadata?.name)).filter(Boolean);
        } else if (Array.isArray(payload?.items)) {
          names = payload.items.map(x => x?.metadata?.name).filter(Boolean);
        } else if (Array.isArray(payload?.names)) {
          names = payload.names.filter(Boolean);
        }
        setResources(names);
        // If current selection not present, reset
        if (resourceName && !names.includes(resourceName)) setResourceName('');
      } catch (e) {
        console.warn(`list ${kind} error`, e);
        setResources([]); // fallback to manual input
      } finally {
        setLoadingResources(false);
      }
    })();
  }, [kind, namespace, role, resourceName]);

  const kindMeta = useMemo(() => KIND_OPTIONS.find(k => k.value === kind), [kind]);

  async function fetchYaml() {
    const name = resourceName?.trim();
    if (!name) {
      setStatus({ type: 'error', msg: 'Please select or enter a resource name.' });
      return;
    }
    try {
      setBusy(true);
      setStatus(null);
      const y = await apiFetch(
        `/api/analyzer/resource/${kind}/${namespace}/${name}/yaml`,
        {},
        role
      );
      const text = typeof y === 'string' ? y : (y.yaml || '');
      setYaml(text);
      setLastLoadedAt(new Date());
      setStatus({ type: 'success', msg: 'YAML loaded.' });
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function replaceYaml() {
    const name = resourceName?.trim();
    if (!name) {
      setStatus({ type: 'error', msg: 'Please select or enter a resource name.' });
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
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  }

  function downloadYaml() {
    const blob = new Blob([yaml || ''], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${kind}-${namespace}-${resourceName || 'resource'}.yaml`; a.click();
    URL.revokeObjectURL(url);
  }

  const nsBadge = lastLoadedAt
    ? `Last loaded: ${new Date(lastLoadedAt).toLocaleTimeString()}`
    : 'Not loaded yet';

  const secretWarning =
    kind === 'secret' ? (
      <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
        <ShieldAlert className="w-5 h-5 mt-0.5" />
        <p className="text-sm">
          Editing <span className="font-semibold">Secrets</span> may expose sensitive data. Ensure you are allowed to view/modify
          secrets and your backend RBAC permits it. Listing of secrets is disabled by default; enter the name manually.
        </p>
      </div>
    ) : null;

  // Animated card container
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-indigo-700">YAML Editor</h2>
        </div>
        <div className="text-xs text-gray-500 italic">{nsBadge}</div>
      </div>

      {/* Selectors */}
      <div className="grid gap-3 md:grid-cols-4">
        {/* Kind selector */}
        <div className="relative">
          <select
            value={kind}
            onChange={(e) => { setKind(e.target.value); setYaml(''); setResourceName(''); }}
            className="w-full border rounded-2xl px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {KIND_OPTIONS.map(k => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Namespace selector */}
        <div className="relative">
          <select
            value={namespace}
            onChange={(e) => { setNamespace(e.target.value); setYaml(''); setResourceName(''); }}
            className="w-full border rounded-2xl px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {namespaces.map(ns => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          {loadingNs && (
            <Loader2 className="w-4 h-4 animate-spin absolute right-9 top-1/2 -translate-y-1/2 text-indigo-400" />
          )}
        </div>

        {/* Resource selector OR manual input */}
        <div className="relative">
          {LISTABLE_KINDS.has(kind) && resources.length > 0 ? (
            <>
              <select
                value={resourceName}
                onChange={(e) => { setResourceName(e.target.value); }}
                className="w-full border rounded-2xl px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Select {kindMeta?.label}</option>
                {resources.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </>
          ) : (
            <input
              value={resourceName}
              onChange={(e) => setResourceName(e.target.value)}
              placeholder={`Enter ${kindMeta?.label} name`}
              className="w-full border rounded-2xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          )}
          {loadingResources && (
            <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400" />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={fetchYaml}
            disabled={busy || !namespace || (!resourceName && resources.length === 0)}
            className="flex-1 bg-indigo-600 text-white rounded-2xl px-3 py-2 hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 transition"
            title="Load YAML"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Load YAML
          </button>
          <button
            onClick={() => {
              // manual refresh of list for the selected kind/ns
              if (!LISTABLE_KINDS.has(kind)) return;
              setNamespace(ns => ns); // trigger effect? we explicitly re-run:
              (async () => {
                try {
                  setLoadingResources(true);
                  const meta = KIND_OPTIONS.find(k => k.value === kind);
                  const q = new URLSearchParams({ namespace });
                  const payload = await apiFetch(`/api/analyzer/${meta.plural}?${q.toString()}`, {}, role);
                  let names = [];
                  if (Array.isArray(payload)) {
                    names = payload.map(x => (typeof x === 'string' ? x : x?.metadata?.name)).filter(Boolean);
                  } else if (Array.isArray(payload?.items)) {
                    names = payload.items.map(x => x?.metadata?.name).filter(Boolean);
                  } else if (Array.isArray(payload?.names)) {
                    names = payload.names.filter(Boolean);
                  }
                  setResources(names);
                } catch (e) {
                  setResources([]);
                } finally {
                  setLoadingResources(false);
                }
              })();
            }}
            className="px-3 py-2 rounded-2xl border inline-flex items-center gap-2 hover:bg-gray-50 transition"
            title="Refresh list"
          >
            <RefreshCcw className="w-4 h-4" /> List
          </button>
          <button
            onClick={downloadYaml}
            className="px-3 py-2 rounded-2xl border inline-flex items-center gap-2 hover:bg-gray-50 transition"
            title="Download YAML"
          >
            <FileDown className="w-4 h-4" /> Download
          </button>
        </div>
      </div>

      {/* Secret caution */}
      <AnimatePresence>
        {secretWarning && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {secretWarning}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/80 backdrop-blur rounded-2xl border border-indigo-100 shadow-sm"
      >
        <textarea
          value={yaml}
          onChange={(e) => setYaml(e.target.value)}
          rows={22}
          placeholder="YAML will appear here…"
          className="w-full rounded-2xl p-4 font-mono text-sm outline-none"
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

      {/* Status Toast */}
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
