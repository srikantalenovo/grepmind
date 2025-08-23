// src/pages/Analytics.jsx
import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

/* ----------------------------- helpers ------------------------------ */
const headersFor = (token, role) => ({
  Authorization: `Bearer ${token}`,
  'x-user-role': role
});

const Chart = ({ panel, data }) => {
  if (!data || data.length === 0) return <div className="text-xs text-gray-500">No data</div>;

  const viz = panel.visualizationConfig || {};
  const chartType = (panel.chartType || 'line').toLowerCase();

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" hide={data.length > 30} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'pie') {
    // Aggregate for a quick pie (take last points of multiple series if present)
    const grouped = Object.values(data.reduce((acc, d) => {
      const k = d.series || panel.title || 'series';
      acc[k] = { name: k, value: (acc[k]?.value || 0) + (d.value || 0) };
      return acc;
    }, {}));
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie dataKey="value" data={grouped} outerRadius={80} label />
          {grouped.map((_, i) => <Cell key={i} />)}
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // default line
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" strokeWidth={2} dot={false} />
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" hide={data.length > 30} />
        <YAxis />
        <Tooltip />
      </LineChart>
    </ResponsiveContainer>
  );
};

const panelThresholdClass = (thresholds, v) => {
  if (!thresholds) return '';
  const warn = Number.isFinite(thresholds.warning) ? thresholds.warning : undefined;
  const crit = Number.isFinite(thresholds.critical) ? thresholds.critical : undefined;
  if (crit != null && v >= crit) return 'ring-2 ring-red-500';
  if (warn != null && v >= warn) return 'ring-2 ring-amber-400';
  return '';
};

