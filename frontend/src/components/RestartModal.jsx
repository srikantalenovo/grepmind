// src/components/RestartModal.jsx
import React from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const DEFAULT_ROLE = 'editor';

async function apiFetch(path, body, role = DEFAULT_ROLE) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-role': role },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
  return res.json();
}

export default function RestartModal({ item, onClose, onConfirm }) {
  async function handleRestart() {
    await apiFetch('/api/analyzer/restart', {
      namespace: item.namespace,
      type: item.type,
      name: item.name,
    });
    onClose();
    onConfirm();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white rounded-xl p-6 shadow-2xl w-[420px] max-w-[90vw]"
      >
        <h2 className="text-lg font-bold mb-2">Confirm Restart</h2>
        <p className="text-sm text-gray-700">
          Restart <strong>{item.type}</strong> <em>{item.name}</em> in <code>{item.namespace}</code>?
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button onClick={handleRestart} className="px-4 py-1 rounded bg-red-600 text-white hover:bg-red-700">Restart</button>
        </div>
      </motion.div>
    </div>
  );
}
