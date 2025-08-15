// src/components/HelmModals.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function ShellModalBase({ title, children, confirmLabel, confirmClass, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 m-auto h-max w-[92%] max-w-lg bg-white rounded-2xl shadow-xl p-4"
      >
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <div className="space-y-3">
          {children}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">
              Cancel
            </button>
            <button onClick={onConfirm} className={`px-3 py-1 rounded text-white ${confirmClass}`}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

async function apiFetch(path, opts = {}, role = 'editor') {
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

export function HelmInstallModal({ role = 'editor', onClose, onDone }) {
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [chart, setChart] = useState('');
  const [valuesYaml, setValuesYaml] = useState('');

  async function onConfirm() {
    try {
      await apiFetch('/api/helm/install', {
        method: 'POST',
        body: JSON.stringify({ name, namespace, chart, values: valuesYaml }),
      }, role);
      onClose();
      onDone?.();
    } catch (e) {
      console.error('helm install error', e);
    }
  }

  return (
    <ShellModalBase
      title="Install Helm Release"
      confirmLabel="Install"
      confirmClass="bg-green-600 hover:bg-green-700"
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="grid grid-cols-1 gap-2">
        <input className="border rounded px-3 py-2" placeholder="name" value={name} onChange={e => setName(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="namespace" value={namespace} onChange={e => setNamespace(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="chart (e.g. bitnami/nginx)" value={chart} onChange={e => setChart(e.target.value)} />
        <textarea className="border rounded px-3 py-2 min-h-[140px]" placeholder="values.yaml (optional)" value={valuesYaml} onChange={e => setValuesYaml(e.target.value)} />
      </div>
    </ShellModalBase>
  );
}

export function HelmUpgradeModal({ role = 'editor', release, onClose, onDone }) {
  const [chart, setChart] = useState(release?.chart || '');
  const [valuesYaml, setValuesYaml] = useState('');

  async function onConfirm() {
    try {
      await apiFetch('/api/helm/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          name: release.name,
          namespace: release.namespace,
          chart,
          values: valuesYaml,
        }),
      }, role);
      onClose();
      onDone?.();
    } catch (e) {
      console.error('helm upgrade error', e);
    }
  }

  return (
    <ShellModalBase
      title={`Upgrade ${release?.namespace}/${release?.name}`}
      confirmLabel="Upgrade"
      confirmClass="bg-blue-600 hover:bg-blue-700"
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="grid grid-cols-1 gap-2">
        <input className="border rounded px-3 py-2" placeholder="chart (e.g. bitnami/nginx)" value={chart} onChange={e => setChart(e.target.value)} />
        <textarea className="border rounded px-3 py-2 min-h-[140px]" placeholder="values.yaml (optional)" value={valuesYaml} onChange={e => setValuesYaml(e.target.value)} />
      </div>
    </ShellModalBase>
  );
}

export function HelmRollbackModal({ role = 'editor', release, onClose, onDone }) {
  const [revision, setRevision] = useState('');

  async function onConfirm() {
    try {
      await apiFetch('/api/helm/rollback', {
        method: 'POST',
        body: JSON.stringify({
          name: release.name,
          namespace: release.namespace,
          revision: revision || undefined,
        }),
      }, role);
      onClose();
      onDone?.();
    } catch (e) {
      console.error('helm rollback error', e);
    }
  }

  return (
    <ShellModalBase
      title={`Rollback ${release?.namespace}/${release?.name}`}
      confirmLabel="Rollback"
      confirmClass="bg-amber-600 hover:bg-amber-700"
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <input
        className="border rounded px-3 py-2"
        placeholder="revision (optional)"
        value={revision}
        onChange={e => setRevision(e.target.value)}
      />
    </ShellModalBase>
  );
}

export function HelmUninstallModal({ role = 'admin', release, onClose, onDone }) {
  async function onConfirm() {
    try {
      await apiFetch('/api/helm/uninstall', {
        method: 'POST',
        body: JSON.stringify({
          name: release.name,
          namespace: release.namespace,
        }),
      }, role);
      onClose();
      onDone?.();
    } catch (e) {
      console.error('helm uninstall error', e);
    }
  }

  return (
    <ShellModalBase
      title={`Uninstall ${release?.namespace}/${release?.name}?`}
      confirmLabel="Uninstall"
      confirmClass="bg-rose-600 hover:bg-rose-700"
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <p className="text-sm text-gray-600">
        This will remove the release and its resources. This action cannot be undone.
      </p>
    </ShellModalBase>
  );
}
