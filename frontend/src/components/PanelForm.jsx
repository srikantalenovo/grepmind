import React, { useState } from 'react';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

export default function PanelForm({ dashboard, onClose }) {
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [chartType, setChartType] = useState('line');
  const [warningThreshold, setWarningThreshold] = useState('');
  const [criticalThreshold, setCriticalThreshold] = useState('');
  const accessToken = localStorage.getItem('accessToken');

  const addPanel = async () => {
    if (!title || !query) return alert('Title & Query required');
    const panels = dashboard.panels || [];
    panels.push({
      id: crypto.randomUUID(),
      title,
      query,
      chartType,
      thresholds: { warning: warningThreshold, critical: criticalThreshold },
    });
    await axios.put(`${API}/analytics/dashboards/${dashboard.id}`, { panels }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/20 flex justify-center items-start pt-20">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md space-y-3">
        <h3 className="text-lg font-semibold">Add Panel</h3>
        <input className="w-full border px-3 py-2 rounded-lg" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <input className="w-full border px-3 py-2 rounded-lg" placeholder="PromQL Query" value={query} onChange={e => setQuery(e.target.value)} />
        <input className="w-full border px-3 py-2 rounded-lg" placeholder="Warning Threshold" value={warningThreshold} onChange={e => setWarningThreshold(e.target.value)} />
        <input className="w-full border px-3 py-2 rounded-lg" placeholder="Critical Threshold" value={criticalThreshold} onChange={e => setCriticalThreshold(e.target.value)} />
        <select className="w-full border px-3 py-2 rounded-lg" value={chartType} onChange={e => setChartType(e.target.value)}>
          <option value="line">Line</option>
          <option value="area">Area</option>
        </select>
        <div className="flex justify-end gap-2 pt-2">
          <button className="px-3 py-2 bg-gray-500 text-white rounded-lg" onClick={onClose}>Cancel</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={addPanel}>Add Panel</button>
        </div>
      </div>
    </div>
  );
}
