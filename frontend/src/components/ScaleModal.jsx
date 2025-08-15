// src/components/ScaleModal.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function ScaleModal({ item, onClose, onConfirm }) {
  const [replicas, setReplicas] = useState(
    Number(item?.details?.desired ?? item?.details?.available ?? 1)
  );

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 m-auto h-max w-[92%] max-w-md bg-white rounded-2xl shadow-xl p-4"
      >
        <h3 className="text-lg font-semibold mb-2">
          Scale Deployment {item.namespace}/{item.name}
        </h3>
        <div className="border rounded p-3 bg-gray-50 mb-3">
          <div className="text-sm text-gray-700">
            Current: <strong>{Number(item?.details?.available ?? 0)}</strong> available /{' '}
            <strong>{Number(item?.details?.desired ?? 0)}</strong> desired
          </div>
        </div>
        <label className="text-sm text-gray-600">Desired replicas</label>
        <input
          type="number"
          min="0"
          value={replicas}
          onChange={(e) => setReplicas(e.target.value)}
          className="w-full border rounded px-3 py-2 mt-1 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(replicas)}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </motion.div>
    </div>
  );
}
