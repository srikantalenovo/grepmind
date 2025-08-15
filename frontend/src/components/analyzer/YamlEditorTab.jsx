import React, { useState } from 'react';
import { FileDown, Save, Search } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path, opts = {}, role = 'editor') {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...(opts.headers || {}), 'x-user-role': role, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export default function YamlEditorTab({ role = 'editor' }) {
  const [type, setType] = useState('deployment'); // deployment | pod | service
  const [namespace, setNamespace] = useState('default');
  const [name, setName] = useState('');
  const [yaml, setYaml] = useState('');
  const [busy, setBusy] = useState(false);

  async function fetchYaml() {
    if (!name) return alert('Enter resource name');
    try {
      setBusy(true);
      const y = await apiFetch(`/api/analyzer/resource/${type}/${namespace}/${name}/yaml`, {}, role);
      setYaml(typeof y === 'string' ? y : (y.yaml || ''));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function replaceYaml() {
    if (!yaml) return alert('Paste YAML first');
    try {
      setBusy(true);
      await apiFetch(`/api/analyzer/resource/${type}/${namespace}/${name}/yaml`, {
        method: 'PUT',
        body: JSON.stringify({ yaml }),
      }, role);
      alert('YAML replaced successfully');
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  function downloadYaml() {
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${type}-${namespace}-${name || 'resource'}.yaml`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded px-3 py-2">
          <option value="deployment">Deployment</option>
          <option value="pod">Pod</option>
          <option value="service">Service</option>
        </select>
        <input value={namespace} onChange={(e) => setNamespace(e.target.value)} placeholder="namespace" className="border rounded px-3 py-2" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" className="border rounded px-3 py-2" />
        <div className="flex gap-2">
          <button onClick={fetchYaml} className="flex-1 bg-indigo-600 text-white rounded px-3 py-2 hover:bg-indigo-700 inline-flex items-center justify-center gap-2">
            <Search className="w-4 h-4" /> Load YAML
          </button>
          <button onClick={downloadYaml} className="px-3 py-2 rounded border inline-flex items-center gap-2"><FileDown className="w-4 h-4" /> Download</button>
        </div>
      </div>

      <textarea
        value={yaml}
        onChange={(e) => setYaml(e.target.value)}
        rows={20}
        placeholder="YAML will appear here…"
        className="w-full border rounded p-3 font-mono text-sm"
      />

      <div className="flex justify-end">
        <button disabled={busy} onClick={replaceYaml} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-flex items-center gap-2">
          <Save className="w-4 h-4" /> Replace
        </button>
      </div>
    </div>
  );
}
