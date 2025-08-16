// src/components/analyzer/YamlEditorTab.jsx
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
 * YAML Editor (Namespace → Kind → Table → Inline Editor)
 * - New-style list: GET  /api/analyzer/:namespace/:plural
 * - Fallback list:   GET  /api/analyzer/:plural?namespace=xxx
 * - YAML get:        GET  /api/analyzer/resource/:kind/:namespace/:name/yaml
 * - YAML put:        PUT  /api/analyzer/resource/:kind/:namespace/:name/yaml
 */

const API_BASE = import.meta.env.VITE_API_BASE || "";
const DEFAULT_ROLE = "editor";

// ---- API helper (accepts YAML or JSON)
async function apiFetch(path, opts = {}, role = DEFAULT_ROLE) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      "x-user-role": role,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${text || res.statusText}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text; // raw YAML
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
];
const LISTABLE_KINDS = new Set(KIND_OPTIONS.map((k) => k.value));

// ---- utils
function classNames(...a) {
  return a.filter(Boolean).join(" ");
}

// Normalize any backend shape → rows: {name, namespace, status, creation}
function parseItemsToRows(payload, fallbackNamespace) {
  if (!payload) return [];
  let items = [];
  if (Array.isArray(payload)) {
    items = payload;
  } else if (Array.isArray(payload.items)) {
    items = payload.items;
  } else if (Array.isArray(payload.names)) {
    return payload.names
      .map((n) => ({
        name: n,
        namespace: fallbackNamespace || "",
        status: "",
        creation: "",
      }))
      .filter((r) => r.name);
  }

  return items
    .map((it) => {
      if (typeof it === "string") {
        return { name: it, namespace: fallbackNamespace || "", status: "", creation: "" };
      }
      const name = it?.metadata?.name || it?.name;
      const ns = it?.metadata?.namespace || fallbackNamespace || "";
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

export default function YamlEditorTab({ role = DEFAULT_ROLE }) {
  // selections
  const [namespace, setNamespace] = useState("");
  const [kind, setKind] = useState("deployment");

  // catalogs
  const [namespaces, setNamespaces] = useState([]);
  const [resources, setResources] = useState([]); // rows {name, namespace, ...}
  const [searchQuery, setSearchQuery] = useState("");

  // active editor
  const [activeName, setActiveName] = useState("");
  const [activeNamespace, setActiveNamespace] = useState(""); // row-specific (important for "all")
  const [yaml, setYaml] = useState("");
  const [initialYaml, setInitialYaml] = useState("");

  // busy
  const [loadingNs, setLoadingNs] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingYaml, setLoadingYaml] = useState(false);
  const [saving, setSaving] = useState(false);

  // status
  const [toast, setToast] = useState(null); // {type, msg}
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  const mountedRef = useRef(true);
  const kindMeta = useMemo(() => KIND_OPTIONS.find((k) => k.value === kind), [kind]);

  const filteredResources = useMemo(() => {
    if (!searchQuery) return resources;
    const q = searchQuery.toLowerCase();
    return resources.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.namespace || "").toLowerCase().includes(q) ||
        (r.status + "").toLowerCase().includes(q)
    );
  }, [resources, searchQuery]);

  const isDirty = yaml && initialYaml && yaml !== initialYaml;

  // toasts
  const showToast = useCallback((type, msg, ms = 2600) => {
    setToast({ type, msg });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  }, []);

  // guard nav
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // namespaces
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        setLoadingNs(true);
        const resp = await apiFetch("/api/cluster/namespaces", {}, role);
        const list = Array.isArray(resp) ? resp : resp?.namespaces || [];
        // Ensure 'all' exists once at the top (if backend already injects, keep it)
        const set = new Set(list);
        if (!set.has("all")) set.add("all");
        const final = Array.from(set);
        setNamespaces(final);
        if (!namespace && final.length) {
          setNamespace(final.includes("default") ? "default" : final[0]);
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

  // helper: list one namespace
  const listOneNamespace = useCallback(
    async (ns, plural) => {
      try {
        // Try new-style
        const payload = await apiFetch(
          `/api/analyzer/${encodeURIComponent(ns)}/${encodeURIComponent(plural)}`,
          {},
          role
        );
        return parseItemsToRows(payload, ns);
      } catch {
        // Fallback old-style
        const q = new URLSearchParams({ namespace: ns });
        const payload = await apiFetch(`/api/analyzer/${encodeURIComponent(plural)}?${q.toString()}`, {}, role);
        return parseItemsToRows(payload, ns);
      }
    },
    [role]
  );

  // list resources
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!namespace || !kind || !LISTABLE_KINDS.has(kind)) {
        setResources([]);
        setActiveName("");
        setActiveNamespace("");
        setYaml("");
        setInitialYaml("");
        return;
      }
      const plural = kindMeta?.plural;
      try {
        setLoadingList(true);
        setResources([]);
        setActiveName("");
        setActiveNamespace("");
        setYaml("");
        setInitialYaml("");

        let rows = [];
        if (namespace === "all") {
          // Aggregate across real namespaces to avoid 404s on /all
          const nsList = namespaces.filter((n) => n && n !== "all");
          if (!nsList.length) {
            // If we don't have namespaces yet, attempt to fetch them quickly
            try {
              const nsResp = await apiFetch("/api/cluster/namespaces", {}, role);
              const list = Array.isArray(nsResp) ? nsResp : nsResp?.namespaces || [];
              const real = list.filter((n) => n !== "all");
              const results = await Promise.allSettled(real.map((ns) => listOneNamespace(ns, plural)));
              rows = results
                .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
                .filter((x) => x?.name);
            } catch {
              rows = [];
            }
          } else {
            const results = await Promise.allSettled(nsList.map((ns) => listOneNamespace(ns, plural)));
            rows = results
              .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
              .filter((x) => x?.name);
          }
        } else {
          rows = await listOneNamespace(namespace, plural);
        }

        if (cancelled) return;
        // de-dupe by (namespace/name)
        const seen = new Set();
        const dedup = [];
        for (const r of rows) {
          const key = `${r.namespace}/${r.name}`;
          if (!seen.has(key)) {
            seen.add(key);
            dedup.push(r);
          }
        }
        setResources(dedup);
      } catch (e) {
        if (!cancelled) {
          showToast("error", e.message || "Failed to list resources");
          setResources([]);
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [namespace, kind, kindMeta, namespaces, listOneNamespace, role]); // eslint-disable-line

  // fetch YAML (uses the row namespace, not the dropdown when namespace === 'all')
  const fetchYaml = useCallback(
    async (ns, name) => {
      if (!ns || !name) return;
      try {
        setLoadingYaml(true);
        const y = await apiFetch(
          `/api/analyzer/resource/${encodeURIComponent(kind)}/${encodeURIComponent(ns)}/${encodeURIComponent(
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
    [kind, role]
  );

  // select row
  const onSelectRow = async (row) => {
    if (!row?.name) return;
    if (isDirty) {
      const ok = window.confirm("You have unsaved changes. Discard and load another resource?");
      if (!ok) return;
    }
    setActiveName(row.name);
    setActiveNamespace(row.namespace || namespace);
    await fetchYaml(row.namespace || namespace, row.name);
  };

  // save
  const onSave = async () => {
    if (!activeName || !activeNamespace) return;
    if (!yaml?.trim()) {
      showToast("error", "YAML is empty");
      return;
    }
    try {
      setSaving(true);
      await apiFetch(
        `/api/analyzer/resource/${encodeURIComponent(kind)}/${encodeURIComponent(activeNamespace)}/${encodeURIComponent(
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

  // download
  const onDownload = () => {
    const blob = new Blob([yaml || ""], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind}-${activeNamespace || namespace}-${activeName || "resource"}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // discard
  const onCancel = () => {
    setYaml(initialYaml || "");
    showToast("info", "Changes discarded");
  };

  const nsBadge = lastLoadedAt ? `Last loaded: ${new Date(lastLoadedAt).toLocaleTimeString()}` : "Not loaded yet";

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-5">
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
                setActiveNamespace("");
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
            {loadingNs && <Loader2 className="w-4 h-4 animate-spin absolute right-9 top-1/2 -translate-y-1/2 text-indigo-400" />}
          </div>
        </div>

        <div className="md:col-span-4">
          <div className="relative">
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setActiveName("");
                setActiveNamespace("");
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
              placeholder="Filter by name/namespace/status…"
              className="w-full border rounded-2xl px-9 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button
            onClick={() => {
              // retrigger effect
              setKind((k) => k);
            }}
            className="px-3 py-2 rounded-2xl border inline-flex items-center gap-2 hover:bg-gray-50 transition"
            title="Refresh list"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Note for namespace=all */}
      {namespace === "all" && (
        <div className="flex items-start gap-2 text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-2xl px-3 py-2">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <p className="text-sm">
            Viewing <span className="font-semibold">all namespaces</span>. You can open YAML per row (we’ll use the row’s actual
            namespace). Creating or replacing YAML still targets that specific namespace.
          </p>
        </div>
      )}

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
                <th className="px-4 py-2">Namespace</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2 w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filteredResources.length === 0 && !loadingList && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      No resources found. Try a different namespace/kind or refresh.
                    </td>
                  </tr>
                )}
                {filteredResources.map((r) => (
                  <motion.tr
                    key={`${r.namespace}/${r.name}`}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className={classNames(
                      "border-t hover:bg-indigo-50/40 cursor-pointer",
                      activeName === r.name && activeNamespace === r.namespace ? "bg-indigo-50/60" : "bg-white"
                    )}
                    onClick={() => onSelectRow(r)}
                  >
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2">{r.namespace || "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={classNames(
                          "inline-flex items-center px-2 py-0.5 rounded-full border text-xs",
                          (r.status + "").toLowerCase().includes("running") ||
                            (r.status + "").toLowerCase().includes("true") ||
                            (r.status + "").toLowerCase().includes("available")
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
                          onSelectRow(r);
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

      {/* Secret caution (if you later add Secret to KIND_OPTIONS) */}
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
                  {activeNamespace} / {kind} / {activeName}
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
                  setActiveNamespace("");
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
 * - No "@/..." imports, no shadcn/ui. Only Tailwind + Framer Motion + Monaco.
 * - Supports `namespace = all` by aggregating lists across real namespaces.
 * - Uses the row’s namespace for YAML get/put, so editing from the “all” view works.
 * - If your backend returns names as plain strings or full K8s objects, both are parsed.
 */
