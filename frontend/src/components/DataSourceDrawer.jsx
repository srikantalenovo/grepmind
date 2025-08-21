import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

export default function DataSourceDrawer() {
  const { accessToken, user } = useContext(AuthContext);
  const role = user?.role || 'viewer';

  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!open || !accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}`, 'x-user-role': role };
    axios.get(`${API}/datasources`, { headers })
      .then(res => {
        const prom = (res.data || []).find(x => x.type === 'prometheus');
        if (prom) setUrl(prom.url);
      })
      .catch(() => {});
  }, [open, accessToken, role]);

  const save = async () => {
    if (role !== 'admin') {
      alert('Only admin can change data sources');
      return;
    }
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}`, 'x-user-role': role };
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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          
          {/* Drawer Panel */}
          <div className="absolute right-0 top-0 h-full w-full sm:w-[28rem] bg-white shadow-xl overflow-y-auto flex flex-col">
            
            {/* Header */}
            <div className="px-4 py-3 bg-indigo-700 text-white">
              <div className="text-sm">Prometheus Data Source</div>
              <div className="text-lg font-semibold truncate">Datasource · Prometheus</div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3 flex-1">
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
      )}
    </>
  );
}