/* ----------------------- Panel Editor Drawer ------------------------ */
const PanelEditorDrawer = ({
  open, onClose, token, role, dashboardId, panel, onSaved
}) => {
  const isEdit = !!panel?.id;
  const [title, setTitle] = useState(panel?.title || '');
  const [promql, setPromql] = useState(panel?.promql || '');
  const [chartType, setChartType] = useState(panel?.chartType || 'line');
  const [thresholds, setThresholds] = useState(panel?.thresholds || { warning: '', critical: '' });
  const [visualizationConfig, setVisualizationConfig] = useState(panel?.visualizationConfig || {});
  const [layout, setLayout] = useState(panel?.layout || { w: 6, h: 3 });
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(panel?.title || '');
    setPromql(panel?.promql || '');
    setChartType(panel?.chartType || 'line');
    setThresholds(panel?.thresholds || { warning: '', critical: '' });
    setVisualizationConfig(panel?.visualizationConfig || {});
    setLayout(panel?.layout || { w: 6, h: 3 });
    setPreview([]);
  }, [open, panel]);

  const doPreview = async () => {
    if (!promql?.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/analytics/query`,
        { query: promql },
        { headers: headersFor(token, role) }
      );
      // Expecting backend returns array of { ts, value, series? }
      const rows = (res.data?.data || []).map(r => ({
        time: r.ts ? new Date(r.ts).toLocaleTimeString() : '',
        value: Number(r.value || r.val || 0),
        series: r.series
      }));
      setPreview(rows);
    } catch (e) {
      alert(`Preview failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!title.trim() || !promql.trim()) {
      alert('Title and PromQL are required');
      return;
    }
    const payload = {
      title,
      promql,
      chartType,
      thresholds: {
        warning: thresholds.warning === '' ? null : Number(thresholds.warning),
        critical: thresholds.critical === '' ? null : Number(thresholds.critical)
      },
      visualizationConfig,
      layout
    };
    try {
      if (isEdit) {
        await axios.put(
          `${API}/analytics/dashboards/${dashboardId}/panels/${panel.id}`,
          payload,
          { headers: headersFor(token, role) }
        );
      } else {
        await axios.post(
          `${API}/analytics/dashboards/${dashboardId}/panels`,
          payload,
          { headers: headersFor(token, role) }
        );
      }
      onSaved?.();
      onClose?.();
    } catch (e) {
      alert(`Save failed: ${e.response?.data?.error || e.message}`);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[36rem] bg-white shadow-xl overflow-y-auto">
        <div className="px-4 py-3 bg-indigo-700 text-white">
          <div className="text-sm">{isEdit ? 'Edit Panel' : 'Add Panel'}</div>
          <div className="text-lg font-semibold truncate">Dashboard Panel Editor</div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Title</label>
            <input
              className="w-full border rounded-xl px-3 py-2"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="HTTP Requests Rate"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">PromQL</label>
            <textarea
              className="w-full border rounded-xl px-3 py-2 min-h-[96px]"
              value={promql}
              onChange={e => setPromql(e.target.value)}
              placeholder="rate(http_requests_total[5m])"
            />
            <div className="mt-2">
              <button
                onClick={doPreview}
                className="px-3 py-2 rounded-xl border shadow bg-white disabled:opacity-50"
                disabled={loading || !promql}
              >
                {loading ? 'Previewing…' : 'Preview'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Chart Type</label>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={chartType}
                onChange={e => setChartType(e.target.value)}
              >
                <option value="line">Line</option>
                <option value="bar">Bar</option>
                <option value="pie">Pie</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Warn ≥</label>
              <input
                type="number"
                className="w-full border rounded-xl px-3 py-2"
                value={thresholds.warning ?? ''}
                onChange={e => setThresholds(t => ({ ...t, warning: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Critical ≥</label>
              <input
                type="number"
                className="w-full border rounded-xl px-3 py-2"
                value={thresholds.critical ?? ''}
                onChange={e => setThresholds(t => ({ ...t, critical: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Width (grid)</label>
              <input
                type="number"
                className="w-full border rounded-xl px-3 py-2"
                value={layout.w}
                min={2}
                max={12}
                onChange={e => setLayout(l => ({ ...l, w: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Height (rows)</label>
              <input
                type="number"
                className="w-full border rounded-xl px-3 py-2"
                value={layout.h}
                min={2}
                max={8}
                onChange={e => setLayout(l => ({ ...l, h: Number(e.target.value) }))}
              />
            </div>
          </div>

          {preview && preview.length > 0 && (
            <div className="mt-2">
              <div className="text-sm font-semibold mb-1">Preview</div>
              <div className="rounded-2xl border p-3">
                <Chart panel={{ chartType }} data={preview} />
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-700 text-white">Close</button>
            {role !== 'viewer' && (
              <button onClick={save} className="px-4 py-2 rounded-xl bg-blue-600 text-white">
                {isEdit ? 'Save Changes' : 'Add Panel'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------- main page ---------------------------- */
export default function Analytics() {
  const { accessToken, user } = useContext(AuthContext);
  const role = user?.role || 'viewer';

  const [dashboards, setDashboards] = useState([]);
  const [selected, setSelected] = useState(null);
  const [panels, setPanels] = useState([]);
  const [panelData, setPanelData] = useState({}); // panelId -> rows
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);
  const [loading, setLoading] = useState(false);

  /* --------- load dashboards ---------- */
  const loadDashboards = async () => {
    if (!accessToken) return;
    try {
      const res = await axios.get(`${API}/analytics/dashboards`, {
        headers: headersFor(accessToken, role)
      });
      setDashboards(res.data || []);
    } catch (e) {
      console.error(e);
      if (e.response?.status === 403) alert('Forbidden: Insufficient role');
    }
  };

  /* --------- load one dashboard (+panels) ---------- */
  const loadDashboardPanels = async (dashboardId) => {
    if (!dashboardId || !accessToken) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/analytics/dashboards/${dashboardId}`, {
        headers: headersFor(accessToken, role)
      });
      const p = res.data?.panels || [];
      setPanels(p);
      // fetch each panel query result once (initial render)
      p.forEach(async (panel) => {
        await fetchPanelData(panel);
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPanelData = async (panel) => {
    if (!panel?.promql) return;
    try {
      const res = await axios.post(
        `${API}/analytics/query`,
        { query: panel.promql },
        { headers: headersFor(accessToken, role) }
      );
      const rows = (res.data?.data || []).map(r => ({
        time: r.ts ? new Date(r.ts).toLocaleTimeString() : '',
        value: Number(r.value || r.val || 0),
        series: r.series
      }));
      setPanelData(prev => ({ ...prev, [panel.id]: rows }));
    } catch (e) {
      console.error(e);
    }
  };

  /* --------- create / delete dashboards ---------- */
  const createDashboard = async () => {
    const name = prompt('Dashboard name?');
    if (!name) return;
    try {
      const res = await axios.post(
        `${API}/analytics/dashboards`,
        { name, description: '' },
        { headers: headersFor(accessToken, role) }
      );
      await loadDashboards();
      // auto-select newly created
      setSelected(res.data);
      await loadDashboardPanels(res.data.id);
    } catch (e) {
      alert(`Create failed: ${e.response?.data?.error || e.message}`);
    }
  };

  const deleteDashboard = async (dashboard) => {
    if (!confirm(`Delete dashboard "${dashboard.name}"?`)) return;
    try {
      await axios.delete(`${API}/analytics/dashboards/${dashboard.id}`, {
        headers: headersFor(accessToken, role)
      });
      setSelected(null);
      setPanels([]);
      setPanelData({});
      await loadDashboards();
    } catch (e) {
      alert(`Delete failed: ${e.response?.data?.error || e.message}`);
    }
  };

  /* --------- initial load ---------- */
  useEffect(() => {
    loadDashboards();
  }, [accessToken, role]);

  /* --------- select change -> load panels ---------- */
  useEffect(() => {
    if (selected?.id) loadDashboardPanels(selected.id);
  }, [selected?.id]);

  /* ----------------------------- render ----------------------------- */
  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-white/80 backdrop-blur-sm">
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Analytics</div>
            <div className="text-lg font-semibold">Dashboards</div>
          </div>
          {role !== 'viewer' && (
            <button
              onClick={createDashboard}
              className="px-3 py-2 rounded-xl border shadow bg-white"
              title="Create new dashboard"
            >
              + New
            </button>
          )}
        </div>
        <div className="px-2 pb-3 space-y-1 overflow-y-auto h-[calc(100%-72px)]">
          {dashboards.length === 0 && (
            <div className="text-xs text-gray-500 px-2">No dashboards yet.</div>
          )}
          {dashboards.map(d => {
            const active = selected?.id === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={`w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-50 transition ${
                  active ? 'bg-indigo-100 font-medium' : ''
                }`}
              >
                <div className="truncate">{d.name}</div>
                {d.description && <div className="text-xs text-gray-500 truncate">{d.description}</div>}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-y-auto space-y-4">
        {!selected && (
          <div className="h-full grid place-items-center">
            <div className="text-center">
              <div className="text-2xl font-semibold mb-2">Select a dashboard</div>
              <div className="text-gray-500">
                Choose a dashboard from the left, or create a new one.
              </div>
            </div>
          </div>
        )}

        {selected && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Dashboard</div>
                <div className="text-2xl font-semibold">{selected.name}</div>
              </div>
              <div className="flex items-center gap-2">
                {role !== 'viewer' && (
                  <>
                    <button
                      className="px-3 py-2 rounded-xl border shadow bg-white"
                      onClick={() => {
                        setEditingPanel(null);
                        setDrawerOpen(true);
                      }}
                    >
                      + Add Panel
                    </button>
                    <button
                      className="px-3 py-2 rounded-xl border shadow bg-white text-red-600"
                      onClick={() => deleteDashboard(selected)}
                    >
                      Delete
                    </button>
                  </>
                )}
                <span className="text-xs text-gray-500">Role: <span className="font-mono">{role}</span></span>
              </div>
            </div>

            {/* Panels grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {loading && (
                <div className="col-span-full text-sm text-gray-500">Loading panels…</div>
              )}
              {panels.map(p => {
                const rows = panelData[p.id] || [];
                const lastVal = rows.length ? rows[rows.length - 1].value : 0;
                const ring = panelThresholdClass(p.thresholds, lastVal);
                const spanCols = Math.min(3, Math.max(1, Math.round((p.layout?.w || 6) / 4)));
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl shadow p-4 bg-white transition ${ring}`}
                    style={{ gridColumn: `span ${spanCols} / span ${spanCols}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold truncate">{p.title}</div>
                      {role !== 'viewer' && (
                        <div className="flex items-center gap-2">
                          <button
                            className="text-sm text-indigo-600"
                            onClick={() => {
                              setEditingPanel(p);
                              setDrawerOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-sm text-red-600"
                            onClick={async () => {
                              if (!confirm(`Delete panel "${p.title}"?`)) return;
                              try {
                                await axios.delete(
                                  `${API}/analytics/dashboards/${selected.id}/panels/${p.id}`,
                                  { headers: headersFor(accessToken, role) }
                                );
                                setPanels(ps => ps.filter(x => x.id !== p.id));
                                setPanelData(pd => {
                                  const { [p.id]: _, ...rest } = pd;
                                  return rest;
                                });
                              } catch (e) {
                                alert(`Delete failed: ${e.response?.data?.error || e.message}`);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    <Chart panel={p} data={rows} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Drawer for Add/Edit panel */}
      <PanelEditorDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        token={accessToken}
        role={role}
        dashboardId={selected?.id}
        panel={editingPanel}
        onSaved={() => {
          if (selected?.id) loadDashboardPanels(selected.id);
        }}
      />
    </div>
  );
}
