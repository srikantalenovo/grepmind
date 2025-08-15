// src/components/HelmModals.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path, body, role) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-role': role },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
  return res.json();
}

function Shell({ title, children, onClose, onSubmit, submitText = 'Submit' }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative bg-white rounded-xl p-6 shadow-2xl w-[560px] max-w-[95vw]"
      >
        <h2 className="text-lg font-bold mb-3">{title}</h2>
        <div className="space-y-3">{children}</div>
        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button onClick={onSubmit} className="px-4 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">{submitText}</button>
        </div>
      </motion.div>
    </div>
  );
}

export function HelmInstallModal({ role = 'editor', onClose, onDone }) {
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [chart, setChart] = useState('');
  const [valuesYaml, setValuesYaml] = useState('');

  async function submit() {
    await apiFetch('/api/helm/install', { name, namespace, chart, valuesYaml }, role);
    onClose(); onDone();
  }

  return (
    <Shell title="Install Helm Release" onClose={onClose} onSubmit={submit} submitText="Install">
      <input className="w-full border rounded px-2 py-1" placeholder="Release name" value={name} onChange={e=>setName(e.target.value)} />
      <input className="w-full border rounded px-2 py-1" placeholder="Namespace" value={namespace} onChange={e=>setNamespace(e.target.value)} />
      <input className="w-full border rounded px-2 py-1" placeholder="Chart (e.g., bitnami/nginx)" value={chart} onChange={e=>setChart(e.target.value)} />
      <textarea className="w-full border rounded px-2 py-1 h-40 font-mono" placeholder="values.yaml (optional)" value={valuesYaml} onChange={e=>setValuesYaml(e.target.value)} />
    </Shell>
  );
}

export function HelmUpgradeModal({ role = 'editor', release, onClose, onDone }) {
  const [chart, setChart] = useState(release.chart?.split('-')[0] || '');
  const [valuesYaml, setValuesYaml] = useState('');

  async function submit() {
    await apiFetch('/api/helm/upgrade', {
      name: release.name,
      namespace: release.namespace,
      chart,
      valuesYaml
    }, role);
    onClose(); onDone();
  }

  return (
    <Shell title={`Upgrade ${release.name}`} onClose={onClose} onSubmit={submit} submitText="Upgrade">
      <input className="w-full border rounded px-2 py-1" placeholder="Chart (repo/name)" value={chart} onChange={e=>setChart(e.target.value)} />
      <textarea className="w-full border rounded px-2 py-1 h-40 font-mono" placeholder="values.yaml (optional)" value={valuesYaml} onChange={e=>setValuesYaml(e.target.value)} />
    </Shell>
  );
}

export function HelmRollbackModal({ role = 'editor', release, onClose, onDone }) {
  const [revision, setRevision] = useState('');

  async function submit() {
    await apiFetch('/api/helm/rollback', {
      name: release.name,
      namespace: release.namespace,
      revision: Number(revision)
    }, role);
    onClose(); onDone();
  }

  return (
    <Shell title={`Rollback ${release.name}`} onClose={onClose} onSubmit={submit} submitText="Rollback">
      <input className="w-full border rounded px-2 py-1" placeholder="Revision number" value={revision} onChange={e=>setRevision(e.target.value)} />
    </Shell>
  );
}

export function HelmUninstallModal({ role = 'admin', release, onClose, onDone }) {
  async function submit() {
    await apiFetch('/api/helm/uninstall', {
      name: release.name,
      namespace: release.namespace
    }, role);
    onClose(); onDone();
  }

  return (
    <Shell title={`Uninstall ${release.name}`} onClose={onClose} onSubmit={submit} submitText="Uninstall">
      <p className="text-sm text-gray-700">
        This will <strong>remove</strong> the release <code>{release.name}</code> from <code>{release.namespace}</code>.
      </p>
    </Shell>
  );
}
