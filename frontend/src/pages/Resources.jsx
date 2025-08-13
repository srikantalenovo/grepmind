import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [namespace, setNamespace] = useState("all");
  const [resourceType, setResourceType] = useState("pods");
  const [search, setSearch] = useState("");
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

  useEffect(() => {
    fetchNamespaces();
    fetchNodes();
  }, []);

  useEffect(() => {
    fetchResources();
  }, [namespace, resourceType, search]);

  const fetchNamespaces = async () => {
    try {
      const res = await axios.get(`${API_BASE}/cluster/namespaces`, { withCredentials: true });
      setNamespaces(res.data || []);
    } catch (err) {
      console.error("Failed to fetch namespaces", err);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const nsQuery = namespace === "all" ? "all" : namespace;
      const res = await axios.get(
        `${API_BASE}/resources?namespace=${nsQuery}&resourceType=${resourceType}&search=${search}`,
        { withCredentials: true }
      );
      setResources(res.data || []);
    } catch (err) {
      console.error("Failed to fetch resources", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNodes = async () => {
    try {
      const res = await axios.get(`${API_BASE}/cluster/nodes`, { withCredentials: true });
      setNodes(res.data || []);
    } catch (err) {
      console.error("Failed to fetch nodes", err);
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case "Running":
      case "Ready":
        return "bg-green-500";
      case "Pending":
        return "bg-yellow-500";
      case "Failed":
      case "NotReady":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="p-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white shadow-sm p-3 rounded-lg sticky top-0 z-10">
        <select
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="pods">Pods</option>
          <option value="services">Services</option>
          <option value="configmaps">ConfigMaps</option>
          <option value="persistentvolumeclaims">PVCs</option>
          <option value="deployments">Deployments</option>
          <option value="statefulsets">StatefulSets</option>
          <option value="daemonsets">DaemonSets</option>
          <option value="jobs">Jobs</option>
          <option value="cronjobs">CronJobs</option>
          <option value="ingress">Ingress</option>
          <option value="sparkapplications">SparkApplications</option>
        </select>

        <select
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Namespaces</option>
          {namespaces.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-sm text-left text-gray-800">
          <thead className="bg-indigo-700 text-white text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 border-b border-indigo-200/40 w-1/3 whitespace-nowrap">Name</th>
              <th className="px-4 py-3 border-b border-indigo-200/40 w-1/4 whitespace-nowrap">Namespace</th>
              <th className="px-4 py-3 border-b border-indigo-200/40 w-1/4 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 border-b border-indigo-200/40 w-1/6 whitespace-nowrap">Age</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : resources.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-4">
                  No resources found.
                </td>
              </tr>
            ) : (
              resources.map((res, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-indigo-50 transition-colors border-b last:border-b-0"
                >
                  <td className="px-4 py-2 whitespace-nowrap">{res.name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{res.namespace}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs text-white ${statusColor(
                        res.status
                      )}`}
                    >
                      {res.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{res.age}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Nodes Panel */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Cluster Nodes</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {nodes.map((n) => (
            <div key={n.name} className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">{n.name}</div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs text-white ${statusColor(
                    n.status
                  )}`}
                >
                  {n.status}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {n.kubeletVersion} · {n.osImage}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                CPU: {n.cpu} · Mem: {n.memory} · IP: {n.internalIP}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
