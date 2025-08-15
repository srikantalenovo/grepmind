// src/components/HelmPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import HelmReleaseTable from './HelmReleaseTable.jsx';
import HelmReleaseDetailDrawer from './HelmReleaseDetailDrawer.jsx';
import { HelmInstallModal, HelmUpgradeModal, HelmRollbackModal, HelmUninstallModal } from './HelmModals.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function HelmPanel({ role = 'editor' }) {
  const [releases, setReleases] = useState([]);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const [detail, setDetail] = useState(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState(null);
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [uninstallTarget, setUninstallTarget] = useState(null);

  async function apiFetch(path, opts = {}) {
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

  async function fetchReleases() {
    try {
      const data = await apiFetch('/api/helm/releases');
      setReleases(Array.isArray(data) ? data : (data?.releases || []));
      setLastUpdated(new Date());
    } catch (e) {
      console.error('helm releases error', e);
    }
  }

  useEffect(() => { fetchReleases(); }, []);

  const filtered = useMemo(() => {
    return releases.filter(r =>
      (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.namespace || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.chart || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [releases, search]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-xl font-bold text-indigo-700">Helm Releases</h2>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name/namespace/chart"
            className="border rounded px-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
          />
          <button
            onClick={fetchReleases}
            className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700"
          >
            Refresh
          </button>
          {(role === 'editor' || role === 'admin') && (
            <button
              onClick={() => setInstallOpen(true)}
              className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
            >
              Install
            </button>
          )}
        </div>
      </div>

      {lastUpdated && (
        <p className="text-sm text-gray-500 italic">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <HelmReleaseTable
          data={filtered}
          role={role}
          onDetails={setDetail}
          onUpgrade={setUpgradeTarget}
          onRollback={setRollbackTarget}
          onUninstall={setUninstallTarget}
        />
      </motion.div>

      {/* Drawer & Modals */}
      {detail && (
        <HelmReleaseDetailDrawer
          role={role}
          release={detail}
          onClose={() => setDetail(null)}
        />
      )}
      {installOpen && (
        <HelmInstallModal
          role={role}
          onClose={() => setInstallOpen(false)}
          onDone={fetchReleases}
        />
      )}
      {upgradeTarget && (
        <HelmUpgradeModal
          role={role}
          release={upgradeTarget}
          onClose={() => setUpgradeTarget(null)}
          onDone={fetchReleases}
        />
      )}
      {rollbackTarget && (
        <HelmRollbackModal
          role={role}
          release={rollbackTarget}
          onClose={() => setRollbackTarget(null)}
          onDone={fetchReleases}
        />
      )}
      {uninstallTarget && (
        <HelmUninstallModal
          role={role}
          release={uninstallTarget}
          onClose={() => setUninstallTarget(null)}
          onDone={fetchReleases}
        />
      )}
    </div>
  );
}
