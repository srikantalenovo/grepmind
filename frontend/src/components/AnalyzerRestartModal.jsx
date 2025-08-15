// src/components/AnalyzerRestartModal.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function AnalyzerRestartModal({ target, onClose, onDone }) {
  const [loading, setLoading] = useState(false);

  async function handleRestart() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/analyzer/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: target.type,
          name: target.name,
          namespace: target.namespace,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onDone?.();
      onClose();
    } catch (err) {
      console.error('Restart failed', err);
      alert('Restart failed: ' + err.message);
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
        <h3 className="text-lg font-bold text-red-600">
          Restart {target.type}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to restart <strong>{target.name}</strong> in
          namespace <strong>{target.namespace}</strong>?
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleRestart}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Restarting...' : 'Confirm Restart'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
