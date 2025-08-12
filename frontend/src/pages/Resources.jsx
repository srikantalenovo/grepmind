// src/pages/Resources.jsx
import React, { useEffect, useState } from "react";

export default function Resources() {
  const [cluster, setCluster] = useState("");
  const [namespace, setNamespace] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        cluster,
        namespace,
        resourceType,
        search,
        page,
        limit,
      });

      console.log(`[UI] Fetching resources with params:`, Object.fromEntries(query));

      const res = await fetch(`/api/resources?${query}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      setResources(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("❌ Error fetching resources:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [page]); // fetch when page changes

  const getStatusColor = (status) => {
    switch (status) {
      case "Running":
        return "bg-green-500 text-white";
      case "Pending":
        return "bg-yellow-500 text-white";
      case "Failed":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  return (
    <div className="p-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <select
          value={cluster}
          onChange={(e) => setCluster(e.target.value)}
          className="border border-gray-300 rounded p-2"
        >
          <option value="">Select Cluster</option>
          <option value="cluster1">Cluster 1</option>
          <option value="cluster2">Cluster 2</option>
        </select>

        <select
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          className="border border-gray-300 rounded p-2"
        >
          <option value="">All Namespaces</option>
          <option value="default">default</option>
          <option value="kube-system">kube-system</option>
        </select>

        <select
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
          className="border border-gray-300 rounded p-2"
        >
          <option value="">Select Resource</option>
          <option value="pods">Pods</option>
          <option value="deployments">Deployments</option>
          <option value="services">Services</option>
          <option value="statefulsets">StatefulSets</option>
          <option value="daemonsets">DaemonSets</option>
          <option value="jobs">Jobs / CronJobs</option>
          <option value="configmaps">ConfigMaps</option>
          <option value="pvcs">PVCs</option>
          <option value="ingress">Ingress</option>
          <option value="helmreleases">Helm Releases</option>
          <option value="sparkapps">SparkApplications</option>
        </select>

        <input
          type="text"
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded p-2 flex-1 min-w-[200px]"
        />

        <button
          onClick={() => {
            setPage(1); // reset to page 1 when applying filters
            fetchResources();
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Namespace</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Age</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : resources.length > 0 ? (
              resources.map((r) => (
                <tr key={r.name} className="border-b">
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">{r.namespace}</td>
                  <td className="px-4 py-2">{r.type}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                        r.status
                      )}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{r.age}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center p-4">
                  No resources found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="px-2 py-1">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
