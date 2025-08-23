// src/pages/Analytics.jsx
import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API, authHeaders } from './metricsHelpers';
import PanelEditor from '../components/PanelEditor';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function Analytics() {
  const { accessToken, user } = useContext(AuthContext);
  const role = user?.role || 'viewer';

  const [dashboards, setDashboards] = useState([]);
  const [activeDash, setActiveDash] = useState(null);
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editorPanel, setEditorPanel] = useState(null);

  const canEdit = role === 'admin' || role === 'editor';

  const loadDashboards = async (selectFirstIfEmpty = true) => {
    if (!accessToken) return;
    try {
      const res = await axios.get(`${API}/analytics/dashboards`, { headers: authHeaders(accessToken, role) });
      setDashboards(res.data || []);
      if (selectFirstIfEmpty && res.data?.length && !activeDash) {
        setActiveDash(res.data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadPanels = async (dash) => {
    if (!dash || !accessToken) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/analytics/dashboards/${dash.id}/panels`, { headers: authHeaders(accessToken, role) });
      setPanels(res.data || []);
    } catch (e) {
      console.error(e);
      setPanels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboards(); }, [accessToken, role]);
  useEffect(() => { if (activeDash?.id) loadPanels(activeDash); }, [activeDash?.id]);

  const createDashboard = async () => {
    const name = prompt('Dashboard name?');
    if (!name) return;
    try {
      await axios.post(`${API}/analytics/dashboards`, { name }, { headers: authHeaders(accessToken, role) });
      await loadDashboards(false);
    } catch (e) {
      alert(e.response?.data?.message || e.response?.data?.error || e.message);
    }
  };

  const deleteDashboard = async (dash) => {
    if (!dash) return;
    if (!confirm(`Delete dashboard "${dash.name}"?`)) return;
    try {
      await axios.delete(`${API}/analytics/dashboards/${dash.id}`, { headers: authHeaders(accessToken, role) });
      setActiveDash(null);
      await loadDashboards();
      setPanels([]);
    } catch (e) {
      alert(e.response?.data?.message || e.response?.data?.error || e.message);
    }
  };

  const deletePanel = async (p) => {
    if (!confirm(`Delete panel "${p.title}"?`)) return;
    try {
      await axios.delete(`${API}/analytics/panels/${p.id}`, { headers: authHeaders(accessToken, role) });
      await loadPanels(activeDash);
    } catch (e) {
      alert(e.response?.data?.message || e.response?.data?.error || e.message);
    }
  };

  const PanelPreview = ({ panel }) => {
    const [data, setData] = useState([]);
    const [series, setSeries] = useState([]);

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const res = await axios.post(`${API}/analytics/query`, { query: panel.promql }, { headers: authHeaders(accessToken, role) });
          const matrix = res.data?.data?.result || [];
          const { data, series } = (await import('./metricsHelpers')).toRechartsSeries(matrix);
          if (mounted) { setData(data); setSeries(series); }
        } catch (e) {
          if (mounted) { setData([]); setSeries([]); }
        }
      })();
      return () => { mounted = false; };
    }, [panel?.promql]);

    return (
      <div className="rounded-2xl bg-white shadow p-3 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">{panel.title}</div>
          {canEdit && (
            <div className="flex gap-2">
              <button
                className="text-indigo-600 hover:underline"
                onClick={() => { setEditorPanel(panel); setShowEditor(true); }}
              >
                Edit
              </button>
              <button className="text-red-600 hover:underline" onClick={() => deletePanel(panel)}>
                Delete
              </button>
            </div>
          )}
        </div>
        <div className="h-48">
          {data.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                {series.map(s => <Line key={s} type="monotone" dataKey={s} strokeWidth={2} dot={false} />)}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
              No data
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full grid grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <aside className="border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-semibold">Dashboards</div>
          {canEdit && (
            <button
              onClick={createDashboard}
              className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition"
            >
              + New
            </button>
          )}
        </div>

        <div className="p-2 space-y-1 overflow-y-auto h-[calc(100vh-56px)]">
          {(dashboards || []).map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDash(d)}
              className={`w-full text-left px-3 py-2 rounded-xl transition ${
                activeDash?.id === d.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="font-medium truncate">{d.name}</div>
              <div className="text-xs text-gray-400">id: {d.id}</div>
            </button>
          ))}
        </div>

        {activeDash && canEdit && (
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={() => deleteDashboard(activeDash)}
              className="w-full px-3 py-2 rounded-xl border text-red-600 border-red-200 hover:bg-red-50 transition"
            >
              Delete dashboard
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="p-6 bg-gray-50 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-500">Analytics</div>
            <h1 className="text-2xl font-semibold">{activeDash?.name || 'Select a dashboard'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Role: <span className="font-mono">{role}</span></span>
            {activeDash && canEdit && (
              <button
                onClick={() => { setEditorPanel(null); setShowEditor(true); }}
                className="px-3 py-2 rounded-xl border shadow bg-white hover:bg-gray-50 transition"
              >
                ➕ New Panel
              </button>
            )}
          </div>
        </div>

        {!activeDash ? (
          <div className="text-gray-500">Choose or create a dashboard from the left.</div>
        ) : loading ? (
          <div className="text-gray-500 animate-pulse">Loading panels…</div>
        ) : panels.length === 0 ? (
          <div className="text-gray-500">No panels yet. Click “New Panel”.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {panels.map(p => <PanelPreview key={p.id} panel={p} />)}
          </div>
        )}
      </main>

      {showEditor && activeDash && (
        <PanelEditor
          token={accessToken}
          role={role}
          dashboard={activeDash}
          panel={editorPanel}
          onClose={() => setShowEditor(false)}
          onSaved={() => loadPanels(activeDash)}
        />
      )}
    </div>
  );
}
