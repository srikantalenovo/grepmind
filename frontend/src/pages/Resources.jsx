// src/pages/Resources.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ReloadIcon } from "@radix-ui/react-icons";

export default function Resources() {
  const [clusters, setClusters] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [resources, setResources] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState("");
  const [selectedNamespace, setSelectedNamespace] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const resourceTypes = [
    "Pods",
    "Deployments",
    "Services",
    "StatefulSets",
    "DaemonSets",
    "Jobs",
    "CronJobs",
    "ConfigMaps",
    "PersistentVolumeClaims",
    "Ingress",
    "HelmReleases",
    "SparkApplications"
  ];

  useEffect(() => {
    // Load cluster list from backend
    setClusters(["dev-cluster", "staging-cluster", "prod-cluster"]);
    setSelectedCluster("dev-cluster");
  }, []);

  useEffect(() => {
    if (!selectedCluster) return;
    axios
      .get(`/api/resources/namespaces?cluster=${selectedCluster}`)
      .then(res => {
        setNamespaces(res.data);
        setSelectedNamespace(res.data[0] || "");
      })
      .catch(err => console.error("❌ Failed to fetch namespaces:", err));
  }, [selectedCluster]);

  const fetchResources = () => {
    if (!selectedCluster || !selectedNamespace || !selectedType) return;
    setLoading(true);
    console.log(`🔄 Fetching ${selectedType} from ${selectedCluster}/${selectedNamespace}...`);
    axios
      .get(`/api/resources/${selectedType.toLowerCase()}?cluster=${selectedCluster}&namespace=${selectedNamespace}`)
      .then(res => {
        setResources(res.data.items || res.data);
        console.log(`✅ Loaded ${res.data.items?.length || res.data.length} ${selectedType}`);
        setPage(1); // reset page after fetch
      })
      .catch(err => console.error("❌ Failed to fetch resources:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchResources();
  }, [selectedCluster, selectedNamespace, selectedType]);

  const filteredResources = resources.filter(r =>
    r.metadata?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedResources = filteredResources.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredResources.length / pageSize);

  const getStatusBadge = status => {
    let color = "bg-gray-400";
    if (status?.toLowerCase() === "running") color = "bg-green-500";
    else if (status?.toLowerCase() === "pending") color = "bg-yellow-500";
    else if (status?.toLowerCase() === "failed") color = "bg-red-500";

    return (
      <span className={`px-2 py-1 rounded-full text-white text-xs font-medium ${color}`}>
        {status || "Unknown"}
      </span>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Cluster */}
        <Select value={selectedCluster} onValueChange={setSelectedCluster}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Cluster" />
          </SelectTrigger>
          <SelectContent>
            {clusters.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Namespace */}
        <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Namespace" />
          </SelectTrigger>
          <SelectContent>
            {namespaces.map(ns => (
              <SelectItem key={ns} value={ns}>{ns}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Resource Type */}
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Select Resource Type" />
          </SelectTrigger>
          <SelectContent>
            {resourceTypes.map(rt => (
              <SelectItem key={rt} value={rt}>{rt}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64"
        />

        {/* Refresh Button */}
        <Button onClick={fetchResources} variant="secondary" disabled={loading}>
          {loading ? <ReloadIcon className="animate-spin mr-2" /> : "⟳"}
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 border">Name</th>
              <th className="p-3 border">Namespace</th>
              <th className="p-3 border">Type</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border">Age</th>
            </tr>
          </thead>
          <tbody>
            {paginatedResources.map((res, i) => {
              const status =
                res.status?.phase || // Pods
                res.status?.conditions?.[0]?.type || // Deployments/Jobs
                "Unknown";

              return (
                <tr key={i} className="hover:bg-gray-100 transition-colors">
                  <td className="p-3 border">{res.metadata?.name}</td>
                  <td className="p-3 border">{res.metadata?.namespace}</td>
                  <td className="p-3 border">{selectedType}</td>
                  <td className="p-3 border">{getStatusBadge(status)}</td>
                  <td className="p-3 border">
                    {res.metadata?.creationTimestamp
                      ? new Date(res.metadata.creationTimestamp).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {filteredResources.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="text-center p-4 text-gray-500">
                  No resources found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Prev
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

