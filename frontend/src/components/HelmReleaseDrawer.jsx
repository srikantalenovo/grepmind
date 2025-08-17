import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// ---------- apiFetch ----------
async function apiFetch(path, opts = {}, role = 'editor') {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'x-user-role': role,
      ...(opts.headers || {}),
      // only set JSON when we actually send a body
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

  const loadDetails = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`${API_BASE}/api/helm/releases/${release.namespace}/${release.name}`)
        .then(r=>r.json());
      setDetails(JSON.stringify(data.details, null, 2));
    } catch (e) {
      setDetails('Failed to load details');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ if(release) loadDetails(); }, [release]);

  const deleteRelease = async () => {
    if(!window.confirm(`Delete release ${release.name}?`)) return;
    await apiFetch(`${API_BASE}/api/helm/releases/${release.namespace}/${release.name}`, { method:'DELETE' });
    onActionDone(); onClose();
  };

  const upgradeRelease = async () => {
    if(!upgradeChart) return alert('Enter chart path');
    await apiFetch(`${API_BASE}/api/helm/releases/${release.namespace}/${release.name}/upgrade`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ chart:upgradeChart })
    });
    onActionDone(); onClose();
  };

  const rollbackRelease = async () => {
    if(!rollbackRevision) return alert('Enter revision number');
    await apiFetch(`${API_BASE}/api/helm/releases/${release.namespace}/${release.name}/rollback`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ revision:rollbackRevision })
    });
    onActionDone(); onClose();
  };

  if(!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end">
      <div className="w-2/5 bg-white h-full p-4 overflow-auto shadow-xl">
        <button className="float-right text-red-600" onClick={onClose}>Close</button>
        <h2 className="text-lg font-semibold mb-2">{release.name}</h2>
        <div className="mb-2 flex gap-2">
          <input type="text" placeholder="Chart path" value={upgradeChart} onChange={e=>setUpgradeChart(e.target.value)}
            className="border px-2 py-1 rounded"/>
          <button className="bg-indigo-600 text-white px-2 py-1 rounded" onClick={upgradeRelease}>Upgrade</button>
        </div>
        <div className="mb-2 flex gap-2">
          <input type="number" placeholder="Revision" value={rollbackRevision} onChange={e=>setRollbackRevision(e.target.value)}
            className="border px-2 py-1 rounded"/>
          <button className="bg-yellow-500 text-white px-2 py-1 rounded" onClick={rollbackRelease}>Rollback</button>
        </div>
        <div className="mb-4">
          <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={deleteRelease}>Delete Release</button>
        </div>
        {loading ? <p>Loading details…</p> : <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">{details}</pre>}
      </div>
    </div>
  );
}
