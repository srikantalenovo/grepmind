// src/controllers/resourcesController.js
import { getResources } from '../services/resourcesService.js';

/**
 * Controller: List Kubernetes resources.
 * Supports: namespace, resourceType, search query params.
 * Example: GET /api/resources?namespace=default&type=pods&search=my-pod
 */
export const listResources = async (req, res) => {
  const namespace = req.query.namespace || 'default';
  const resourceType = req.query.type || 'pods';
  const search = req.query.search || '';

  console.info(`[INFO] Fetching ${resourceType} in namespace "${namespace}" with search="${search}"`);

  try {
    const resources = await getResources(namespace, resourceType, search);

    console.info(`[SUCCESS] Retrieved ${resources.length} ${resourceType} from "${namespace}"`);

    res.status(200).json({
      namespace,
      type: resourceType,
      count: resources.length,
      items: resources
    });

  } catch (err) {
    console.error(`[ERROR] Unable to fetch ${resourceType} in "${namespace}": ${err.message}`);
    res.status(500).json({
      message: `Failed to fetch ${resourceType} in ${namespace}`,
      error: err.message
    });
  }
};
