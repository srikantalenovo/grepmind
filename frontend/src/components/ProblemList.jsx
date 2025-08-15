import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, FileText, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';

export default function ProblemList({ userRole }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analyzer/scan');
      const data = await res.json();
      setIssues(data.issues || []);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const canEdit = ['editor', 'admin'].includes(userRole);
  const isAdmin = userRole === 'admin';

  return (
    <div className="bg-white shadow-md rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-indigo-700 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Problem Scan Results
        </h2>
        <button
          onClick={fetchIssues}
          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          {loading ? 'Scanning...' : 'Refresh'}
        </button>
      </div>

      {issues.length === 0 ? (
        <p className="text-gray-500 text-sm">No issues found 🎉</p>
      ) : (
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
              <tr
                key={idx}
                className="border-b hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-2 text-sm">{item.type}</td>
                <td className="px-3 py-2 text-sm">{item.name}</td>
                <td className="px-3 py-2 text-sm">{item.namespace}</td>
                <td className="px-3 py-2 text-sm text-red-600">{item.issue}</td>
                <td className="px-3 py-2 text-sm space-x-2">
                  {/* Viewer Actions */}
                  <button
                    title="View Details"
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </button>

                  {/* Editor+ Actions */}
                  {canEdit && (
                    <button
                      title="Restart"
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <RefreshCw className="w-4 h-4 text-green-600" />
                    </button>
                  )}

                  {/* Admin-only Actions */}
                  {isAdmin && (
                    <button
                      title="Delete Resource"
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
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
  userRole: PropTypes.oneOf(['viewer', 'editor', 'admin']).isRequired,
};
