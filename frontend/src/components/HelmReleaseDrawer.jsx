import React, { useEffect, useState } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-github';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// ---------- apiFetch ----------
async function apiFetch(path, opts = {}, role = 'editor') {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'x-user-role': role,
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

export default function HelmReleaseDrawer({ open, onClose, release, onActionDone }) {
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [upgradeChart, setUpgradeChart] = useState('');
  const [rollbackRevision, setRollbackRevision] = useState('');
  const [valuesYaml, setValuesYaml] = useState('');
  const [yamlLoading, setYamlLoading] = useState(false);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}`);
      setDetails(JSON.stringify(data.details, null, 2));
    } catch (e) {
      setDetails('Failed to load details');
    } finally { setLoading(false); }
  };

  const loadValuesYaml = async () => {
    setYamlLoading(true);
    try {
      const data = await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}/values`);
      setValuesYaml(data.valuesYaml || '');
    } catch (e) {
      setValuesYaml('# Failed to load values.yaml');
    } finally { setYamlLoading(false); }
  };

  useEffect(() => {
    if (release) {
      loadDetails();
      loadValuesYaml();
    }
  }, [release]);

  const deleteRelease = async () => {
    if (!window.confirm(`Delete release ${release.name}?`)) return;
    await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}`, { method: 'DELETE' });
    onActionDone(); onClose();
  };

  const upgradeRelease = async () => {
    if (!upgradeChart) return alert('Enter chart path');
    await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chart: upgradeChart }),
    });
    onActionDone(); onClose();
  };

  const upgradeWithValues = async () => {
    if (!valuesYaml) return alert('YAML is empty');
    await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valuesYaml }),
    });
    onActionDone(); onClose();
  };

  const rollbackRelease = async () => {
    if (!rollbackRevision) return alert('Enter revision number');
    await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision: rollbackRevision }),
    });
    onActionDone(); onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-50">
      <div className="w-2/5 bg-white h-full p-4 overflow-auto shadow-xl">
        <button className="float-right text-red-600" onClick={onClose}>Close</button>
        <h2 className="text-lg font-semibold mb-2">{release.name}</h2>

        <div className="mb-2 flex gap-2">
          <input type="text" placeholder="Chart path" value={upgradeChart} onChange={e => setUpgradeChart(e.target.value)}
            className="border px-2 py-1 rounded"/>
          <button className="bg-indigo-600 text-white px-2 py-1 rounded" onClick={upgradeRelease}>Upgrade</button>
        </div>

        <div className="mb-2 flex gap-2">
          <input type="number" placeholder="Revision" value={rollbackRevision} onChange={e => setRollbackRevision(e.target.value)}
            className="border px-2 py-1 rounded"/>
          <button className="bg-yellow-500 text-white px-2 py-1 rounded" onClick={rollbackRelease}>Rollback</button>
        </div>

        <div className="mb-4">
          <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={deleteRelease}>Delete Release</button>
        </div>

        <h3 className="text-md font-semibold mb-1">Values.yaml Editor</h3>
        {yamlLoading ? <p>Loading YAML…</p> : (
          <AceEditor
            mode="yaml"
            theme="github"
            name="valuesYamlEditor"
            value={valuesYaml}
            onChange={setValuesYaml}
            width="100%"
            height="300px"
            fontSize={14}
            setOptions={{ useWorker: false }}
          />
        )}
        <button
          className="mt-2 bg-green-600 text-white px-3 py-1 rounded"
          onClick={upgradeWithValues}
        >
          Apply YAML / Upgrade
        </button>

        <h3 className="text-md font-semibold mt-4 mb-1">Release Details</h3>
        {loading ? <p>Loading details…</p> : <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">{details}</pre>}
      </div>
    </div>
  );
}
