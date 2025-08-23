// src/utils/metricsHelpers.js
export const API = import.meta.env.VITE_API_URL || 'http://grepmind.sritechhub.com/api';

export function authHeaders(token, role) {
  return {
    Authorization: `Bearer ${token}`,
    'x-user-role': role || 'viewer',
  };
}

export function toRechartsSeries(promData) {
  // Accepts Prometheus /api/v1/query_range or /query vector->matrix normalized to:
  // [{ metric: {__name__:.., ...}, values: [[ts, value], ...] }]
  if (!Array.isArray(promData)) return [];
  // Build a single merged array by ts with multiple series as keys
  const allTs = new Set();
  promData.forEach(s => (s.values || []).forEach(v => allTs.add(Number(v[0]) * 1000)));
  const sortedTs = [...allTs].sort((a, b) => a - b);

  const labelFor = (m = {}) => {
    const name = m.__name__ || 'series';
    // build a compact label from a few key labels
    const keys = ['job', 'instance', 'pod', 'container', 'namespace'].filter(k => m[k]);
    return keys.length ? `${name}{${keys.map(k => `${k}="${m[k]}"`).join(',')}}` : name;
  };

  const out = sortedTs.map(ts => {
    const obj = { ts, time: new Date(ts).toLocaleTimeString() };
    promData.forEach(s => {
      const label = labelFor(s.metric || {});
      const match = (s.values || []).find(v => Number(v[0]) * 1000 === ts);
      obj[label] = match ? Number(match[1]) : null;
    });
    return obj;
  });

  const series = promData.map(s => labelFor(s.metric || {}));
  return { data: out, series };
}

export const TIME_PRESETS = [
  { key: '15m', label: 'Last 15 min', step: 15 },
  { key: '1h', label: 'Last 1 hour', step: 30 },
  { key: '6h', label: 'Last 6 hours', step: 60 },
  { key: '24h', label: 'Last 24 hours', step: 120 },
];

export function rangeForPreset(presetKey) {
  const now = Math.floor(Date.now() / 1000);
  const map = {
    '15m': 15 * 60,
    '1h': 60 * 60,
    '6h': 6 * 60 * 60,
    '24h': 24 * 60 * 60,
  };
  const dur = map[presetKey] || map['1h'];
  // pick a step roughly every ~30 seconds min
  const step = Math.max(30, Math.floor(dur / 200));
  return { start: now - dur, end: now, step };
}
