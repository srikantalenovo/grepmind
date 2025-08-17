import { exec } from 'child_process';

function helmExec(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch {
        resolve(stdout);
      }
    });
  });
}

// List releases
export async function getHelmReleases(req, res) {
  const namespace = req.query.namespace || 'default';
  try {
    const items = await helmExec(`helm list -n ${namespace} -o json`);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
}

// Get release details
export async function getHelmReleaseDetails(req, res) {
  const { namespace, name } = req.params;
  try {
    const details = await helmExec(`helm get all ${name} -n ${namespace} -o json`);
    res.json({ details });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
}

// Upgrade release
export async function upgradeHelmRelease(req, res) {
  const { namespace, name } = req.params;
  const { chart } = req.body;
  try {
    await helmExec(`helm upgrade ${name} ${chart} -n ${namespace}`);
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
}

// Rollback release
export async function rollbackHelmRelease(req, res) {
  const { namespace, name } = req.params;
  const { revision } = req.body;
  try {
    await helmExec(`helm rollback ${name} ${revision} -n ${namespace}`);
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
}

// Delete release
export async function deleteHelmRelease(req, res) {
  const { namespace, name } = req.params;
  try {
    await helmExec(`helm uninstall ${name} -n ${namespace}`);
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
}
