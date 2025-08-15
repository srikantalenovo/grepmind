// src/components/HelmReleaseDetailDrawer.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path, role) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-user-role': role },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
  return res.json();
}

export default function HelmReleaseDetailDrawer({ role = 'editor', release, onClose }) {
  const [status, setStatus] = useState(null);
  const [values, setValues] = useState(null);

  useEffect(() => {
    apiFetch(`/api/helm/releases/${release.namespace}/${release.name}/status`, role).then(setStatus).catch(console.error);
    apiFetch(`/api/helm/releases/${release.namespace}/${release.name}/values`, role).then(setValues).catch(console.error);
  }, [release, role]);

  return (
    <div className="fixed inset-0 z-40">
      <div onClick={onClose} className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-2xl p-4 overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Helm • {release.name}</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Close
          </button>
        </div>

        <h3 className="font-semibold text-gray-800 mb-2">Status</h3>
        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto mb-4">
          {status ? JSON.stringify(status, null, 2) : 'Loading…'}
        </pre>

        <h3 className="font-semibold text-gray-800 mb-2">values.yaml</h3>
        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
          {values ? JSON.stringify(values, null, 2) : 'Loading…'}
        </pre>
      </motion.div>
    </div>
  );
}
