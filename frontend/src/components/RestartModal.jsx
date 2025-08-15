// src/components/RestartModal.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function RestartModal({ item, onClose, onConfirm, role = "editor" }) {
  const [loading, setLoading] = useState(false);

  async function handleRestart() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/analyzer/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": role },
        body: JSON.stringify({ type: item.type, name: item.name, namespace: item.namespace }),
      });
      if (!res.ok) throw new Error(await res.text());
      onConfirm?.();
      onClose();
    } catch (e) {
      console.error("Restart failed:", e);
      alert("Restart failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-lg font-bold">Restart {item.type}</h3>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to restart <strong>{item.name}</strong> in namespace <strong>{item.namespace}</strong>?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
          <button
            onClick={handleRestart}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Restarting..." : "Confirm Restart"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
