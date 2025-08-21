// src/pages/Analytics.jsx (Prometheus-aware)
import React, { useEffect, useMemo, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import DataSourceDrawer from '../components/DataSourceDrawer';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import MetricsDashboardDrawer from './MetricsDashboardDrawer';
import DashboardDrawer from './DashboardDrawer';

const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

function bytesToGiB(x){ return x ? x / (1024 ** 3) : 0; }
function round(n, d=2){ const p = 10**d; return Math.round(n*p)/p; }

export default function Analytics() {
  const { accessToken, user } = useContext(AuthContext);
  const role = user?.role || 'viewer';

  // ADD THIS
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);


  const [cluster, setCluster] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [topPods, setTopPods] = useState([]);
  const [history, setHistory] = useState([]);
  const [sources, setSources] = useState({ k8s: true, prometheus: false });
  const [net, setNet] = useState(null);
  const [fsio, setFsio] = useState(null);

  // initial REST loads
  useEffect(() => {
    if (!accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}`, 'x-user-role': role };
    (async () => {
      try {
        const ds = await axios.get(`${API}/analytics/data-sources`, { headers });
        setSources(ds.data);
      } catch {}
      try {
        const res = await axios.get(`${API}/analytics/cluster/nodes`, { headers });
        setCluster(res.data.cluster); setNodes(res.data.nodes);
        const pods = await axios.get(`${API}/analytics/cluster/pods?namespace=all`, { headers });
        const sorted = (pods.data.items || []).sort((a,b)=>(b.cpuCores||0)-(a.cpuCores||0)).slice(0,10);
        setTopPods(sorted);
      } catch {}
      try {
        const nm = await axios.get(`${API}/analytics/network-metrics`, { headers });
        setNet(nm.data);
      } catch {}
      try {
        const fsm = await axios.get(`${API}/analytics/filesystem-metrics`, { headers });
        setFsio(fsm.data);
      } catch {}
    })();
  }, [accessToken, role]);

  // SSE stream
  useEffect(() => {
    if (!accessToken) return;
    const es = new EventSource(`${API}/analytics/stream?token=${accessToken}&role=${role}`);
    es.addEventListener('metrics', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.cluster) setCluster(payload.cluster);
        if (payload.nodes) setNodes(payload.nodes);
        if (payload.topPods) setTopPods(payload.topPods);
        setHistory(h => [...h, { ts: payload.ts, cpu: payload.cluster?.totalCpuCores || 0 }].slice(-60));
      } catch {}
    });
    return () => es.close();
  }, [accessToken, role]);

  const kpis = useMemo(() => ([
    { label: 'Nodes (Ready/Total)', value: cluster ? `${cluster.readyCount}/${cluster.nodeCount}` : '--' },
    { label: 'CPU (Total cores)', value: cluster ? round(cluster.totalCpuCores, 2) : '--' },
    { label: 'Memory (Total GiB)', value: cluster ? round(bytesToGiB(cluster.totalMemoryBytes), 1) : '--' },
    { label: 'Metrics', value: cluster?.metricsAvailable ? 'Available' : 'Unavailable' },
  ]), [cluster]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Source: {sources.prometheus ? 'Prometheus + K8s' : 'K8s only'}
          </span>
          <DataSourceDrawer token={accessToken} role={role} />
          {role === 'admin' && (
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                onClick={() => setMetricsOpen(true)}
              >
                Metrics Dashboards
              </button>         
          )}
          {role === 'admin' && (
              <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              onClick={() => setDashboardOpen(true)}
            >
              Manage Dashboards
            </button>
          )} 
        </div>
      </div>

  

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl shadow p-4 bg-white">
            <div className="text-sm text-gray-500">{k.label}</div>
            <div className="text-2xl font-bold mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Cluster CPU timeseries */}
      <div className="rounded-2xl shadow p-4 bg-white">
        <div className="font-semibold mb-2">Cluster CPU (cores) over time</div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={history.map(p=>({ name:new Date(p.ts).toLocaleTimeString(), cpu:p.cpu }))}>
            <Line type="monotone" dataKey="cpu" />
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Nodes bar */}
      <div className="rounded-2xl shadow p-4 bg-white">
        <div className="font-semibold mb-2">Node CPU (cores)</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={nodes.map(n=>({ name:n.name, cpu:n.cpuCores||0 }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide={nodes.length > 8} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cpu" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Pods */}
      <div className="rounded-2xl shadow p-4 bg-white">
        <div className="font-semibold mb-3">Top Pods by CPU</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Namespace</th>
                <th className="py-2 pr-4">Pod</th>
                <th className="py-2 pr-4">CPU (cores)</th>
                <th className="py-2 pr-4">Memory (MiB)</th>
              </tr>
            </thead>
            <tbody>
              {topPods.map((p) => (
                <tr key={`${p.namespace}/${p.name}`} className="border-b last:border-0">
                  <td className="py-2 pr-4">{p.namespace}</td>
                  <td className="py-2 pr-4">{p.name}</td>
                  <td className="py-2 pr-4">{round(p.cpuCores, 3)}</td>
                  <td className="py-2 pr-4">{round((p.memoryBytes || 0) / (1024*1024), 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Network panel */}
      <div className="rounded-2xl shadow p-4 bg-white">
        <div className="font-semibold mb-2">Network</div>
        {!net && <div className="text-sm text-gray-500">Loading network metrics...</div>}
        {net && net.source === 'prometheus' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border p-3">
              <div className="text-sm text-gray-500">RX (bytes/s)</div>
              <div className="text-xl font-bold">{round(net.throughput?.rxBytesPerSec || 0, 0)}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-sm text-gray-500">TX (bytes/s)</div>
              <div className="text-xl font-bold">{round(net.throughput?.txBytesPerSec || 0, 0)}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-sm text-gray-500">Latency p95 (s)</div>
              <div className="text-xl font-bold">{round(net.latencyP95 || 0, 3)}</div>
            </div>
          </div>
        )}
        {net && net.source === 'k8s' && (
          <div className="text-sm text-gray-600">
            Prometheus not configured. Showing topology objects (Services/NetworkPolicies). Add Prometheus URL via the Datasource drawer for throughput/latency.
          </div>
        )}
      </div>

      {/* Filesystem IO */}
      <div className="rounded-2xl shadow p-4 bg-white">
        <div className="font-semibold mb-2">Filesystem I/O</div>
        {!fsio && <div className="text-sm text-gray-500">Loading filesystem metrics...</div>}
        {fsio && fsio.source === 'prometheus' && (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[{ name:'IOPS', read: fsio.filesystemIO.readBps||0, write: fsio.filesystemIO.writeBps||0 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="read" />
              <Bar dataKey="write" />
            </BarChart>
          </ResponsiveContainer>
        )}
        {fsio && fsio.source === 'k8s' && (
          <div className="text-sm text-gray-600">
            Filesystem I/O not available without Prometheus.
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500">Role: <span className="font-mono">{role}</span></div>

      {/* --- Add the Drawer here ---
      <MetricsDashboardDrawer
        token={accessToken}
        role={role}
        open={dashboardDrawerOpen}
        onClose={() => setDashboardDrawerOpen(false)}
      /> */}
      {metricsOpen && <MetricsDashboardDrawer open={metricsOpen} onClose={() => setMetricsOpen(false)} />}
      {dashboardOpen && <DashboardDrawer open={dashboardOpen} onClose={() => setDashboardOpen(false)} />}
    </div>
  );
}
