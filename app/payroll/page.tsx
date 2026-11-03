"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store/store";
import {
  fetchPayrollRuns,
  fetchPayrollRunDetails,
  createPayrollRun,
  updatePayrollItem,
  recomputePayroll,
  finalizePayroll,
  exportPayroll,
} from "../store/payroll/payrollSlice";

import {
  Calculator,
  Calendar,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Edit3,
  Eye,
  FileSpreadsheet,
  X,
  IndianRupee,
  TrendingDown,
} from "lucide-react";

import Sidebar from "../components/SideBar";

// ============================================================
// TYPES
// ============================================================

interface OtherEarning {
  label: string;
  amount: number;
}

interface OtherDeduction {
  label: string;
  amount: number;
}

interface PayrollItem {
  id: number;
  payroll_run_id: number;
  user_id: number;
  emp_code: string;
  name: string;
  designation: string;
  gross: number;
  calendar_days: number;
  payable_days: number;
  lop_days: number;
  per_day: number;
  lop_amount: number;
  other_earnings: OtherEarning[];
  other_deductions: OtherDeduction[];
  net_pay: number;
  remarks: string | null;
  lop_dates?:
    | string[]
    | {
        work_date: string;
        status: string;
        lop_value: number;
      }[];
}

interface PayrollRun {
  id: number;
  month: number;
  year: number;
  status: "DRAFT" | "FINALIZED";
  finalized_by?: number | null;
  finalized_at?: string | null;
  created_at: string;
}

// ============================================================
// HELPERS
// ============================================================

const formatINR = (value: number, showDecimals = false) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(Number(value) || 0);
};

const getAvatarBg = (name: string) => {
  const colors = [
    "bg-[#1b64da]",
    "bg-[#0284c7]",
    "bg-[#7c3aed]",
    "bg-[#059669]",
    "bg-[#d97706]",
    "bg-[#e11d48]",
    "bg-[#4f46e5]",
  ];

  let sum = 0;

  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }

  return colors[sum % colors.length];
};

