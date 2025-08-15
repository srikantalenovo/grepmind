// src/components/HelmModals.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function ModalShell({ title, onClose, children, color = "indigo" }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
        <h3 className={`text-lg font-bold text-${color}-600`}>{title}</h3>
        {children}
        <div className="mt-6 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Close</button>
        </div>
      </div>
    </motion.div>
  );
}

export function HelmInstallModal({ role = "editor", onClose, onDone }) {
  const [form, setForm] = useState({ release: "", chart: "", namespace: "default", values: "" });
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/helm/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": role },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      onDone?.();
      onClose();
    } catch (e) {
      alert("Install failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title="Install Helm Release" onClose={onClose} color="green">
      <div className="grid grid-cols-1 gap-3 mt-3">
        <input className="border rounded px-3 py-2" placeholder="Release name"
          value={form.release} onChange={(e) => setForm({ ...form, release: e.target.value })}/>
        <input className="border rounded px-3 py-2" placeholder="Chart (repo/chart)"
          value={form.chart} onChange={(e) => setForm({ ...form, chart: e.target.value })}/>
        <input className="border rounded px-3 py-2" placeholder="Namespace"
          value={form.namespace} onChange={(e) => setForm({ ...form, namespace: e.target.value })}/>
        <textarea className="border rounded px-3 py-2" placeholder="values.yaml (optional)" rows={6}
          value={form.values} onChange={(e) => setForm({ ...form, values: e.target.value })}/>
      </div>
      <div className="mt-4 text-right">
        <button onClick={submit} disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {loading ? "Installing..." : "Install"}
        </button>
      </div>
    </ModalShell>
  );
}

export function HelmUpgradeModal({ role = "editor", onClose, onDone, release }) {
  const [form, setForm] = useState({ chart: release.chart || "", namespace: release.namespace, values: "" });
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/helm/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": role },
        body: JSON.stringify({ name: release.name, ...form }),
      });
      if (!res.ok) throw new Error(await res.text());
      onDone?.();
      onClose();
    } catch (e) {
      alert("Upgrade failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title={`Upgrade ${release.name}`} onClose={onClose} color="blue">
      <div className="grid grid-cols-1 gap-3 mt-3">
        <input className="border rounded px-3 py-2" placeholder="Chart (repo/chart)"
          value={form.chart} onChange={(e) => setForm({ ...form, chart: e.target.value })}/>
        <textarea className="border rounded px-3 py-2" placeholder="values.yaml (optional)" rows={6}
          value={form.values} onChange={(e) => setForm({ ...form, values: e.target.value })}/>
      </div>
      <div className="mt-4 text-right">
        <button onClick={submit} disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Upgrading..." : "Upgrade"}
        </button>
      </div>
    </ModalShell>
  );
}

export function HelmRollbackModal({ role = "editor", onClose, onDone, release }) {
  const [revision, setRevision] = useState(release.revision || "");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/helm/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": role },
        body: JSON.stringify({ name: release.name, namespace: release.namespace, revision }),
      });
      if (!res.ok) throw new Error(await res.text());
      onDone?.();
      onClose();
    } catch (e) {
      alert("Rollback failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title={`Rollback ${release.name}`} onClose={onClose} color="amber">
      <div className="grid grid-cols-1 gap-3 mt-3">
        <input className="border rounded px-3 py-2" placeholder="Revision"
          value={revision} onChange={(e) => setRevision(e.target.value)}/>
      </div>
      <div className="mt-4 text-right">
        <button onClick={submit} disabled={loading}
          className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50">
          {loading ? "Rolling back..." : "Rollback"}
        </button>
      </div>
    </ModalShell>
  );
}

export function HelmUninstallModal({ role = "admin", onClose, onDone, release }) {
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/helm/uninstall`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": role },
        body: JSON.stringify({ name: release.name, namespace: release.namespace }),
      });
      if (!res.ok) throw new Error(await res.text());
      onDone?.();
      onClose();
    } catch (e) {
      alert("Uninstall failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title={`Uninstall ${release.name}`} onClose={onClose} color="red">
      <p className="mt-3 text-sm text-gray-600">
        Are you sure you want to uninstall <strong>{release.name}</strong> from <strong>{release.namespace}</strong>?
      </p>
      <div className="mt-4 text-right">
        <button onClick={submit} disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
          {loading ? "Uninstalling..." : "Confirm Uninstall"}
        </button>
      </div>
    </ModalShell>
  );
}
