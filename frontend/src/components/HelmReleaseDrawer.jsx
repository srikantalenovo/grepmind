// src/components/analyzer/HelmReleaseDrawer.jsx
import React, { useState, useEffect } from "react";
import { Drawer, Button, Textarea, Badge } from "@/components/ui";
import axios from "axios";

export default function HelmReleaseDrawer({ release, namespace, isOpen, setIsOpen, refresh }) {
  const [valuesYaml, setValuesYaml] = useState("");
  const [status, setStatus] = useState(release.status);
  const [loading, setLoading] = useState(false);

  const fetchReleaseYaml = async () => {
    try {
      const res = await axios.get(`/api/helm/${namespace}/release/${release.name}/yaml`);
      setValuesYaml(res.data);
    } catch (err) {
      console.error("Failed to fetch release YAML", err);
    }
  };

  const fetchReleaseStatus = async () => {
    try {
      const res = await axios.get(`/api/helm/${namespace}/release/${release.name}/status`);
      setStatus(res.data.info?.status || release.status);
    } catch (err) {
      console.error("Failed to fetch release status", err);
    }
  };

  useEffect(() => {
    fetchReleaseYaml();
    fetchReleaseStatus();
  }, [release]);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await axios.post(`/api/helm/${namespace}/release/${release.name}/upgrade`, { valuesYaml });
      alert("Release upgraded successfully!");
      fetchReleaseStatus();
      refresh();
    } catch (err) {
      console.error(err);
      alert("Upgrade failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    const rev = prompt("Enter revision number to rollback:");
    if (!rev) return;
    setLoading(true);
    try {
      await axios.post(`/api/helm/${namespace}/release/${release.name}/rollback`, { revision: rev });
      alert(`Rolled back to revision ${rev}`);
      fetchReleaseStatus();
      refresh();
    } catch (err) {
      console.error(err);
      alert("Rollback failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete release ${release.name}?`)) return;
    setLoading(true);
    try {
      await axios.delete(`/api/helm/${namespace}/release/${release.name}`);
      alert("Release deleted");
      setIsOpen(false);
      refresh();
    } catch (err) {
      console.error(err);
      alert("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer isOpen={isOpen} setIsOpen={setIsOpen} title={`Manage Release: ${release.name}`}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{release.name}</h2>
          <Badge
            className={`px-2 py-1 rounded-xl ${
              status === "deployed" ? "bg-green-500/30 text-green-500" :
              status === "failed" ? "bg-red-500/30 text-red-500" :
              "bg-yellow-500/30 text-yellow-500"
            }`}
          >
            {status}
          </Badge>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Values.yaml</h3>
          <Textarea
            value={valuesYaml}
            onChange={(e) => setValuesYaml(e.target.value)}
            rows={15}
            className="font-mono bg-gray-800 text-white rounded-lg p-2"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleUpgrade} disabled={loading}>Upgrade</Button>
          <Button onClick={handleRollback} disabled={loading} variant="secondary">Rollback</Button>
          <Button onClick={handleDelete} disabled={loading} variant="destructive">Delete</Button>
        </div>
      </div>
    </Drawer>
  );
}
