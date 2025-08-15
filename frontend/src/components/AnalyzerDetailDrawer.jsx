// src/components/AnalyzerDetailDrawer.jsx
import React from 'react';
import { motion } from 'framer-motion';

export default function AnalyzerDetailDrawer({ item, onClose }) {
  if (!item) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        className="w-full sm:w-[420px] bg-white shadow-lg p-6 overflow-y-auto"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
      >
        <h3 className="text-lg font-bold text-indigo-700 mb-4">
          {item.type} Details
        </h3>

        <div className="space-y-2 text-sm">
          <div><strong>Name:</strong> {item.name}</div>
          <div><strong>Namespace:</strong> {item.namespace}</div>
          {item.nodeName && <div><strong>Node:</strong> {item.nodeName}</div>}
          {item.issue && <div><strong>Issue:</strong> {item.issue}</div>}
          {item.details && (
            <div className="mt-3">
              <strong>Details:</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto text-xs">
                {JSON.stringify(item.details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
