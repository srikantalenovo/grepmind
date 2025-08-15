// src/components/ConfirmModal.jsx
import React from 'react';
import { motion } from 'framer-motion';

export default function ConfirmModal({
  title = 'Are you sure?',
  message = 'Confirm this action.',
  confirmLabel = 'Confirm',
  confirmClass = 'bg-indigo-600 hover:bg-indigo-700',
  onClose,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 m-auto h-max w-[92%] max-w-md bg-white rounded-2xl shadow-xl p-4"
      >
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">
            Cancel
          </button>
          <button onClick={onConfirm} className={`px-3 py-1 rounded text-white ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
