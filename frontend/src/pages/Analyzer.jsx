// src/pages/Analyzer.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import AnalyzerTable from '../components/AnalyzerTable.jsx';
import DetailsDrawer from '../components/DetailsDrawer.jsx';
import RestartModal from '../components/RestartModal.jsx';
import ScaleModal from '../components/ScaleModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import HelmPanel from '../components/HelmPanel.jsx';

// If you have an AuthContext:
import { useAuth } from '../context/AuthContext'; // optional but recommended

const API_BASE = import.meta.env.VITE_API_BASE || '';
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 min
const DEFAULT_ROLE = 'editor'; // editor or admin

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
  const { user } = useAuth?.() || { user: null };
  const role = user?.role || DEFAULT_ROLE;

  const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'helm'
  const [namespaces, setNamespaces] = useState(['all']);
  const [namespace, setNamespace] = useState('all');
  const [resourceType, setResourceType] = useState('pods'); // pods | deployments | services
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [detailsItem, setDetailsItem] = useState(null);
  const [restartItem, setRestartItem] = useState(null);
  const [scaleItem, setScaleItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  // Fetch namespaces once
  async function fetchNamespaces() {
    try {
      const data = await apiFetch('/api/cluster/namespaces', {}, role);
      if (Array.isArray(data)) {
        const unique = Array.from(new Set(['all', ...data]));
        setNamespaces(unique);
      }
    } catch (e) {
      console.error('namespaces error', e);
    }
  }

  // Fetch resources by type + namespace
  async function fetchResources() {
    try {
      let q = `?namespace=${encodeURIComponent(namespace)}`;
      let path = '';
      if (resourceType === 'pods') path = `/api/analyzer/pods${q}`;
      else if (resourceType === 'deployments') path = `/api/analyzer/deployments${q}`;
      else if (resourceType === 'services') path = `/api/analyzer/services${q}`;
      else path = `/api/analyzer/pods${q}`;

      const data = await apiFetch(path, {}, role);
      const items = Array.isArray(data?.items) ? data.items : [];

      // normalize => rows with type/name/ns/issue/details
      const normalized = items.map((it) => {
        if (resourceType === 'pods') {
          const issue = it.issue || it.status || 'Unknown';
          return {
            type: 'Pod',
            name: it.name,
            namespace: it.namespace,
            issue,
            nodeName: it.nodeName || null,
            details: it,
          };
        }
        if (resourceType === 'deployments') {
          const desired = it.desired ?? 0;
          const available = it.available ?? 0;
          const issue = available < desired
            ? `Unhealthy: ${available}/${desired} available`
            : 'OK';
          return {
            type: 'Deployment',
            name: it.name,
            namespace: it.namespace,
            issue,
            details: it,
          };
        }
        if (resourceType === 'services') {
          const t = it.type || 'ClusterIP';
          const issue = it.ports?.length ? `${t} : ${it.ports.length} port(s)` : t;
          return {
            type: 'Service',
            name: it.name,
            namespace: it.namespace,
            issue,
            details: it,
          };
        }
        return {
          type: it.type || 'Unknown',
          name: it.name,
          namespace: it.namespace,
          issue: it.issue || 'Unknown',
          details: it,
        };
      });

      setRows(normalized);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('fetch resources error', e);
    }
  }

  // Initial loads
  useEffect(() => { fetchNamespaces(); }, []);
  useEffect(() => {
    if (activeTab !== 'resources') return;
    fetchResources();
    const id = setInterval(fetchResources, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [activeTab, resourceType, namespace]);

  const filtered = useMemo(() => {
    return rows.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()));
  }, [rows, search]);

  // Action handlers
  async function onConfirmRestart(item) {
    try {
      await apiFetch('/api/analyzer/restart', {
        method: 'POST',
        body: JSON.stringify({
          resourceType: item.type.toLowerCase(), // 'pod' or 'deployment'
          namespace: item.namespace,
          name: item.name,
        }),
      }, role);
      setRestartItem(null);
      fetchResources();
    } catch (e) {
      console.error('restart error', e);
    }
  }

  async function onConfirmScale(item, replicas) {
    try {
      await apiFetch('/api/analyzer/scale', {
        method: 'POST',
        body: JSON.stringify({
          namespace: item.namespace,
          name: item.name,
          replicas: Number(replicas),
        }),
      }, role);
      setScaleItem(null);
      fetchResources();
    } catch (e) {
      console.error('scale error', e);
    }
  }

  async function onConfirmDelete(item) {
    try {
      await apiFetch('/api/analyzer/delete', {
        method: 'POST',
        body: JSON.stringify({
          resourceType: item.type.toLowerCase(), // pod | deployment | service
          namespace: item.namespace,
          name: item.name,
        }),
      }, role);
      setDeleteItem(null);
      fetchResources();
    } catch (e) {
      console.error('delete error', e);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2 rounded-2xl border transition ${
            activeTab === 'resources'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
          }`}
        >
          Resources
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

      {activeTab === 'resources' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h1 className="text-2xl font-bold text-indigo-700">Analyzer</h1>
            <div className="flex items-center gap-2">
              <select
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                className="border rounded px-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
              >
                {namespaces.map(ns => (
                  <option key={ns} value={ns}>{ns}</option>
                ))}
              </select>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="border rounded px-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
              >
                <option value="pods">Pods</option>
                <option value="deployments">Deployments</option>
                <option value="services">Services</option>
              </select>
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border rounded px-3 py-1 focus:outline-none focus:ring focus:border-indigo-400"
              />
              <button
                onClick={fetchResources}
                className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Timestamp */}
          {lastUpdated && (
            <p className="text-sm text-gray-500 italic">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <AnalyzerTable
              data={filtered}
              role={role}
              onDetails={setDetailsItem}
              onRestart={setRestartItem}
              onScale={setScaleItem}
              onDelete={setDeleteItem}
            />
          </motion.div>

          {/* Drawer & Modals */}
          {detailsItem && (
            <DetailsDrawer
              item={detailsItem}
              onClose={() => setDetailsItem(null)}
            />
          )}

          {restartItem && (
            <RestartModal
              item={restartItem}
              onClose={() => setRestartItem(null)}
              onConfirm={() => onConfirmRestart(restartItem)}
            />
          )}

          {scaleItem && (
            <ScaleModal
              item={scaleItem}
              onClose={() => setScaleItem(null)}
              onConfirm={(replicas) => onConfirmScale(scaleItem, replicas)}
            />
          )}

          {deleteItem && (
            <ConfirmModal
              title="Delete Resource?"
              message={`Are you sure you want to delete ${deleteItem.type} ${deleteItem.namespace}/${deleteItem.name}? This action cannot be undone.`}
              confirmLabel="Delete"
              confirmClass="bg-red-600 hover:bg-red-700"
              onClose={() => setDeleteItem(null)}
              onConfirm={() => onConfirmDelete(deleteItem)}
            />
          )}
        </>
      )}

      {activeTab === 'helm' && (
        <HelmPanel role={role} />
      )}
    </div>
  );
}
