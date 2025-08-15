// src/components/HelmReleaseDetailDrawer.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function HelmReleaseDetailDrawer({ role = 'editor', release, onClose }) {
  const [details, setDetails] = useState(null);
  const [values, setValues] = useState('');
  const [loading, setLoading] = useState(true);

  async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        'x-user-role': role,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
    return res.json();
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [d, v] = await Promise.all([
          apiFetch(`/api/helm/release/${encodeURIComponent(release.namespace)}/${encodeURIComponent(release.name)}`),
          apiFetch(`/api/helm/release/${encodeURIComponent(release.namespace)}/${encodeURIComponent(release.name)}/values`),
        ]);
        if (!mounted) return;
        setDetails(d);
        setValues(typeof v === 'string' ? v : (v?.values || ''));
      } catch (e) {
        console.error('helm release detail error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [release]);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-2xl p-4 overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b pb-2 mb-3">
          <h3 className="text-lg font-semibold text-indigo-700">
            Helm — {release.namespace}/{release.name}
          </h3>
          <button
            onClick={onClose}
            className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : (
          <div className="space-y-4">
            <section>
              <h4 className="font-semibold text-gray-700 mb-1">Overview</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded border overflow-x-auto">
                {JSON.stringify(details ?? release, null, 2)}
              </pre>
            </section>
            <section>
              <h4 className="font-semibold text-gray-700 mb-1">values.yaml</h4>
              <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded border overflow-x-auto max-h-96">
                {values || '—'}
              </pre>
            </section>
          </div>
        )}
      </motion.div>
    </div>
  );
}
