// src/components/AnalyzerScaleModal.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function AnalyzerScaleModal({ target, onClose, onDone }) {
  const [replicas, setReplicas] = useState(target.desired || 1);
  const [loading, setLoading] = useState(false);

  async function handleScale() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/analyzer/scale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: target.name,
          namespace: target.namespace,
          replicas: Number(replicas),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onDone?.();
      onClose();
    } catch (err) {
      console.error('Scale failed', err);
      alert('Scale failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-blue-600">
          Scale Deployment
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Set new replica count for <strong>{target.name}</strong> in
          namespace <strong>{target.namespace}</strong>.
        </p>

        <input
          type="number"
          value={replicas}
          min={0}
          onChange={(e) => setReplicas(e.target.value)}
          className="border rounded px-3 py-2 mt-4 w-full focus:outline-none focus:ring focus:border-blue-400"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleScale}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Scaling...' : 'Confirm Scale'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
