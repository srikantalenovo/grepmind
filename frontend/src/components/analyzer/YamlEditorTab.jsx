import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import apiFetch from "@/lib/apiFetch"; // your fetch wrapper

const KIND_OPTIONS = [
  { value: "deployment", label: "Deployment" },
  { value: "pod", label: "Pod" },
  { value: "service", label: "Service" },
  { value: "configmap", label: "ConfigMap" },
  { value: "ingress", label: "Ingress" },
  { value: "job", label: "Job" },
  { value: "statefulset", label: "StatefulSet" },
  { value: "daemonset", label: "DaemonSet" },
  { value: "cronjob", label: "CronJob" },
];

export default function YamlEditorTab({ role }) {
  const [namespaces, setNamespaces] = useState([]);
  const [namespace, setNamespace] = useState("default");
  const [kind, setKind] = useState("pod");
  const [resources, setResources] = useState([]);
  const [selected, setSelected] = useState(null);
  const [yaml, setYaml] = useState("");
  const [loading, setLoading] = useState(false);

  // load namespaces
  useEffect(() => {
    (async () => {
      const resp = await apiFetch("/api/analyzer/namespaces", {}, role);
      setNamespaces(resp.namespaces);
    })();
  }, [role]);

  // load resources when kind/namespace changes
  useEffect(() => {
    if (!kind || !namespace) return;
    (async () => {
      setLoading(true);
      try {
        const resp = await apiFetch(
          `/api/analyzer/${kind}/${namespace}`,
          {},
          role
        );
        setResources(resp.items || []);
      } catch (e) {
        console.error("resources error", e);
        setResources([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [kind, namespace, role]);

  const handleRowClick = async (r) => {
    setSelected(r);
    try {
      const y = await apiFetch(
        `/api/analyzer/resource/${kind}/${r.namespace}/${r.name}/yaml`,
        {},
        role
      );
      setYaml(y);
    } catch (e) {
      console.error("yaml error", e);
      setYaml(`# Error: ${e.message}`);
    }
  };

  const handleSave = async () => {
    try {
      await apiFetch(
        `/api/analyzer/resource/${kind}/${selected.namespace}/${selected.name}/yaml`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ yaml }),
        },
        role
      );
      alert("YAML updated successfully");
    } catch (e) {
      alert("Save failed: " + e.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <select
          className="border p-2 rounded-lg"
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
        >
          <option value="all">All Namespaces</option>
          {namespaces.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>
        <select
          className="border p-2 rounded-lg"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-x-auto rounded-xl shadow-md border border-gray-200"
      >
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {namespace === "all" && (
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Namespace
                </th>
              )}
              <th className="px-4 py-2 text-left font-semibold text-gray-700">
                Name
              </th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">
                Status
              </th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-4">
                  Loading...
                </td>
              </tr>
            ) : (
              resources.map((r) => (
                <motion.tr
                  key={`${r.namespace}-${r.name}`}
                  whileHover={{ scale: 1.01, backgroundColor: "#f9fafb" }}
                  onClick={() => handleRowClick(r)}
                  className="cursor-pointer"
                >
                  {namespace === "all" && (
                    <td className="px-4 py-2 text-gray-700">{r.namespace}</td>
                  )}
                  <td className="px-4 py-2 font-medium text-blue-600">
                    {r.name}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{r.status}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(r.creation).toLocaleString()}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Inline YAML editor */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border rounded-xl shadow-md overflow-hidden"
        >
          <div className="flex justify-between items-center p-2 bg-gray-100 border-b">
            <span className="font-semibold text-gray-700">
              {selected.kind || kind} – {selected.name}
            </span>
            <Button onClick={handleSave}>Save</Button>
          </div>
          <Editor
            height="400px"
            defaultLanguage="yaml"
            theme="vs-dark"
            value={yaml}
            onChange={(v) => setYaml(v)}
          />
        </motion.div>
      )}
    </div>
  );
}
