// src/components/ScaleModal.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Boxes } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function ScaleModal({ item, onClose, onConfirm, role = "editor" }) {
  const [replicas, setReplicas] = useState(item?.details?.desired ?? item?.details?.available ?? 1);
  const [loading, setLoading] = useState(false);

  async function handleScale() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/analyzer/scale`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": role },
        body: JSON.stringify({ name: item.name, namespace: item.namespace, replicas: Number(replicas) }),
      });
      if (!res.ok) throw new Error(await res.text());
      onConfirm?.();
      onClose();
    } catch (e) {
      console.error("Scale failed:", e);
      alert("Scale failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center gap-2 text-blue-600">
          <Boxes className="w-5 h-5" />
          <h3 className="text-lg font-bold">Scale Deployment</h3>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Set new replica count for <strong>{item.name}</strong> in <strong>{item.namespace}</strong>.
        </p>
        <label className="block text-sm mt-4">Replicas</label>
        <input
          type="number"
          min={0}
          value={replicas}
          onChange={(e) => setReplicas(e.target.value)}
          className="border rounded px-3 py-2 mt-1 w-full focus:outline-none focus:ring focus:border-blue-400"
        />
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
          <button
            onClick={handleScale}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Scaling..." : "Confirm Scale"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
