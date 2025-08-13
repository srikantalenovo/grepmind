// src/controllers/clusterController.js
import { listNamespaces, listNodes } from '../services/clusterService.js';

export async function getNamespaces(req, res) {
  try {
    const nsObjs = await listNamespaces(); // [{ name, status }]
    const namespaces = nsObjs.map(n => n.name); // string array for UI dropdown
    res.json({ namespaces, namespacesDetailed: nsObjs });
  } catch (err) {
    console.error('[ERROR] getNamespaces:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getNodes(req, res) {
  try {
    const nodes = await listNodes();
    res.json({ nodes });
  } catch (err) {
    console.error('[ERROR] getNodes:', err);
    res.status(500).json({ error: err.message });
  }
}
