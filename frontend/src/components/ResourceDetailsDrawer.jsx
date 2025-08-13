// src/components/ResourceDetailsDrawer.jsx
import React, { useEffect, useMemo, useState } from 'react';
import yaml from 'js-yaml';

const API_BASE = import.meta.env.VITE_API_BASE || '';

/** Map UI type -> backend plural where needed */
function normalizeType(t) {
  if (!t) return '';
  const k = String(t).toLowerCase();
  if (k === 'ingress') return 'ingresses';
  return k;
}

async function apiJson(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-user-role': 'viewer' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

async function apiText(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-user-role': 'viewer' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.text();
}

export default function ResourceDetailsDrawer({ open, onClose, resource }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | yaml | events | logs
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [yamlStr, setYamlStr] = useState('');
  const [events, setEvents] = useState([]);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');

  const canShowLogs = useMemo(() => {
    const t = String(resource?.type || '').toLowerCase();
    return ['pods', 'sparkapplications'].includes(t); // spark apps: show driver logs if wired later
  }, [resource]);

  // fetch detail data per tab
  useEffect(() => {
    if (!open || !resource?.name || !resource?.namespace) return;

    const t = normalizeType(resource.type);
    const ns = resource.namespace;
    const name = resource.name;

    const load = async () => {
      setError('');
      setLoading(true);
      try {
        if (activeTab === 'overview') {
          const d = await apiJson(`/api/resources/${encodeURIComponent(ns)}/${encodeURIComponent(t)}/${encodeURIComponent(name)}/details`);
          setDetails(d);
        } else if (activeTab === 'yaml') {
          // backend returns YAML text; we also keep a parsed version to pretty re-dump if needed
          const text = await fetch(`${API_BASE}/api/resources/${encodeURIComponent(ns)}/${encodeURIComponent(t)}/${encodeURIComponent(name)}/yaml`, {
            headers: { 'x-user-role': 'viewer' },
          }).then(async (r) => {
            if (!r.ok) {
              const msg = await r.text().catch(() => '');
              throw new Error(`HTTP ${r.status} ${r.statusText}${msg ? ` - ${msg}` : ''}`);
            }
            return r.text();
          });
          setYamlStr(text);
        } else if (activeTab === 'events') {
          const ev = await apiJson(`/api/resources/${encodeURIComponent(ns)}/${encodeURIComponent(name)}/events`);
          // sort by lastTimestamp desc
          ev.sort((a, b) => new Date(b.lastTimestamp || 0) - new Date(a.lastTimestamp || 0));
          setEvents(ev);
        } else if (activeTab === 'logs' && canShowLogs) {
        const podName = name;

        // First fetch pod details to get a valid container name
        const podDetails = await apiJson(
            `/api/resources/${encodeURIComponent(ns)}/pods/${encodeURIComponent(podName)}/details`
        );

        const containerName = podDetails?.spec?.containers?.[0]?.name;

        if (!containerName) {
            console.error(`No container found for pod: ${podName}`);
            setLogs("No containers found in this pod.");
            return;
        }

        // Now fetch logs for that container
        const logText = await apiText(
            `/api/resources/${encodeURIComponent(ns)}/${encodeURIComponent(podName)}/${encodeURIComponent(containerName)}/logs`
        );
        setLogs(logText);
        }
      } catch (e) {
        console.error('Drawer load error:', e);
        setError(e.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, resource, activeTab, canShowLogs]);

  // reset when closed or target changes
  useEffect(() => {
    if (!open) {
      setActiveTab('overview');
      setDetails(null);
      setYamlStr('');
      setEvents([]);
      setLogs('');
      setError('');
    }
  }, [open, resource?.name, resource?.namespace, resource?.type]);

  const title = useMemo(() => {
    if (!resource) return 'Details';
    return `${resource.name} · ${resource.namespace}`;
    // color palette comes from parent shells (indigo headers/borders)
  }, [resource]);

  const downloadYaml = () => {
    const blob = new Blob([yamlStr || ''], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = `${resource?.name || 'resource'}.yaml`;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* drawer panel */}
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[560px] lg:w-[720px] transform transition-transform duration-300
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col bg-white/90 backdrop-blur-md border-l border-gray-200 shadow-2xl">
          {/* header */}
          <div className="px-5 py-4 bg-indigo-700 text-white flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm uppercase tracking-wide text-indigo-200">Details</div>
              <div className="text-lg font-semibold truncate">{title}</div>
              {resource?.type && (
                <div className="text-xs text-indigo-200 mt-0.5 truncate">
                  Type: {resource.type} {resource.status ? '· ' : ''}{resource.status || ''}
                </div>
              )}
            </div>
            <button
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* tabs */}
          <div className="px-5 pt-3">
            <div className="inline-flex bg-indigo-50 rounded-xl p-1 border border-indigo-100">
              {['overview', 'yaml', 'events', ...(canShowLogs ? ['logs'] : [])].map(t => (
                <button
                  key={t}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${
                    activeTab === t ? 'bg-indigo-600 text-white shadow-inner' : 'text-indigo-700 hover:bg-indigo-100'
                  }`}
                  onClick={() => setActiveTab(t)}
                >
                  {t === 'overview' ? 'Overview' : t === 'yaml' ? 'YAML' : t === 'events' ? 'Events' : 'Logs'}
                </button>
              ))}
            </div>
          </div>

          {/* body */}
          <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 mb-4">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin h-6 w-6 rounded-full border-2 border-indigo-200 border-t-indigo-700" />
                <span className="ml-3 text-gray-800">Loading…</span>
              </div>
            )}

            {!loading && !error && activeTab === 'overview' && (
              <Overview details={details} />
            )}

            {!loading && !error && activeTab === 'yaml' && (
              <YamlView yamlStr={yamlStr} onDownload={downloadYaml} />
            )}

            {!loading && !error && activeTab === 'events' && (
              <EventsView events={events} />
            )}

            {!loading && !error && activeTab === 'logs' && canShowLogs && (
              <LogsView logs={logs} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-views (match your rounded/indigo style) ---------- */

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="text-sm font-semibold text-gray-900 mb-2">{title}</div>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-3">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="w-40 shrink-0 text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm text-gray-900 break-words">{value ?? '—'}</div>
    </div>
  );
}

function Overview({ details }) {
  if (!details) {
    return (
      <div className="text-sm text-gray-600">No details available for this resource.</div>
    );
  }

  const meta = details.metadata || {};
  const status = details.status || {};
  const spec = details.spec || {};

  return (
    <div>
      <Section title="Metadata">
        <Row label="Name" value={meta.name} />
        <Row label="Namespace" value={meta.namespace} />
        <Row label="UID" value={meta.uid} />
        <Row label="Labels" value={formatKV(meta.labels)} />
        <Row label="Annotations" value={formatKV(meta.annotations)} />
        <Row label="Created" value={meta.creationTimestamp} />
      </Section>

      <Section title="Status">
        <Row label="Phase" value={status.phase || status.conditions?.find(c => c.type === 'Ready')?.status} />
        <Row label="Message" value={status.message || '—'} />
        {Array.isArray(status.conditions) && status.conditions.length > 0 && (
          <div className="mt-2">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Conditions</div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-indigo-700 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                    <th className="px-3 py-2 text-left">Last Transition</th>
                  </tr>
                </thead>
                <tbody>
                  {status.conditions.map((c, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-indigo-50/50'}>
                      <td className="px-3 py-2 border-b border-gray-200">{c.type}</td>
                      <td className="px-3 py-2 border-b border-gray-200">{c.status}</td>
                      <td className="px-3 py-2 border-b border-gray-200">{c.reason || '—'}</td>
                      <td className="px-3 py-2 border-b border-gray-200">{c.lastTransitionTime || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      {/* Type-specific quick info (best effort, safe if fields missing) */}
      <TypeSpecific spec={spec} details={details} />
    </div>
  );
}

function TypeSpecific({ spec, details }) {
  const kind = (details?.kind || '').toLowerCase();

  if (kind.includes('ingress')) {
    const rules = spec?.rules || [];
    const tls = spec?.tls || [];
    return (
      <Section title="Ingress Rules">
        <Row label="Default Backend" value={formatBackend(spec?.defaultBackend)} />
        <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-indigo-700 text-white">
              <tr>
                <th className="px-3 py-2 text-left">Host</th>
                <th className="px-3 py-2 text-left">Paths → Service</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 && (
                <tr><td className="px-3 py-2" colSpan={2}>—</td></tr>
              )}
              {rules.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-indigo-50/50'}>
                  <td className="px-3 py-2 border-b border-gray-200">{r.host || '—'}</td>
                  <td className="px-3 py-2 border-b border-gray-200">
                    {(r.http?.paths || []).map((p, j) => (
                      <div key={j} className="truncate">
                        {p.path || '/'} → {formatServiceBackend(p.backend)}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">TLS</div>
          {tls.length === 0 ? '—' : tls.map((t, i) => (
            <div key={i} className="text-sm text-gray-900">Secret: <span className="font-medium">{t.secretName}</span> · Hosts: {(t.hosts || []).join(', ')}</div>
          ))}
        </div>
      </Section>
    );
  }

  if (kind.includes('deployment') || kind.includes('statefulset') || kind.includes('daemonset')) {
    const selector = spec?.selector?.matchLabels || spec?.selector;
    const replicas = spec?.replicas;
    return (
      <Section title="Workload">
        <Row label="Replicas" value={replicas != null ? String(replicas) : '—'} />
        <Row label="Selector" value={formatKV(selector)} />
        <Row label="Strategy" value={formatStrategy(spec?.strategy)} />
      </Section>
    );
  }

  // default (show some spec fields generically)
  return (
    <Section title="Spec">
      <pre className="text-sm text-gray-900 whitespace-pre-wrap break-all">
        {yaml.dump(spec || {}, { lineWidth: 120 })}
      </pre>
    </Section>
  );
}

function YamlView({ yamlStr, onDownload }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-gray-900">Manifest (read-only)</div>
        <button
          onClick={onDownload}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 text-sm"
        >
          Download YAML
        </button>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white/70 p-3 max-h-[60vh] overflow-auto">
        <pre className="text-sm text-gray-900 whitespace-pre">{yamlStr || '—'}</pre>
      </div>
    </div>
  );
}

function EventsView({ events }) {
  if (!events || events.length === 0) {
    return <div className="text-sm text-gray-600">No events found.</div>;
  }
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-indigo-700 text-white">
          <tr>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Reason</th>
            <th className="px-3 py-2 text-left">Message</th>
            <th className="px-3 py-2 text-left">First</th>
            <th className="px-3 py-2 text-left">Last</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-indigo-50/50'}>
              <td className="px-3 py-2 border-b border-gray-200">{e.type || '—'}</td>
              <td className="px-3 py-2 border-b border-gray-200">{e.reason || '—'}</td>
              <td className="px-3 py-2 border-b border-gray-200">{e.message || '—'}</td>
              <td className="px-3 py-2 border-b border-gray-200">{e.firstTimestamp || '—'}</td>
              <td className="px-3 py-2 border-b border-gray-200">{e.lastTimestamp || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LogsView({ logs }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white/70 p-3 max-h-[60vh] overflow-auto">
      <pre className="text-sm text-gray-900 whitespace-pre-wrap break-words">{logs || '—'}</pre>
    </div>
  );
}

/* ---------- helpers ---------- */

function formatKV(obj) {
  if (!obj || typeof obj !== 'object') return '—';
  const parts = Object.entries(obj).map(([k, v]) => `${k}=${v}`);
  return parts.length ? parts.join(', ') : '—';
}

function formatBackend(b) {
  if (!b) return '—';
  return formatServiceBackend(b);
}

function formatServiceBackend(backend) {
  if (!backend) return '—';
  // networking.k8s.io/v1 style: backend.service.name/port.name|number
  const svc = backend.service;
  if (svc?.name) {
    const port = svc.port?.name || svc.port?.number || '?';
    return `${svc.name}:${port}`;
  }
  return '—';
}

function formatStrategy(strategy) {
  if (!strategy) return '—';
  const type = strategy.type || '—';
  const rolling = strategy.rollingUpdate
    ? ` (maxUnavailable: ${strategy.rollingUpdate.maxUnavailable ?? '—'}, maxSurge: ${strategy.rollingUpdate.maxSurge ?? '—'})`
    : '';
  return `${type}${rolling}`;
}
