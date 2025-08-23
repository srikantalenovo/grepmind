// src/components/MetricsDashboardDrawer.jsx
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import PanelForm from './PanelForm.jsx';
import PromQLExplorer from './PromQLExplorer.jsx';

const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

export default function MetricsDashboardDrawer({ open, onClose }) {
  const { accessToken, user } = useContext(AuthContext);
  const role = user?.role || 'viewer';
  const headers = { Authorization: `Bearer ${accessToken}`, 'x-user-role': role };

  const [dashboards, setDashboards] = useState([]);
  const [selected, setSelected] = useState(null);
  const [addingPanelFor, setAddingPanelFor] = useState(null);
  const [status, setStatus] = useState('');

  const load = async () => {
    if (!accessToken) return;
    try {
      setStatus('Loading…');
      const res = await axios.get(`${API}/analytics/dashboards`, { headers });
      setDashboards(res.data);
      setStatus('');
    } catch (e) {
      setStatus('Failed: ' + (e.response?.data?.error || e.message));
    }
  };

  useEffect(() => { if (open) load(); }, [open]);

  const createDash = async () => {
    const name = prompt('Dashboard name');
    if (!name) return;
    try {
      await axios.post(`${API}/analytics/dashboards`, { name }, { headers });
      await load();
    } catch (e) {
      alert('Create failed: ' + (e.response?.data?.details || e.message));
    }
  };

  const removeDash = async (id) => {
    if (!confirm('Delete dashboard?')) return;
    try {
      await axios.delete(`${API}/analytics/dashboards/${id}`, { headers });
      await load();
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.details || e.message));
    }
  };

  return open ? (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[36rem] bg-white shadow-xl overflow-y-auto">
        <div className="px-4 py-3 bg-indigo-700 text-white">
          <div className="text-sm">Metrics Dashboards</div>
          <div className="text-lg font-semibold truncate">Role: {role}</div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">{status}</div>
            {['admin','editor'].includes(role) && (
              <button onClick={createDash} className="px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
                + New Dashboard
              </button>
            )}
          </div>

          {dashboards.map(d => (
            <div key={d.id} className="border rounded-2xl p-4 bg-white shadow space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{d.name}</div>
                <div className="flex gap-2">
                  {['admin','editor'].includes(role) && (
                    <button onClick={() => setAddingPanelFor(d)} className="px-3 py-1 rounded-lg bg-green-600 text-white">+ Panel</button>
                  )}
                  {role === 'admin' && (
                    <button onClick={() => removeDash(d.id)} className="px-3 py-1 rounded-lg bg-red-600 text-white">Delete</button>
                  )}
                </div>
              </div>

              {/* Simple, lightweight panel renders (fetch-by-click via explorer is built-in). 
                 For production charts you likely have a dedicated panel grid view page. */}
              {d.panels?.length ? (
                <ul className="list-disc pl-5 text-sm text-gray-600">
                  {d.panels.map(p => (
                    <li key={p.id}><span className="font-medium">{p.title}</span> — <code>{p.promql}</code> ({p.chartType})</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-400">No panels yet.</div>
              )}
            </div>
          ))}

          {/* PromQL scratchpad */}
          <PromQLExplorer />
        </div>

        <div className="p-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800">
            Close
          </button>
        </div>
      </div>

      {addingPanelFor && (
        <PanelForm
          dashboard={addingPanelFor}
          onClose={() => setAddingPanelFor(null)}
          onSaved={load}
        />
      )}
    </div>
  ) : null;
}
