// src/components/DataSourceDrawer.jsx
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

  // Load existing Prometheus URL from backend
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


  // Validate Prometheus URL
  const validatePrometheus = async (testUrl) => {
    if (!testUrl) throw new Error('URL is empty');
    let urlToTest = testUrl.trim();
    if (!/^https?:\/\//i.test(urlToTest)) urlToTest = 'http://' + urlToTest;
    urlToTest = urlToTest.replace(/\/$/, '');
    try {
      const res = await axios.get(`${urlToTest}/api/v1/query?query=up`, { timeout: 5000 });
      if (res.data?.status === 'success') return true;
      throw new Error('Prometheus query returned non-success status');
    } catch (err) {
      if (err.response) throw new Error(`Server responded with ${err.response.status}`);
      if (err.request) throw new Error('Unable to reach Prometheus. Check the URL or ingress.');
      throw new Error(err.message || 'Connection failed');
    }
  };

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
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-0 h-full w-full sm:w-[28rem] bg-white shadow-xl overflow-y-auto">
            {/* Header */}
            <div className="px-4 py-3 bg-indigo-700 text-white">
              <div className="text-sm">Prometheus Data Source</div>
              <div className="text-lg font-semibold truncate">Role: <span className="font-mono">{role}</span></div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <label className="block text-sm text-gray-600">Prometheus URL</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="http://prometheus.sritechhub.com/"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
              <div className="text-xs text-gray-500">
                Enter the URL accessible from your browser. It will be validated and stored in DB.
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

              <div className="text-xs text-gray-500 pt-2">
                Only <b>admin</b> can change the data source.
              </div>
              <div className="text-xs text-gray-500">Role: <span className="font-mono">{role}</span></div>

              {/* Close button */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </>
  );
}
