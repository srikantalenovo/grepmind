import React, { useEffect, useState, useCallback } from 'react';
import HelmReleaseDrawer from '../components/HelmReleaseDrawer';

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
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [role, setRole] = useState('editor'); // can be dynamically set

  // ---------- Fetch all namespaces ----------
  const loadNamespaces = useCallback(async () => {
    try {
      const data = await apiFetch('/api/cluster/namespaces', {}, role);
      setNamespaces(['all', ...data.namespaces]);
    } catch (err) {
      console.error('Failed to load namespaces', err);
      setNamespaces(['all']);
    }
  }, [role]);

  // ---------- Fetch releases ----------
  const loadReleases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/helm/releases?namespace=${selectedNamespace}`, {}, role);
      console.log('Helm API response:', data); // debug
      setReleases(data.releases || []);
    } catch (err) {
      console.error('Failed to load Helm releases', err);
      setReleases([]);
    } finally {
      setLoading(false);
    }
  }, [selectedNamespace, role]);

  // ---------- Auto-refresh every 30 minutes ----------
  useEffect(() => {
    loadNamespaces();
  }, [loadNamespaces]);

  useEffect(() => {
    loadReleases();
    const interval = setInterval(loadReleases, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadReleases]);

  // ---------- Render ----------
  return (
    <div className="p-4">
      <div className="flex justify-between mb-3">
        <select
          className="border rounded px-2 py-1"
          value={selectedNamespace}
          onChange={e => setSelectedNamespace(e.target.value)}
        >
          {namespaces.map(ns => <option key={ns} value={ns}>{ns}</option>)}
        </select>
        <button
          className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
          onClick={loadReleases}
        >
          Refresh
        </button>
      </div>

      <div className="overflow-auto rounded shadow border">
        <table className="min-w-full border-collapse">
          <thead className="bg-indigo-600 text-white rounded-t">
            <tr>
              <th className="px-4 py-2 text-left rounded-tl">Name</th>
              <th className="px-4 py-2 text-left">Namespace</th>
              <th className="px-4 py-2 text-left">Chart</th>
              <th className="px-4 py-2 text-left">Version</th>
              <th className="px-4 py-2 text-left rounded-tr">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center p-4">Loading releases…</td></tr>
            ) : releases.length === 0 ? (
              <tr><td colSpan={5} className="text-center p-4">No releases found</td></tr>
            ) : (
              releases.map(rel => (
                <tr
                  key={`${rel.namespace}-${rel.name}`}
                  className="hover:bg-indigo-50 cursor-pointer transition"
                  onClick={() => setSelectedRelease(rel)}
                >
                  <td className="px-4 py-2">{rel.name}</td>
                  <td className="px-4 py-2">{rel.namespace}</td>
                  <td className="px-4 py-2">{rel.chart?.name || '-'}</td>
                  <td className="px-4 py-2">{rel.chart?.version || '-'}</td>
                  <td className="px-4 py-2">{rel.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedRelease && (
        <HelmReleaseDrawer
          open={Boolean(selectedRelease)}
          release={selectedRelease}
          onClose={() => setSelectedRelease(null)}
          onActionDone={loadReleases}
          role={role}
        />
      )}
    </div>
  );
}