// src/components/AnalyzerPanel.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import AnalyzerTable from './AnalyzerTable.jsx';
import AnalyzerDetailDrawer from './AnalyzerDetailDrawer.jsx';
import AnalyzerRestartModal from './AnalyzerRestartModal.jsx';
import AnalyzerScaleModal from './AnalyzerScaleModal.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function AnalyzerPanel({ role = 'editor' }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const [detail, setDetail] = useState(null);
  const [restartTarget, setRestartTarget] = useState(null);
  const [scaleTarget, setScaleTarget] = useState(null);

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

  async function fetchAnalyzerData() {
    try {
      const data = await apiFetch('/api/analyzer/resources');
      setItems(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Analyzer fetch error', e);
    }
  }

  useEffect(() => { fetchAnalyzerData(); }, []);

  const filtered = useMemo(() => {
    return items.filter(i =>
      (i.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.namespace || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.issue || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-xl font-bold text-indigo-700">Cluster Analyzer</h2>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name/namespace/issue"
            className="border rounded px-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
          />
          <button
            onClick={fetchAnalyzerData}
            className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-sm text-gray-500 italic">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <AnalyzerTable
          data={filtered}
          onDetails={setDetail}
          onRestart={setRestartTarget}
          onScale={setScaleTarget}
        />
      </motion.div>

      {/* Drawer & Modals */}
      {detail && (
        <AnalyzerDetailDrawer
          item={detail}
          onClose={() => setDetail(null)}
        />
      )}
      {restartTarget && (
        <AnalyzerRestartModal
          target={restartTarget}
          onClose={() => setRestartTarget(null)}
          onDone={fetchAnalyzerData}
        />
      )}
      {scaleTarget && (
        <AnalyzerScaleModal
          target={scaleTarget}
          onClose={() => setScaleTarget(null)}
          onDone={fetchAnalyzerData}
        />
      )}
    </div>
  );
}
