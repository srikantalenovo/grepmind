import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, Wrench } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path, opts = {}, role = 'editor') {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...(opts.headers || {}), 'x-user-role': role, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
  const t = await res.text(); try { return JSON.parse(t); } catch { return t; }
}

export default function HelmTab({ role = 'editor' }) {
  const [releases, setReleases] = useState([]);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  async function load() {
    try {
      const data = await apiFetch('/api/helm/releases', {}, role);
      setReleases(Array.isArray(data) ? data : (data.releases || []));
      setLastUpdated(new Date());
    } catch (e) {
      console.error('helm list error', e);
    }
  }

  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return releases.filter(r =>
      (r.name || '').toLowerCase().includes(s) ||
      (r.namespace || '').toLowerCase().includes(s) ||
      (r.chart || '').toLowerCase().includes(s)
    );
  }, [releases, search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-indigo-700 flex items-center gap-2"><Wrench className="w-5 h-5" /> Helm Releases</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name/namespace/chart..."
              className="border rounded pl-7 pr-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
            />
          </div>
          <button onClick={load} className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 inline-flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {lastUpdated && <p className="text-sm text-gray-500 italic">Last updated: {lastUpdated.toLocaleTimeString()}</p>}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-indigo-100">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-indigo-600 text-white">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Namespace</th>
                <th className="px-4 py-2 text-left">Chart</th>
                <th className="px-4 py-2 text-left">Revision</th>
                <th className="px-4 py-2 text-left">Updated</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={`${r.namespace}/${r.name}`} className="border-b hover:bg-indigo-50/30">
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">{r.namespace}</td>
                  <td className="px-4 py-2">{r.chart}</td>
                  <td className="px-4 py-2">{r.revision}</td>
                  <td className="px-4 py-2">{r.updated || r.updated_at || ''}</td>
                  <td className="px-4 py-2">{r.status}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-3 text-gray-500">No releases.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
