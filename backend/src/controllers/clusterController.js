// controllers/clusterController.js
import { listNamespaces, listNodes } from '../services/clusterService.js';

export async function getNamespaces(req, res) {
  try {
    const namespaces = await listNamespaces();
    res.json({ namespaces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getNodes(req, res) {
  try {
    const nodes = await listNodes();
    res.json({ nodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
