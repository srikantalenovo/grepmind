// src/components/AnalyzerTable.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TriangleAlert, Bug, Boxes, Bell } from "lucide-react";

function typeBadge(type = "") {
  const base = "px-2 py-1 text-xs rounded inline-flex items-center gap-1";
  if (type.startsWith("Event")) return `${base} bg-gray-200 text-gray-800`;
  if (type === "Deployment") return `${base} bg-purple-200 text-purple-800`;
  return `${base} bg-blue-200 text-blue-800`; // Pod
}
function typeIcon(type = "") {
  if (type.startsWith("Event")) return <Bell className="w-3.5 h-3.5" />;
  if (type === "Deployment") return <Boxes className="w-3.5 h-3.5" />;
  return <Bug className="w-3.5 h-3.5" />;
}

function severity(issue = "", type = "") {
  const i = issue.toLowerCase();
  if (type.startsWith("Event")) return "warning";
  if (i.includes("crash") || i.includes("backoff") || i.includes("notrunning")) return "critical";
  if (i.includes("unhealthy") || i.includes("imagepull") || i.includes("failed")) return "high";
  if (i.includes("restart")) return "medium";
  return "low";
}

function severityPill(level) {
  const base = "px-2 py-0.5 text-xs rounded-full font-semibold";
  switch (level) {
    case "critical": return `${base} bg-red-100 text-red-700 animate-pulse`;
    case "high": return `${base} bg-orange-100 text-orange-700`;
    case "medium": return `${base} bg-yellow-100 text-yellow-700`;
    case "warning": return `${base} bg-amber-100 text-amber-700`;
    default: return `${base} bg-gray-100 text-gray-700`;
  }
}

export default function AnalyzerTable({ data = [], onDetails, onRestart, onScale, role = "editor" }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-indigo-100">
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
            const t = p.type || "";
            const n = p.name || "N/A";
            const ns = p.namespace || "default";
            const issue = p.issue || "";
            const key = `${t}:${ns}:${n}`;
            const sev = severity(issue, t);

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
                <td className="px-4 py-2">
                  <span className={typeBadge(t)}>{typeIcon(t)}{t || "Unknown"}</span>
                </td>
                <td className="px-4 py-2">{n}</td>
                <td className="px-4 py-2">{ns}</td>
                <td className="px-4 py-2">
                  <div className="text-sm text-gray-800">{issue || "No issue reported"}</div>
                  {p.nodeName && <div className="text-xs text-gray-500">Node: {p.nodeName}</div>}
                </td>
                <td className="px-4 py-2">
                  <span className={severityPill(sev)}>{sev}</span>
                </td>
                <td className="px-4 py-2 space-x-2">
                  <button
                    onClick={() => onDetails(p)}
                    className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Details
                  </button>
                  {(t === "Pod" || t === "Deployment") && (role === "editor" || role === "admin") && (
                    <>
                      <button
                        onClick={() => onRestart(p)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 inline-flex items-center gap-1"
                      >
                        <TriangleAlert className="w-3.5 h-3.5" />
                        Restart
                      </button>
                      {t === "Deployment" && (
                        <button
                          onClick={() => onScale({ ...p, desired: p.details?.desired ?? p.details?.available ?? 1 })}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Scale
                        </button>
                      )}
                    </>
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
