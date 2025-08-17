import React, { useEffect, useState, useRef } from 'react';
import HelmReleaseDrawer from '../components/HelmReleaseDrawer';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function HelmTab() {
  const [releases, setReleases] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNs, setSelectedNs] = useState('all');
  const [loading, setLoading] = useState(false);
  const [drawerRelease, setDrawerRelease] = useState(null);

  const intervalRef = useRef(null);

  const loadNamespaces = async () => {
    try {
      const data = await apiFetch('/api/helm/namespaces', {}, 'editor');
      setNamespaces(['all', ...data.namespaces]);
    } catch (err) {
      console.error('Failed to load namespaces:', err);
    }
  };

  const loadReleases = async () => {
    setLoading(true);
    try {
      const nsQuery = selectedNs === 'all' ? 'all' : selectedNs;
      const data = await apiFetch(`/api/helm/releases?namespace=${nsQuery}`, {}, 'editor');
      setReleases(data.releases || []);
    } catch (err) {
      console.error('Failed to load releases:', err);
      setReleases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNamespaces();
  }, []);

  useEffect(() => {
    loadReleases();
    // refresh every 30 mins
    intervalRef.current && clearInterval(intervalRef.current);
    intervalRef.current = setInterval(loadReleases, 30 * 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, [selectedNs]);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Helm Releases</h2>
        <div className="flex gap-2">
          <select
            value={selectedNs}
            onChange={(e) => setSelectedNs(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            {namespaces.map(ns => <option key={ns} value={ns}>{ns}</option>)}
          </select>
          <button
            className="bg-indigo-600 text-white px-3 py-1 rounded"
            onClick={loadReleases}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded shadow">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-gray-700">Namespace</th>
              <th className="px-4 py-2 text-left text-gray-700">Release</th>
              <th className="px-4 py-2 text-left text-gray-700">Chart</th>
              <th className="px-4 py-2 text-left text-gray-700">Status</th>
              <th className="px-4 py-2 text-left text-gray-700">Updated</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-2 text-center">Loading…</td>
                </tr>
              ) : releases.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-2 text-center">No releases found</td>
                </tr>
              ) : (
                releases.map((rel) => (
                  <motion.tr
                    key={`${rel.namespace}-${rel.name}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setDrawerRelease(rel)}
                  >
                    <td className="px-4 py-2">{rel.namespace}</td>
                    <td className="px-4 py-2">{rel.name}</td>
                    <td className="px-4 py-2">{rel.chart}</td>
                    <td className="px-4 py-2">{rel.status}</td>
                    <td className="px-4 py-2">{rel.updated}</td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
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
