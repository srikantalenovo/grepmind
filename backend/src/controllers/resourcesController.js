// controllers/resourcesController.js
import * as resourcesService from '../services/resourcesService.js';
import logger from '../utils/logger.js';

export const listResources = async (req, res) => {
  const { namespace, type } = req.query;

  try {
    logger.info(`Fetching ${type} in namespace: ${namespace || 'all'}`);
    let data;

    switch (type) {
      case 'pods': data = await resourcesService.getPods(namespace); break;
      case 'deployments': data = await resourcesService.getDeployments(namespace); break;
      case 'services': data = await resourcesService.getServices(namespace); break;
      case 'statefulsets': data = await resourcesService.getStatefulSets(namespace); break;
      case 'daemonsets': data = await resourcesService.getDaemonSets(namespace); break;
      case 'jobs': data = await resourcesService.getJobs(namespace); break;
      case 'cronjobs': data = await resourcesService.getCronJobs(namespace); break;
      case 'configmaps': data = await resourcesService.getConfigMaps(namespace); break;
      case 'pvcs': data = await resourcesService.getPVCs(namespace); break;
      case 'ingress': data = await resourcesService.getIngress(namespace); break;
      case 'helmreleases': data = resourcesService.getHelmReleases(namespace); break;
      case 'sparkapplications': data = await resourcesService.getSparkApps(namespace); break;
      default: return res.status(400).json({ message: 'Invalid resource type' });
    }

    res.json(data.body || data);
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
};
