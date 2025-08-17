// src/components/analyzer/Helm.jsx
import React, { useState, useEffect } from "react";
import { Button, Input, Badge, Table, TableHead, TableBody, TableRow, TableCell } from "@/components/ui";
import { FaSearch } from "react-icons/fa";
import HelmReleaseDrawer from "../components/HelmReleaseDrawer";
import axios from "axios";

export default function Helm({ namespace }) {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/helm/${namespace}/releases`, { params: { search } });
      setReleases(res.data.releases || []);
    } catch (err) {
      console.error("Failed to fetch Helm releases", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, [namespace, search]);

  const openDrawer = (release) => {
    setSelectedRelease(release);
    setDrawerOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search releases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button onClick={fetchReleases} className="flex items-center gap-2">
          <FaSearch /> Refresh
        </Button>
      </div>

      <Table className="bg-white/5 rounded-2xl overflow-hidden shadow-md">
        <TableHead className="bg-indigo-500/30 text-white">
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Namespace</TableCell>
            <TableCell>Chart</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Revision</TableCell>
            <TableCell>App Version</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4">Loading...</TableCell>
            </TableRow>
          ) : releases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4">No releases found</TableCell>
            </TableRow>
          ) : (
            releases.map((r) => (
              <TableRow key={r.name} className="hover:bg-indigo-500/10 cursor-pointer transition-colors" onClick={() => openDrawer(r)}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.namespace}</TableCell>
                <TableCell>{r.chart}</TableCell>
                <TableCell>
                  <Badge
                    className={`px-2 py-1 rounded-xl ${
                      r.status === "deployed" ? "bg-green-500/30 text-green-500" :
                      r.status === "failed" ? "bg-red-500/30 text-red-500" :
                      "bg-yellow-500/30 text-yellow-500"
                    }`}
                  >
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell>{r.revision}</TableCell>
                <TableCell>{r.app_version}</TableCell>
                <TableCell>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); openDrawer(r); }}>Manage</Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {drawerOpen && selectedRelease && (
        <HelmReleaseDrawer
          release={selectedRelease}
          namespace={namespace}
          isOpen={drawerOpen}
          setIsOpen={setDrawerOpen}
          refresh={fetchReleases}
        />
      )}
    </div>
  );
}
