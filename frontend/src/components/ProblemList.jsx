// src/components/ProblemList.jsx
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, FileText, RotateCcw, Sliders } from 'lucide-react';

// --- Config ---
const API_BASE = import.meta.env.VITE_API_BASE || ''; // e.g. http://localhost:5000

// --- API helpers (inline, same style as Resources.jsx) ---
async function apiFetch(path, opts = {}, role = 'editor') {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      'Content-Type': 'application/json',
      'x-user-role': role, // RBAC role passed from props
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export default function ProblemList({ role }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const data = await apiFetch('/api/analyzer/scan', {}, role);
      setIssues(Array.isArray(data?.issues) ? data.issues : []);
    } catch (e) {
      setErr(e.message || 'Failed to load issues');
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async (item) => {
    try {
      await apiFetch(`/api/actions/restart`, {
        method: 'POST',
        body: JSON.stringify(item),
      }, role);
      alert(`Restarted ${item.type} ${item.name}`);
    } catch (e) {
      alert(`Action failed: ${e.message}`);
    }
  };

  const handleScale = async (item) => {
    try {
      await apiFetch(`/api/actions/scale`, {
        method: 'POST',
        body: JSON.stringify({ ...item, replicas: 2 }), // example
      }, role);
      alert(`Scaled ${item.type} ${item.name}`);
    } catch (e) {
      alert(`Action failed: ${e.message}`);
    }
  };

  useEffect(() => {
    load();
  }, [role]);

  const canAct = role === 'editor' || role === 'admin';

  return (
    <div className="bg-white shadow-md rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-indigo-700 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Problem Scan Results
        </h2>
        <button
          onClick={load}
          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Scanning…' : 'Refresh'}
        </button>
      </div>

      {err && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {!err && issues.length === 0 && !loading && (
        <p className="text-gray-500 text-sm">No issues found 🎉</p>
      )}

      {!err && issues.length > 0 && (
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-indigo-50 text-indigo-800">
              <th className="px-3 py-2 text-left text-sm font-medium">Type</th>
              <th className="px-3 py-2 text-left text-sm font-medium">Name</th>
              <th className="px-3 py-2 text-left text-sm font-medium">Namespace</th>
              <th className="px-3 py-2 text-left text-sm font-medium">Issue</th>
              <th className="px-3 py-2 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((item, idx) => (
              <tr key={`${item.type}-${item.namespace}-${item.name}-${idx}`} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 text-sm">{item.type}</td>
                <td className="px-3 py-2 text-sm">{item.name}</td>
                <td className="px-3 py-2 text-sm">{item.namespace}</td>
                <td className="px-3 py-2 text-sm text-red-600">{item.issue}</td>
                <td className="px-3 py-2 text-sm flex gap-2">
                  <button
                    title="View details"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </button>

                  {canAct && (
                    <>
                      <button
                        onClick={() => handleRestart(item)}
                        title="Restart"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        <RotateCcw className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleScale(item)}
                        title="Scale"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        <Sliders className="w-4 h-4 text-green-600" />
                      </button>
                    </>
                  )}

                  {!canAct && (
                    <span className="text-gray-400 text-xs italic">No actions allowed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

ProblemList.propTypes = {
  role: PropTypes.oneOf(['viewer', 'editor', 'admin']).isRequired,
};
