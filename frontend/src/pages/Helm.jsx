import React, { useEffect, useState } from "react";
import axios from "axios";
import { Search } from "lucide-react";
import HelmReleaseDrawer from "../components/HelmReleaseDrawer";

function Helm() {
  const [releases, setReleases] = useState([]);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [namespace, setNamespace] = useState("default");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `/api/helm/releases?namespace=${namespace}`
      );
      setReleases(data || []);
    } catch (err) {
      console.error("❌ Failed to fetch helm releases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, [namespace]);

  const filtered = releases.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Helm Releases
        </h1>
        <div className="flex gap-2">
          <select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm shadow-sm"
          >
            <option value="default">default</option>
            <option value="kube-system">kube-system</option>
            <option value="monitoring">monitoring</option>
            {/* Add more namespaces dynamically later */}
          </select>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search releases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border rounded-lg text-sm shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-gray-600 font-medium">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Namespace</th>
              <th className="px-4 py-3">Chart</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-6">
                  Loading releases...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-500">
                  No releases found
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr
                  key={i}
                  className="border-b hover:bg-indigo-50 cursor-pointer transition-all"
                  onClick={() => setSelectedRelease(r)}
                >
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3">{r.namespace}</td>
                  <td className="px-4 py-3">{r.chart}</td>
                  <td className="px-4 py-3">{r.version}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        r.status === "deployed"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.updated}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {selectedRelease && (
        <HelmReleaseDrawer
          release={selectedRelease}
          onClose={() => setSelectedRelease(null)}
          refresh={fetchReleases}
        />
      )}
    </div>
  );
}

export default Helm;
