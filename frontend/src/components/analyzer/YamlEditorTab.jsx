// src/components/YamlEditorTab.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  FolderTree,
  SlidersHorizontal,
  Search,
  RefreshCcw,
  Loader2,
  FileDown,
  Save,
  X,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import Editor from "@monaco-editor/react";

/**
 * Production-grade YAML Editor with:
 *  - Namespace → Kind → Resources (table)
 *  - Inline YAML editor under the table
 *  - Tailwind + Framer Motion animations
 *  - Works with backend endpoints:
 *      GET  /api/cluster/namespaces
 *      GET  /api/analyzer/:namespace/:plural
 *      (fallback: GET /api/analyzer/:plural?namespace=xxx if server is older)
 *      GET  /api/analyzer/resource/:kind/:namespace/:name/yaml
 *      PUT  /api/analyzer/resource/:kind/:namespace/:name/yaml
 */

const API_BASE = import.meta.env.VITE_API_BASE || "";
const DEFAULT_ROLE = "editor";

// ---- API helper
async function apiFetch(path, opts = {}, role = DEFAULT_ROLE) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      "x-user-role": role,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} - ${txt || res.statusText}`);
  }
  // May return YAML (text) or JSON – try JSON first
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---- Kinds
const KIND_OPTIONS = [
  { value: "deployment", label: "Deployment", plural: "deployments" },
  { value: "pod", label: "Pod", plural: "pods" },
  { value: "service", label: "Service", plural: "services" },
  { value: "configmap", label: "ConfigMap", plural: "configmaps" },
  { value: "ingress", label: "Ingress", plural: "ingresses" },
  { value: "job", label: "Job", plural: "jobs" },
  { value: "statefulset", label: "StatefulSet", plural: "statefulsets" },
  { value: "daemonset", label: "DaemonSet", plural: "daemonsets" },
  { value: "cronjob", label: "CronJob", plural: "cronjobs" },
  // Secrets intentionally excluded from table-listing for safety
];

const LISTABLE_KINDS = new Set(KIND_OPTIONS.map((k) => k.value));

// ---- small utilities
function parseItemsToRows(payload) {
  // Accept: array of names, array of k8s objects, { items: [...] }, { names: [...] }
  if (!payload) return [];
  let items = [];
  if (Array.isArray(payload)) items = payload;
  else if (Array.isArray(payload.items)) items = payload.items;
  else if (Array.isArray(payload.names)) return payload.names.map((n) => ({ name: n }));

  return items
    .map((it) => {
      if (typeof it === "string") return { name: it };
      const name = it?.metadata?.name || it?.name;
      const ns = it?.metadata?.namespace || "";
      const status =
        it?.status?.phase ||
        it?.status?.conditions?.find((c) => c.type === "Ready")?.status ||
        it?.status?.availableReplicas ||
        it?.status?.readyReplicas ||
        "";
      const creation = it?.metadata?.creationTimestamp || "";
      return { name, namespace: ns, status, creation };
    })
    .filter((r) => r.name);
}

function classNames(...a) {
  return a.filter(Boolean).join(" ");
}

export default function YamlEditorTab({ role = DEFAULT_ROLE }) {
  // selections
  const [namespace, setNamespace] = useState("");
  const [kind, setKind] = useState("deployment");

  // catalog
  const [namespaces, setNamespaces] = useState([]);
  const [resources, setResources] = useState([]); // [{name, status, creation}]
  const [searchQuery, setSearchQuery] = useState("");

  // active resource
  const [activeName, setActiveName] = useState("");
  const [yaml, setYaml] = useState("");
  const [initialYaml, setInitialYaml] = useState(""); // for dirty check

  // busy states
  const [loadingNs, setLoadingNs] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingYaml, setLoadingYaml] = useState(false);
  const [saving, setSaving] = useState(false);

  // status
  const [toast, setToast] = useState(null); // {type, msg}
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  // refs
  const mountedRef = useRef(true);

  const kindMeta = useMemo(() => KIND_OPTIONS.find((k) => k.value === kind), [kind]);

  const filteredResources = useMemo(() => {
    if (!searchQuery) return resources;
    const q = searchQuery.toLowerCase();
    return resources.filter((r) => r.name.toLowerCase().includes(q) || (r.status + "").toLowerCase().includes(q));
  }, [resources, searchQuery]);

  const isDirty = yaml && initialYaml && yaml !== initialYaml;

  // ---- Toast helper (auto-hide)
  const showToast = useCallback((type, msg, ms = 2600) => {
    setToast({ type, msg });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  }, []);

  // ---- Guard navigation if dirty
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ---- Load namespaces on mount
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        setLoadingNs(true);
        const resp = await apiFetch("/api/cluster/namespaces", {}, role);
        const list = Array.isArray(resp) ? resp : resp?.namespaces || [];
        setNamespaces(list);
        // set initial namespace
        if (!namespace && list.length) {
          setNamespace(list.includes("default") ? "default" : list[0]);
        }
      } catch (e) {
        showToast("error", e.message || "Failed to load namespaces");
      } finally {
        setLoadingNs(false);
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [role]); // eslint-disable-line

  // ---- List resources when namespace/kind changes
  useEffect(() => {
    if (!namespace || !kind || !LISTABLE_KINDS.has(kind)) {
      setResources([]);
      setActiveName("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingList(true);
        setResources([]);
        setActiveName("");
        setYaml("");
        setInitialYaml("");
        // Prefer new-style endpoint /api/analyzer/:namespace/:plural
        const plural = kindMeta?.plural;
        let payload;
        try {
          payload = await apiFetch(`/api/analyzer/${encodeURIComponent(namespace)}/${encodeURIComponent(plural)}`, {}, role);
        } catch {
          // Fallback to old-style endpoint /api/analyzer/:plural?namespace=xxx
          const q = new URLSearchParams({ namespace });
          payload = await apiFetch(`/api/analyzer/${encodeURIComponent(plural)}?${q.toString()}`, {}, role);
        }
        if (cancelled) return;
        const rows = parseItemsToRows(payload);
        setResources(rows);
      } catch (e) {
        showToast("error", e.message || "Failed to list resources");
        setResources([]);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [namespace, kind, kindMeta, role]); // eslint-disable-line

  // ---- Fetch YAML for a chosen resource
  const fetchYaml = useCallback(
    async (name) => {
      if (!name) return;
      try {
        setLoadingYaml(true);
        const y = await apiFetch(
          `/api/analyzer/resource/${encodeURIComponent(kind)}/${encodeURIComponent(namespace)}/${encodeURIComponent(
            name
          )}/yaml`,
          {},
          role
        );
        const text = typeof y === "string" ? y : y?.yaml || "";
        setYaml(text);
        setInitialYaml(text);
        setLastLoadedAt(new Date());
        showToast("success", "YAML loaded");
      } catch (e) {
        showToast("error", e.message || "Failed to load YAML");
        setYaml("");
        setInitialYaml("");
      } finally {
        setLoadingYaml(false);
      }
    },
    [kind, namespace, role]
  );

  // ---- Select a row (with dirty check)
  const onSelectRow = async (name) => {
    if (isDirty) {
      const ok = window.confirm("You have unsaved changes. Discard and load another resource?");
      if (!ok) return;
    }
    setActiveName(name);
    await fetchYaml(name);
  };

  // ---- Save (Replace)
  const onSave = async () => {
    if (!activeName) return;
    if (!yaml?.trim()) {
      showToast("error", "YAML is empty");
      return;
    }
    try {
      setSaving(true);
      await apiFetch(
        `/api/analyzer/resource/${encodeURIComponent(kind)}/${encodeURIComponent(namespace)}/${encodeURIComponent(
          activeName
        )}/yaml`,
        { method: "PUT", body: JSON.stringify({ yaml }) },
        role
      );
      setInitialYaml(yaml);
      showToast("success", "YAML replaced successfully");
    } catch (e) {
      showToast("error", e.message || "Failed to replace YAML");
    } finally {
      setSaving(false);
    }
  };

  // ---- Download
  const onDownload = () => {
    const blob = new Blob([yaml || ""], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind}-${namespace}-${activeName || "resource"}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Reset editor
  const onCancel = () => {
    setYaml(initialYaml || "");
    showToast("info", "Changes discarded");
  };

  // ---- UI
  const nsBadge = lastLoadedAt ? `Last loaded: ${new Date(lastLoadedAt).toLocaleTimeString()}` : "Not loaded yet";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-indigo-700">YAML Editor</h2>
        </div>
        <div className="text-xs text-gray-500 italic">{nsBadge}</div>
      </div>

      {/* Controls */}
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="relative">
            <select
              value={namespace}
              onChange={(e) => {
                setNamespace(e.target.value);
                setActiveName("");
                setYaml("");
                setInitialYaml("");
              }}
              className="w-full border rounded-2xl px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {namespaces.map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
            <FolderTree className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            {loadingNs && (
              <Loader2 className="w-4 h-4 animate-spin absolute right-9 top-1/2 -translate-y-1/2 text-indigo-400" />
            )}
          </div>
        </div>

        <div className="md:col-span-4">
          <div className="relative">
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setActiveName("");
                setYaml("");
                setInitialYaml("");
              }}
              className="w-full border rounded-2xl px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="md:col-span-3 flex items-center gap-2">
          <div className="relative w-full">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name/status…"
              className="w-full border rounded-2xl px-9 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button
            onClick={() => {
              // re-trigger listing
              setKind((k) => k);
            }}
            className="px-3 py-2 rounded-2xl border inline-flex items-center gap-2 hover:bg-gray-50 transition"
            title="Refresh list"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-white/80 backdrop-blur">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold text-gray-700">
            {namespace} / {kindMeta?.plural}
          </div>
          {loadingList && (
            <div className="flex items-center gap-2 text-indigo-600 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2 w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filteredResources.length === 0 && !loadingList && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                      No resources found. Try a different namespace/kind or refresh.
                    </td>
                  </tr>
                )}
                {filteredResources.map((r) => (
                  <motion.tr
                    key={r.name}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className={classNames(
                      "border-t hover:bg-indigo-50/40 cursor-pointer",
                      activeName === r.name ? "bg-indigo-50/60" : "bg-white"
                    )}
                    onClick={() => onSelectRow(r.name)}
                  >
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={classNames(
                          "inline-flex items-center px-2 py-0.5 rounded-full border text-xs",
                          (r.status + "").toLowerCase().includes("running") ||
                            (r.status + "").toLowerCase().includes("true")
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        )}
                      >
                        {r.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2">{r.creation ? new Date(r.creation).toLocaleString() : "—"}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRow(r.name);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Edit YAML
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Secret caution (if user switches to secret via future enhancement) */}
      {kind === "secret" && (
        <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2">
          <ShieldAlert className="w-5 h-5 mt-0.5" />
          <p className="text-sm">
            Editing <span className="font-semibold">Secrets</span> may expose sensitive data. Ensure you are authorized.
          </p>
        </div>
      )}

      {/* Inline Editor */}
      <AnimatePresence initial={false}>
        {activeName && (
          <motion.div
            key="yaml-editor"
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="rounded-2xl border bg-white/90 backdrop-blur shadow-sm overflow-hidden"
          >
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">
                  {namespace} / {kind} / {activeName}
                </span>
                {loadingYaml && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                {isDirty && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs">
                    <AlertCircle className="w-3 h-3" />
                    Unsaved changes
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  if (isDirty) {
                    const ok = window.confirm("Discard unsaved changes and close?");
                    if (!ok) return;
                  }
                  setActiveName("");
                  setYaml("");
                  setInitialYaml("");
                }}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"
                title="Close editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3">
              <div className="rounded-xl overflow-hidden border">
                <Editor
                  height="420px"
                  defaultLanguage="yaml"
                  language="yaml"
                  theme="vs"
                  value={yaml}
                  onChange={(v) => setYaml(v ?? "")}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                  }}
                />
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{yaml ? `${(yaml.split("\n") || []).length} lines` : "No content loaded"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onDownload}
                    className="px-3 py-2 rounded-2xl border inline-flex items-center gap-2 hover:bg-gray-50 transition"
                    title="Download YAML"
                  >
                    <FileDown className="w-4 h-4" /> Download
                  </button>
                  <button
                    disabled={!isDirty}
                    onClick={onCancel}
                    className={classNames(
                      "px-3 py-2 rounded-2xl border inline-flex items-center gap-2 transition",
                      isDirty ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"
                    )}
                    title="Discard changes"
                  >
                    <X className="w-4 h-4" /> Discard
                  </button>
                  <button
                    disabled={saving || !yaml?.trim()}
                    onClick={onSave}
                    className={classNames(
                      "bg-green-600 text-white px-4 py-2 rounded-2xl inline-flex items-center gap-2 transition",
                      saving ? "opacity-70" : "hover:bg-green-700"
                    )}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={classNames(
              "fixed bottom-5 right-5 rounded-2xl px-4 py-3 shadow-lg border",
              toast.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : toast.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-indigo-50 border-indigo-200 text-indigo-700"
            )}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Notes:
 * - If your backend only supports the old list format (`/api/analyzer/:plural?namespace=xyz`),
 *   the code auto-falls back to that when `/api/analyzer/:namespace/:plural` fails.
 * - Make sure CORS / reverse proxy forwards the `x-user-role` header.
 * - Install deps:
 *     npm i @monaco-editor/react framer-motion lucide-react
 */
