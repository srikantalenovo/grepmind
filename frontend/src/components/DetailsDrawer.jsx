// src/components/DetailsDrawer.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function DetailsDrawer({ item, onClose }) {
  const [logs, setLogs] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  async function fetchLogs() {
    if (item.type !== 'Pod') return;
    setLoadingLogs(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/analyzer/pod/${encodeURIComponent(item.namespace)}/${encodeURIComponent(item.name)}/logs`,
        { headers: { 'x-user-role': 'editor' } }
      );
      const text = await res.text();
      setLogs(text);
    } catch (e) {
      setLogs(`Failed to load logs: ${e.message}`);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    setLogs('');
  }, [item]);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl p-4 overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b pb-2 mb-3">
          <h3 className="text-lg font-semibold text-indigo-700">
            {item.type} — {item.namespace}/{item.name}
          </h3>
          <button
            onClick={onClose}
            className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <section>
            <h4 className="font-semibold text-gray-700 mb-1">Issue</h4>
            <p className="text-sm text-gray-800">{item.issue || '—'}</p>
          </section>

          <section>
            <h4 className="font-semibold text-gray-700 mb-1">Details</h4>
            <pre className="text-xs bg-gray-50 p-2 rounded border overflow-x-auto">
              {JSON.stringify(item.details ?? item, null, 2)}
            </pre>
          </section>

          {item.type === 'Pod' && (
            <section>
              <h4 className="font-semibold text-gray-700 mb-1">Logs</h4>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={fetchLogs}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  {loadingLogs ? 'Loading…' : 'Load Logs'}
                </button>
              </div>
              <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded border overflow-x-auto max-h-72">
                {logs || '—'}
              </pre>
            </section>
          )}
        </div>
      </motion.div>
    </div>
  );
}
