import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API = import.meta.env.VITE_API_URL;

export default function DashboardDrawer({ open, onClose, dashboard, onSaved }) {
  const [name, setName] = useState(dashboard?.name || '');
  const [panels, setPanels] = useState(dashboard?.panels || []);

  useEffect(() => {
    if (dashboard) {
      setName(dashboard.name);
      setPanels(dashboard.panels);
    }
  }, [dashboard]);

  const addPanel = () => {
    setPanels([...panels, { title: '', query: '', chartType: 'line', thresholds: {} }]);
  };

  const updatePanel = (idx, panel) => {
    const newPanels = [...panels];
    newPanels[idx] = panel;
    setPanels(newPanels);
  };

  const validateQuery = async (panel) => {
    try {
      const res = await axios.post(`${API}/analytics/metrics-dashboards/${dashboard?.id || ''}/query`, { query: panel.query });
      return res.data.result || [];
    } catch (e) {
      alert('Invalid query: ' + e.response?.data?.error || e.message);
      return [];
    }
  };

  const saveDashboard = async () => {
    const payload = { name, panels };
    if (dashboard?.id) {
      await axios.put(`${API}/analytics/metrics-dashboards/${dashboard.id}`, payload);
    } else {
      await axios.post(`${API}/analytics/metrics-dashboards`, payload);
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[28rem] bg-white shadow-xl overflow-y-auto p-6">
        <h2 className="text-lg font-semibold mb-4">{dashboard ? 'Edit Dashboard' : 'New Dashboard'}</h2>

        <input
          className="w-full border rounded-lg px-3 py-2 mb-4"
          placeholder="Dashboard Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        {panels.map((p, idx) => (
          <div key={idx} className="mb-4 border p-3 rounded-lg space-y-2">
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="Panel Title"
              value={p.title}
              onChange={e => updatePanel(idx, { ...p, title: e.target.value })}
            />
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="PromQL Query"
              value={p.query}
              onChange={e => updatePanel(idx, { ...p, query: e.target.value })}
            />
            <div className="flex gap-2">
              <button
                className="px-2 py-1 bg-blue-600 text-white rounded"
                onClick={async () => {
                  const data = await validateQuery(p);
                  updatePanel(idx, { ...p, data: data.map(d => ({ time: new Date(d.value[0]*1000).toLocaleTimeString(), value: parseFloat(d.value[1]) })) });
                }}
              >
                Preview
              </button>
            </div>
            {p.data && (
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={p.data}>
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="blue" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        ))}

        <button onClick={addPanel} className="px-3 py-1 bg-green-600 text-white rounded mb-4">+ Add Panel</button>
        <div className="flex justify-end gap-2">
          <button onClick={saveDashboard} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800">Close</button>
        </div>
      </div>
    </div>
  );
}
