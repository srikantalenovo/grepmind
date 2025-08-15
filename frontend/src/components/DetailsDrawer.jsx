// src/components/DetailsDrawer.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const DEFAULT_ROLE = 'editor';

async function apiFetch(path, role = DEFAULT_ROLE) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-user-role': role },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
  return res.json();
}

export default function DetailsDrawer({ item, onClose }) {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    apiFetch(`/api/analyzer/details/${item.namespace}/${item.type}/${item.name}`)
      .then(setDetails)
      .catch(console.error);
  }, [item]);

  return (
    <div className="fixed inset-0 z-40">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl p-4 overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">
            {item.type} • {item.name}
          </h2>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
        {details ? (
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
            {JSON.stringify(details, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-600">Loading details…</p>
        )}
      </motion.div>
    </div>
  );
}
