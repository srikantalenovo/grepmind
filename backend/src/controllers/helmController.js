// src/controllers/helmControllers.js
import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);

/**
 * Execute Helm command safely
 */
async function runHelmCommand(cmd) {
  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) console.error('[Helm STDERR]:', stderr);
    return stdout;
  } catch (err) {
    console.error('[Helm ERROR]:', err);
    throw err;
  }
}

/**
 * GET /api/helm/releases?namespace=all
 */
export const getHelmReleases = async (req, res) => {
  try {
    const { namespace } = req.query;
    const nsFlag = namespace && namespace !== 'all' ? `--namespace ${namespace}` : '--all-namespaces';
    const cmd = `helm list ${nsFlag} -o json`;

    const stdout = await runHelmCommand(cmd);
    let releases = [];
    try {
      releases = JSON.parse(stdout);
    } catch (err) {
      console.error('[ERROR] Parsing Helm list output:', err, stdout);
      return res.status(500).json({ error: 'Failed to parse Helm output', details: err.message });
    }

    return res.json({ releases });
  } catch (err) {
    console.error('[ERROR] getHelmReleases:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

/**
 * GET /api/helm/releases/:namespace/:release
 */
export const getHelmReleaseDetails = async (req, res) => {
  try {
    const { namespace, release } = req.params;
    if (!namespace || !release) {
      return res.status(400).json({ error: 'Namespace and release are required' });
    }

    const cmd = `helm get all ${release} -n ${namespace}`;
    const stdout = await runHelmCommand(cmd);

    return res.json({ details: stdout });
  } catch (err) {
    console.error('[ERROR] getHelmReleaseDetails:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

/**
 * POST /api/helm/releases/install
 */
export const installHelmRelease = async (req, res) => {
  try {
    const { name, namespace, chart, version, values } = req.body;
    if (!name || !chart || !namespace) {
      return res.status(400).json({ error: 'name, namespace, and chart are required' });
    }

    const versionFlag = version ? `--version ${version}` : '';
    const valuesFlag = values ? `-f -` : '';
    const cmd = `helm install ${name} ${chart} -n ${namespace} ${versionFlag} ${valuesFlag}`;

    const stdout = await runHelmCommand(cmd, values ? values : null);
    return res.json({ message: 'Release installed', output: stdout });
  } catch (err) {
    console.error('[ERROR] installHelmRelease:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

/**
 * POST /api/helm/releases/upgrade
 */
export const upgradeHelmRelease = async (req, res) => {
  try {
    const { name, namespace, chart, version, values } = req.body;
    if (!name || !namespace || !chart) {
      return res.status(400).json({ error: 'name, namespace, and chart are required' });
    }

    const versionFlag = version ? `--version ${version}` : '';
    const valuesFlag = values ? `-f -` : '';
    const cmd = `helm upgrade ${name} ${chart} -n ${namespace} ${versionFlag} ${valuesFlag}`;

    const stdout = await runHelmCommand(cmd, values ? values : null);
    return res.json({ message: 'Release upgraded', output: stdout });
  } catch (err) {
    console.error('[ERROR] upgradeHelmRelease:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

/**
 * DELETE /api/helm/releases/:namespace/:release
 */
export const uninstallHelmRelease = async (req, res) => {
  try {
    const { namespace, release } = req.params;
    if (!release || !namespace) {
      return res.status(400).json({ error: 'Release and namespace are required' });
    }

    const cmd = `helm uninstall ${release} -n ${namespace}`;
    const stdout = await runHelmCommand(cmd);

    return res.json({ message: 'Release uninstalled', output: stdout });
  } catch (err) {
    console.error('[ERROR] uninstallHelmRelease:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
};