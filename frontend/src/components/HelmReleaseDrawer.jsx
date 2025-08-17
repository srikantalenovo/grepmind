import React, { useEffect, useState } from 'react';
import AceEditor from 'react-ace';
import { motion, AnimatePresence } from 'framer-motion';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-github';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// ---------- apiFetch ----------
async function apiFetch(path, opts = {}, role = 'editor') {
  // Validate role
  const userRole = role === 'admin' ? 'admin' : 'editor';

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'x-user-role': userRole,
      ...(opts.headers || {}),
      // Only set JSON header if sending a body and content-type not already set
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
  const [yamlText, setYamlText] = useState('');
  const [yamlLoading, setYamlLoading] = useState(false);

  const loadReleaseDetails = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}`);
      setDetails(JSON.stringify(data.details || data, null, 2));
      if(data.values) setYamlText(data.values);
    } catch (err) {
      setDetails('Failed to load details');
      setYamlText('');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if(release && open) loadReleaseDetails(); }, [release, open]);

  const handleUpgrade = async () => {
    if(!upgradeChart) return alert('Enter chart path');
    await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}/upgrade`, {
      method: 'POST',
      body: JSON.stringify({ chart: upgradeChart })
    });
    onActionDone(); onClose();
  };

  const handleRollback = async () => {
    if(!rollbackRevision) return alert('Enter revision number');
    await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ revision: rollbackRevision })
    });
    onActionDone(); onClose();
  };

  const handleDelete = async () => {
    if(!window.confirm(`Delete release ${release.name}?`)) return;
    await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}`, { method: 'DELETE' });
    onActionDone(); onClose();
  };

  const handleApplyYaml = async () => {
    if(!yamlText) return alert('YAML is empty');
    setYamlLoading(true);
    try {
      await apiFetch(`/api/helm/releases/${release.namespace}/${release.name}/apply-values`, {
        method: 'POST',
        body: JSON.stringify({ values: yamlText })
      });
      alert('Values applied successfully');
      onActionDone();
    } catch(err) {
      alert('Failed to apply values: ' + err.message);
      console.error(err);
    } finally { setYamlLoading(false); }
  };

  if(!open) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/30 flex justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-2/5 bg-white h-full p-4 overflow-auto shadow-xl"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <button className="float-right text-red-600" onClick={onClose}>Close</button>
          <h2 className="text-lg font-semibold mb-2">{release.name}</h2>

          <div className="mb-2 flex gap-2">
            <input type="text" placeholder="Chart path" value={upgradeChart} onChange={e => setUpgradeChart(e.target.value)}
              className="border px-2 py-1 rounded w-full"/>
            <button className="bg-indigo-600 text-white px-2 py-1 rounded" onClick={handleUpgrade}>Upgrade</button>
          </div>

          <div className="mb-2 flex gap-2">
            <input type="number" placeholder="Revision" value={rollbackRevision} onChange={e => setRollbackRevision(e.target.value)}
              className="border px-2 py-1 rounded w-full"/>
            <button className="bg-yellow-500 text-white px-2 py-1 rounded" onClick={handleRollback}>Rollback</button>
          </div>

          <div className="mb-4">
            <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={handleDelete}>Delete Release</button>
          </div>

          {loading ? <p>Loading details…</p> : <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto mb-4">{details}</pre>}

          <h3 className="text-md font-semibold mb-1">Edit Values YAML</h3>
          <AceEditor
            mode="yaml"
            theme="github"
            width="100%"
            height="300px"
            value={yamlText}
            onChange={setYamlText}
            name="helm-values-editor"
            editorProps={{ $blockScrolling: true }}
          />
          <button
            className={`mt-2 px-3 py-1 rounded text-white ${yamlLoading ? 'bg-gray-400' : 'bg-green-600'}`}
            onClick={handleApplyYaml}
            disabled={yamlLoading}
          >
            {yamlLoading ? 'Applying…' : 'Apply YAML'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
