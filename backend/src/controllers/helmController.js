// src/controllers/helmController.js
import { exec } from 'child_process';
import util from 'util';
import yaml from 'js-yaml';

const execAsync = util.promisify(exec);

// Helper to execute helm commands
async function runHelm(args, namespace) {
  const ns = namespace ? `-n ${namespace}` : '';
  const cmd = `helm ${args} ${ns}`;
  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) console.warn('[HELM WARN]', stderr);
    return stdout;
  } catch (err) {
    console.error('[HELM ERROR]', err);
    throw new Error(err.stderr || err.message);
  }
}

// ---------- GET ALL RELEASES ----------
export const getHelmReleases = async (req, res) => {
  const namespace = req.params.namespace || '';
  const search = (req.query.search || '').toLowerCase();

  try {
    const output = await runHelm('list -o json', namespace);
    let releases = JSON.parse(output);

    if (search) {
      releases = releases.filter(r =>
        r.name.toLowerCase().includes(search) ||
        r.chart.toLowerCase().includes(search)
      );
    }

    // Add pod/healthy status placeholder (frontend can display badges)
    releases = releases.map(r => ({
      name: r.name,
      namespace: r.namespace,
      revision: r.revision,
      updated: r.updated,
      status: r.status,
      chart: r.chart,
      app_version: r.app_version,
    }));

    res.json({ namespace, count: releases.length, releases });
  } catch (err) {
    console.error('[ERROR] getHelmReleases:', err.message);
    res.status(500).json({ error: 'Failed to fetch Helm releases', details: err.message });
  }
};

// ---------- GET RELEASE YAML ----------
export const getHelmReleaseYaml = async (req, res) => {
  const { namespace, releaseName } = req.params;

  try {
    const output = await runHelm(`get manifest ${releaseName}`, namespace);
    res.setHeader('Content-Type', 'text/yaml');
    res.send(output);
  } catch (err) {
    console.error(`[ERROR] getHelmReleaseYaml ${releaseName}:`, err.message);
    res.status(500).json({ error: 'Failed to fetch Helm release YAML', details: err.message });
  }
};

// ---------- GET RELEASE STATUS ----------
export const getHelmReleaseStatus = async (req, res) => {
  const { namespace, releaseName } = req.params;

  try {
    const output = await runHelm(`status ${releaseName} -o json`, namespace);
    const status = JSON.parse(output);
    res.json(status);
  } catch (err) {
    console.error(`[ERROR] getHelmReleaseStatus ${releaseName}:`, err.message);
    res.status(500).json({ error: 'Failed to fetch Helm release status', details: err.message });
  }
};

// ---------- UPGRADE RELEASE ----------
export const upgradeHelmRelease = async (req, res) => {
  const { namespace, releaseName } = req.params;
  const { chart, valuesYaml } = req.body; // chart optional, valuesYaml optional

  if (!chart && !valuesYaml) {
    return res.status(400).json({ error: 'Either chart or valuesYaml is required for upgrade' });
  }

  try {
    let args = `upgrade ${releaseName}`;
    if (chart) args += ` ${chart}`;
    if (valuesYaml) args += ` -f -`;

    const child = exec(`helm ${args} -n ${namespace}`, { maxBuffer: 1024 * 500 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[HELM UPGRADE ERROR]', err);
        return res.status(500).json({ error: 'Failed to upgrade release', details: err.message });
      }
      res.json({ ok: true, message: `Release ${releaseName} upgraded successfully`, stdout });
    });

    if (valuesYaml) child.stdin.end(valuesYaml);

  } catch (err) {
    console.error(`[ERROR] upgradeHelmRelease ${releaseName}:`, err.message);
    res.status(500).json({ error: 'Failed to upgrade Helm release', details: err.message });
  }
};

// ---------- ROLLBACK RELEASE ----------
export const rollbackHelmRelease = async (req, res) => {
  const { namespace, releaseName } = req.params;
  const { revision } = req.body;

  if (!revision) return res.status(400).json({ error: 'revision is required for rollback' });

  try {
    await runHelm(`rollback ${releaseName} ${revision}`, namespace);
    res.json({ ok: true, message: `Release ${releaseName} rolled back to revision ${revision}` });
  } catch (err) {
    console.error(`[ERROR] rollbackHelmRelease ${releaseName}:`, err.message);
    res.status(500).json({ error: 'Failed to rollback release', details: err.message });
  }
};

// ---------- DELETE RELEASE ----------
export const deleteHelmRelease = async (req, res) => {
  const { namespace, releaseName } = req.params;

  try {
    await runHelm(`uninstall ${releaseName}`, namespace);
    res.json({ ok: true, message: `Release ${releaseName} deleted successfully` });
  } catch (err) {
    console.error(`[ERROR] deleteHelmRelease ${releaseName}:`, err.message);
    res.status(500).json({ error: 'Failed to delete release', details: err.message });
  }
};

// ---------- EDIT VALUES.YAML ----------
export const editHelmValues = async (req, res) => {
  const { namespace, releaseName } = req.params;
  const { valuesYaml } = req.body;

  if (!valuesYaml) return res.status(400).json({ error: 'valuesYaml is required' });

  try {
    // Apply values.yaml via upgrade (dry-run false)
    const child = exec(`helm upgrade ${releaseName} -n ${namespace} -f -`, { maxBuffer: 1024 * 500 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[HELM VALUES ERROR]', err);
        return res.status(500).json({ error: 'Failed to apply values.yaml', details: err.message });
      }
      res.json({ ok: true, message: `Values.yaml applied to ${releaseName}`, stdout });
    });

    child.stdin.end(valuesYaml);

  } catch (err) {
    console.error(`[ERROR] editHelmValues ${releaseName}:`, err.message);
    res.status(500).json({ error: 'Failed to edit Helm values', details: err.message });
  }
};
