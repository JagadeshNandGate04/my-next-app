"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Users,
  Database,
  ShieldCheck,
  Filter,
  RefreshCw,
  Download,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  FileCode,
  X,
  Clock,
  User,
  Eye,
  AlertCircle,
  Loader2,
  FileText,
  RotateCcw,
} from "lucide-react";

import { useDispatch, useSelector } from "react-redux";

import Sidebar from "@/app/components/SideBar";

import type {
  RootState,
  AppDispatch,
} from "@/app/store/store";

import {
  fetchAuditLogs,
  fetchAuditLogById,
  setAuditFilters,
  setAuditPage,
  setAuditLimit,
  resetAuditFilters,
  clearSelectedAuditLog,
  clearAuditError,
} from "@/app/store/audit/auditSlice";

// ==================================================
// TYPES
// ==================================================

type AuditValue = unknown;

interface AuditLogItem {
  id: number | string;
  actor_id: number | string | null;
  actor_name: string | null;
  actor_emp_code: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | string | null;
  before: AuditValue;
  after: AuditValue;
  reason: string | null;
  created_at: string;
  updated_at?: string;
}

// ==================================================
// HELPERS
// ==================================================

const formatDate = (dateValue: string) => {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const formatTime = (dateValue: string) => {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const getInitials = (name?: string | null) => {
  if (!name) return "SY";

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

const getActionLabel = (action: string) => {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getActionBadgeStyle = (action: string) => {
  const normalized = action.toUpperCase();

  if (
    normalized.includes("CREATED") ||
    normalized.includes("CREATE")
  ) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (
    normalized.includes("UPDATED") ||
    normalized.includes("UPDATE") ||
    normalized.includes("CHANGED")
  ) {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  if (
    normalized.includes("APPROVED") ||
    normalized.includes("FINALIZED")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    normalized.includes("REJECTED") ||
    normalized.includes("DELETED") ||
    normalized.includes("CANCELLED")
  ) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
};

const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "—";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "No items";
    }

    return value.every(
      (item) =>
        item === null ||
        ["string", "number", "boolean"].includes(typeof item)
    )
      ? value.map(stringifyValue).join(", ")
      : `${value.length} items`;
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key.replace(/_/g, " ")}: ${stringifyValue(item)}`)
      .join(" · ");
  }

  return String(value);
};

const isObject = (
  value: unknown
): value is Record<string, unknown> => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

const csvEscape = (value: unknown) => {
  const text = stringifyValue(value);
  return `"${text.replace(/"/g, '""')}"`;
};

// ==================================================
// COMPONENT: CHANGE COMPARISON
// ==================================================

