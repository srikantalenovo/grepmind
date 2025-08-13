// src/controllers/resourcesController.js
import { getResources } from '../services/resourcesService.js';

export const listResources = async (req, res) => {
  // accept both ?type= and ?resourceType= to be lenient
  const namespace = (req.query.namespace ?? '').trim() || 'all';
  const resourceType = (req.query.resourceType || req.query.type || 'pods').toLowerCase();
  const search = (req.query.search ?? '').trim();

  console.info(`[INFO] Fetching type="${resourceType}" namespace="${namespace}" search="${search}"`);

  try {
    const items = await getResources(namespace, resourceType, search);

    res.status(200).json({
      namespace,
      type: resourceType,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error(`[ERROR] listResources failed:`, err);
    res.status(500).json({
      message: `Failed to fetch ${resourceType} for namespace=${namespace}`,
      error: err.message || String(err),
    });
  }
};
