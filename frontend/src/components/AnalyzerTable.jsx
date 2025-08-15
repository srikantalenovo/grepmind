// src/components/AnalyzerTable.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function safeType(t) {
  return typeof t === 'string' && t.length ? t : 'Unknown';
}

function badgeForType(type) {
  const t = safeType(type);
  const base = 'px-2 py-1 text-xs rounded';
  if (t.startsWith('Event')) return `${base} bg-gray-200 text-gray-800`;
  if (t === 'Deployment') return `${base} bg-purple-200 text-purple-800`;
  if (t === 'Service') return `${base} bg-teal-200 text-teal-800`;
  if (t === 'Pod') return `${base} bg-blue-200 text-blue-800`;
  return `${base} bg-slate-200 text-slate-800`;
}

function severity(issue, type) {
  const i = String(issue || '').toLowerCase();
  const t = safeType(type).toLowerCase();
  if (t.startsWith('event')) return 'warning';
  if (i.includes('crash') || i.includes('backoff') || i.includes('notrunning')) return 'critical';
  if (i.includes('unhealthy') || i.includes('imagepull') || i.includes('err')) return 'high';
  if (i.includes('restart')) return 'medium';
  return 'low';
}

function severityPill(level) {
  const base = 'px-2 py-0.5 text-xs rounded-full font-semibold';
  switch (level) {
    case 'critical': return `${base} bg-red-100 text-red-700`;
    case 'high': return `${base} bg-orange-100 text-orange-700`;
    case 'medium': return `${base} bg-yellow-100 text-yellow-700`;
    case 'warning': return `${base} bg-amber-100 text-amber-700`;
    default: return `${base} bg-gray-100 text-gray-700`;
  }
}

export default function AnalyzerTable({ data, role, onDetails, onRestart, onScale, onDelete }) {
  return (
    <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-indigo-100">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-indigo-600 text-white">
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Namespace</th>
            <th className="px-4 py-2 text-left">Issue</th>
            <th className="px-4 py-2 text-left">Severity</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <AnimatePresence component="tbody">
          {data.map((p) => {
            const type = safeType(p.type);
            const key = `${type}:${p.namespace}:${p.name}`;
            const level = severity(p.issue, type);

            const canEdit = role === 'editor' || role === 'admin';
            const canDelete = role === 'admin';

            return (
              <motion.tr
                key={key}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="border-b hover:bg-indigo-50/30"
              >
                <td className="px-4 py-2">
                  <span className={badgeForType(type)}>{type}</span>
                </td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.namespace}</td>
                <td className="px-4 py-2">
                  <div className="text-sm text-gray-800">{p.issue || '—'}</div>
                  {p.nodeName && (
                    <div className="text-xs text-gray-500">Node: {p.nodeName}</div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className={severityPill(level)}>{level}</span>
                </td>
                <td className="px-4 py-2 space-x-2">
                  <button
                    onClick={() => onDetails(p)}
                    className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Details
                  </button>

                  {canEdit && (type === 'Pod' || type === 'Deployment') && (
                    <button
                      onClick={() => onRestart(p)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Restart
                    </button>
                  )}

                  {canEdit && type === 'Deployment' && (
                    <button
                      onClick={() =>
                        onScale({
                          ...p,
                          desired:
                            p.details?.desired ??
                            p.details?.available ??
                            1,
                        })
                      }
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Scale
                    </button>
                  )}

                  {canDelete && (type === 'Pod' || type === 'Deployment' || type === 'Service') && (
                    <button
                      onClick={() => onDelete(p)}
                      className="px-2 py-1 text-xs bg-rose-600 text-white rounded hover:bg-rose-700"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </motion.tr>
            );
          })}
        </AnimatePresence>
      </table>
    </div>
  );
}
