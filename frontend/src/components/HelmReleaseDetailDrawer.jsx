// src/components/HelmReleaseDetailDrawer.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function HelmReleaseDetailDrawer({ release, onClose, role = "editor" }) {
  const [details, setDetails] = useState(null);
  const [values, setValues] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ns = release.namespace ? `?namespace=${encodeURIComponent(release.namespace)}` : "";
        const res = await fetch(`${API_BASE}/api/helm/release/${encodeURIComponent(release.name)}${ns}`, {
          headers: { "x-user-role": role },
        });
        const data = await res.json();
        if (mounted) {
          setDetails(data?.details || data);
          setValues(data?.values || data?.valuesYaml || data?.values_yaml || null);
        }
      } catch (e) {
        console.error("helm detail error", e);
      }
    })();
    return () => { mounted = false; };
  }, [release, role]);

  return (
    <motion.div className="fixed inset-0 z-50 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <motion.div
        className="w-full sm:w-[520px] bg-white shadow-xl p-6 overflow-y-auto"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-indigo-700">Release: {release.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div><strong>Namespace:</strong> {release.namespace}</div>
          <div><strong>Chart:</strong> {release.chart}</div>
          <div><strong>Status:</strong> {release.status}</div>
          <div><strong>Revision:</strong> {release.revision}</div>

          {details && (
            <div>
              <strong>Details:</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto text-xs">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}
          {values && (
            <div>
              <strong>values.yaml:</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto text-xs">
                {typeof values === "string" ? values : JSON.stringify(values, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
