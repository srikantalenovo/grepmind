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
    const nsFlag = namespace && namespace !== 'all' ? `--namespace ${namespace}` : '';
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
 * GET /api/helm/releases/:namespace/:releaseName
 */
export const getHelmReleaseDetails = async (req, res) => {
  try {
    const { namespace, releaseName } = req.params;

    if (!releaseName) return res.status(400).json({ error: 'Release name is required' });

    const nsFlag = namespace && namespace !== 'all' ? `--namespace ${namespace}` : '';
    const cmd = `helm get all ${releaseName} ${nsFlag} -o json`;

    const stdout = await runHelmCommand(cmd);
    let details;
    try {
      details = JSON.parse(stdout);
    } catch (err) {
      console.error('[ERROR] Parsing Helm get output:', err, stdout);
      return res.status(500).json({ error: 'Failed to parse Helm output', details: err.message });
    }

    res.json({ release: details });
  } catch (err) {
    console.error('[ERROR] getHelmReleaseDetails:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

/**
 * POST /api/helm/releases/:namespace/:releaseName/upgrade
 * body: { chart, valuesYaml }
 */
export const upgradeHelmRelease = async (req, res) => {
  try {
    const { namespace, releaseName } = req.params;
    const { chart, valuesYaml } = req.body;

    if (!releaseName || !chart) return res.status(400).json({ error: 'Release name and chart are required' });

    const nsFlag = namespace && namespace !== 'all' ? `--namespace ${namespace}` : '';
    const valuesFlag = valuesYaml ? `-f -` : '';
    const cmd = `helm upgrade ${releaseName} ${chart} ${nsFlag} ${valuesFlag} -o json`;

    let stdout;
    if (valuesYaml) {
      const child = exec(`helm upgrade ${releaseName} ${chart} ${nsFlag} -f - -o json`);
      child.stdin.write(valuesYaml);
      child.stdin.end();

      stdout = await new Promise((resolve, reject) => {
        let output = '';
        child.stdout.on('data', data => (output += data));
        child.stderr.on('data', data => console.error('[Helm STDERR]:', data));
        child.on('close', code => (code === 0 ? resolve(output) : reject(new Error(`Helm exited with ${code}`))));
      });
    } else {
      stdout = await runHelmCommand(cmd);
    }

    let details;
    try {
      details = JSON.parse(stdout);
    } catch (err) {
      console.error('[ERROR] Parsing Helm upgrade output:', err, stdout);
      return res.status(500).json({ error: 'Failed to parse Helm output', details: err.message });
    }

    res.json({ release: details });
  } catch (err) {
    console.error('[ERROR] upgradeHelmRelease:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

/**
 * POST /api/helm/releases/:namespace/:releaseName/rollback
 * body: { revision }
 */
export const rollbackHelmRelease = async (req, res) => {
  try {
    const { namespace, releaseName } = req.params;
    const { revision } = req.body;

    if (!releaseName || revision == null) return res.status(400).json({ error: 'Release name and revision are required' });

    const nsFlag = namespace && namespace !== 'all' ? `--namespace ${namespace}` : '';
    const cmd = `helm rollback ${releaseName} ${revision} ${nsFlag} -o json`;

    const stdout = await runHelmCommand(cmd);

    let details;
    try {
      details = JSON.parse(stdout);
    } catch (err) {
      console.error('[ERROR] Parsing Helm rollback output:', err, stdout);
      return res.status(500).json({ error: 'Failed to parse Helm output', details: err.message });
    }

    res.json({ release: details });
  } catch (err) {
    console.error('[ERROR] rollbackHelmRelease:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
};

/**
 * DELETE /api/helm/releases/:namespace/:releaseName
 */
export const deleteHelmRelease = async (req, res) => {
  try {
    const { namespace, releaseName } = req.params;
    if (!releaseName) return res.status(400).json({ error: 'Release name is required' });

    const nsFlag = namespace && namespace !== 'all' ? `--namespace ${namespace}` : '';
    const cmd = `helm uninstall ${releaseName} ${nsFlag} -o json`;

    const stdout = await runHelmCommand(cmd);

    let details;
    try {
      details = JSON.parse(stdout);
    } catch (err) {
      console.error('[ERROR] Parsing Helm uninstall output:', err, stdout);
      return res.status(500).json({ error: 'Failed to parse Helm output', details: err.message });
    }

    res.json({ release: details });
  } catch (err) {
    console.error('[ERROR] deleteHelmRelease:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
};