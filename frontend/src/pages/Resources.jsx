// src/pages/Resources.jsx
import React, { useState, useEffect } from "react";

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [activeTab, setActiveTab] = useState("resources");

  // Filters
  const [namespace, setNamespace] = useState("");
  const [resourceType, setResourceType] = useState("pods");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const limit = 10;

  // Fetch Namespaces
  useEffect(() => {
    fetch("/api/cluster/namespaces", { headers: { "x-user-role": "viewer" } })
      .then((res) => res.json())
      .then((data) => setNamespaces(data.namespaces || []))
      .catch((err) => console.error("❌ Error fetching namespaces:", err));
  }, []);

  // Fetch Resources
  const fetchResources = () => {
    console.log("[UI] Fetching resources...");
    fetch(
      `/api/resources?namespace=${namespace}&resourceType=${resourceType}&search=${search}&page=${page}&limit=${limit}`,
      { headers: { "x-user-role": "viewer" } }
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then((data) => setResources(data.items || []))
      .catch((err) => console.error("❌ Error fetching resources:", err));
  };

  useEffect(() => {
    if (activeTab === "resources") fetchResources();
  }, [namespace, resourceType, search, page, activeTab]);

  // Fetch Nodes
  const fetchNodes = () => {
    fetch("/api/cluster/nodes", { headers: { "x-user-role": "viewer" } })
      .then((res) => res.json())
      .then((data) => setNodes(data.nodes || []))
      .catch((err) => console.error("❌ Error fetching nodes:", err));
  };

  useEffect(() => {
    if (activeTab === "nodes") fetchNodes();
  }, [activeTab]);

  // Status badge colors
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "running":
      case "ready":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "failed":
      case "notready":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b pb-2">
        <button
          className={`px-4 py-2 ${activeTab === "resources" ? "border-b-2 border-blue-500 font-bold" : ""}`}
          onClick={() => setActiveTab("resources")}
        >
          Resources
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "nodes" ? "border-b-2 border-blue-500 font-bold" : ""}`}
          onClick={() => setActiveTab("nodes")}
        >
          Nodes
        </button>
      </div>

      {activeTab === "resources" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <select
              className="border p-2 rounded"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
            >
              <option value="">All Namespaces</option>
              {namespaces.map((ns) => (
                <option key={ns.name} value={ns.name}>
                  {ns.name}
                </option>
              ))}
            </select>

            <select
              className="border p-2 rounded"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
            >
              <option value="pods">Pods</option>
              <option value="services">Services</option>
              <option value="deployments">Deployments</option>
              <option value="jobs">Jobs</option>
              <option value="cronjobs">CronJobs</option>
            </select>

            <input
              type="text"
              placeholder="Search..."
              className="border p-2 rounded flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              onClick={fetchResources}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>

          {/* Table */}
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Namespace</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Age</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((res, idx) => (
                <tr key={idx}>
                  <td className="p-2 border">{res.name}</td>
                  <td className="p-2 border">{res.namespace}</td>
                  <td className="p-2 border">
                    <span
                      className={`text-white px-2 py-1 rounded ${getStatusColor(res.status)}`}
                    >
                      {res.status}
                    </span>
                  </td>
                  <td className="p-2 border">{res.age}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span>Page {page}</span>
            <button
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border rounded"
            >
              Next
            </button>
          </div>
        </>
      )}

      {activeTab === "nodes" && (
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Node Name</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Roles</th>
              <th className="p-2 border">Kubelet Version</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node, idx) => (
              <tr key={idx}>
                <td className="p-2 border">{node.name}</td>
                <td className="p-2 border">
                  <span
                    className={`text-white px-2 py-1 rounded ${getStatusColor(node.status)}`}
                  >
                    {node.status}
                  </span>
                </td>
                <td className="p-2 border">{node.roles}</td>
                <td className="p-2 border">{node.kubeletVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
