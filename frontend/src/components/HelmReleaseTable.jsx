// src/components/HelmReleaseTable.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HelmReleaseTable({ data, role, onDetails, onUpgrade, onRollback, onUninstall }) {
  const canEdit = role === 'editor' || role === 'admin';
  const canUninstall = role === 'admin';

  return (
    <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-indigo-100">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-indigo-600 text-white">
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Namespace</th>
            <th className="px-4 py-2 text-left">Chart</th>
            <th className="px-4 py-2 text-left">Revision</th>
            <th className="px-4 py-2 text-left">Updated</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <AnimatePresence component="tbody">
          {data.map((r) => {
            const key = `${r.namespace}:${r.name}`;
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
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.namespace}</td>
                <td className="px-4 py-2">{r.chart}</td>
                <td className="px-4 py-2">{r.revision}</td>
                <td className="px-4 py-2">{r.updated}</td>
                <td className="px-4 py-2">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2 space-x-2">
                  <button
                    onClick={() => onDetails(r)}
                    className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Details
                  </button>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => onUpgrade(r)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Upgrade
                      </button>
                      <button
                        onClick={() => onRollback(r)}
                        className="px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700"
                      >
                        Rollback
                      </button>
                    </>
                  )}
                  {canUninstall && (
                    <button
                      onClick={() => onUninstall(r)}
                      className="px-2 py-1 text-xs bg-rose-600 text-white rounded hover:bg-rose-700"
                    >
                      Uninstall
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
