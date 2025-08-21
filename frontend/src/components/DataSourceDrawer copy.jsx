// src/components/DataSourceDrawer.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

/** Minimal drawer without extra UI libs */
export default function DataSourceDrawer({ token, role }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    axios.get(`${API}/datasources`, { headers }).then(res => {
      const prom = (res.data || []).find(x => x.type === 'prometheus');
      if (prom) setUrl(prom.url);
    }).catch(()=>{});
  }, [token]);

  const save = async () => {
    if (role !== 'admin') {
      alert('Only admin can change data sources');
      return;
    }
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/datasources/prometheus`, { url }, { headers });
      setStatus('Saved');
    } catch (e) {
      setStatus('Failed: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-xl border shadow bg-white">
        ⚙️ Datasource
      </button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[28rem] bg-white shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Prometheus Data Source</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500">✕</button>
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
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">
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
      )}
    </>
  );
}
