// src/components/PanelForm.jsx
import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

export default function PanelForm({ dashboard, onClose, onSaved }) {
  const { accessToken, user } = useContext(AuthContext);
  const role = user?.role || 'viewer';

  const [panel, setPanel] = useState({
    title: '',
    promql: 'up',
    chartType: 'line',
    thresholds: { warn: null, crit: null },
    layout: { x: 0, y: 0, w: 6, h: 4 },
    visualizationConfig: { legend: true, yUnit: 'short' },
  });
  const [preview, setPreview] = useState(null);
  const headers = { Authorization: `Bearer ${accessToken}`, 'x-user-role': role };

  const previewQuery = async () => {
    try {
      const res = await axios.post(`${API}/analytics/query`, { query: panel.promql }, { headers });
      setPreview(res.data.data);
    } catch (e) {
      alert('Preview failed: ' + (e.response?.data?.details || e.message));
    }
  };

  const save = async () => {
    try {
      await axios.post(`${API}/analytics/dashboards/${dashboard.id}/panels`, panel, { headers });
      onSaved?.();
      onClose?.();
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.details || e.message));
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[32rem] bg-white shadow-xl overflow-y-auto p-6">
        <div className="text-lg font-semibold mb-4">Add Panel to: {dashboard.name}</div>

        <div className="space-y-3">
          <input className="w-full border rounded-xl px-3 py-2" placeholder="Panel Title"
                 value={panel.title} onChange={e => setPanel({ ...panel, title: e.target.value })} />
          <input className="w-full border rounded-xl px-3 py-2" placeholder="PromQL"
                 value={panel.promql} onChange={e => setPanel({ ...panel, promql: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="border rounded-xl px-2 py-2"
                    value={panel.chartType}
                    onChange={e => setPanel({ ...panel, chartType: e.target.value })}>
              <option value="line">Line</option>
              <option value="area">Area</option>
              <option value="bar">Bar</option>
              <option value="stat">Stat</option>
            </select>
            <input className="border rounded-xl px-2 py-2" type="text" placeholder="warn threshold"
                   value={panel.thresholds.warn ?? ''} onChange={e => setPanel({ ...panel, thresholds: { ...panel.thresholds, warn: e.target.value ? Number(e.target.value) : null }})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="border rounded-xl px-2 py-2" type="text" placeholder="crit threshold"
                   value={panel.thresholds.crit ?? ''} onChange={e => setPanel({ ...panel, thresholds: { ...panel.thresholds, crit: e.target.value ? Number(e.target.value) : null }})} />
            <input className="border rounded-xl px-2 py-2" type="text" placeholder="yUnit (e.g. bytes, s, short)"
                   value={panel.visualizationConfig.yUnit}
                   onChange={e => setPanel({ ...panel, visualizationConfig: { ...panel.visualizationConfig, yUnit: e.target.value }})} />
          </div>

          <div className="flex gap-2">
            <button onClick={previewQuery} className="px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
              Preview
            </button>
            <button onClick={save} className="px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700">
              Save Panel
            </button>
            <button onClick={onClose} className="px-3 py-2 rounded-xl bg-gray-700 text-white">Close</button>
          </div>

          {preview && (
            <pre className="text-xs bg-gray-50 p-3 rounded-xl overflow-x-auto">{JSON.stringify(preview, null, 2)}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
