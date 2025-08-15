// src/pages/Helm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, RefreshCw, Puzzle, Wrench } from "lucide-react";
import TabWrapper from "../components/TabWrapper.jsx";
import HelmReleaseTable from "../components/HelmReleaseTable.jsx";
import HelmReleaseDetailDrawer from "../components/HelmReleaseDetailDrawer.jsx";
import { HelmInstallModal, HelmUpgradeModal, HelmRollbackModal, HelmUninstallModal } from "../components/HelmModals.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const ROLE = "editor"; // or 'admin'

async function apiFetch(path, opts = {}, role = ROLE) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      "x-user-role": role,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
  return res.json();
}

export default function Helm() {
  const [releases, setReleases] = useState([]);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [detail, setDetail] = useState(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState(null);
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [uninstallTarget, setUninstallTarget] = useState(null);

  async function fetchReleases() {
    try {
      const data = await apiFetch("/api/helm/releases");
      setReleases(Array.isArray(data) ? data : (data?.releases || []));
      setLastUpdated(new Date());
    } catch (e) {
      console.error("helm releases error", e);
    }
  }

  useEffect(() => { fetchReleases(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return releases.filter((r) =>
      (r.name || "").toLowerCase().includes(q) ||
      (r.namespace || "").toLowerCase().includes(q) ||
      (r.chart || "").toLowerCase().includes(q) ||
      (r.revision || "").toString().includes(q)
    );
  }, [releases, search]);

  const toolbar = (
    <>
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name/namespace/chart"
          className="border rounded-full pl-8 pr-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
        />
      </div>
      <button
        onClick={fetchReleases}
        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1 rounded-full hover:bg-indigo-700"
      >
        <RefreshCw className="w-4 h-4 animate-spin-slow" />
        Refresh
      </button>
      {(ROLE === "editor" || ROLE === "admin") && (
        <button
          onClick={() => setInstallOpen(true)}
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-1 rounded-full hover:bg-green-700"
        >
          <Puzzle className="w-4 h-4" />
          Install
        </button>
      )}
    </>
  );

  return (
    <TabWrapper title="Helm Releases" lastUpdated={lastUpdated} toolbar={toolbar}>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <HelmReleaseTable
          data={filtered}
          role={ROLE}
          onDetails={setDetail}
          onUpgrade={setUpgradeTarget}
          onRollback={setRollbackTarget}
          onUninstall={setUninstallTarget}
        />
      </motion.div>

      {detail && (
        <HelmReleaseDetailDrawer role={ROLE} release={detail} onClose={() => setDetail(null)} />
      )}
      {installOpen && (
        <HelmInstallModal role={ROLE} onClose={() => setInstallOpen(false)} onDone={fetchReleases} />
      )}
      {upgradeTarget && (
        <HelmUpgradeModal role={ROLE} release={upgradeTarget} onClose={() => setUpgradeTarget(null)} onDone={fetchReleases} />
      )}
      {rollbackTarget && (
        <HelmRollbackModal role={ROLE} release={rollbackTarget} onClose={() => setRollbackTarget(null)} onDone={fetchReleases} />
      )}
      {uninstallTarget && (
        <HelmUninstallModal role={ROLE} release={uninstallTarget} onClose={() => setUninstallTarget(null)} onDone={fetchReleases} />
      )}
    </TabWrapper>
  );
}
