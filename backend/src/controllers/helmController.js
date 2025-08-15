// src/controllers/helmController.js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function helm(...args) {
  const { stdout } = await execFileAsync('helm', args, { maxBuffer: 1024 * 1024 * 5 });
  return stdout;
}

export async function listReleases(_req, res) {
  try {
    const out = await helm('list', '--all-namespaces', '--output', 'json');
    res.type('json').send(out);
  } catch (err) {
    console.error('helm list error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function releaseStatus(req, res) {
  const { name, namespace } = req.params;
  if (!name || !namespace) return res.status(400).json({ error: 'name and namespace required' });

  try {
    const out = await helm('status', name, '-n', namespace, '--output', 'json');
    res.type('json').send(out);
  } catch (err) {
    console.error('helm status error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function releaseValues(req, res) {
  const { name, namespace } = req.params;
  if (!name || !namespace) return res.status(400).json({ error: 'name and namespace required' });

  try {
    const out = await helm('get', 'values', name, '-n', namespace, '--all', '--output', 'json');
    res.type('json').send(out);
  } catch (err) {
    console.error('helm values error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function installRelease(req, res) {
  const { name, namespace, chart, valuesYaml } = req.body || {};
  if (!name || !namespace || !chart) return res.status(400).json({ error: 'name, namespace, chart required' });

  try {
    const args = ['install', name, chart, '-n', namespace, '--create-namespace'];
    if (valuesYaml) {
      args.push('-f', '-'); // read values from stdin
      const { stdout } = await execFileAsync('helm', args, { input: valuesYaml, maxBuffer: 1024 * 1024 * 5 });
      return res.json({ ok: true, output: stdout });
    } else {
      const out = await helm(...args);
      return res.json({ ok: true, output: out });
    }
  } catch (err) {
    console.error('helm install error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function upgradeRelease(req, res) {
  const { name, namespace, chart, valuesYaml } = req.body || {};
  if (!name || !namespace || !chart) return res.status(400).json({ error: 'name, namespace, chart required' });

  try {
    const args = ['upgrade', name, chart, '-n', namespace];
    if (valuesYaml) {
      args.push('-f', '-');
      const { stdout } = await execFileAsync('helm', args, { input: valuesYaml, maxBuffer: 1024 * 1024 * 5 });
      return res.json({ ok: true, output: stdout });
    } else {
      const out = await helm(...args);
      return res.json({ ok: true, output: out });
    }
  } catch (err) {
    console.error('helm upgrade error:', err);
    res.status(500).json({ error: err.message });
  }
}
export async function rollbackRelease(req, res) {
  const { name, namespace, revision } = req.body || {};
  if (!name || !namespace || !revision) return res.status(400).json({ error: 'name, namespace, revision required' });

  try {
    const out = await helm('rollback', name, String(revision), '-n', namespace);
    res.json({ ok: true, output: out });
  } catch (err) {
    console.error('helm rollback error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function uninstallRelease(req, res) {
  const { name, namespace } = req.body || {};
  if (!name || !namespace) return res.status(400).json({ error: 'name and namespace required' });

  try {
    const out = await helm('uninstall', name, '-n', namespace);
    res.json({ ok: true, output: out });
  } catch (err) {
    console.error('helm uninstall error:', err);
    res.status(500).json({ error: err.message });
  }
}

// Repo management (admin)
export async function listRepos(_req, res) {
  try {
    const out = await helm('repo', 'list', '--output', 'json');
    res.type('json').send(out);
  } catch (err) {
    console.error('helm repo list error:', err);
    res.status(500).json({ error: err.message });
  }
}
export async function addRepo(req, res) {
  const { name, url, username, password } = req.body || {};
  if (!name || !url) return res.status(400).json({ error: 'name and url required' });

  try {
    const args = ['repo', 'add', name, url];
    if (username && password) args.push('--username', username, '--password', password);
    const out = await helm(...args);
    const upd = await helm('repo', 'update');
    res.json({ ok: true, output: out + upd });
  } catch (err) {
    console.error('helm repo add error:', err);
    res.status(500).json({ error: err.message });
  }
}
export async function removeRepo(req, res) {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    const out = await helm('repo', 'remove', name);
    res.json({ ok: true, output: out });
  } catch (err) {
    console.error('helm repo remove error:', err);
    res.status(500).json({ error: err.message });
  }
}