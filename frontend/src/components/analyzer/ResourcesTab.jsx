import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Trash2, Scale as ScaleIcon, Info, Search } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const REFRESH_MS = 60 * 1000;
const resourceOptions = [
  { value: 'pods', label: 'Pods' },
  { value: 'deployments', label: 'Deployments' },
  { value: 'services', label: 'Services' },
];

async function apiFetch(path, opts = {}, role = 'editor') {
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

function pill(level) {
  const base = 'px-2 py-0.5 text-xs rounded-full font-semibold';
  switch (level) {
    case 'critical': return `${base} bg-red-100 text-red-700`;
    case 'high': return `${base} bg-orange-100 text-orange-700`;
    case 'medium': return `${base} bg-yellow-100 text-yellow-700`;
    default: return `${base} bg-gray-100 text-gray-700`;
  }
}
function severity(issue, type) {
  const i = (issue || '').toLowerCase();
  if (type?.startsWith?.('Event')) return 'medium';
  if (i.includes('crash') || i.includes('backoff') || i.includes('notrunning')) return 'critical';
  if (i.includes('unhealthy') || i.includes('imagepull')) return 'high';
  if (i.includes('restart')) return 'medium';
  return 'low';
}

export default function ResourcesTab({ role = 'editor' }) {
  const [namespaces, setNamespaces] = useState(['all']);
  const [namespace, setNamespace] = useState('all');
  const [rtype, setRtype] = useState('pods');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [scaleTarget, setScaleTarget] = useState(null);

  async function loadNamespaces() {
    try {
      const data = await apiFetch('/api/analyzer/namespaces', {}, role);
      setNamespaces(data.namespaces || ['all']);
    } catch (e) {
      console.error('namespaces error', e);
    }
  }

  async function loadItems() {
    try {
      setBusy(true);
      const q = new URLSearchParams({ namespace, issuesOnly: 'true' }).toString();
      const data = await apiFetch(`/api/analyzer/${rtype}?${q}`, {}, role);
      setItems(Array.isArray(data.items) ? data.items : []);
      setLastUpdated(new Date(data.scannedAt || Date.now()));
    } catch (e) {
      console.error('fetch resources error', e);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { loadNamespaces(); }, []);
  useEffect(() => { loadItems(); }, [rtype, namespace]);
  useEffect(() => {
    const id = setInterval(loadItems, REFRESH_MS);
    return () => clearInterval(id);
  }, [rtype, namespace]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return items.filter(it =>
      (it.name || '').toLowerCase().includes(s) ||
      (it.namespace || '').toLowerCase().includes(s) ||
      (it.issue || '').toLowerCase().includes(s)
    );
  }, [items, search]);

  async function onRestart(item) {
    if (!window.confirm(`Restart ${item.type} ${item.namespace}/${item.name}?`)) return;
    try {
      await apiFetch('/api/analyzer/restart', {
        method: 'POST',
        body: JSON.stringify({ type: item.type, namespace: item.namespace, name: item.name }),
      }, role);
      await loadItems();
    } catch (e) { alert(e.message); }
  }

  async function onDelete(item) {
    if (!window.confirm(`Delete ${item.type} ${item.namespace}/${item.name}?`)) return;
    try {
      await apiFetch('/api/analyzer/resource', {
        method: 'DELETE',
        body: JSON.stringify({ type: item.type, namespace: item.namespace, name: item.name }),
      }, role);
      await loadItems();
    } catch (e) { alert(e.message); }
  }

  async function onScaleSubmit() {
    if (!scaleTarget) return;
    const replicas = Number(scaleTarget.desired);
    if (Number.isNaN(replicas)) return alert('Invalid replicas');
    try {
      await apiFetch('/api/analyzer/scale', {
        method: 'POST',
        body: JSON.stringify({ namespace: scaleTarget.namespace, name: scaleTarget.name, replicas }),
      }, role);
      setScaleTarget(null);
      await loadItems();
    } catch (e) { alert(e.message); }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="border rounded px-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
          >
            {namespaces.map(ns => <option key={ns} value={ns}>{ns}</option>)}
          </select>
          <select
            value={rtype}
            onChange={(e) => setRtype(e.target.value)}
            className="border rounded px-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
          >
            {resourceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / issue…"
              className="border rounded pl-7 pr-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
            />
          </div>
          <button
            onClick={loadItems}
            className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-sm text-gray-500 italic">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-indigo-100">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-indigo-600 text-white">
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Namespace</th>
              <th className="px-4 py-2 text-left">Issue</th>
              <th className="px-4 py-2 text-left">Severity</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <AnimatePresence component="tbody">
            {busy && filtered.length === 0 && (
              <tr><td className="px-4 py-3 text-gray-500" colSpan={6}>Loading…</td></tr>
            )}
            {filtered.map((it) => {
              const key = `${it.type}:${it.namespace}:${it.name}`;
              const lvl = severity(it.issue, it.type);
              return (
                <motion.tr
                  key={key}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="border-b hover:bg-indigo-50/30"
                >
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">{it.type}</span>
                  </td>
                  <td className="px-4 py-2">{it.name}</td>
                  <td className="px-4 py-2">{it.namespace}</td>
                  <td className="px-4 py-2">
                    <div className="text-sm text-gray-800">{it.issue}</div>
                    {it.nodeName && <div className="text-xs text-gray-500">Node: {it.nodeName}</div>}
                  </td>
                  <td className="px-4 py-2"><span className={pill(lvl)}>{lvl}</span></td>
                  <td className="px-4 py-2 space-x-2">
                    <button
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                      onClick={() => alert(JSON.stringify(it.details || {}, null, 2))}
                    >
                      <Info className="w-3 h-3" /> Details
                    </button>

                    {(it.type === 'Pod' || it.type === 'Deployment') && (role === 'editor' || role === 'admin') && (
                      <button
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        onClick={() => onRestart(it)}
                      >
                        <RotateCcw className="w-3 h-3" /> Restart
                      </button>
                    )}

                    {(it.type === 'Deployment') && (role === 'editor' || role === 'admin') && (
                      <button
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() => setScaleTarget({
                          namespace: it.namespace, name: it.name,
                          desired: it.details?.desired ?? it.details?.available ?? 1
                        })}
                      >
                        <ScaleIcon className="w-3 h-3" /> Scale
                      </button>
                    )}

                    {(role === 'admin') && (
                      <button
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 text-white rounded hover:bg-black"
                        onClick={async () => {
                          const yaml = await apiFetch(`/api/analyzer/resource/${it.type.toLowerCase()}/${it.namespace}/${it.name}/yaml`, {}, role);
                          const blob = new Blob([yaml], { type: 'text/yaml' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${it.type}-${it.namespace}-${it.name}.yaml`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download YAML
                      </button>
                    )}

                    {(role === 'editor' || role === 'admin') && (
                      <button
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                        onClick={() => {
                          // Navigate to YAML tab prefilled (optional: use a global store/router)
                          alert('Open YAML tab to edit this resource.');
                        }}
                      >
                        Edit YAML
                      </button>
                    )}

                    {(role === 'admin') && (
                      <button
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-rose-600 text-white rounded hover:bg-rose-700"
                        onClick={() => onDelete(it)}
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </td>
                </motion.tr>
              );
            })}
            {!busy && filtered.length === 0 && (
              <tr><td className="px-4 py-3 text-gray-500" colSpan={6}>No issues found for selected filters.</td></tr>
            )}
          </AnimatePresence>
        </table>
      </div>

      {/* Scale Modal */}
      {scaleTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-4">
            <h3 className="text-lg font-semibold text-indigo-700 mb-2">Scale Deployment</h3>
            <p className="text-sm text-gray-600 mb-3">
              {scaleTarget.namespace}/{scaleTarget.name}
            </p>
            <label className="block text-sm text-gray-700 mb-1">Desired replicas</label>
            <input
              type="number"
              value={scaleTarget.desired}
              onChange={(e) => setScaleTarget({ ...scaleTarget, desired: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-4 focus:outline-none focus:ring focus:border-indigo-400"
            />
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded border" onClick={() => setScaleTarget(null)}>Cancel</button>
              <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={onScaleSubmit}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
