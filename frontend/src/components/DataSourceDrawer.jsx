// src/components/DataSourceDrawer.jsx
import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// ---------- apiFetch ----------
async function apiFetch(path, opts = {}, role = 'viewer') {
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

// ---------- Component ----------
export default function DataSourceDrawer({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState(null);
  const [role, setRole] = useState('viewer'); // default role

  useEffect(() => {
    if (!open) return;

    // Fetch user role
    apiFetch('/auth/me')
      .then(res => setRole(res.user?.role || 'viewer'))
      .catch(() => setRole('viewer'));

    // Fetch Prometheus datasource
    apiFetch('/datasources', {}, role)
      .then(res => {
        const prom = (res || []).find(x => x.type === 'prometheus');
        if (prom) setUrl(prom.url);
      })
      .catch(() => {});
  }, [open]);

  const save = async () => {
    if (role !== 'admin') {
      alert('Only admin can change data sources');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/datasources/prometheus', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }, role);
      setStatus('Saved');
    } catch (e) {
      setStatus('Failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[28rem] bg-white shadow-xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Prometheus Data Source</h2>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-gray-600">URL</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="http://prometheus-server.monitoring.svc.cluster.local:9090"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
          <div className="text-xs text-gray-500">
            This URL is stored in DB and used for Prometheus queries.
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              disabled={loading}
              onClick={save}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            {status && <span className="text-sm">{status}</span>}
          </div>

          <div className="text-xs text-gray-500 pt-4">
            Only <b>admin</b> can change the data source.
          </div>
        </div>
      </div>
    </div>
  );
}
