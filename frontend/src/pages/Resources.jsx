import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Resources() {
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [resourceType, setResourceType] = useState('pods');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const resourceOptions = [
    'pods',
    'deployments',
    'services',
    'statefulsets',
    'daemonsets',
    'jobs',
    'cronjobs',
    'configmaps',
    'persistentvolumeclaims',
    'ingress',
    'helmreleases',
    'sparkapplications'
  ];

  // Fetch namespaces
  useEffect(() => {
    axios.get('/api/cluster/namespaces')
      .then(res => {
        setNamespaces(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedNamespace(res.data[0]);
        }
      })
      .catch(err => console.error('Failed to fetch namespaces:', err));
  }, []);

  // Fetch resources whenever namespace or type changes
  useEffect(() => {
    if (!selectedNamespace || !resourceType) return;
    setLoading(true);
    axios.get(`/api/resources?namespace=${selectedNamespace}&resourceType=${resourceType}`)
      .then(res => setData(res.data || []))
      .catch(err => console.error(`Failed to fetch ${resourceType}:`, err))
      .finally(() => setLoading(false));
  }, [selectedNamespace, resourceType]);

  function statusColor(status) {
    switch (status?.toLowerCase()) {
      case 'running': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'succeeded': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Kubernetes Resources</h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Namespace</label>
          <select
            value={selectedNamespace}
            onChange={(e) => setSelectedNamespace(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {namespaces.map(ns => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Resource Type</label>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {resourceOptions.map(rt => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden shadow-lg border border-white/20 backdrop-blur-md bg-white/30"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-900/70 text-white text-xs uppercase tracking-wide">
                {['Name', 'Namespace', 'Status', 'Age'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left border-b border-white/20"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-gray-700 text-center">
                    No resources found.
                  </td>
                </tr>
              )}
              {data.map((row, idx) => (
                <tr
                  key={`${row.namespace}-${row.name}-${idx}`}
                  className={idx % 2 === 0
                    ? 'bg-white/40 hover:bg-white/50'
                    : 'bg-white/20 hover:bg-white/40'
                  }
                >
                  <td className="px-4 py-3 border-b border-white/20 text-gray-900 font-medium">{row.name}</td>
                  <td className="px-4 py-3 border-b border-white/20 text-gray-900">{row.namespace || '—'}</td>
                  <td className="px-4 py-3 border-b border-white/20">
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${statusColor(row.status)}`}>
                      {row.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-white/20 text-gray-900">{row.age || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 rounded-full border-2 border-gray-300 border-t-gray-900" />
            <span className="ml-3 text-gray-800">Loading…</span>
          </div>
        )}
      </div>
    </div>
  );
}
