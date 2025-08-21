import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardDrawer from './DashboardDrawer.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API = import.meta.env.VITE_API_URL;

export default function MetricsDashboardTab() {
  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchDashboards();
  }, []);

  const fetchDashboards = async () => {
    const res = await axios.get(`${API}/analytics/metrics-dashboards`);
    setDashboards(res.data);
  };

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => { setSelectedDashboard(null); setDrawerOpen(true); }}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
      >
        + Add Dashboard
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboards.map(d => (
          <Card key={d.id} className="shadow-md">
            <CardContent>
              <h2 className="font-semibold text-lg">{d.name}</h2>
              <div className="space-y-4 mt-3">
                {d.panels.map((p, idx) => (
                  <div key={idx} className="border p-2 rounded-lg">
                    <h3 className="text-sm font-medium">{p.title}</h3>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={p.data || []}>
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={p.thresholds?.critical ? 'red' : 'blue'}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
              <button
                className="mt-3 px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
                onClick={() => { setSelectedDashboard(d); setDrawerOpen(true); }}
              >
                Edit Dashboard
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {drawerOpen && (
        <DashboardDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          dashboard={selectedDashboard}
          onSaved={fetchDashboards}
        />
      )}
    </div>
  );
}
