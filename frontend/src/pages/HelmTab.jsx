import React, { useEffect, useState, useCallback } from 'react';
import HelmReleaseDrawer from './HelmReleaseDrawer.jsx';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// ---------- apiFetch ----------
async function apiFetch(path, opts = {}, role = 'editor') {
  // Validate role
  const userRole = role === 'admin' ? 'admin' : 'editor';

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'x-user-role': userRole,
      ...(opts.headers || {}),
      // Only set JSON header if sending a body and content-type not already set
      ...((opts.body && !opts.headers?.['Content-Type']) ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

async function fetchNamespaces(role = 'editor') {
  return apiFetch('/api/cluster/namespaces', {}, role);
}

export default function HelmTab() {
  const [releases, setReleases] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [loading, setLoading] = useState(false);
  const [drawerRelease, setDrawerRelease] = useState(null);

  const loadNamespaces = async () => {
    try {
      const ns = await fetchNamespaces();
      setNamespaces(['all', ...ns]);
    } catch (err) {
      console.error('Failed to fetch namespaces:', err);
    }
  };

  const loadReleases = useCallback(async () => {
    setLoading(true);
    try {
      const nsQuery = selectedNamespace === 'all' ? 'all' : selectedNamespace;
      const data = await apiFetch(`/api/helm/releases?namespace=${nsQuery}`);
      setReleases(data.releases || []);
    } catch (err) {
      console.error('Failed to fetch Helm releases:', err);
      setReleases([]);
    } finally {
      setLoading(false);
    }
  }, [selectedNamespace]);

  useEffect(() => { loadNamespaces(); }, []);
  useEffect(() => { loadReleases(); }, [loadReleases]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => { loadReleases(); }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadReleases]);

  return (
    <div className="p-4">
      <div className="flex justify-between mb-2 items-center">
        <div>
          <label className="mr-2 font-semibold">Namespace:</label>
          <select
            className="border rounded px-2 py-1"
            value={selectedNamespace}
            onChange={e => setSelectedNamespace(e.target.value)}
          >
            {namespaces.map(ns => <option key={ns} value={ns}>{ns}</option>)}
          </select>
        </div>
        <button
          className="bg-indigo-600 text-white px-3 py-1 rounded"
          onClick={loadReleases}
        >
          Refresh
        </button>
      </div>

      <div className="overflow-auto rounded-lg shadow border">
        <table className="w-full text-left border-collapse">
          <thead className="bg-indigo-600 text-white rounded-t-lg">
            <tr>
              <th className="px-4 py-2 rounded-tl-lg">Name</th>
              <th className="px-4 py-2">Namespace</th>
              <th className="px-4 py-2">Chart</th>
              <th className="px-4 py-2">Version</th>
              <th className="px-4 py-2 rounded-tr-lg">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="px-4 py-2 text-center">Loading…</td></tr>
            ) : releases.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-2 text-center">No releases found</td></tr>
            ) : releases.map(rel => (
              <motion.tr
                key={`${rel.namespace}-${rel.name}`}
                className="cursor-pointer hover:bg-indigo-50"
                onClick={() => setDrawerRelease(rel)}
                whileHover={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <td className="px-4 py-2">{rel.name}</td>
                <td className="px-4 py-2">{rel.namespace}</td>
                <td className="px-4 py-2">{rel.chart}</td>
                <td className="px-4 py-2">{rel.version}</td>
                <td className="px-4 py-2">{rel.status}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawerRelease && (
        <HelmReleaseDrawer
          open={!!drawerRelease}
          release={drawerRelease}
          onClose={() => setDrawerRelease(null)}
          onActionDone={loadReleases}
        />
      )}
    </div>
  );
}
