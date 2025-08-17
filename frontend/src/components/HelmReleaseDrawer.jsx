// src/components/HelmReleaseDrawer.jsx
import React, { useEffect, useState } from 'react';

export default function HelmReleaseDrawer({ open, onClose, release, role, onActionDone }) {
  const [yamlContent, setYamlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE || '';

  useEffect(() => {
    if (!release || !open) return;

    const fetchYaml = async () => {
      setLoading(true);
      setErrMsg('');
      try {
        const res = await fetch(`${API_BASE}/api/helm/releases/${release.namespace}/${release.name}/yaml`, {
          headers: { 'x-user-role': role },
        });
        if (!res.ok) throw new Error(`Failed to fetch YAML: ${res.statusText}`);
        const data = await res.text();
        setYamlContent(data);
      } catch (e) {
        console.error(e);
        setErrMsg(e.message || 'Failed to load release YAML.');
      } finally {
        setLoading(false);
      }
    };

    fetchYaml();
  }, [release, open, role, API_BASE]);

  const handleApply = async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/helm/releases/${release.namespace}/${release.name}/apply`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/yaml',
          'x-user-role': role,
        },
        body: yamlContent,
      });
      if (!res.ok) throw new Error(`Failed to apply YAML: ${res.statusText}`);
      onActionDone?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      setErrMsg(e.message || 'Failed to apply changes.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm">
      <div className="bg-white w-full md:w-3/4 lg:w-1/2 h-full overflow-y-auto shadow-lg p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 font-bold text-xl"
          title="Close"
        >
          ×
        </button>

        <h2 className="text-2xl font-semibold mb-4">Helm Release: {release?.name}</h2>
        <p className="text-sm text-gray-600 mb-4">Namespace: {release?.namespace}</p>

        {errMsg && <p className="text-red-600 mb-4">{errMsg}</p>}

        <textarea
          value={yamlContent}
          onChange={e => setYamlContent(e.target.value)}
          className="w-full h-[400px] border border-gray-300 rounded-lg p-2 font-mono text-sm resize-y"
          placeholder="YAML content..."
        />

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleApply}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition"
          >
            {loading ? 'Applying…' : 'Apply Changes'}
          </button>

          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
