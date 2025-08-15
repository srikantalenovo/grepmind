import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import AnalyzerTable from '../components/AnalyzerTable.jsx';
import DetailsDrawer from '../components/DetailsDrawer.jsx';
import RestartModal from '../components/RestartModal.jsx';
import ScaleModal from '../components/ScaleModal.jsx';
import HelmPanel from '../components/HelmPanel.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 min
const DEFAULT_ROLE = 'editor';

async function apiFetch(path, opts = {}, role = DEFAULT_ROLE) {
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

export default function Analyzer() {
  const [activeTab, setActiveTab] = useState('problems');
  const [problems, setProblems] = useState([]);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [detailsItem, setDetailsItem] = useState(null);
  const [restartItem, setRestartItem] = useState(null);
  const [scaleItem, setScaleItem] = useState(null);

  async function fetchProblems() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/analyzer/problems');
      setProblems(Array.isArray(data.issues) ? data.issues : []);
      setLastUpdated(data.scannedAt ? new Date(data.scannedAt) : new Date());
    } catch (err) {
      console.error('Fetch problems error:', err);
      setProblems([]);
      setError('Failed to load problems. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== 'problems') return;
    fetchProblems();
    const id = setInterval(fetchProblems, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [activeTab]);

  const filtered = useMemo(() => {
    return (problems || []).filter(p =>
      typeof p.name === 'string' &&
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [problems, search]);

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab('problems')}
          className={`px-4 py-2 rounded-2xl border transition ${
            activeTab === 'problems'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
          }`}
        >
          Problems
        </button>
        <button
          onClick={() => setActiveTab('helm')}
          className={`px-4 py-2 rounded-2xl border transition ${
            activeTab === 'helm'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
          }`}
        >
          Helm
        </button>
      </div>

      {activeTab === 'problems' && (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h1 className="text-2xl font-bold text-indigo-700">Analyzer</h1>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border rounded px-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
              />
              <button
                onClick={fetchProblems}
                className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {loading && <p className="text-sm text-gray-500">Loading problems...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {lastUpdated && !loading && !error && (
            <p className="text-sm text-gray-500 italic">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}

          {/* Problems Table */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {!loading && !error && filtered.length > 0 && (
              <AnalyzerTable
                data={filtered}
                onDetails={setDetailsItem}
                onRestart={setRestartItem}
                onScale={setScaleItem}
              />
            )}
            {!loading && !error && filtered.length === 0 && (
              <p className="text-gray-500 italic mt-4">No problems found.</p>
            )}
          </motion.div>

          {/* Modals & Drawer */}
          {detailsItem && (
            <DetailsDrawer item={detailsItem} onClose={() => setDetailsItem(null)} />
          )}
          {restartItem && (
            <RestartModal
              item={restartItem}
              onClose={() => setRestartItem(null)}
              onConfirm={fetchProblems}
            />
          )}
          {scaleItem && (
            <ScaleModal
              item={scaleItem}
              onClose={() => setScaleItem(null)}
              onConfirm={fetchProblems}
            />
          )}
        </>
      )}

      {activeTab === 'helm' && (
        <HelmPanel role={DEFAULT_ROLE} />
      )}
    </div>
  );
}
