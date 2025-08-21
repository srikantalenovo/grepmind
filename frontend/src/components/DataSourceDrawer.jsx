// src/components/DataSourceDrawer.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

/** Minimal drawer with validation */
export default function DataSourceDrawer({ token, role }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Load existing Prometheus URL from DB
  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    axios.get(`${API}/datasources`, { headers })
      .then(res => {
        const prom = (res.data || []).find(x => x.type === 'prometheus');
        if (prom) setUrl(prom.url);
      })
      .catch(() => {});
  }, [token]);

  // Validate Prometheus URL by calling /api/v1/query?query=up
  const validatePrometheus = async (testUrl) => {
    try {
      const res = await axios.get(`${testUrl.replace(/\/$/, '')}/api/v1/query?query=up`, { timeout: 5000 });
      return res.data?.status === 'success';
    } catch (err) {
      throw new Error(err.message || 'Connection failed');
    }
  };

  const save = async () => {
    if (role !== 'admin') {
      alert('Only admin can change data sources');
      return;
    }
    if (!url) {
      alert('Please enter a Prometheus URL');
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Validate connectivity
      await validatePrometheus(url);

      // Save to backend
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/datasources/prometheus`, { url }, { headers });

      setStatus('Saved ✅');
    } catch (e) {
      setStatus('Failed ❌: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded-xl border shadow bg-white"
      >
        ⚙️ Datasource
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-0 h-full w-full sm:w-[28rem] bg-white shadow-xl p-6 overflow-y-auto">
            {/* Header */}
            <div className="px-4 py-3 bg-indigo-700 text-white">
              <div className="text-sm">Prometheus Data Source</div>
              <div className="text-lg font-semibold truncate">Manage URL</div>
            </div>

            <div className="space-y-3 mt-4">
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
                Only <b>admin</b> can change the data source. URL will be tested before saving.
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="text-xs text-gray-500">Role: <span className="font-mono">{role}</span></div>
    </>   
  );
}