function ChangeComparison({
  before,
  after,
}: {
  before: AuditValue;
  after: AuditValue;
}) {
  const beforeExists = before !== null && before !== undefined;
  const afterExists = after !== null && after !== undefined;

  const changes = useMemo(() => {
    const oldObject = isObject(before)
      ? before
      : beforeExists
        ? { value: before }
        : {};
    const newObject = isObject(after)
      ? after
      : afterExists
        ? { value: after }
        : {};

    const keys = Array.from(
      new Set([
        ...Object.keys(oldObject),
        ...Object.keys(newObject),
      ])
    );

    return keys.map((key) => {
      const oldValue = oldObject[key];
      const newValue = newObject[key];

      return {
        key,
        oldValue,
        newValue,
        changed:
          JSON.stringify(oldValue) !==
          JSON.stringify(newValue),
        added: !(key in oldObject),
        removed: !(key in newObject),
      };
    });
  }, [before, after, beforeExists, afterExists]);

  if (!beforeExists && !afterExists) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        No before or after data is available for this event.
      </div>
    );
  }

  const changedCount = changes.filter(
    (item) => item.changed
  ).length;

  return (
    <div className="space-y-3">
      {!beforeExists && afterExists && (
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
          <Check className="w-4 h-4" />
          New record created
        </div>
      )}

      {beforeExists && !afterExists && (
        <div className="font-bold text-sm text-rose-800">
          Record removed or no after-state recorded
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {beforeExists && afterExists ? "Field comparison" : "Record details"}
        </span>

        <span className="text-xs font-bold text-[#1b64da]">
          {changedCount} changed field
          {changedCount !== 1 ? "s" : ""}
        </span>
      </div>

      {changes.length === 0 ? (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
          No fields available for comparison.
        </div>
      ) : (
        changes.map((item) => (
          <div
            key={item.key}
            className={`rounded-xl border p-3 ${
              item.changed
                ? "border-[#d6e5fb] bg-[#f8fbff]"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-slate-700 break-all capitalize">
                {item.key.replace(/_/g, " ")}
              </span>

              {item.changed ? (
                <span className="text-[10px] font-bold uppercase text-[#1b64da] bg-[#eef4fa] px-2 py-1 rounded-full shrink-0">
                  Changed
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 uppercase shrink-0">
                  Unchanged
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-2 min-w-0">
                <p className="text-[10px] uppercase font-bold text-rose-600 mb-1">
                  Before
                </p>

                <p className="text-xs text-slate-700 break-words">
                  {item.removed
                    ? "—"
                    : stringifyValue(item.oldValue)}
                </p>
              </div>

              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2 min-w-0">
                <p className="text-[10px] uppercase font-bold text-emerald-700 mb-1">
                  After
                </p>

                <p className="text-xs text-slate-700 break-words">
                  {item.added
                    ? "—"
                    : stringifyValue(item.newValue)}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ==================================================
// MAIN PAGE
// ==================================================

export default function AuditLogsPage() {
  const dispatch = useDispatch<AppDispatch>();

  // ==================================================
  // HYDRATION FIX
  // ==================================================

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redux audit state
  const {
    logs,
    selectedLog,
    pagination,
    filters,
    listLoading,
    detailLoading,
    error,
    detailError,
  } = useSelector((state: RootState) => state.audit);

  // Authentication state
  const token = useSelector(
    (state: RootState) => state.auth.token
  );

  // Local UI state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Immediately show the clicked row while detail API loads.
  const [clickedLog, setClickedLog] =
    useState<AuditLogItem | null>(null);

  // Local filter input values.
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actorIdFilter, setActorIdFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ==================================================
  // FETCH AUDIT LOGS
  // ==================================================

  useEffect(() => {
    if (!token) {
      return;
    }

    dispatch(fetchAuditLogs(filters));
  }, [dispatch, filters, token]);

  // ==================================================
  // REFRESH
  // ==================================================

  const handleRefresh = () => {
    dispatch(clearAuditError());
    dispatch(fetchAuditLogs(filters));
  };

  // ==================================================
  // FILTER HANDLERS
  // ==================================================

  const handleApplyFilters = () => {
    if (
      actorIdFilter.trim() &&
      !/^\d+$/.test(actorIdFilter.trim())
    ) {
      return;
    }

    if (
      fromDate &&
      toDate &&
      fromDate > toDate
    ) {
      return;
    }

    dispatch(
      setAuditFilters({
        action: actionFilter.trim(),
        entity_type: entityFilter.trim(),
        actor_id: actorIdFilter.trim(),
        from_date: fromDate,
        to_date: toDate,
      })
    );
  };

  const handleClearFilters = () => {
    setActionFilter("");
    setEntityFilter("");
    setActorIdFilter("");
    setFromDate("");
    setToDate("");

    dispatch(resetAuditFilters());
  };

  const handleLimitChange = (
    value: number
  ) => {
    dispatch(setAuditLimit(value));
  };

  // ==================================================
  // PAGINATION
  // ==================================================

  const handlePreviousPage = () => {
    if (filters.page > 1) {
      dispatch(setAuditPage(filters.page - 1));
    }
  };

  const handleNextPage = () => {
    if (filters.page < pagination.totalPages) {
      dispatch(setAuditPage(filters.page + 1));
    }
  };

  // ==================================================
  // SELECT AUDIT LOG
  // ==================================================

  const handleSelectLog = (
    log: AuditLogItem
  ) => {
    setClickedLog(log);
    setDrawerOpen(true);

    // Clear the previous selected record.
    dispatch(clearSelectedAuditLog());

    // Fetch complete record from backend.
    dispatch(fetchAuditLogById(log.id));
  };

  // Use the clicked row until the detail request succeeds.
  const activeLog = selectedLog || clickedLog;

  // ==================================================
  // CLOSE DRAWER
  // ==================================================

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setClickedLog(null);

    dispatch(clearSelectedAuditLog());
  }, [dispatch]);

  // Close drawer using Escape key.
  useEffect(() => {
    if (!drawerOpen) return;

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [drawerOpen, closeDrawer]);

  // ==================================================
  // EXPORT CURRENT PAGE AS CSV
  // ==================================================

  const handleExport = () => {
    if (logs.length === 0) return;

    const headers = [
      "ID",
      "Actor ID",
      "Actor Name",
      "Employee Code",
      "Action",
      "Entity Type",
      "Entity ID",
      "Reason",
      "Created At",
      "Before",
      "After",
    ];

    const rows = logs.map((log) => [
      log.id,
      log.actor_id,
      log.actor_name || "",
      log.actor_emp_code || "",
      log.action,
      log.entity_type || "",
      log.entity_id ?? "",
      log.reason || "",
      log.created_at,
      JSON.stringify(log.before),
      JSON.stringify(log.after),
    ]);

    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) =>
        row.map(csvEscape).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `audit-logs-page-${filters.page}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // ==================================================
  // KPI VALUES FROM CURRENT PAGE
  // ==================================================

  const uniqueActors = useMemo(() => {
    return new Set(
      logs
        .filter((log) => log.actor_id !== null)
        .map((log) => String(log.actor_id))
    ).size;
  }, [logs]);

  const uniqueEntities = useMemo(() => {
    return new Set(
      logs
        .map((log) => log.entity_type)
        .filter(Boolean)
    ).size;
  }, [logs]);

  const hasFilters = Boolean(
    actionFilter ||
      entityFilter ||
      actorIdFilter ||
      fromDate ||
      toDate
  );

  const invalidActorId =
    Boolean(actorIdFilter.trim()) &&
    !/^\d+$/.test(actorIdFilter.trim());

  const invalidDateRange =
    Boolean(fromDate && toDate && fromDate > toDate);

  // ==================================================
  // HYDRATION-SAFE INITIAL RENDER
  // ==================================================

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#f5faff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1b64da]" />
          <p className="text-sm font-medium text-slate-500">
            Loading audit logs...
          </p>
        </div>
      </div>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen bg-[#f5faff] text-[#1e293b] font-sans antialiased flex flex-col lg:flex-row">

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">

          {/* PAGE HEADER */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#eef4fa] border border-[#d6e5fb] flex items-center justify-center text-[#1b64da]">
                  <ShieldCheck className="w-6 h-6" />
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight">
                    System Audit Logs
                  </h1>

                  <p className="text-sm text-slate-500 mt-1">
                    Monitor administrative actions and system activity.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={listLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#d5dbe1] text-xs font-bold text-[#475569] hover:bg-[#f1f6fc] shadow-sm disabled:opacity-60"
              >
                <RefreshCw
                  className={`w-4 h-4 text-[#1b64da] ${
                    listLoading ? "animate-spin" : ""
                  }`}
                />

                {listLoading ? "Loading..." : "Refresh Logs"}
              </button>

              <button
                type="button"
                onClick={handleExport}
                disabled={logs.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1b64da] hover:bg-[#1552b5] text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export Current Page
              </button>
            </div>
          </div>

          {/* AUTHENTICATION MESSAGE */}
          {!token && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />

              <div>
                <p className="text-sm font-bold text-amber-800">
                  Authentication required
                </p>

                <p className="text-xs text-amber-700 mt-1">
                  Please sign in again to access audit logs.
                </p>
              </div>
            </div>
          )}

          {/* API ERROR */}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />

              <div className="flex-1">
                <p className="text-sm font-bold text-rose-800">
                  Unable to load audit logs
                </p>

                <p className="text-xs text-rose-700 mt-1">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                className="text-xs font-bold text-rose-700 underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

            <div className="bg-white border border-[#d5dbe1] rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Audit Events
                </p>

                <p className="text-3xl font-black text-[#0f172a] mt-2">
                  {pagination.total.toLocaleString("en-IN")}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Matching current filters
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-[#eef4fa] text-[#1b64da] flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-[#d5dbe1] rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Actors on This Page
                </p>

                <p className="text-3xl font-black text-[#0f172a] mt-2">
                  {uniqueActors}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Unique actor IDs
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-[#eef4fa] text-[#1b64da] flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-[#d5dbe1] rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Entities on This Page
                </p>

                <p className="text-3xl font-black text-[#0f172a] mt-2">
                  {uniqueEntities}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Unique entity types
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-[#eef4fa] text-[#1b64da] flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-[#d5dbe1] rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Security Filtering
                </p>

                <p className="text-xl font-black text-emerald-700 mt-2">
                  API Enabled
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Sensitive JSON fields filtered
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* FILTER TOOLBAR */}
          <section className="bg-white border border-[#d5dbe1] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#1b64da]" />

                <h2 className="text-sm font-black text-[#0f172a]">
                  Filter Audit Stream
                </h2>
              </div>

              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-bold text-slate-500 hover:text-[#1b64da] flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">

              {/* ACTION */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">
                  Action Type
                </label>

                <input
                  type="text"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  placeholder="e.g. EMPLOYEE_UPDATED"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f8fafc] border border-[#d5dbe1] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                />
              </div>

              {/* ENTITY */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">
                  Entity Type
                </label>

                <input
                  type="text"
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  placeholder="e.g. users"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f8fafc] border border-[#d5dbe1] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                />
              </div>

              {/* ACTOR ID */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">
                  Actor ID
                </label>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />

                  <input
                    type="text"
                    value={actorIdFilter}
                    onChange={(e) => setActorIdFilter(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#f8fafc] border border-[#d5dbe1] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                  />
                </div>

                {invalidActorId && (
                  <p className="text-[10px] text-rose-600 mt-1">
                    Actor ID must contain numbers only.
                  </p>
                )}
              </div>

              {/* FROM DATE */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">
                  From Date
                </label>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f8fafc] border border-[#d5dbe1] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                />
              </div>

              {/* TO DATE */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">
                  To Date
                </label>

                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f8fafc] border border-[#d5dbe1] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                />

                {invalidDateRange && (
                  <p className="text-[10px] text-rose-600 mt-1">
                    To Date cannot be earlier than From Date.
                  </p>
                )}
              </div>

              {/* LIMIT */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">
                  Records Per Page
                </label>

                <select
                  value={filters.limit}
                  onChange={(e) =>
                    handleLimitChange(Number(e.target.value))
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f8fafc] border border-[#d5dbe1] text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                >
                  <option value={10}>10 records</option>
                  <option value={25}>25 records</option>
                  <option value={50}>50 records</option>
                  <option value={100}>100 records</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={invalidActorId || invalidDateRange}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1b64da] hover:bg-[#1552b5] text-white text-xs font-bold shadow-sm disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                Apply Filters
              </button>
            </div>
          </section>

          {/* AUDIT TABLE */}
          <section className="bg-white border border-[#cbdcf5] rounded-2xl shadow-sm overflow-hidden">

            <div className="p-5 border-b border-[#d6e5fb] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#eaf2ff] flex items-center justify-center text-[#1b64da]">
                  <FileText className="w-4 h-4" />
                </div>

                <div>
                  <h3 className="font-black text-lg text-[#0f172a]">
                    Audit Event Ledger
                  </h3>

                  <p className="text-xs text-slate-500">
                    Chronological administrative activity
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Sorted by timestamp · Newest first
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">

                <thead>
                  <tr className="bg-[#eaf2ff] border-b border-[#cbdcf5] text-[11px] font-bold text-[#334b70] uppercase tracking-wider">
                    <th className="py-4 px-5">Event / Action</th>
                    <th className="py-4 px-4">Entity</th>
                    <th className="py-4 px-4">Actor</th>
                    <th className="py-4 px-4">Reason</th>
                    <th className="py-4 px-5">Timestamp</th>
                    <th className="py-4 px-4 text-center">View</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e5edf8] text-xs">

                  {listLoading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center bg-white">
                        <Loader2 className="w-7 h-7 animate-spin text-[#1b64da] mx-auto" />

                        <p className="text-sm text-slate-500 mt-3">
                          Loading audit logs...
                        </p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center bg-white">
                        <Database className="w-8 h-8 text-slate-300 mx-auto" />

                        <p className="font-bold text-slate-700 mt-3">
                          No audit records found
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          Try changing or clearing your filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, index) => {
                      const isSelected =
                        activeLog &&
                        String(activeLog.id) === String(log.id);

                      return (
                        <tr
                          key={log.id}
                          onClick={() => handleSelectLog(log)}
                          className={`cursor-pointer transition-colors duration-150 border-l-[3px] ${
                            isSelected
                              ? "bg-[#e1edff] border-l-[#1b64da] hover:bg-[#d9e8ff]"
                              : index % 2 === 0
                              ? "bg-white border-l-transparent hover:bg-[#edf4ff]"
                              : "bg-[#f7faff] border-l-transparent hover:bg-[#edf4ff]"
                          }`}
                        >
                          {/* ACTION */}
                          <td className="py-4 px-5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-mono text-[10px] font-bold border whitespace-nowrap ${getActionBadgeStyle(
                                log.action
                              )}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {log.action}
                            </span>
                          </td>

                          {/* ENTITY */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <p className="font-bold text-[#263b59]">
                              {log.entity_type || "—"}
                            </p>
                          </td>

                          {/* ACTOR */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-[#1b64da] text-white font-bold flex items-center justify-center text-[10px] shrink-0 shadow-sm">
                                {getInitials(log.actor_name)}
                              </div>

                              <div className="min-w-0">
                                <p className="font-bold text-[#263b59] whitespace-nowrap">
                                  {log.actor_name || "Unknown Actor"}
                                </p>

                                <p className="text-[10px] text-[#71839e] font-mono">
                                  {log.actor_emp_code ||
                                    (log.actor_id
                                      ? `ID: ${log.actor_id}`
                                      : "System")}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* REASON */}
                          <td className="py-4 px-4 max-w-[220px]">
                            <p
                              className="text-[#52657f] line-clamp-2"
                              title={log.reason || ""}
                            >
                              {log.reason || "No reason provided"}
                            </p>
                          </td>

                          {/* TIMESTAMP */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <p className="font-bold text-[#334b70]">
                              {formatDate(log.created_at)}
                            </p>

                            <p className="text-[10px] text-[#71839e] mt-1">
                              {formatTime(log.created_at)} IST
                            </p>
                          </td>

                          {/* VIEW */}
                          <td className="py-4 px-4 text-center">
                            <button
                              type="button"
                              title="View audit details"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSelectLog(log);
                              }}
                              className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-[#e5efff] border border-[#cbdcf5] text-[#1b64da] hover:bg-[#1b64da] hover:text-white hover:border-[#1b64da] transition-all duration-150"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="p-4 bg-[#f1f6fd] border-t border-[#d6e5fb] flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-[#52657f]">
                Showing{" "}
                <strong className="text-[#263b59]">
                  {pagination.total === 0
                    ? 0
                    : (filters.page - 1) * filters.limit + 1}
                </strong>
                {" - "}
                <strong className="text-[#263b59]">
                  {Math.min(
                    filters.page * filters.limit,
                    pagination.total
                  )}
                </strong>
                {" of "}
                <strong className="text-[#263b59]">
                  {pagination.total}
                </strong>{" "}
                records
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={filters.page <= 1 || listLoading}
                  onClick={handlePreviousPage}
                  className="w-9 h-9 rounded-lg border border-[#cbdcf5] bg-white flex items-center justify-center text-[#475569] hover:bg-[#e5efff] hover:text-[#1b64da] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-[#334b70] px-2">
                  Page {filters.page} of{" "}
                  {Math.max(pagination.totalPages, 1)}
                </span>

                <button
                  type="button"
                  disabled={
                    filters.page >= pagination.totalPages ||
                    listLoading ||
                    pagination.totalPages === 0
                  }
                  onClick={handleNextPage}
                  className="w-9 h-9 rounded-lg border border-[#cbdcf5] bg-white flex items-center justify-center text-[#475569] hover:bg-[#e5efff] hover:text-[#1b64da] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {/* <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Audit data is retrieved from the authenticated backend API.
          </div> */}
        </div>
      </main>

      {/* ==================================================
          SLIDE-OVER DRAWER
      ================================================== */}

      {drawerOpen && (
        <div className="fixed inset-0 z-[100]">

          {/* BACKDROP */}
          <button
            type="button"
            aria-label="Close audit details"
            onClick={closeDrawer}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity"
          />

          {/* DRAWER */}
          <aside
            className="absolute right-0 top-0 h-full w-full sm:max-w-[650px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            role="dialog"
            aria-modal="true"
            aria-label="Audit event details"
          >

            {/* DRAWER HEADER */}
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#eef4fa] border border-[#d6e5fb] text-[#1b64da] flex items-center justify-center shrink-0">
                  <FileCode className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="font-black text-lg text-[#0f172a]">
                    Event Diff Inspector
                  </h2>

                  <p className="text-xs text-slate-500 truncate">
                    Audit Record #{activeLog?.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DRAWER CONTENT */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

              {detailLoading && (
                <div className="flex items-center justify-center gap-3 py-4 text-sm text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin text-[#1b64da]" />
                  Loading complete audit record...
                </div>
              )}

              {detailError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {detailError}
                </div>
              )}

              {activeLog && (
                <>
                  {/* ACTION */}
                  <div className="space-y-3">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border ${getActionBadgeStyle(
                        activeLog.action
                      )}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {getActionLabel(activeLog.action)}
                    </span>

                    <h3 className="text-xl font-black text-[#0f172a] break-words">
                      {activeLog.entity_type || "Entity"}
                    </h3>

                    <p className="text-xs text-slate-500">
                      Record ID: {activeLog.id}
                    </p>
                  </div>

                  {/* EVENT INFORMATION */}
                  <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Event Information
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <User className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">
                            Performed By
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-800">
                          {activeLog.actor_name || "Unknown Actor"}
                        </p>

                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {activeLog.actor_emp_code ||
                            (activeLog.actor_id
                              ? `Actor ID: ${activeLog.actor_id}`
                              : "System")}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">
                            Date & Time
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-800">
                          {formatDate(activeLog.created_at)}
                        </p>

                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatTime(activeLog.created_at)} IST
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Actor ID
                        </p>

                        <p className="text-sm font-bold text-slate-800">
                          {activeLog.actor_id ?? "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                          Entity Type
                        </p>

                        <p className="text-sm font-bold text-slate-800">
                          {activeLog.entity_type || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* REASON */}
                  <div className="rounded-2xl border border-[#d6e5fb] bg-[#f0f7ff] p-4">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[#1b64da] mb-2">
                      Reason / Context
                    </p>

                    <p className="text-sm text-slate-700 leading-relaxed">
                      {activeLog.reason ||
                        "No reason provided for this action."}
                    </p>
                  </div>

                  {/* BEFORE / AFTER */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-800">
                        State Modification
                      </h4>

                      <span className="text-[10px] font-mono text-slate-400">
                        {activeLog.entity_type || "Entity"}
                      </span>
                    </div>

                    <ChangeComparison
                      before={activeLog.before}
                      after={activeLog.after}
                    />
                  </div>

                </>
              )}
            </div>

            {/* DRAWER FOOTER */}
            {activeLog && (
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex justify-end">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="px-5 py-3 rounded-xl bg-[#1b64da] hover:bg-[#1552b5] text-white text-xs font-bold"
                  >
                    Close
                  </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}