// src/components/HelmReleaseTable.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

function statusPill(status = "") {
  const s = status.toLowerCase();
  const base = "px-2 py-0.5 text-xs rounded-full font-semibold";
  if (s.includes("deployed")) return `${base} bg-green-100 text-green-700`;
  if (s.includes("failed")) return `${base} bg-red-100 text-red-700 animate-pulse`;
  if (s.includes("pending")) return `${base} bg-amber-100 text-amber-700`;
  return `${base} bg-gray-100 text-gray-700`;
}

export default function HelmReleaseTable({
  data = [],
  role = "editor",
  onDetails,
  onUpgrade,
  onRollback,
  onUninstall,
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-indigo-100">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-indigo-600 text-white">
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Namespace</th>
            <th className="px-4 py-2 text-left">Chart</th>
            <th className="px-4 py-2 text-left">Revision</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Updated</th>
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
                transition={{ duration: 0.18 }}
                className="border-b hover:bg-indigo-50/30"
              >
                <td className="px-4 py-2 font-medium">{r.name}</td>
                <td className="px-4 py-2">{r.namespace}</td>
                <td className="px-4 py-2">{r.chart}</td>
                <td className="px-4 py-2">{r.revision}</td>
                <td className="px-4 py-2"><span className={statusPill(r.status)}>{r.status}</span></td>
                <td className="px-4 py-2">{r.updated || r.updatedAt || "-"}</td>
                <td className="px-4 py-2 space-x-2">
                  <button onClick={() => onDetails(r)} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Details</button>
                  {(role === "editor" || role === "admin") && (
                    <>
                      <button onClick={() => onUpgrade(r)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Upgrade</button>
                      <button onClick={() => onRollback(r)} className="px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700">Rollback</button>
                    </>
                  )}
                  {role === "admin" && (
                    <button onClick={() => onUninstall(r)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Uninstall</button>
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