const getMonthName = (month: number, style: "long" | "short" = "long") => {
  return new Date(2026, month - 1).toLocaleString("en-IN", {
    month: style,
  });
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PayrollProcessingHub() {
  const dispatch = useDispatch<AppDispatch>();

  const payrollState = useSelector((state: RootState) => state.payroll);

  const runs: PayrollRun[] = payrollState.runs ?? [];
  const items: PayrollItem[] = payrollState.items ?? [];

  const loading = Boolean(payrollState.loading);
  const actionLoading = Boolean(payrollState.actionLoading);

  const error = payrollState.error;
  const message = payrollState.message;

  // ==========================================================
  // LOCAL STATE
  // ==========================================================

  const [activeRunId, setActiveRunId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const [newRunMonth, setNewRunMonth] = useState<number>(1);

  const [newRunYear, setNewRunYear] = useState<number>(2025);

  useEffect(() => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setNewRunMonth(now.getMonth() + 1);
    setNewRunYear(now.getFullYear());
  }, []);

  // Edit payroll item state
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);

  const [tempEarnings, setTempEarnings] = useState<OtherEarning[]>([]);

  const [tempDeductions, setTempDeductions] = useState<OtherDeduction[]>([]);

  const [tempRemarks, setTempRemarks] = useState("");

  // Create payroll modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // ==========================================================
  // ACTIVE PAYROLL RUN
  // ==========================================================

  const activeRun = useMemo(() => {
    return (
      runs.find(
        (run) => Number(run.id) === Number(activeRunId)
      ) ||
      runs[0] ||
      null
    );
  }, [runs, activeRunId]);

  // Finalized payroll runs can be viewed but cannot be edited.
  const isFinalized = activeRun?.status === "FINALIZED";

  const availableYears = useMemo(() => {
    const uniqueYears = new Set<number>();

    if (selectedYear !== null) {
      uniqueYears.add(selectedYear);
    }

    runs.forEach((run) => uniqueYears.add(Number(run.year)));

    return [...uniqueYears].sort((a, b) => b - a);
  }, [runs, selectedYear]);

  // ==========================================================
  // FETCH PAYROLL RUNS
  // ==========================================================

  useEffect(() => {
    if (!selectedYear) {
      return;
    }

    dispatch(fetchPayrollRuns(selectedYear) as any);
  }, [dispatch, selectedYear]);

  // ==========================================================
  // SELECT FIRST AVAILABLE RUN
  // ==========================================================

  useEffect(() => {
    if (runs.length === 0) {
      setActiveRunId(null);
      setEditingItem(null);
      return;
    }

    const currentExists = runs.some(
      (run) => Number(run.id) === Number(activeRunId)
    );

    if (!currentExists) {
      setActiveRunId(Number(runs[0].id));
    }
  }, [runs, activeRunId]);

  // ==========================================================
  // FETCH SELECTED RUN DETAILS
  // ==========================================================

  useEffect(() => {
    if (activeRunId !== null) {
      dispatch(fetchPayrollRunDetails(activeRunId) as any);
      setEditingItem(null);
    }
  }, [dispatch, activeRunId]);

  // ==========================================================
  // KPI CALCULATIONS
  // ==========================================================

  const totalGross = useMemo(() => {
    return items.reduce(
      (total, item) => total + Number(item.gross || 0),
      0
    );
  }, [items]);

  const totalLop = useMemo(() => {
    return items.reduce(
      (total, item) => total + Number(item.lop_amount || 0),
      0
    );
  }, [items]);

  const totalLopDays = useMemo(() => {
    return items.reduce(
      (total, item) => total + Number(item.lop_days || 0),
      0
    );
  }, [items]);

  const totalNet = useMemo(() => {
    return items.reduce(
      (total, item) => total + Number(item.net_pay || 0),
      0
    );
  }, [items]);

  const totalBonus = useMemo(() => {
    return items.reduce((total, item) => {
      const earnings = item.other_earnings || [];

      return (
        total +
        earnings.reduce(
          (sum, earning) => sum + Number(earning.amount || 0),
          0
        )
      );
    }, 0);
  }, [items]);

  const totalDeductionsSum = useMemo(() => {
    return items.reduce((total, item) => {
      const deductions = item.other_deductions || [];

      return (
        total +
        deductions.reduce(
          (sum, deduction) => sum + Number(deduction.amount || 0),
          0
        )
      );
    }, 0);
  }, [items]);

  // ==========================================================
  // SEARCH FILTER
  // ==========================================================

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return items.filter((item) => {
      return (
        String(item.name || "").toLowerCase().includes(query) ||
        String(item.emp_code || "").toLowerCase().includes(query) ||
        String(item.designation || "").toLowerCase().includes(query)
      );
    });
  }, [items, searchQuery]);

  // ==========================================================
  // SELECT EMPLOYEE FOR VIEWING / EDITING
  // ==========================================================

  const handleSelectItemForEdit = (item: PayrollItem) => {
    setEditingItem(item);

    setTempEarnings(
      (item.other_earnings || []).map((entry) => ({
        ...entry,
        amount: Number(entry.amount) || 0,
      }))
    );

    setTempDeductions(
      (item.other_deductions || []).map((entry) => ({
        ...entry,
        amount: Number(entry.amount) || 0,
      }))
    );

    setTempRemarks(item.remarks || "");
  };

  // ==========================================================
  // LIVE NET PAY CALCULATION
  // ==========================================================

  const computedNetInEditor = useMemo(() => {
    if (!editingItem) {
      return 0;
    }

    const earningsTotal = tempEarnings.reduce(
      (sum, earning) => sum + Number(earning.amount || 0),
      0
    );

    const deductionsTotal = tempDeductions.reduce(
      (sum, deduction) => sum + Number(deduction.amount || 0),
      0
    );

    return (
      Number(editingItem.gross) -
      Number(editingItem.lop_amount) +
      earningsTotal -
      deductionsTotal
    );
  }, [editingItem, tempEarnings, tempDeductions]);

  // ==========================================================
  // SAVE PAYROLL ITEM
  // PATCH /payroll/items/:id
  // ==========================================================

  const handleSaveItemAdjustment = async () => {
    if (
      !editingItem ||
      !activeRun ||
      activeRun.status === "FINALIZED"
    ) {
      return;
    }

    try {
      const result = await dispatch(
        (updatePayrollItem as any)(
          Number(editingItem.id),
          {
            other_earnings: tempEarnings,
            other_deductions: tempDeductions,
            remarks: tempRemarks.trim() || null,
          }
        ) as any
      );

      if ((result as any)?.error) {
        throw new Error(
          (result as any).error.message ||
            "Unable to update payroll item"
        );
      }

      await dispatch(
        fetchPayrollRunDetails(Number(activeRun.id)) as any
      );

      setEditingItem(null);
    } catch (err) {
      console.error("Unable to update payroll item:", err);
    }
  };

  // ==========================================================
  // RECOMPUTE PAYROLL
  // POST /payroll/runs/:id/recompute
  // ==========================================================

  const handleRecompute = async () => {
    if (!activeRun || activeRun.status === "FINALIZED") {
      return;
    }

    try {
      const result = await dispatch(
        recomputePayroll(Number(activeRun.id)) as any
      );

      if ((result as any)?.error) {
        throw new Error(
          (result as any).error.message ||
            "Unable to recompute payroll"
        );
      }

      await dispatch(
        fetchPayrollRunDetails(Number(activeRun.id)) as any
      );

      if (selectedYear) {
        await dispatch(fetchPayrollRuns(selectedYear) as any);
      }
    } catch (err) {
      console.error("Unable to recompute payroll:", err);
    }
  };

  // ==========================================================
  // FINALIZE PAYROLL
  // POST /payroll/runs/:id/finalize
  // ==========================================================

  const handleFinalize = async () => {
    if (!activeRun || activeRun.status === "FINALIZED") {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to finalize this run? Day summaries will be locked and payslips will be published."
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await dispatch(
        finalizePayroll(Number(activeRun.id)) as any
      );

      if ((result as any)?.error) {
        throw new Error(
          (result as any).error.message ||
            "Unable to finalize payroll"
        );
      }

      if (selectedYear) {
        await dispatch(fetchPayrollRuns(selectedYear) as any);
      }

      await dispatch(
        fetchPayrollRunDetails(Number(activeRun.id)) as any
      );
    } catch (err) {
      console.error("Unable to finalize payroll:", err);
    }
  };

  // ==========================================================
  // EXPORT PAYROLL EXCEL
  // GET /payroll/runs/:id/export
  // ==========================================================

  const handleExport = async () => {
    if (!activeRun) {
      return;
    }

    try {
      const fileName = `${activeRun.year}-${String(activeRun.month).padStart(2, "0")}-payroll-export.xlsx`;

      const result = await dispatch(
        exportPayroll(Number(activeRun.id), fileName) as any
      );

      if ((result as any)?.error) {
        throw new Error(
          (result as any).error.message ||
            "Unable to export payroll"
        );
      }
    } catch (err) {
      console.error("Unable to export payroll:", err);
    }
  };

  // ==========================================================
  // CREATE PAYROLL RUN
  // POST /payroll/runs
  // ==========================================================

  const handleCreateRun = async () => {
    try {
      const action: any = await dispatch(
        createPayrollRun({
          month: newRunMonth,
          year: newRunYear,
        }) as any
      );

      if (action?.error) {
        throw new Error(
          action.error.message || "Unable to create payroll run"
        );
      }

      const result =
        action?.payload?.data ??
        action?.payload ??
        action;

      const createdRun =
        result?.payroll_run ??
        result?.data?.payroll_run;

      setIsCreateModalOpen(false);

      setSelectedYear(newRunYear);

      if (createdRun?.id) {
        setActiveRunId(Number(createdRun.id));
      }

      await dispatch(
        fetchPayrollRuns(newRunYear) as any
      );

      if (createdRun?.id) {
        await dispatch(
          fetchPayrollRunDetails(Number(createdRun.id)) as any
        );
      }
    } catch (err) {
      console.error("Unable to create payroll run:", err);
    }
  };

  // ==========================================================
  // JSX
  // ==========================================================

  return (
    <div className="min-h-screen bg-[#f5faff] text-[#1e293b] font-sans antialiased lg:flex">
      <Sidebar />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1440px] mx-auto space-y-6">

          {/* PAGE HEADER */}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1b64da]" />

                <h1 className="text-3xl lg:text-4xl font-black text-[#0f172a] tracking-tight">
                  Payroll Processing & Run Management
                </h1>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#eef4fa] text-[#1b64da] border border-[#d6e5fb] tracking-wider uppercase">
                  Active Cycle:{" "}
                  {activeRun
                    ? `${getMonthName(activeRun.month)} ${activeRun.year} (${activeRun.status})`
                    : "No run selected"}
                </span>
              </div>

              <p className="text-sm font-medium text-[#64748b] mt-1.5 max-w-3xl">
                Automated attendance-linked salary disbursement engine.
                Recompute LOP deductions, manage custom earning and
                deduction line items, finalize runs, and publish PDF
                payslips across NANDGATE-IT personnel.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">

              <button
                type="button"
                onClick={handleRecompute}
                disabled={
                  !activeRun ||
                  activeRun.status === "FINALIZED" ||
                  actionLoading
                }
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-[#d5dbe1] text-xs font-bold text-[#475569] hover:bg-[#f1f6fc] shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#1b64da]" />
                Recompute LOP
              </button>

              <button
                type="button"
                onClick={handleExport}
                disabled={!activeRun || actionLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-[#d5dbe1] text-xs font-bold text-[#475569] hover:bg-[#f1f6fc] shadow-sm transition-all disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Export Register (.xlsx)
              </button>

              <button
                type="button"
                onClick={handleFinalize}
                disabled={
                  !activeRun ||
                  activeRun.status === "FINALIZED" ||
                  actionLoading
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-emerald-300 text-xs font-bold text-emerald-700 hover:bg-emerald-50 shadow-sm transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Finalize & Publish Slips
              </button>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1b64da] hover:bg-[#1552b5] text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                New Payroll Run
              </button>
            </div>
          </div>

          {/* KPI METRICS */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* NET PAY */}

            <div className="bg-white border border-[#d5dbe1] rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                  Total Net Disbursement
                </span>

                <div className="text-3xl font-black text-[#0f172a] tracking-tight mt-2">
                  {formatINR(totalNet)}
                </div>

                <p className="text-xs font-bold text-emerald-600 mt-1">
                  {items.length} employees payable
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-[#eef4fa] border border-[#d6e5fb] flex items-center justify-center text-[#1b64da]">
                <IndianRupee className="w-6 h-6" />
              </div>
            </div>

            {/* GROSS */}

            <div className="bg-white border border-[#d5dbe1] rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                  Scheduled Gross Base
                </span>

                <div className="text-3xl font-black text-[#1b64da] tracking-tight mt-2">
                  {formatINR(totalGross)}
                </div>

                <p className="text-xs font-medium text-[#64748b] mt-1">
                  Calendar days based on selected payroll run
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-[#eef4fa] border border-[#d6e5fb] flex items-center justify-center text-[#1b64da]">
                <Calculator className="w-6 h-6" />
              </div>
            </div>

            {/* LOP */}

            <div className="bg-white border border-[#d5dbe1] rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                  Total LOP Deduction
                </span>

                <div className="text-3xl font-black text-rose-600 tracking-tight mt-2">
                  {formatINR(totalLop)}
                </div>

                <p className="text-xs font-bold text-rose-600 mt-1">
                  {totalLopDays} Total Unpaid / LOP Days
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>

            {/* MANUAL ADJUSTMENTS */}

            <div className="bg-white border border-[#d5dbe1] rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                  Manual Adjustments
                </span>

                <div className="text-3xl font-black text-[#0f172a] tracking-tight mt-2">
                  {formatINR(totalBonus - totalDeductionsSum)}
                </div>

                <p className="text-xs font-medium text-[#64748b] mt-1">
                  +{formatINR(totalBonus)} bonus / -
                  {formatINR(totalDeductionsSum)} deductions
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-[#eef4fa] border border-[#d6e5fb] flex items-center justify-center text-[#1b64da]">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* YEAR AND RUN SELECTOR */}

          <div className="bg-white border border-[#d5dbe1] rounded-3xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eef4fa] border border-[#d6e5fb] text-xs font-bold text-[#1b64da]">
                <span>YEAR:</span>

                <select
                  value={selectedYear ?? ""}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent font-black focus:outline-none"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {runs.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setActiveRunId(Number(run.id))}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    Number(activeRunId) === Number(run.id)
                      ? "bg-[#1b64da] text-white shadow-sm"
                      : "bg-[#eef4fa] text-[#475569] hover:bg-[#e2e8f0]"
                  }`}
                >
                  {getMonthName(run.month, "short")} {run.year}

                  {run.status === "FINALIZED" && (
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-1" />
                  )}
                </button>
              ))}

              {runs.length === 0 && (
                <span className="text-xs text-slate-400">
                  No payroll runs for {selectedYear ?? "this year"}
                </span>
              )}
            </div>

            {/* SEARCH */}

            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

              <input
                type="text"
                placeholder="Search by employee, EMP code, designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#f8fafc] border border-[#d5dbe1] text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
              />
            </div>
          </div>

          {/* LOADING / ERROR / SUCCESS */}

          {loading && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Loading payroll data...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {String(error)}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {String(message)}
            </div>
          )}

          {!activeRun && !loading && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No payroll run found for {selectedYear ?? "this year"}. Create a new payroll run to get started.
            </div>
          )}

          {/* RUN STATUS */}

          <div className="px-4 py-2.5 rounded-2xl bg-white/60 border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#64748b] gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-[#1b64da]" />

              <span>
                Viewing Payroll Run ID:{" "}
                <strong className="font-mono text-[#0f172a]">
                  {activeRun
                    ? `RUN#${activeRun.year}-${String(activeRun.month).padStart(2, "0")} (#${activeRun.id})`
                    : "—"}
                </strong>
              </span>

              <span>•</span>

              <span>
                Status:{" "}
                <strong
                  className={`px-2 py-0.5 rounded border ${
                    activeRun?.status === "FINALIZED"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-amber-700 bg-amber-50 border-amber-200"
                  }`}
                >
                  {activeRun?.status || "NO RUN"}
                </strong>
              </span>

              <span>•</span>
            </div>

            <div className="font-mono text-slate-400 text-[11px]">
              Audit Actor: Admin
            </div>
          </div>

          {/* PAYROLL TABLE */}

          <div className="bg-white border border-[#d5dbe1] rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 lg:p-6 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1b64da]" />

                <h2 className="text-lg font-black text-[#0f172a] tracking-tight">
                  Payroll Items & Line-Item Adjustments
                </h2>

                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#eef4fa] text-[#1b64da] border border-[#d6e5fb]">
                  {items.length} Personnel Processed
                </span>
              </div>

              <div className="text-xs font-mono font-bold text-slate-500">
                Formulas:{" "}
                <span className="text-[#1b64da]">
                  Net Pay = Gross - LOP + Earnings - Deductions
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f1f6fc] border-b border-[#d6e5fb] text-xs font-bold text-[#475569] uppercase tracking-wider">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Emp Code</th>
                    <th className="py-4 px-6">Gross (₹)</th>
                    <th className="py-4 px-6">Cal / Pay Days</th>
                    <th className="py-4 px-6">LOP Days</th>
                    <th className="py-4 px-6">Per Day Rate</th>
                    <th className="py-4 px-6">LOP Deduction (₹)</th>
                    <th className="py-4 px-6">Adjustments</th>
                    <th className="py-4 px-6">Net Pay (₹)</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e2e8f0] text-sm">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#f0f6ff]/80 transition-all duration-150"
                    >
                      {/* EMPLOYEE */}

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div
                            className={`w-10 h-10 shrink-0 rounded-2xl ${getAvatarBg(
                              item.name || item.emp_code || "Employee"
                            )} text-white font-bold flex items-center justify-center text-xs shadow-sm`}
                          >
                            {String(item.name || item.emp_code || "E")
                              .split(" ")
                              .map((name) => name[0])
                              .join("")}
                          </div>

                          <div>
                            <div className="font-bold text-[#0f172a] text-sm">
                              {item.name}
                            </div>

                            <div className="text-xs text-[#64748b]">
                              {item.designation}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* EMP CODE */}

                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-[#1b64da]">
                          {item.emp_code}
                        </span>
                      </td>

                      {/* GROSS */}

                      <td className="py-4 px-6 whitespace-nowrap font-bold text-[#0f172a]">
                        {formatINR(Number(item.gross))}
                      </td>

                      {/* CALENDAR / PAYABLE DAYS */}

                      <td className="py-4 px-6 whitespace-nowrap text-xs font-mono text-slate-700">
                        <strong>{item.payable_days}</strong> /{" "}
                        {item.calendar_days}
                      </td>

                      {/* LOP DAYS */}

                      <td className="py-4 px-6 whitespace-nowrap">
                        {Number(item.lop_days) > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            • {item.lop_days} d LOP
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            0.0 d
                          </span>
                        )}
                      </td>

                      {/* PER DAY */}

                      <td className="py-4 px-6 whitespace-nowrap text-xs font-mono text-slate-600">
                        ₹ {Number(item.per_day || 0).toFixed(2)}
                      </td>

                      {/* LOP AMOUNT */}

                      <td className="py-4 px-6 whitespace-nowrap font-mono text-xs">
                        {Number(item.lop_amount) > 0 ? (
                          <span className="text-rose-600 font-bold">
                            - ₹ {Number(item.lop_amount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            ₹ 0.00
                          </span>
                        )}
                      </td>

                      {/* ADJUSTMENTS */}

                      <td className="py-4 px-6 whitespace-nowrap">
                        {(item.other_earnings || []).length > 0 ? (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Earnings
                          </span>
                        ) : (item.other_deductions || []).length > 0 ? (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Deductions
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-100">
                            Standard
                          </span>
                        )}
                      </td>

                      {/* NET PAY */}

                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-black text-[#0f172a] text-sm">
                          {formatINR(Number(item.net_pay), true)}
                        </span>
                      </td>

                      {/* ACTIONS - ONLY EYE ICON */}

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            title={
                              isFinalized
                                ? "View payroll details"
                                : "View / Edit payroll details"
                            }
                            aria-label={
                              isFinalized
                                ? `View payroll details for ${item.name}`
                                : `View or edit payroll details for ${item.name}`
                            }
                            onClick={() => handleSelectItemForEdit(item)}
                            className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-[#1b64da] hover:bg-[#eef4fa] transition-colors focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-10 text-center text-sm text-slate-400"
                      >
                        {items.length === 0
                          ? "No payroll items found for this run."
                          : "No employees match your search."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-[#f8fafc] border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748b] gap-2">
              <span>
                Displaying {filteredItems.length} of {items.length} employees
                • Auto-locked on Finalize (Day Summaries `is_locked: true`)
              </span>

              <span className="font-semibold">
                {activeRun?.status || "No run selected"}
              </span>
            </div>
          </div>

          {/* LINE ITEM EDITOR / BREAKDOWN */}

          {editingItem && (
            <div className="bg-white border border-[#d5dbe1] rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#e2e8f0] gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#eef4fa] border border-[#d6e5fb] flex items-center justify-center text-[#1b64da]">
                    {isFinalized ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <Edit3 className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-black text-xl text-[#0f172a]">
                      Line-Item Adjuster & Breakdown — {editingItem.name} (
                      {editingItem.emp_code})
                    </h3>

                    <p className="text-xs text-[#64748b]">
                      {isFinalized ? (
                        <>
                          <span className="font-semibold text-emerald-700">
                            Read-only payroll breakdown
                          </span>
                          {" "}• This payroll run has been finalized.
                        </>
                      ) : (
                        <>
                          Mapped to:{" "}
                          <span className="font-mono text-[#1b64da]">
                            PATCH /payroll/items/:id
                          </span>{" "}
                          • Auto-recalculates net pay
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#eef4fa] text-[#1b64da] border border-[#d6e5fb] self-start sm:self-auto">
                  Item #{editingItem.id}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* ATTENDANCE / LOP */}

                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                    Attendance & LOP Base
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Base Gross Salary
                      </span>

                      <span className="font-bold text-[#0f172a]">
                        {formatINR(Number(editingItem.gross))}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Calendar Days
                      </span>

                      <span className="font-bold text-[#0f172a]">
                        {editingItem.calendar_days} Days
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Daily Rate
                      </span>

                      <span className="font-mono font-bold text-[#0f172a]">
                        ₹ {Number(editingItem.per_day || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="text-rose-600 font-bold">
                        Unpaid LOP ({editingItem.lop_days} Days)
                      </span>

                      <span className="font-mono font-bold text-rose-600">
                        - ₹ {Number(editingItem.lop_amount || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between pt-1">
                      <span className="text-[#1b64da] font-bold">
                        Payable Days
                      </span>

                      <span className="font-bold text-[#1b64da]">
                        {editingItem.payable_days} Days
                      </span>
                    </div>
                  </div>

                  {/* LOP DATES */}

                  {editingItem.lop_dates &&
                    editingItem.lop_dates.length > 0 && (
                      <div className="pt-3 border-t border-slate-200">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-2">
                          LOP Dates
                        </h5>

                        <div className="space-y-1.5">
                          {editingItem.lop_dates.map((lopDate, index) => {
                            const dateLabel =
                              typeof lopDate === "string"
                                ? lopDate
                                : lopDate.work_date;

                            const dateStatus =
                              typeof lopDate === "string"
                                ? "LOP"
                                : lopDate.status;

                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-slate-600">
                                  {dateLabel}
                                </span>

                                <span className="font-semibold text-rose-600">
                                  {dateStatus}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>

                {/* OTHER EARNINGS */}

                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      + Other Earnings
                    </h4>

                    {!isFinalized && (
                      <button
                        type="button"
                        disabled={isFinalized}
                        onClick={() =>
                          setTempEarnings([
                            ...tempEarnings,
                            { label: "Bonus", amount: 5000 },
                          ])
                        }
                        className="text-xs font-bold text-[#1b64da] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + Add Earning
                      </button>
                    )}
                  </div>

                  {tempEarnings.length > 0 ? (
                    tempEarnings.map((earning, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={earning.label}
                          disabled={isFinalized}
                          onChange={(e) => {
                            const copy = [...tempEarnings];
                            copy[index].label = e.target.value;
                            setTempEarnings(copy);
                          }}
                          className="w-2/3 px-3 py-1.5 rounded-xl bg-white border border-[#d5dbe1] text-xs font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />

                        <input
                          type="number"
                          min="0"
                          value={earning.amount}
                          disabled={isFinalized}
                          onChange={(e) => {
                            const copy = [...tempEarnings];
                            copy[index].amount =
                              Number(e.target.value) || 0;
                            setTempEarnings(copy);
                          }}
                          className="w-1/3 px-3 py-1.5 rounded-xl bg-white border border-[#d5dbe1] text-xs font-mono font-bold text-emerald-700 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />

                        {!isFinalized && (
                          <button
                            type="button"
                            disabled={isFinalized}
                            onClick={() =>
                              setTempEarnings(
                                tempEarnings.filter((_, i) => i !== index)
                              )
                            }
                            className="text-rose-500 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remove earning"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No manual earnings attached.
                    </p>
                  )}

                  <p className="text-xs font-bold text-emerald-600 pt-2">
                    Total Additional Earnings: +
                    {formatINR(
                      tempEarnings.reduce(
                        (sum, earning) =>
                          sum + Number(earning.amount || 0),
                        0
                      )
                    )}
                  </p>
                </div>

                {/* OTHER DEDUCTIONS */}

                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">
                      - Other Deductions
                    </h4>

                    {!isFinalized && (
                      <button
                        type="button"
                        disabled={isFinalized}
                        onClick={() =>
                          setTempDeductions([
                            ...tempDeductions,
                            { label: "Deduction", amount: 1000 },
                          ])
                        }
                        className="text-xs font-bold text-rose-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + Add Deduction
                      </button>
                    )}
                  </div>

                  {tempDeductions.length > 0 ? (
                    tempDeductions.map((deduction, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={deduction.label}
                          disabled={isFinalized}
                          onChange={(e) => {
                            const copy = [...tempDeductions];
                            copy[index].label = e.target.value;
                            setTempDeductions(copy);
                          }}
                          className="w-2/3 px-3 py-1.5 rounded-xl bg-white border border-[#d5dbe1] text-xs font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />

                        <input
                          type="number"
                          min="0"
                          value={deduction.amount}
                          disabled={isFinalized}
                          onChange={(e) => {
                            const copy = [...tempDeductions];
                            copy[index].amount =
                              Number(e.target.value) || 0;
                            setTempDeductions(copy);
                          }}
                          className="w-1/3 px-3 py-1.5 rounded-xl bg-white border border-[#d5dbe1] text-xs font-mono font-bold text-rose-600 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />

                        {!isFinalized && (
                          <button
                            type="button"
                            disabled={isFinalized}
                            onClick={() =>
                              setTempDeductions(
                                tempDeductions.filter((_, i) => i !== index)
                              )
                            }
                            className="text-rose-500 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remove deduction"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No manual deductions attached.
                    </p>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Remarks (Optional)
                    </label>

                    <input
                      type="text"
                      value={tempRemarks}
                      disabled={isFinalized}
                      placeholder="Audit reason for adjustment"
                      onChange={(e) => setTempRemarks(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#d5dbe1] text-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* COMPUTED NET PAY */}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-[#e2e8f0] gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                    Computed Net Pay:
                  </span>

                  <span className="ml-2 text-2xl font-black text-[#0f172a]">
                    {formatINR(computedNetInEditor, true)}
                  </span>

                  <span className="text-xs text-slate-500 ml-2">
                    Gross - LOP + Earnings - Deductions
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#64748b] hover:bg-[#eef4fa] transition-colors"
                  >
                    Close
                  </button>

                  {!isFinalized && (
                    <button
                      type="button"
                      onClick={handleSaveItemAdjustment}
                      disabled={actionLoading}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#1b64da] hover:bg-[#1552b5] text-white shadow-md transition-all disabled:opacity-50"
                    >
                      Update Line Item & Audit
                    </button>
                  )}
                </div>
              </div>

              {/* FINALIZED READ-ONLY MESSAGE */}

              {isFinalized && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                  This payroll run is FINALIZED. Employee payroll details
                  are available in read-only mode. Editing and adjustments
                  are disabled.
                </div>
              )}
            </div>
          )}

          {/* CREATE PAYROLL RUN MODAL */}

          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white border border-[#d5dbe1] rounded-3xl max-w-md w-full p-6 shadow-2xl">

                <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#eef4fa] border border-[#d6e5fb] flex items-center justify-center text-[#1b64da]">
                      <Calendar className="w-5 h-5" />
                    </div>

                    <div>
                      <h3 className="font-black text-lg text-[#0f172a]">
                        Create Payroll Run
                      </h3>

                      <p className="text-xs text-[#64748b]">
                        Maps to:{" "}
                        <span className="font-mono text-[#1b64da]">
                          POST /payroll/runs
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wider">
                      Payroll Month
                    </label>

                    <select
                      value={newRunMonth}
                      onChange={(e) =>
                        setNewRunMonth(Number(e.target.value))
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-[#f8fafc] border border-[#d5dbe1] text-sm font-medium"
                    >
                      <option value={1}>January (01)</option>
                      <option value={2}>February (02)</option>
                      <option value={3}>March (03)</option>
                      <option value={4}>April (04)</option>
                      <option value={5}>May (05)</option>
                      <option value={6}>June (06)</option>
                      <option value={7}>July (07)</option>
                      <option value={8}>August (08)</option>
                      <option value={9}>September (09)</option>
                      <option value={10}>October (10)</option>
                      <option value={11}>November (11)</option>
                      <option value={12}>December (12)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wider">
                      Payroll Year
                    </label>

                    <input
                      type="number"
                      min="2000"
                      max="2100"
                      value={newRunYear}
                      onChange={(e) =>
                        setNewRunYear(Number(e.target.value))
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-[#f8fafc] border border-[#d5dbe1] text-sm font-medium"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                    <strong>Warning check:</strong> Ensures previous month
                    payroll run is finalized before locking.
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748b]"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleCreateRun}
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1b64da] hover:bg-[#1552b5] text-white shadow-md disabled:opacity-50"
                    >
                      Initialize Draft Run
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}