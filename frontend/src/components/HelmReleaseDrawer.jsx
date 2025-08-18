// src/components/HelmReleaseDrawer.jsx
import React, { useEffect, useState } from 'react';
import AceEditor from 'react-ace';
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
      ...((opts.body && !opts.headers?.['Content-Type'])
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export default function HelmReleaseDrawer({ open, release, onClose, onActionDone, role }) {
  const [details, setDetails] = useState(null);
  const [yaml, setYaml] = useState('');
  const [releaseName, setReleaseName] = useState('');
  const [chartVersion, setChartVersion] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (release && open) {
      setReleaseName(release.name);
      setLoading(true);
      apiFetch(`/api/helm/releases/${release.namespace}/${release.name}`, {}, role)
        .then((res) => {
          setDetails(res);
          if (res.valuesYaml) setYaml(res.valuesYaml);
          if (res.chart_version) setChartVersion(res.chart_version);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else if (open) {
      // New release, clear fields
      setReleaseName('');
      setChartVersion('');
      setYaml('');
      setDetails(null);
    }
  }, [release, open, role]);

  const handleInstall = async () => {
    if (!releaseName) return alert('Release name is required');
    try {
      setSaving(true);
      await apiFetch(`/api/helm/releases/install`, {
        method: 'POST',
        body: JSON.stringify({ release: releaseName, chart_version: chartVersion, values: yaml }),
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
    if (!releaseName) return alert('Release name is required');
    try {
      setSaving(true);
      await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}/upgrade`, {
        method: 'POST',
        body: JSON.stringify({ chart_version: chartVersion, values: yaml }),
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
      await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}/rollback`, {
        method: 'POST',
      }, role);
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
      await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}`, {
        method: 'DELETE',
      }, role);
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
              {release ? `Release: ${release.name} (${release.namespace})` : 'New Helm Release'}
            </h2>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition">
              ✕
            </button>
          </div>

          {/* Actions / Inputs */}
          <div className="p-4 flex gap-2 border-b bg-gray-50">
            <input
              type="text"
              placeholder="Release Name"
              value={releaseName}
              onChange={e => setReleaseName(e.target.value)}
              className="border px-2 py-1 rounded flex-1"
            />
            <input
              type="text"
              placeholder="Chart Version"
              value={chartVersion}
              onChange={e => setChartVersion(e.target.value)}
              className="border px-2 py-1 rounded flex-1"
            />
            <button
              onClick={handleInstall}
              disabled={saving}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
            >
              {saving ? 'Installing…' : 'Install'}
            </button>
            {release && (
              <button
                onClick={handleUpgrade}
                disabled={saving}
                className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
              >
                {saving ? 'Upgrading…' : 'Upgrade'}
              </button>
            )}
            {release && (
              <button
                onClick={handleRollback}
                disabled={saving}
                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
              >
                Rollback
              </button>
            )}
            {release && (
              <button
                onClick={handleUninstall}
                disabled={saving}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
              >
                Uninstall
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <p className="text-gray-500">Loading release details…</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : details ? (
              <>
                <div className="border rounded-lg shadow p-3">
                  <h3 className="text-indigo-600 font-medium mb-2">Details</h3>
                  <ul className="text-sm space-y-1">
                    <li><strong>Name:</strong> {release?.name}</li>
                    <li><strong>Namespace:</strong> {release?.namespace}</li>
                    <li><strong>Chart:</strong> {release?.chart}</li>
                    <li><strong>App Version:</strong> {release?.app_version || '-'}</li>
                    <li><strong>Revision:</strong> {release?.revision}</li>
                    <li><strong>Status:</strong> {release?.status}</li>
                    <li><strong>Updated:</strong> {release?.updated}</li>
                  </ul>
                </div>
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
                    setOptions={{ useWorker: false }}
                    className="border rounded"
                  />
                </div>
              </>
            ) : (
              <p>No details available</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
