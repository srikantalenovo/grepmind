import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';
async function apiFetch(path, opts = {}, role = 'editor') {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...(opts.headers || {}), 'x-user-role': role, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
  return res.json();
}
function level(issue, type) {
  const i = (issue || '').toLowerCase();
  if (type?.startsWith?.('Event')) return 'warning';
  if (i.includes('crash') || i.includes('backoff') || i.includes('notrunning')) return 'critical';
  if (i.includes('unhealthy') || i.includes('imagepull')) return 'high';
  if (i.includes('restart')) return 'medium';
  return 'low';
}
function pill(lvl) {
  const base = 'px-2 py-0.5 text-xs rounded-full font-semibold';
  return {
    critical: `${base} bg-red-100 text-red-700`,
    high: `${base} bg-orange-100 text-orange-700`,
    medium: `${base} bg-yellow-100 text-yellow-700`,
    warning: `${base} bg-amber-100 text-amber-700`,
    low: `${base} bg-gray-100 text-gray-700`,
  }[lvl] || `${base} bg-gray-100 text-gray-700`;
}

export default function PodIssuesTab({ role = 'editor' }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setBusy(true);
      const data = await apiFetch('/api/analyzer/problems', {}, role);
      setItems(Array.isArray(data.issues) ? data.issues : []);
      setLastUpdated(new Date(data.scannedAt || Date.now()));
    } catch (e) {
      console.error('scan error', e);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return items.filter(x =>
      (x.name || '').toLowerCase().includes(s) ||
      (x.namespace || '').toLowerCase().includes(s) ||
      (x.issue || '').toLowerCase().includes(s) ||
      (x.type || '').toLowerCase().includes(s)
    );
  }, [items, search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" /> Pod Issue List
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issue/name/namespace..."
              className="border rounded pl-7 pr-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
            />
          </div>
          <button onClick={load} className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 inline-flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>
      {lastUpdated && <p className="text-sm text-gray-500 italic">Last updated: {lastUpdated.toLocaleTimeString()}</p>}

      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-indigo-100">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-indigo-600 text-white">
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Namespace</th>
              <th className="px-4 py-2 text-left">Issue</th>
              <th className="px-4 py-2 text-left">Severity</th>
            </tr>
          </thead>
          <AnimatePresence component="tbody">
            {busy && <tr><td colSpan={5} className="px-4 py-3 text-gray-500">Scanning…</td></tr>}
            {filtered.map((p, idx) => {
              const k = `${p.type}:${p.namespace}:${p.name}:${idx}`;
              const lvl = level(p.issue, p.type);
              return (
                <motion.tr key={k}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="border-b hover:bg-indigo-50/30"
                >
                  <td className="px-4 py-2">{p.type}</td>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{p.namespace}</td>
                  <td className="px-4 py-2">{p.issue}</td>
                  <td className="px-4 py-2"><span className={pill(lvl)}>{lvl}</span></td>
                </motion.tr>
              );
            })}
            {!busy && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-3 text-gray-500">No issues found.</td></tr>
            )}
          </AnimatePresence>
        </table>
      </div>
    </div>
  );
}
