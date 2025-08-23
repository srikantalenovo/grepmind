// src/components/analytics/PanelEditor.jsx
import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { API, authHeaders, toRechartsSeries, TIME_PRESETS, rangeForPreset } from '../pages/metricsHelpers';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function PanelEditor({
  token,
  role,
  dashboard,
  panel,                 // existing panel or null for create
  onClose,
  onSaved,
}) {
  const isEdit = !!panel?.id;

  const [title, setTitle] = useState(panel?.title || 'New Panel');
  const [promql, setPromql] = useState(panel?.promql || '');
  const [chartType, setChartType] = useState(panel?.chartType || 'timeseries');
  const [thresholds, setThresholds] = useState(panel?.thresholds || { warn: null, crit: null });
  const [timePreset, setTimePreset] = useState('1h');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState({ data: [], series: [] });
  const [error, setError] = useState(null);

  const canEdit = role === 'admin' || role === 'editor';

  const headerTitle = isEdit ? 'Edit panel' : 'New panel';

  const runQuery = async () => {
    if (!promql) return;
    setLoading(true);
    setError(null);
    try {
      const range = rangeForPreset(timePreset);
      const res = await axios.post(
        `${API}/analytics/query`,
        { query: promql, range },
        { headers: authHeaders(token, role) }
      );
      // backend should return result like Prometheus matrix in data.result
      const matrix = res.data?.data?.result || [];
      const merged = toRechartsSeries(matrix);
      setPreview(merged);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setPreview({ data: [], series: [] });
    } finally {
      setLoading(false);
    }
  };

  const savePanel = async () => {
    if (!canEdit) return;
    const payload = {
      dashboardId: dashboard.id,
      title,
      promql,
      chartType,
      thresholds,
      layout: panel?.layout || { w: 6, h: 4, x: 0, y: 0 }, // default grid cell
      visualizationConfig: panel?.visualizationConfig || {},
    };
    const url = isEdit ? `${API}/analytics/panels/${panel.id}` : `${API}/analytics/panels`;
    const method = isEdit ? 'put' : 'post';
    await axios[method](url, payload, { headers: authHeaders(token, role) });
    onSaved?.();
    onClose?.();
  };

  const Chart = useMemo(() => {
    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={preview.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            {preview.series.map((s) => (
              <Bar key={s} dataKey={s} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }
    // default time series
    return (
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={preview.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          {preview.series.map((s) => (
            <Line key={s} type="monotone" dataKey={s} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }, [chartType, preview]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/80">
      <div className="absolute inset-0 grid grid-rows-[auto_1fr]">
        {/* Header (breadcrumb/actions) */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="text-sm text-gray-300">
            <span className="opacity-60">Home</span> <span className="opacity-60">›</span>{' '}
            <span className="opacity-60">Dashboards</span> <span className="opacity-60">›</span>{' '}
            <span className="opacity-60">{dashboard?.name || 'New dashboard'}</span> <span className="opacity-60">›</span>{' '}
            <span className="font-semibold">{headerTitle}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-800 transition"
            >
              Back to dashboard
            </button>
            {canEdit && (
              <button
                onClick={savePanel}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition shadow"
              >
                Save panel
              </button>
            )}
          </div>
        </div>

        {/* Body: three zones (preview center, right options, bottom query) */}
        <div className="grid grid-rows-[1fr_auto]">
          {/* Center + Right */}
          <div className="grid grid-cols-[1fr_320px] gap-3 p-3 overflow-hidden">
            {/* Center visualization */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-inner p-3 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Table view</span>
                  <label className="inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="sr-only peer" disabled />
                    <div className="w-10 h-5 bg-gray-700 rounded-full peer-checked:bg-indigo-600 transition-all"></div>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={timePreset}
                    onChange={(e) => setTimePreset(e.target.value)}
                    className="text-sm bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-200"
                  >
                    {TIME_PRESETS.map((t) => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={runQuery}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="h-[360px] rounded-xl bg-gray-950 flex items-center justify-center">
                {loading ? (
                  <div className="animate-pulse text-gray-400">Running query…</div>
                ) : preview.data.length ? (
                  Chart
                ) : (
                  <div className="text-gray-600">No data</div>
                )}
              </div>
              {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
            </div>

            {/* Right options */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-inner p-3 overflow-y-auto">
              <div className="flex items-center gap-2 text-gray-300 mb-2">
                <span className="text-yellow-400">⌇</span>
                <span className="font-medium">Time series</span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Panel options</div>
                  <label className="block text-xs text-gray-400">Title</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-200"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Panel Title"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Visualization</label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-200"
                  >
                    <option value="timeseries">Time series</option>
                    <option value="bar">Bar</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-1">Thresholds</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-200"
                      placeholder="Warn"
                      value={thresholds.warn ?? ''}
                      onChange={(e) => setThresholds({ ...thresholds, warn: e.target.value ? Number(e.target.value) : null })}
                    />
                    <input
                      type="number"
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-200"
                      placeholder="Crit"
                      value={thresholds.crit ?? ''}
                      onChange={(e) => setThresholds({ ...thresholds, crit: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom query editor */}
          <div className="border-t border-gray-800 bg-gray-900 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-300">Queries</div>
              <div className="text-xs text-gray-400">Data source: <span className="font-mono">prometheus</span></div>
            </div>

            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <textarea
                  className="w-full h-20 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-200 font-mono text-sm"
                  placeholder="sum(rate(container_cpu_usage_seconds_total[5m]))"
                  value={promql}
                  onChange={(e) => setPromql(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={runQuery}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition shadow"
                >
                  Run queries
                </button>
                {canEdit && (
                  <button
                    onClick={savePanel}
                    className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 transition"
                  >
                    Save panel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
