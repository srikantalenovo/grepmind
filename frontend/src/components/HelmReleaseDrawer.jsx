import React, { useState } from "react";
import { X } from "lucide-react";
import Editor from "@monaco-editor/react";
import axios from "axios";

function HelmReleaseDrawer({ release, onClose, refresh }) {
  const [yaml, setYaml] = useState(release.valuesYaml || "");
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    try {
      setLoading(true);
      if (action === "upgrade") {
        await axios.post(`/api/helm/releases/${release.namespace}/${release.name}/upgrade`, { values: yaml });
      } else if (action === "rollback") {
        await axios.post(`/api/helm/releases/${release.namespace}/${release.name}/rollback`);
      } else if (action === "delete") {
        await axios.delete(`/api/helm/releases/${release.namespace}/${release.name}`);
      }
      refresh();
      onClose();
    } catch (err) {
      console.error(`❌ Failed to ${action} release:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-end bg-black/40 z-50">
      <div className="w-[600px] bg-white h-full shadow-lg p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {release.name} ({release.namespace})
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Info */}
        <div className="space-y-2 mb-4 text-sm text-gray-600">
          <p><strong>Chart:</strong> {release.chart}</p>
          <p><strong>Version:</strong> {release.version}</p>
          <p><strong>Status:</strong> {release.status}</p>
          <p><strong>Updated:</strong> {release.updated}</p>
        </div>

        {/* YAML Editor */}
        <div className="flex-1 border rounded overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="yaml"
            value={yaml}
            onChange={(val) => setYaml(val || "")}
            options={{ minimap: { enabled: false } }}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={() => handleAction("upgrade")}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
          >
            Upgrade
          </button>
          <button
            onClick={() => handleAction("rollback")}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg shadow hover:bg-yellow-600 transition"
          >
            Rollback
          </button>
          <button
            onClick={() => handleAction("delete")}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default HelmReleaseDrawer;
