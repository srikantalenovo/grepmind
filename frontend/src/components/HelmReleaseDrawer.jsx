import React, { useEffect, useState } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/worker-yaml';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-github';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path, opts = {}, role = 'editor') {
  const userRole = role === 'admin' ? 'admin' : 'editor';
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'x-user-role': userRole,
      ...(opts.headers || {}),
      ...((opts.body && !opts.headers?.['Content-Type']) ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export default function HelmReleaseDrawer({ open, mode = 'manage', release, onClose, onActionDone, role }) {
  const [details, setDetails] = useState(null);
  const [yaml, setYaml] = useState('');
  const [chart, setChart] = useState('');
  const [version, setVersion] = useState('');
  const [releaseName, setReleaseName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mode === 'manage' && release && open) {
      setLoading(true);
      apiFetch(`/api/helm/releases/${release.namespace}/${release.name}`, {}, role)
        .then((res) => {
          setDetails(res);
          if (res.valuesYaml) setYaml(res.valuesYaml);
          setChart(res.chart || '');
          setVersion(res.app_version || '');
          setReleaseName(res.name);
          setNamespace(res.namespace);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else if (mode === 'install') {
      setDetails(null);
      setYaml('');
      setChart('');
      setVersion('');
      setReleaseName('');
      setNamespace('');
    }
  }, [release, open, mode, role]);

  const handleInstall = async () => {
    if (!releaseName || !namespace || !chart) return alert('Release name, namespace and chart are required');
    try {
      setSaving(true);
      await apiFetch(`/api/helm/releases/install`, {
        method: 'POST',
        body: JSON.stringify({ releaseName, namespace, chart, version, values: yaml }),
      }, role);
      onActionDone();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      setSaving(true);
      await apiFetch(`/api/helm/releases/${namespace}/${releaseName}/upgrade`, {
        method: 'POST',
        body: JSON.stringify({ chart, version, values: yaml }),
      }, role);
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
      await apiFetch(`/api/helm/releases/${namespace}/${releaseName}/rollback`, { method: 'POST' }, role);
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
      await apiFetch(`/api/helm/releases/${namespace}/${releaseName}`, { method: 'DELETE' }, role);
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
              {mode === 'install' ? 'Install New Release' : `Release: ${releaseName} (${namespace})`}
            </h2>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition">✕</button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <p className="text-gray-500">Loading release details…</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <>
                {/* Install / Upgrade Form */}
                <div className="border rounded-lg shadow p-3 space-y-2">
                  {mode === 'install' && (
                    <>
                      <input
                        type="text"
                        placeholder="Release Name"
                        value={releaseName}
                        onChange={e => setReleaseName(e.target.value)}
                        className="w-full border px-2 py-1 rounded"
                      />
                      <input
                        type="text"
                        placeholder="Namespace"
                        value={namespace}
                        onChange={e => setNamespace(e.target.value)}
                        className="w-full border px-2 py-1 rounded"
                      />
                    </>
                  )}
                  <input
                    type="text"
                    placeholder="Chart"
                    value={chart}
                    onChange={e => setChart(e.target.value)}
                    className="w-full border px-2 py-1 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Version (optional)"
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full border px-2 py-1 rounded"
                  />
                </div>

                {/* Existing Release Details */}
                {mode === 'manage' && details && (
                  <div className="border rounded-lg shadow p-3">
                    <h3 className="text-indigo-600 font-medium mb-2">Details</h3>
                    <ul className="text-sm space-y-1">
                      <li><strong>Name:</strong> {releaseName}</li>
                      <li><strong>Namespace:</strong> {namespace}</li>
                      <li><strong>Chart:</strong> {chart}</li>
                      <li><strong>App Version:</strong> {version || '-'}</li>
                      <li><strong>Revision:</strong> {details.revision}</li>
                      <li><strong>Status:</strong> {details.status}</li>
                      <li><strong>Updated:</strong> {details.updated}</li>
                    </ul>
                  </div>
                )}

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
              {mode === 'install' ? (
                <button
                  onClick={handleInstall}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
                >
                  {saving ? 'Installing…' : 'Install'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleUpgrade}
                    disabled={saving}
                    className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
                  >
                    {saving ? 'Upgrading…' : 'Upgrade'}
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
                </>
              )}
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
