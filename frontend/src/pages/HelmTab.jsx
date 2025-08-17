import React, { useEffect, useState } from 'react';
import HelmReleaseDrawer from '../components/HelmReleaseDrawer';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path, opts = {}, role = 'editor') {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'x-user-role': role,
      ...(opts.headers || {}),
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
  const [namespace, setNamespace] = useState('all');
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState(null);

  const loadReleases = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/helm/releases?namespace=${namespace}`);
      setReleases(data.items || []); // Ensure fallback
    } catch (e) {
      console.error('Failed to load Helm releases:', e.message);
      setReleases([]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadReleases();
  }, [namespace]);

  const openDrawer = (release) => {
    setSelectedRelease(release);
    setDrawerOpen(true);
  };

  const onActionDone = () => {
    loadReleases();
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex gap-2 items-center">
        <label>Namespace:</label>
        <select value={namespace} onChange={e => setNamespace(e.target.value)}
          className="border px-2 py-1 rounded">
          <option value="all">All</option>
          {/* Optionally load namespaces dynamically */}
          <option value="monitoring">monitoring</option>
          <option value="default">default</option>
        </select>
        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={loadReleases}>
          Refresh
        </button>
      </div>

      {loading ? <p>Loading releases…</p> : (
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Name</th>
              <th className="border px-2 py-1">Namespace</th>
              <th className="border px-2 py-1">Chart</th>
              <th className="border px-2 py-1">Version</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {releases.length === 0 ? (
              <tr>
                <td colSpan={5} className="border px-2 py-1 text-center">No releases found</td>
              </tr>
            ) : releases.map(rel => (
              <tr key={`${rel.namespace}-${rel.name}`}>
                <td className="border px-2 py-1">{rel.name}</td>
                <td className="border px-2 py-1">{rel.namespace}</td>
                <td className="border px-2 py-1">{rel.chart}</td>
                <td className="border px-2 py-1">{rel.version}</td>
                <td className="border px-2 py-1 flex gap-1">
                  <button className="bg-green-600 text-white px-2 py-1 rounded"
                    onClick={() => openDrawer(rel)}>View / Edit YAML</button>
                  <button className="bg-indigo-600 text-white px-2 py-1 rounded"
                    onClick={() => openDrawer(rel)}>Upgrade</button>
                  <button className="bg-yellow-500 text-white px-2 py-1 rounded"
                    onClick={() => openDrawer(rel)}>Rollback</button>
                  <button className="bg-red-600 text-white px-2 py-1 rounded"
                    onClick={() => openDrawer(rel)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {drawerOpen && selectedRelease && (
        <HelmReleaseDrawer
          open={drawerOpen}
          release={selectedRelease}
          onClose={() => setDrawerOpen(false)}
          onActionDone={onActionDone}
        />
      )}
    </div>
  );
}
