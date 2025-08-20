// src/utils/prometheusClient.js
import fetch from 'node-fetch';
import prisma from '../prismaClient.js';

/** Get the current Prometheus URL from DB (DataSource.type='prometheus'). */
export async function getPrometheusUrl() {
  try {
    const ds = await prisma.dataSource.findUnique({ where: { type: 'prometheus' } });
    return ds?.url || null;
  } catch (e) {
    return null;
  }
}

/** Run a Prometheus instant query. Throws if not configured or on error. */
export async function promQuery(query) {
  const PROM_URL = await getPrometheusUrl();
  if (!PROM_URL) throw new Error('Prometheus not configured');
  const url = `${PROM_URL.replace(/\/$/, '')}/api/v1/query?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Prometheus error: ${res.status}`);
  const data = await res.json();
  if (data.status !== 'success') throw new Error('Prometheus query failed');
  return data.data.result;
}
