// src/pages/Helm.jsx
import React, { useEffect, useState, useRef, useContext } from 'react';
import HelmReleaseDrawer from '../components/HelmReleaseDrawer.jsx';
import { AuthContext } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path, opts = {}, role = 'editor') {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      'x-user-role': role,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

async function fetchReleases(role) {
  return apiFetch('/api/helm/releases', {}, role);
}

export default function Helm() {
  const { user } = useContext(AuthContext);
  const role = user?.role || 'editor';

  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState(null);

  const load = async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const data = await fetchReleases(role);
      setReleases(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      console.error('Failed to fetch Helm releases', e);
      setErrMsg(e.message || 'Failed to load releases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [role]);

  const onRowClick = (release) => {
    setSelectedRelease(release);
    setDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-100 p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Helm Releases</h1>
        </div>
        <div>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 backdrop-blur-md bg-white/70">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">
            <thead>
              <tr className="bg-indigo-700 text-white text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left border-b border-indigo-200/40 w-[20%]">Name</th>
                <th className="px-4 py-3 text-left border-b border-indigo-200/40 w-[20%]">Namespace</th>
                <th className="px-4 py-3 text-left border-b border-indigo-200/40 w-[20%]">Chart</th>
                <th className="px-4 py-3 text-left border-b border-indigo-200/40 w-[20%]">Version</th>
                <th className="px-4 py-3 text-left border-b border-indigo-200/40 w-[20%]">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && releases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-gray-600 text-center">
                    {errMsg || 'No Helm releases found.'}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-gray-700 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 rounded-full border-2 border-indigo-200 border-t-indigo-700" />
                      <span className="ml-3">Loading…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                releases.map((release, idx) => (
                  <tr
                    key={`${release.namespace}-${release.name}-${idx}`}
                    className="transition hover:bg-indigo-50 cursor-pointer"
                    onClick={() => onRowClick(release)}
                  >
                    <td className="px-4 py-3 border-b border-gray-200 text-gray-900">{release.name}</td>
                    <td className="px-4 py-3 border-b border-gray-200 text-gray-900">{release.namespace}</td>
                    <td className="px-4 py-3 border-b border-gray-200 text-gray-900">{release.chart}</td>
                    <td className="px-4 py-3 border-b border-gray-200 text-gray-900">{release.version}</td>
                    <td className="px-4 py-3 border-b border-gray-200 text-gray-900">{release.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <HelmReleaseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        release={selectedRelease}
        role={role}
        onActionDone={load}
      />
    </div>
  );
}
