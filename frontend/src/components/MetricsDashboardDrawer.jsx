import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PanelForm from './PanelForm';
import PromQLExplorer from './PromQLExplorer';

const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

export default function MetricsDashboardDrawer({ open, onClose }) {
  const { accessToken, user } = useContext(AuthContext);
  const role = user?.role || 'viewer';

  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [panelData, setPanelData] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchDashboards = async () => {
    if (!accessToken) return;
    try {
      const res = await axios.get(`${API}/analytics/dashboards`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setDashboards(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPanelQuery = async (panelId, query) => {
    try {
      const res = await axios.post(`${API}/analytics/query`, { query }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setPanelData(prev => ({ ...prev, [panelId]: res.data.data }));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { if (open) fetchDashboards(); }, [open]);

  return (
    open && (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="absolute right-0 top-0 h-full w-full sm:w-[32rem] bg-white shadow-xl overflow-y-auto">
          <div className="px-4 py-3 bg-indigo-700 text-white">
            <div className="text-sm">Metrics Dashboards</div>
            <div className="text-lg font-semibold truncate">Role: {role}</div>
          </div>

          <div className="p-6 space-y-4">
            {role === 'admin' && (
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                onClick={async () => {
                  const name = prompt('Dashboard name?');
                  if (!name) return;
                  await axios.post(`${API}/analytics/dashboards`, { name }, { headers: { Authorization: `Bearer ${accessToken}` } });
                  fetchDashboards();
                }}
              >
                + New Dashboard
              </button>
            )}

            {dashboards.map(d => (
              <div key={d.id} className="border p-3 rounded-lg shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div className="font-semibold">{d.name}</div>
                  <div className="flex gap-2">
                    {role === 'admin' && (
                      <>
                        <button
                          className="text-green-600"
                          onClick={() => setSelectedDashboard(d)}
                        >
                          Edit Panels
                        </button>
                        <button
                          className="text-red-500"
                          onClick={async () => {
                            await axios.delete(`${API}/analytics/dashboards/${d.id}`, {
                              headers: { Authorization: `Bearer ${accessToken}` },
                            });
                            fetchDashboards();
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {d.panels?.map(p => (
                  <div key={p.id}>
                    <div className="text-sm font-medium">{p.title}</div>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={panelData[p.id] || []}>
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={p.thresholds?.warning ? '#FBBF24' : '#4F46E5'}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    {!panelData[p.id] && fetchPanelQuery(p.id, p.query)}
                  </div>
                ))}
              </div>
            ))}

            {selectedDashboard && (
              <PanelForm
                dashboard={selectedDashboard}
                onClose={() => {
                  setSelectedDashboard(null);
                  fetchDashboards();
                }}
              />
            )}

            <PromQLExplorer />

          </div>
          <div className="p-4 flex justify-end">
            <button className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  );
}
