"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { clearEmployeeSalary, fetchEmployeeSalary } from "../store/employee/employeeSlice";
import SalaryDetails, { SalaryHistoryContent } from "../components/SalaryDetails";

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
  History,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const getPageItems = (current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", total];
  if (current >= total - 3) {
    return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total];
};

// ============================================================
// THEME (same three colours as the dashboard)
//   SKY       #7BBDE8
//   SKY LIGHT #bfe0f5
//   BLUE      #1b64da
//   INK       #0f172a (text)
// ============================================================

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
    "bg-[#7BBDE8]",
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
// FILLED COUNT CARD (same look as dashboard cards)
// ============================================================

const SKY = "#7BBDE8";
const SKY_LIGHT = "#bfe0f5";
const BLUE = "#1b64da";
const INK = "#0f172a";

function CountCard({
  label,
  value,
  note,
  color,
  text,
  muted,
  Icon,
}: {
  label: string;
  value: React.ReactNode;
  note: string;
  color: string;
  text: string;
  muted: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className="relative flex min-h-[170px] flex-col rounded-[32px] p-5 shadow-sm"
      style={{ backgroundColor: color, color: text }}
    >
      <p className="max-w-[65%] text-xs font-bold leading-tight">
        {label}
      </p>

      <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-slate-600 ring-4 ring-white/60">
        <Icon className="h-4 w-4" />
      </span>

      <p className="mt-auto pt-4 text-[30px] font-black leading-none tracking-tight">
        {value}
      </p>

      <p className={`mt-3 text-xs font-bold leading-snug ${muted}`}>
        {note}
      </p>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PayrollProcessingHub() {
  const dispatch = useDispatch<AppDispatch>();

  const payrollState = useSelector((state: RootState) => state.payroll);
  const { salary, salaryLoading, salaryError } = useSelector(
    (state: RootState) => state.employees
  );

  const loading = payrollState.runsLoading || payrollState.detailsLoading;
  const actionLoading = Boolean(payrollState.actionLoading);

  const error = payrollState.error;
  const message = payrollState.message;

  // ==========================================================
  // LOCAL STATE
  // ==========================================================

  const [activeRunId, setActiveRunId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const runs: PayrollRun[] = useMemo(() => payrollState.runsYear === selectedYear
    ? payrollState.runs.filter((run) => run.year === selectedYear)
    : [], [payrollState.runs, payrollState.runsYear, selectedYear]);
  const detailsMatch = selectedYear !== null &&
    payrollState.activeRun?.year === selectedYear &&
    Number(payrollState.activeRun?.id) === activeRunId &&
    runs.some((run) => Number(run.id) === activeRunId);
  const items: PayrollItem[] = useMemo(
    () => detailsMatch ? payrollState.items : [],
    [detailsMatch, payrollState.items]
  );

  const [newRunMonth, setNewRunMonth] = useState<number>(1);

  const [newRunYear, setNewRunYear] = useState<number>(2025);

  useEffect(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setSelectedYear(now.getFullYear());
    setNewRunMonth(now.getMonth() + 1);
    setNewRunYear(now.getFullYear());
  }, []);

  // Edit payroll item state
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);
  const [salaryItem, setSalaryItem] = useState<PayrollItem | null>(null);
  const [salarySelectionError, setSalarySelectionError] = useState<string | null>(null);
  const [historySelection, setHistorySelection] = useState<{ runId: number | null; itemId: number } | null>(null);

  // Auto-scroll to the details section when the eye icon is clicked
  const breakdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingItem) {
      // Small timeout to ensure the element is fully rendered in the DOM before scrolling
      const timer = setTimeout(() => {
        breakdownRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [editingItem]);

  useEffect(() => {
    return () => {
      dispatch(clearEmployeeSalary());
    };
  }, [dispatch]);

  const loadSalary = (item: PayrollItem) => {
    const userId = Number(item.user_id);
    dispatch(clearEmployeeSalary());
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      setSalarySelectionError("This payroll item has no valid employee ID. Salary details cannot be loaded.");
      return;
    }
    setSalarySelectionError(null);
    dispatch(fetchEmployeeSalary(userId));
  };

  const openSalary = (item: PayrollItem) => {
    setSalaryItem(item);
    loadSalary(item);
  };

  const closeSalary = () => {
    setSalaryItem(null);
    setSalarySelectionError(null);
    dispatch(clearEmployeeSalary());
  };

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
    if (currentYear !== null) {
      for (let y = currentYear - 5; y <= currentYear + 1; y++) {
        uniqueYears.add(y);
      }
    }

    if (selectedYear !== null) {
      uniqueYears.add(selectedYear);
    }

    runs.forEach((run) => uniqueYears.add(Number(run.year)));

    return [...uniqueYears].sort((a, b) => b - a);
  }, [runs, selectedYear, currentYear]);

  // ==========================================================
  // FETCH PAYROLL RUNS
  // ==========================================================

  useEffect(() => {
    if (!selectedYear) {
      return;
    }

    void dispatch(fetchPayrollRuns(selectedYear)).catch(() => {
      // The slice exposes the error to the page.
    });
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
    if (activeRunId !== null && runs.some((run) => Number(run.id) === activeRunId)) {
      void dispatch(fetchPayrollRunDetails(activeRunId)).catch(() => {
        // The slice exposes the error to the page.
      });
      setEditingItem(null);
    }
  }, [dispatch, activeRunId, selectedYear, runs]);

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

  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  // The page returns to 1 whenever the reset key changes.
  const pageResetKey = `${activeRunId}|${searchQuery}`;
  const totalRecords = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(
    pageState.key === pageResetKey ? pageState.page : 1,
    totalPages
  );
  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageEndIndex = Math.min(pageStartIndex + pageSize, totalRecords);
  const setPage = (page: number) => setPageState({ key: pageResetKey, page });
  const pagedItems = filteredItems.slice(pageStartIndex, pageEndIndex);

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

      closeSalary();
      setSelectedYear(newRunYear);

      if (createdRun?.id) {
        setActiveRunId(Number(createdRun.id));
      }

      await dispatch(
        fetchPayrollRuns(newRunYear) as any
      );

      if (createdRun?.id) {
        setActiveRunId(Number(createdRun.id));
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
    <div className="min-h-screen bg-[#f0f6fa] text-[#0f172a] font-sans antialiased selection:bg-[#7BBDE8]/30">
      <main className="flex-1 min-w-0 py-4 sm:py-6 lg:py-8">
        <div className="mx-auto w-full max-w-[1700px] space-y-6 px-3 sm:px-5 lg:px-6">

          {/* PAGE HEADER */}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7BBDE8]" />

                <h1 className="text-3xl lg:text-4xl font-black text-[#0f172a] tracking-tight">
                  Payroll Management
                </h1>
              </div>
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
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-white border border-[#bfe0f5] text-xs font-bold text-[#0f172a] hover:bg-[#bfe0f5]/40 shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#1b64da]" />
                Recompute LOP
              </button>

              <button
                type="button"
                onClick={handleExport}
                disabled={!activeRun || actionLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-white border border-[#bfe0f5] text-xs font-bold text-[#0f172a] hover:bg-[#bfe0f5]/40 shadow-sm transition-all disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#1b64da]" />
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#7BBDE8] border border-[#7BBDE8] text-xs font-bold text-[#0f172a] hover:bg-[#6ab0df] shadow-sm transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0f172a]" />
                Finalize & Publish Slips
              </button>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1b64da] hover:bg-[#1552b5] text-white text-xs font-bold shadow-md shadow-[#1b64da]/20 hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                New Payroll Run
              </button>
            </div>
          </div>

          {/* KPI METRICS (filled like the dashboard) */}

          {detailsMatch && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <CountCard
              label="Total Net Disbursement"
              value={formatINR(totalNet)}
              note={`${items.length} employees payable`}
              color={SKY}
              text={INK}
              muted="text-black/50"
              Icon={IndianRupee}
            />

            <CountCard
              label="Scheduled Gross Base"
              value={formatINR(totalGross)}
              note="Calendar days based on selected payroll run"
              color={SKY_LIGHT}
              text={INK}
              muted="text-black/50"
              Icon={Calculator}
            />

            <CountCard
              label="Total LOP Deduction"
              value={formatINR(totalLop)}
              note={`${totalLopDays} Total Unpaid / LOP Days`}
              color={BLUE}
              text="#ffffff"
              muted="text-white/70"
              Icon={TrendingDown}
            />

            <CountCard
              label="Manual Adjustments"
              value={formatINR(totalBonus - totalDeductionsSum)}
              note={`+${formatINR(totalBonus)} bonus / -${formatINR(totalDeductionsSum)} deductions`}
              color={SKY}
              text={INK}
              muted="text-black/50"
              Icon={SlidersHorizontal}
            />
          </div>}

          {/* YEAR AND RUN SELECTOR */}

          <div className="bg-white border border-[#e6edf4] rounded-[32px] p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#bfe0f5] text-xs font-bold text-[#1b64da]">
                <span>YEAR:</span>

                <select
                  value={selectedYear ?? ""}
                  onChange={(e) => {
                    closeSalary();
                    setHistorySelection(null);
                    setEditingItem(null);
                    setActiveRunId(null);
                    setSelectedYear(Number(e.target.value));
                  }}
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
                  onClick={() => {
                    if (Number(activeRunId) !== Number(run.id)) {
                      closeSalary();
                      setHistorySelection(null);
                    }
                    setActiveRunId(Number(run.id));
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    Number(activeRunId) === Number(run.id)
                      ? "bg-[#1b64da] text-white shadow-sm"
                      : "bg-[#f0f6fa] text-[#0f172a] hover:bg-[#bfe0f5]"
                  }`}
                >
                  {getMonthName(run.month, "short")} {run.year}

                  {run.status === "FINALIZED" && (
                    <span className="inline-block w-2 h-2 rounded-full bg-[#7BBDE8] ml-1" />
                  )}
                </button>
              ))}

              {runs.length === 0 && !loading && !error && payrollState.runsYear === selectedYear && (
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
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-slate-200/80 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
              />
            </div>
          </div>

          {/* LOADING / ERROR / SUCCESS */}

          {loading && (
            <div className="rounded-2xl border border-[#7BBDE8] bg-[#bfe0f5]/40 px-4 py-3 text-sm text-[#1b64da]">
              Loading payroll data...
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-[#1b64da] bg-[#1b64da] px-4 py-3 text-sm text-white">
              {String(error)}
            </div>
          )}

          {message && (
            <div className="rounded-2xl border border-[#7BBDE8] bg-[#bfe0f5] px-4 py-3 text-sm text-[#0f172a]">
              {String(message)}
            </div>
          )}

          {!activeRun && !loading && !error && selectedYear !== null && payrollState.runsYear === selectedYear && (
            <div className="rounded-[32px] border border-dashed border-[#7BBDE8] bg-white p-10 text-center text-sm text-slate-500">
              No payroll run found for {selectedYear ?? "this year"}. Create a new payroll run to get started.
            </div>
          )}

          {/* PAYROLL TABLE */}

          {detailsMatch && <div className="flex min-w-0 flex-col items-start gap-4 xl:flex-row">
          <div className="min-w-0 w-full flex-1 bg-white border border-[#e6edf4] rounded-[32px] shadow-sm overflow-hidden">
            <div className="p-5 lg:p-6 border-b border-[#e6edf4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7BBDE8]" />

                <h2 className="text-lg font-black text-[#0f172a] tracking-tight">
                  Payroll Breakdown & Adjustments
                </h2>

                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#bfe0f5] text-[#1b64da]">
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

            <div className="overflow-x-auto" role="region" aria-label="Payroll breakdown table" tabIndex={0}>
              <table className="w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-[#f0f6fa] border-b border-[#bfe0f5] text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                    <th className="py-4 px-3">Employee</th>
                    <th className="py-4 px-3">Emp Code</th>
                    {/* <th className="py-4 px-3">Gross (₹)</th> */}
                    <th className="py-4 px-3">Cal / Pay Days</th>
                    <th className="py-4 px-3">LOP Days</th>
                    <th className="py-4 px-3">Per Day Rate</th>
                    <th className="py-4 px-3">LOP Deduction (₹)</th>
                    {/* <th className="py-4 px-3">Adjustments</th> */}
                    <th className="py-4 px-3">Net Pay (₹)</th>
                    <th scope="col" className="whitespace-nowrap px-3 py-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e6edf4] text-sm">
                  {pagedItems.map((item) => (
                    <React.Fragment key={item.id}>
                    <tr
                      className="group hover:bg-[#bfe0f5]/20 transition-all duration-150"
                    >
                      {/* EMPLOYEE */}

                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 shrink-0 rounded-full ${getAvatarBg(
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

                            <div className="text-xs text-slate-500">
                              {item.designation}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* EMP CODE */}

                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-[#1b64da]">
                          {item.emp_code}
                        </span>
                      </td>

                      {/*
                      <td className="py-4 px-3 whitespace-nowrap font-bold text-[#0f172a]">
                        {formatINR(Number(item.gross))}
                      </td>
                      */}

                      {/* CALENDAR / PAYABLE DAYS */}

                      <td className="py-4 px-3 whitespace-nowrap text-xs font-mono text-slate-700">
                        <strong>{item.payable_days}</strong> /{" "}
                        {item.calendar_days}
                      </td>

                      {/* LOP DAYS */}

                      <td className="py-4 px-3 whitespace-nowrap">
                        {Number(item.lop_days) > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1b64da] text-white">
                            • {item.lop_days} d LOP
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#bfe0f5] text-[#0f172a]">
                            0.0 d
                          </span>
                        )}
                      </td>

                      {/* PER DAY */}

                      <td className="py-4 px-3 whitespace-nowrap text-xs font-mono text-slate-600">
                        ₹ {Number(item.per_day || 0).toFixed(2)}
                      </td>

                      {/* LOP AMOUNT */}

                      <td className="py-4 px-3 whitespace-nowrap font-mono text-xs">
                        {Number(item.lop_amount) > 0 ? (
                          <span className="text-[#1b64da] font-bold">
                            - ₹ {Number(item.lop_amount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            ₹ 0.00
                          </span>
                        )}
                      </td>

                      {/*
                      <td className="py-4 px-3 whitespace-nowrap">
                        {(item.other_earnings || []).length > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#7BBDE8] text-[#0f172a]">
                            Earnings
                          </span>
                        ) : (item.other_deductions || []).length > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1b64da] text-white">
                            Deductions
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-500 bg-[#f0f6fa]">
                            Standard
                          </span>
                        )}
                      </td>
                      */}

                      {/* NET PAY */}

                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="font-black text-[#0f172a] text-sm">
                          {formatINR(Number(item.net_pay), true)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openSalary(item)}
                            aria-label={`View current salary for ${item.name}`}
                            aria-controls="payroll-salary-panel"
                            aria-pressed={salaryItem?.id === item.id}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b64da] ${
                              salaryItem?.id === item.id
                                ? "border-[#1b64da] bg-[#1b64da] text-white"
                                : "border-[#c7e1f4] bg-[#eef7fd] text-[#1b64da] hover:bg-[#dceffc]"
                            }`}
                          >
                            <IndianRupee className="h-3.5 w-3.5" />
                            Salary
                          </button>
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
                            className="inline-flex items-center justify-center p-2 rounded-full text-slate-400 hover:text-[#1b64da] hover:bg-[#bfe0f5]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {historySelection?.runId === activeRunId && historySelection?.itemId === item.id && (
                      <tr>
                        <td colSpan={8} className="bg-[#f5faff] px-4 py-4">
                          <section id={`payroll-history-${item.id}`} aria-label={`Salary history for ${item.name}`} className="sticky left-4 w-[calc(100vw-4rem)] max-w-[760px] rounded-2xl border border-[#d6e8f7] bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900"><History className="h-4 w-4 text-blue-600" /> Salary history</h3>
                                <p className="mt-1 text-sm text-slate-600">{item.name} · {item.emp_code}</p>
                              </div>
                              <button type="button" aria-label="Close salary history" onClick={() => {
                                setHistorySelection(null);
                                document.getElementById(`payroll-history-button-${item.id}`)?.focus();
                              }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            {Number.isSafeInteger(Number(item.user_id)) && Number(item.user_id) > 0 ? (
                              <SalaryHistoryContent key={`${activeRunId}-${item.user_id}`} employeeId={Number(item.user_id)} />
                            ) : (
                              <p role="alert" className="mt-3 text-sm text-rose-700">This payroll item has no valid employee ID. Salary history cannot be loaded.</p>
                            )}
                          </section>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
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

            {totalRecords > 0 && (
            <nav
              aria-label="Payroll pagination"
              className="flex flex-col items-center justify-between gap-3 bg-white px-4 py-3 text-xs text-[#64748b] sm:flex-row border-t border-[#e6edf4]"
            >
              <label className="flex items-center gap-2 font-semibold">
                Rows per page
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#7BBDE8] focus:ring-2 focus:ring-[#7BBDE8]/30"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <span className="font-semibold">
                {pageStartIndex + 1}–{pageEndIndex} of {totalRecords}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-[#eef7fd] hover:text-[#1b64da] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageItems(currentPage, totalPages).map((item) =>
                  typeof item === "string" ? (
                    <span key={item} className="px-1 text-slate-400" aria-hidden="true">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      aria-label={`Page ${item}`}
                      aria-current={item === currentPage ? "page" : undefined}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-bold transition-colors ${
                        item === currentPage
                          ? "border-[#1b64da] bg-[#1b64da] text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-[#eef7fd] hover:text-[#1b64da]"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-[#eef7fd] hover:text-[#1b64da] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </nav>
            )}

            <div className="p-4 bg-[#f0f6fa] border-t border-[#e6edf4] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
              <span>
                Displaying {pagedItems.length} of {filteredItems.length} employees
              </span>

              <span className="font-semibold text-[#1b64da]">
                {activeRun?.status || "No run selected"}
              </span>
            </div>
          </div>
            <section
              id="payroll-salary-panel"
              aria-labelledby="payroll-salary-title"
              className="w-full shrink-0 overflow-hidden rounded-3xl border border-[#d6e8f7] bg-white shadow-sm xl:sticky xl:top-4 xl:w-[280px] 2xl:w-[320px]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#d6e8f7] bg-[#f1f8fe] px-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b64da] text-white">
                    <IndianRupee className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 id="payroll-salary-title" className="text-sm font-black text-[#0f172a]">Salary details</h2>
                    {salaryItem && (
                      <p className="mt-1 break-words text-xs font-medium text-slate-600">
                        {salaryItem.name} <span className="text-slate-400">·</span> {salaryItem.emp_code}
                      </p>
                    )}
                  </div>
                </div>
                {salaryItem && (
                  <button
                    type="button"
                    onClick={closeSalary}
                    aria-label="Close salary details"
                    className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b64da]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="p-4">
                <p className="mb-4 text-xs leading-relaxed text-slate-500">
                  Salary structure and effective dates may differ from this payroll run.
                </p>
                {salaryItem ? (
                  <SalaryDetails
                    key={salaryItem.user_id}
                    salary={salary}
                    loading={salaryLoading}
                    error={salarySelectionError || salaryError}
                    onRetry={() => loadSalary(salaryItem)}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#c7e1f4] bg-[#f7fbff] px-4 py-8 text-center">
                    <p className="text-sm font-bold text-slate-700">Select an employee</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      Choose Salary in the Actions column to view the employee&apos;s current salary breakdown.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>}

          {/* LINE ITEM EDITOR / BREAKDOWN */}

          {detailsMatch && editingItem && (
            <div 
              ref={breakdownRef} 
              className="bg-white border border-[#e6edf4] rounded-[32px] p-6 shadow-sm space-y-6 scroll-mt-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#e6edf4] gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#bfe0f5] flex items-center justify-center text-[#1b64da]">
                    {isFinalized ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <Edit3 className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-black text-xl text-[#0f172a]">
                      Salary Breakdown — {editingItem.name} (
                      {editingItem.emp_code})
                    </h3>

                    <p className="text-xs text-slate-500">
                      {isFinalized ? (
                        <>
                          <span className="font-semibold text-[#1b64da]">
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

                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#bfe0f5] text-[#1b64da] self-start sm:self-auto">
                  Item #{editingItem.id}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* ATTENDANCE / LOP */}

                <div className="bg-[#f0f6fa] border border-[#e6edf4] rounded-3xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
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

                    <div className="flex justify-between pt-2 border-t border-[#bfe0f5]">
                      <span className="text-[#1b64da] font-bold">
                        Unpaid LOP ({editingItem.lop_days} Days)
                      </span>

                      <span className="font-mono font-bold text-[#1b64da]">
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
                      <div className="pt-3 border-t border-[#bfe0f5]">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[#1b64da] mb-2">
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

                                <span className="font-semibold text-[#1b64da]">
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

                <div className="bg-[#f0f6fa] border border-[#e6edf4] rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1b64da]">
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
                          className="w-2/3 px-3 py-1.5 rounded-xl bg-white border border-[#bfe0f5] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40 disabled:bg-[#f0f6fa] disabled:text-slate-500 disabled:cursor-not-allowed"
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
                          className="w-1/3 px-3 py-1.5 rounded-xl bg-white border border-[#bfe0f5] text-xs font-mono font-bold text-[#1b64da] focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40 disabled:bg-[#f0f6fa] disabled:text-slate-500 disabled:cursor-not-allowed"
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
                            className="text-[#1b64da] text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <p className="text-xs font-bold text-[#1b64da] pt-2">
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

                <div className="bg-[#f0f6fa] border border-[#e6edf4] rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">
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
                        className="text-xs font-bold text-[#1b64da] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
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
                          className="w-2/3 px-3 py-1.5 rounded-xl bg-white border border-[#bfe0f5] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40 disabled:bg-[#f0f6fa] disabled:text-slate-500 disabled:cursor-not-allowed"
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
                          className="w-1/3 px-3 py-1.5 rounded-xl bg-white border border-[#bfe0f5] text-xs font-mono font-bold text-[#1b64da] focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40 disabled:bg-[#f0f6fa] disabled:text-slate-500 disabled:cursor-not-allowed"
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
                            className="text-[#1b64da] text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Remarks (Optional)
                    </label>

                    <input
                      type="text"
                      value={tempRemarks}
                      disabled={isFinalized}
                      placeholder="Audit reason for adjustment"
                      onChange={(e) => setTempRemarks(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#bfe0f5] text-xs focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40 disabled:bg-[#f0f6fa] disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* COMPUTED NET PAY */}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-[#e6edf4] gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
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
                    className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-500 hover:bg-[#bfe0f5]/50 transition-colors"
                  >
                    Close
                  </button>

                  {!isFinalized && (
                    <button
                      type="button"
                      onClick={handleSaveItemAdjustment}
                      disabled={actionLoading}
                      className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#1b64da] hover:bg-[#1552b5] text-white shadow-md shadow-[#1b64da]/20 transition-all disabled:opacity-50"
                    >
                      Update Line Item & Audit
                    </button>
                  )}
                </div>
              </div>

              {/* FINALIZED READ-ONLY MESSAGE */}

              {isFinalized && (
                <div className="rounded-2xl border border-[#7BBDE8] bg-[#bfe0f5]/50 px-4 py-3 text-xs font-semibold text-[#1b64da]">
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
              <div className="bg-white border border-[#bfe0f5] rounded-[32px] max-w-md w-full p-6 shadow-2xl">

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#d6e8f7] bg-[#eaf4fc] p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#bfe0f5] flex items-center justify-center text-[#1b64da]">
                      <Calendar className="w-5 h-5" />
                    </div>

                    <div>
                      <h3 className="font-black text-lg text-[#0f172a]">
                        Create Payroll Run
                      </h3>

                      <p className="text-xs text-slate-500">
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
                    className="p-2 rounded-full text-slate-400 hover:text-[#1b64da] hover:bg-[#bfe0f5]/50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Payroll Month
                    </label>

                    <select
                      value={newRunMonth}
                      onChange={(e) =>
                        setNewRunMonth(Number(e.target.value))
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-[#f0f6fa] border border-[#bfe0f5] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
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
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
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
                      className="w-full px-4 py-2.5 rounded-xl bg-[#f0f6fa] border border-[#bfe0f5] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]/40"
                    />
                  </div>

                  <div className="p-3 bg-[#bfe0f5]/50 rounded-2xl border border-[#7BBDE8] text-xs text-[#0f172a]">
                    <strong>Warning check:</strong> Ensures previous month
                    payroll run is finalized before locking.
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#e6edf4]">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 hover:bg-[#bfe0f5]/50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleCreateRun}
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#1b64da] hover:bg-[#1552b5] text-white shadow-md shadow-[#1b64da]/20 disabled:opacity-50"
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