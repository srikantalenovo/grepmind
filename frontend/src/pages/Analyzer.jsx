// src/pages/Analyzer.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Search, Activity } from "lucide-react";
import TabWrapper from "../components/TabWrapper.jsx";
import AnalyzerTable from "../components/AnalyzerTable.jsx";
import DetailsDrawer from "../components/DetailsDrawer.jsx";
import RestartModal from "../components/RestartModal.jsx";
import ScaleModal from "../components/ScaleModal.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const REFRESH_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_ROLE = "editor"; // change to 'admin' for admin testing

async function apiFetch(path, opts = {}, role = DEFAULT_ROLE) {
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

export default function Analyzer() {
  const [problems, setProblems] = useState([]);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [detailsItem, setDetailsItem] = useState(null);
  const [restartItem, setRestartItem] = useState(null);
  const [scaleItem, setScaleItem] = useState(null);

  async function fetchProblems() {
    try {
      const data = await apiFetch("/api/analyzer/problems");
      setProblems(Array.isArray(data?.issues) ? data.issues : []);
      setLastUpdated(data?.scannedAt ? new Date(data.scannedAt) : new Date());
    } catch (e) {
      console.error("Fetch problems error:", e);
    }
  }

  useEffect(() => {
    fetchProblems();
    const id = setInterval(fetchProblems, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return problems.filter((p) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.namespace || "").toLowerCase().includes(q) ||
      (p.issue || "").toLowerCase().includes(q) ||
      (p.type || "").toLowerCase().includes(q)
    );
  }, [problems, search]);

  const toolbar = (
    <>
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name/namespace/issue"
          className="border rounded-full pl-8 pr-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
        />
      </div>
      <button
        onClick={fetchProblems}
        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1 rounded-full hover:bg-indigo-700"
      >
        <RefreshCw className="w-4 h-4 animate-spin-slow" />
        Refresh
      </button>
    </>
  );

  return (
    <TabWrapper title="Cluster Analyzer" lastUpdated={lastUpdated} toolbar={toolbar}>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <div className="px-2 py-2">
          <div className="flex items-center gap-2 text-indigo-700 mb-2">
            <Activity className="w-5 h-5" />
            <span className="font-semibold">Detected issues</span>
          </div>
          <AnalyzerTable
            data={filtered}
            onDetails={setDetailsItem}
            onRestart={setRestartItem}
            onScale={setScaleItem}
            role={DEFAULT_ROLE}
          />
        </div>
      </motion.div>

      {detailsItem && (
        <DetailsDrawer item={detailsItem} onClose={() => setDetailsItem(null)} />
      )}
      {restartItem && (
        <RestartModal
          item={restartItem}
          onClose={() => setRestartItem(null)}
          onConfirm={fetchProblems}
          role={DEFAULT_ROLE}
        />
      )}
      {scaleItem && (
        <ScaleModal
          item={scaleItem}
          onClose={() => setScaleItem(null)}
          onConfirm={fetchProblems}
          role={DEFAULT_ROLE}
        />
      )}
    </TabWrapper>
  );
}
