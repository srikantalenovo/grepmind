// src/components/HelmReleaseDrawer.jsx
import React, { useEffect, useState } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-github';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// ---------- apiFetch ----------
async function apiFetch(path, opts = {}, role = 'editor') {
  // Ensure role is either admin or editor
  const userRole = role === 'admin' ? 'admin' : 'editor';

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'x-user-role': userRole,
      ...(opts.headers || {}),
      // Only set Content-Type JSON if body exists & not already set
      ...((opts.body && !opts.headers?.['Content-Type'])
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`,
    );
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export default function HelmReleaseDrawer({ open, release, onClose, onActionDone, role }) {
  const [details, setDetails] = useState(null);
  const [yaml, setYaml] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // 🔹 Normalize release fields (handles both camelCase & PascalCase from Helm)
  const relName = release?.name || release?.Name || '';
  const relNs   = release?.namespace || release?.Namespace || '';
  const relChart = release?.chart || release?.Chart || '';
  const relAppVersion = release?.app_version || release?.AppVersion || '';
  const relRevision = release?.revision || release?.Revision || '';
  const relStatus = release?.status || release?.Status || '';
  const relUpdated = release?.updated || release?.Updated || '';

  // Fetch release details
  useEffect(() => {
    if (open && relName && relNs) {
      setLoading(true);
      apiFetch(`/api/helm/releases/${relNs}/${relName}`, {}, role)
        .then((res) => {
          setDetails(res);
          if (res.valuesYaml) setYaml(res.valuesYaml);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [open, relName, relNs, role]);

  const handleUpgrade = async () => {
    try {
      setSaving(true);
      await apiFetch(
        `/api/helm/releases/${relNs}/${relName}/upgrade`,
        {
          method: 'POST',
          body: JSON.stringify({ values: yaml }),
        },
        role,
      );
      onActionDone();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async () => {
    try {
      setSaving(true);
      await apiFetch(
        `/api/helm/releases/${relNs}/${relName}/rollback`,
        { method: 'POST' },
        role,
      );
      onActionDone();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUninstall = async () => {
    try {
      setSaving(true);
      await apiFetch(
        `/api/helm/releases/${relNs}/${relName}`,
        { method: 'DELETE' },
        role,
      );
      onActionDone();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="fixed top-0 right-0 h-full w-[70%] bg-white shadow-2xl z-50 flex flex-col"
        >
          {/* Header */}
          <div className="bg-indigo-600 text-white p-4 flex justify-between items-center rounded-tl-2xl">
            <h2 className="text-lg font-semibold">
              Release: {relName} ({relNs})
            </h2>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition">
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <p className="text-gray-500">Loading release details…</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <>
                {/* Release Info */}
                <div className="border rounded-lg shadow p-3">
                  <h3 className="text-indigo-600 font-medium mb-2">Details</h3>
                  <ul className="text-sm space-y-1">
                    <li><strong>Name:</strong> {relName}</li>
                    <li><strong>Namespace:</strong> {relNs}</li>
                    <li><strong>Chart:</strong> {relChart}</li>
                    <li><strong>App Version:</strong> {relAppVersion || '-'}</li>
                    <li><strong>Revision:</strong> {relRevision}</li>
                    <li><strong>Status:</strong> {relStatus}</li>
                    <li><strong>Updated:</strong> {relUpdated}</li>
                  </ul>
                </div>

                {/* YAML Editor */}
                <div className="border rounded-lg shadow p-3">
                  <h3 className="text-indigo-600 font-medium mb-2">Values.yaml</h3>
                  <AceEditor
                    mode="yaml"
                    theme="github"
                    name="helm-values-editor"
                    width="100%"
                    height="300px"
                    fontSize={14}
                    value={yaml}
                    onChange={setYaml}
                    editorProps={{ $blockScrolling: true }}
                    className="border rounded"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t flex justify-between bg-gray-50 rounded-br-2xl">
            <div className="space-x-2">
              <button
                onClick={handleUpgrade}
                disabled={saving}
                className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
              >
                {saving ? 'Applying…' : 'Apply / Upgrade'}
              </button>
              <button
                onClick={handleRollback}
                disabled={saving}
                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
              >
                Rollback
              </button>
              <button
                onClick={handleUninstall}
                disabled={saving}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
              >
                Uninstall
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1 border rounded hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
