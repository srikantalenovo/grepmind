import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

export default function PanelForm({ dashboard, onClose }) {
  const { accessToken, user } = useContext(AuthContext);
  const role = user?.role || 'viewer';

  const [panels, setPanels] = useState(dashboard?.panels || []);

  const addPanel = () => setPanels([...panels, { title: '', query: '', chartType: 'line', thresholds: {} }]);

  const updatePanel = (idx, panel) => {
    const newPanels = [...panels];
    newPanels[idx] = panel;
    setPanels(newPanels);
  };

  const savePanels = async () => {
    try {
      const payload = { ...dashboard, panels };
      await axios.put(`${API}/analytics/dashboards/${dashboard.id}`, payload, {
        headers: { Authorization: `Bearer ${accessToken}`, 'x-user-role': role },
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="mt-4 border p-4 rounded-lg bg-gray-50">
      {panels.map((p, idx) => (
        <div key={idx} className="mb-2 space-y-1">
          <input
            className="w-full border px-2 py-1 rounded"
            placeholder="Panel Title"
            value={p.title}
            onChange={(e) => updatePanel(idx, { ...p, title: e.target.value })}
          />
          <input
            className="w-full border px-2 py-1 rounded"
            placeholder="PromQL Query"
            value={p.query}
            onChange={(e) => updatePanel(idx, { ...p, query: e.target.value })}
          />
        </div>
      ))}
      <button className="px-3 py-1 bg-green-600 text-white rounded mb-2" onClick={addPanel}>
        + Add Panel
      </button>
      <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={savePanels}>
        Save Panels
      </button>
    </div>
  );
}
