// // src/utils/prometheusClient.js
// import fetch from 'node-fetch';
// import prisma from '../prismaClient.js';

// /** Get the current Prometheus URL from DB (DataSource.type='prometheus'). */
// export async function getPrometheusUrl() {
//   try {
//     const ds = await prisma.dataSource.findUnique({ where: { type: 'prometheus' } });
//     return ds?.url || null;
//   } catch (e) {
//     return null;
//   }
// }

// /** Run a Prometheus instant query. Throws if not configured or on error. */
// export async function promQuery(query) {
//   const PROM_URL = await getPrometheusUrl();
//   if (!PROM_URL) throw new Error('Prometheus not configured');
//   const url = `${PROM_URL.replace(/\/$/, '')}/api/v1/query?query=${encodeURIComponent(query)}`;
//   const res = await fetch(url);
//   if (!res.ok) throw new Error(`Prometheus error: ${res.status}`);
//   const data = await res.json();
//   if (data.status !== 'success') throw new Error('Prometheus query failed');
//   return data.data.result;
// }


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

/** Detect if the backend is running inside Kubernetes by checking environment variables. */
function isRunningInCluster() {
  return process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT;
}

/** Rewrite external Prometheus URLs to internal cluster DNS if needed */
function getClusterPrometheusUrl(externalUrl) {
  if (isRunningInCluster() && externalUrl.includes('prometheus.sritechhub.com')) {
    return 'http://prometheus-server.monitoring.svc.cluster.local:80';
  }
  return externalUrl;
}

/** Run a Prometheus instant query. Throws if not configured or on error. */
export async function promQuery(query) {
  let PROM_URL = await getPrometheusUrl();
  if (!PROM_URL) throw new Error('Prometheus not configured');

  // Rewrite to internal URL if inside cluster
  PROM_URL = getClusterPrometheusUrl(PROM_URL);

  const url = `${PROM_URL.replace(/\/$/, '')}/api/v1/query?query=${encodeURIComponent(query)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Prometheus error: ${res.status}`);

  const data = await res.json();
  if (data.status !== 'success') throw new Error('Prometheus query failed');

  return data.data.result;
}
