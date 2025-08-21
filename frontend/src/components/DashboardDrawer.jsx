import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './context/AuthContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

export default function DashboardDrawer({ open, onClose, dashboardData }) {
  const { accessToken, user } = useContext(AuthContext);
  const role = user?.role || 'viewer';

  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [panels, setPanels] = useState([]);

  const fetchDashboards = async () => {
    try {
      const res = await axios.get(`${API}/analytics/dashboards`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'x-user-role': role },
      });
      setDashboards(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (open) fetchDashboards();
  }, [open]);

  const saveDashboard = async (dashboard) => {
    try {
      if (dashboard.id) {
        await axios.put(`${API}/analytics/dashboards/${dashboard.id}`, dashboard, {
          headers: { Authorization: `Bearer ${accessToken}`, 'x-user-role': role },
        });
      } else {
        await axios.post(`${API}/analytics/dashboards`, dashboard, {
          headers: { Authorization: `Bearer ${accessToken}`, 'x-user-role': role },
        });
      }
      fetchDashboards();
      setSelectedDashboard(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[32rem] bg-white shadow-xl overflow-y-auto p-6">
        <h2 className="text-lg font-semibold mb-4">Manage Dashboards</h2>

        {role === 'admin' && (
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded mb-4"
            onClick={() => setSelectedDashboard({ name: '', panels: [] })}
          >
            + New Dashboard
          </button>
        )}

        {dashboards.map((d) => (
          <div key={d.id} className="border p-3 rounded-lg shadow-sm mb-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{d.name}</span>
              {role === 'admin' && (
                <div className="flex gap-2">
                  <button className="text-green-600" onClick={() => setSelectedDashboard(d)}>
                    Edit
                  </button>
                  <button
                    className="text-red-500"
                    onClick={async () => {
                      await axios.delete(`${API}/analytics/dashboards/${d.id}`, {
                        headers: { Authorization: `Bearer ${accessToken}`, 'x-user-role': role },
                      });
                      fetchDashboards();
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {selectedDashboard && (
          <div className="border p-4 rounded-lg bg-gray-50 mt-4">
            <input
              className="w-full border px-2 py-1 mb-2 rounded"
              placeholder="Dashboard Name"
              value={selectedDashboard.name}
              onChange={(e) => setSelectedDashboard({ ...selectedDashboard, name: e.target.value })}
            />
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => saveDashboard(selectedDashboard)}
            >
              Save
            </button>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
