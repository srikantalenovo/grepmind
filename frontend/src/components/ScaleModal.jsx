// src/components/ScaleModal.jsx
import React, { useState } from 'react';
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

export default function ScaleModal({ item, onClose, onConfirm }) {
  const [desired, setDesired] = useState(
    typeof item.details?.desired === 'number' ? item.details.desired :
    typeof item.details?.available === 'number' ? item.details.available : 1
  );

  async function handleScale() {
    await apiFetch('/api/analyzer/scale', {
      namespace: item.namespace,
      name: item.name,
      replicas: Number(desired),
    });
    onClose();
    onConfirm();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative bg-white rounded-xl p-6 shadow-2xl w-[420px] max-w-[90vw]"
      >
        <h2 className="text-lg font-bold mb-2">Scale Deployment</h2>
        <div className="space-y-2 text-sm text-gray-700">
          <div><strong>Name:</strong> {item.name}</div>
          <div><strong>Namespace:</strong> {item.namespace}</div>
          <div><strong>Current:</strong> {typeof item.details?.desired === 'number' ? item.details.desired : (item.details?.available ?? 'N/A')}</div>
        </div>
        <label className="block mt-4 text-sm text-gray-700">Desired replicas</label>
        <input
          type="number"
          min="0"
          value={desired}
          onChange={(e) => setDesired(e.target.value)}
          className="border rounded px-2 py-1 mt-1 w-full focus:outline-none focus:ring focus:border-indigo-400"
        />
        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button onClick={handleScale} className="px-4 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Apply</button>
        </div>
      </motion.div>
    </div>
  );
}
