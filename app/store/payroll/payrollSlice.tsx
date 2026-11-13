
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "../store";

// --------------------------------------------------
// Types matching the actual Knex backend response
// --------------------------------------------------

export interface OtherEarning {
  label: string;
  amount: number;
}

export interface OtherDeduction {
  label: string;
  amount: number;
}

export interface PayrollItem {
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
  lop_dates?: string[];
}

export interface PayrollRun {
  id: number;
  month: number;
  year: number;
  status: "DRAFT" | "FINALIZED";
  finalized_by?: number | null;
  finalized_at?: string | null;
  created_at: string;
  updated_at?: string;
}

interface PayrollState {
  runs: PayrollRun[];
  runsYear: number | null;
  runsRequestId: number;
  detailsRequestId: number;
  activeRun: PayrollRun | null;
  items: PayrollItem[];
  runsLoading: boolean;
  detailsLoading: boolean;
  actionLoading: boolean;
  error: string | null;
  message: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface RunDetails {
  payroll_run: PayrollRun;
  employee_count: number;
  payroll_items: PayrollItem[];
}

interface RunList {
  year: number;
  total: number;
  payroll_runs: PayrollRun[];
}

interface CreateRunResponse {
  payroll_run: PayrollRun;
  employee_count: number;
  payroll_items?: PayrollItem[];
}

interface UpdateItemResponse {
  payroll_item: Partial<PayrollItem>;
}

interface RecomputeResponse {
  payroll_run_id: number;
  updated_items: number;
}

interface FinalizeResponse {
  payroll_run_id: number;
  status: "FINALIZED";
  payslips_generated: number;
  day_summaries_locked: number;
}

// --------------------------------------------------
// API configuration
// NEXT_PUBLIC_API_URL should contain the server origin:
// http://192.168.1.88:5001
// --------------------------------------------------

const API_BASE_URL =
  `${process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.88:5001"}/api/v1/payroll`;

const initialState: PayrollState = {
  runs: [],
  runsYear: null,
  runsRequestId: 0,
  detailsRequestId: 0,
  activeRun: null,
  items: [],
  runsLoading: false,
  detailsLoading: false,
  actionLoading: false,
  error: null,
  message: null,
};

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function normalizeItem(item: Partial<PayrollItem>): PayrollItem {
  return {
    id: Number(item.id),
    payroll_run_id: Number(item.payroll_run_id),
    user_id: Number(item.user_id),
    emp_code: item.emp_code ?? "",
    name: item.name ?? "",
    designation: item.designation ?? "",
    gross: Number(item.gross ?? 0),
    calendar_days: Number(item.calendar_days ?? 0),
    payable_days: Number(item.payable_days ?? 0),
    lop_days: Number(item.lop_days ?? 0),
    per_day: Number(item.per_day ?? 0),
    lop_amount: Number(item.lop_amount ?? 0),
    other_earnings: (item.other_earnings ?? []).map((entry) => ({
      label: entry.label,
      amount: Number(entry.amount),
    })),
    other_deductions: (item.other_deductions ?? []).map((entry) => ({
      label: entry.label,
      amount: Number(entry.amount),
    })),
    net_pay: Number(item.net_pay ?? 0),
    remarks: item.remarks ?? null,
    lop_dates: item.lop_dates ?? [],
  };
}

function normalizeRun(run: PayrollRun): PayrollRun {
  return {
    ...run,
    id: Number(run.id),
    month: Number(run.month),
    year: Number(run.year),
    finalized_by:
      run.finalized_by == null ? null : Number(run.finalized_by),
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message || `Request failed with status ${response.status}`
    );
  }

  return result as T;
}

function getToken(getState: () => RootState): string {
  const token = getState().auth.token;

  if (!token) {
    throw new Error("Authentication token is missing. Please log in again.");
  }

  return token;
}

// --------------------------------------------------
// Slice
// --------------------------------------------------

const payrollSlice = createSlice({
  name: "payroll",
  initialState,
  reducers: {
    startRunsRequest(state, action: PayloadAction<{ year: number; requestId: number }>) {
      if (state.runsYear !== action.payload.year) {
        state.runs = [];
        state.activeRun = null;
        state.items = [];
        state.detailsRequestId = 0;
        state.detailsLoading = false;
      }
      state.runsYear = action.payload.year;
      state.runsRequestId = action.payload.requestId;
      state.runsLoading = true;
      state.error = null;
    },
    startDetailsRequest(state, action: PayloadAction<{ runId: number; requestId: number }>) {
      state.detailsRequestId = action.payload.requestId;
      if (state.activeRun?.id !== action.payload.runId) {
        state.activeRun = null;
        state.items = [];
      }
      state.detailsLoading = true;
      state.error = null;
    },
    finishFetch(state, action: PayloadAction<{ kind: "runs" | "details"; error?: string }>) {
      if (action.payload.kind === "runs") {
        state.runsLoading = false;
      } else {
        state.detailsLoading = false;
      }
      if (action.payload.error) state.error = action.payload.error;
    },

    actionStart(state) {
      state.actionLoading = true;
      state.error = null;
      state.message = null;
    },

    actionSuccess(state, action: PayloadAction<string>) {
      state.actionLoading = false;
      state.error = null;
      state.message = action.payload;
    },

    payrollFailure(state, action: PayloadAction<string>) {
      state.actionLoading = false;
      state.error = action.payload;
    },

    setRuns(state, action: PayloadAction<PayrollRun[]>) {
      state.runs = action.payload;
    },

    setActiveRun(state, action: PayloadAction<PayrollRun | null>) {
      state.activeRun = action.payload;
    },

    setRunDetails(state, action: PayloadAction<RunDetails>) {
      state.activeRun = normalizeRun(action.payload.payroll_run);
      state.items = action.payload.payroll_items.map(normalizeItem);
    },

    setCreatedRun(state, action: PayloadAction<CreateRunResponse>) {
      const run = normalizeRun(action.payload.payroll_run);

      if (state.runsYear !== run.year) state.runs = [];
      state.runsYear = run.year;
      state.runsRequestId = 0;
      state.detailsRequestId = 0;
      state.runsLoading = false;
      state.detailsLoading = false;
      state.runs = [
        run,
        ...state.runs.filter((existing) => existing.id !== run.id),
      ];

      state.activeRun = run;
      state.items = (action.payload.payroll_items ?? []).map(normalizeItem);
    },

    updatePayrollItemInState(
      state,
      action: PayloadAction<Partial<PayrollItem> & { id: number }>
    ) {
      const updated = action.payload;

      state.items = state.items.map((item) =>
        item.id === Number(updated.id)
          ? normalizeItem({ ...item, ...updated })
          : item
      );
    },

    updateRunStatus(
      state,
      action: PayloadAction<{
        runId: number;
        status: "DRAFT" | "FINALIZED";
      }>
    ) {
      const run = state.runs.find(
        (item) => item.id === action.payload.runId
      );

      if (run) {
        run.status = action.payload.status;
      }

      if (state.activeRun?.id === action.payload.runId) {
        state.activeRun.status = action.payload.status;
      }
    },

    clearPayrollError(state) {
      state.error = null;
    },

    clearPayrollMessage(state) {
      state.message = null;
    },

    clearPayrollData(state) {
      state.runs = [];
      state.runsYear = null;
      state.runsRequestId = 0;
      state.detailsRequestId = 0;
      state.activeRun = null;
      state.items = [];
      state.runsLoading = false;
      state.detailsLoading = false;
      state.actionLoading = false;
      state.error = null;
      state.message = null;
    },
  },
});

export const {
  finishFetch,
  actionStart,
  actionSuccess,
  payrollFailure,
  setRuns,
  setActiveRun,
  setRunDetails,
  setCreatedRun,
  updatePayrollItemInState,
  updateRunStatus,
  clearPayrollError,
  clearPayrollMessage,
  clearPayrollData,
  startRunsRequest,
  startDetailsRequest,
} = payrollSlice.actions;

export default payrollSlice.reducer;
let nextPayrollRequestId = 0;

// --------------------------------------------------
// 1. GET /payroll/status/runs?year=2026
// --------------------------------------------------

export const fetchPayrollRuns =
  (year: number) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const requestId = ++nextPayrollRequestId;
    dispatch(startRunsRequest({ year, requestId }));

    try {
      const token = getToken(getState);

      const response = await apiRequest<ApiResponse<RunList>>(
        `/status/runs?year=${year}`,
        token
      );

      if (!Array.isArray(response.data?.payroll_runs)) {
        throw new Error("The server returned an invalid payroll run list for the selected year.");
      }
      const runs = response.data.payroll_runs.map(normalizeRun);
      if (runs.some((run) => run.year !== year)) {
        throw new Error("The server returned payroll runs for a different year.");
      }

      if (getState().payroll.runsRequestId === requestId) {
        dispatch(setRuns(runs));
        dispatch(finishFetch({ kind: "runs" }));
      }

      return runs;
    } catch (error) {
      if (getState().payroll.runsRequestId === requestId) {
        dispatch(finishFetch({ kind: "runs", error: getErrorMessage(error) }));
      }
      throw error;
    }
  };

// --------------------------------------------------
// 2. GET /payroll/runs/:id
// --------------------------------------------------

export const fetchPayrollRunDetails =
  (runId: number) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const requestId = ++nextPayrollRequestId;
    dispatch(startDetailsRequest({ runId, requestId }));

    try {
      const token = getToken(getState);

      const response = await apiRequest<ApiResponse<RunDetails>>(
        `/runs/${runId}`,
        token
      );

      if (getState().payroll.detailsRequestId === requestId) {
        if (Number(response.data.payroll_run.id) !== runId) {
          throw new Error("The server returned details for a different payroll run.");
        }
        dispatch(setRunDetails(response.data));
        dispatch(finishFetch({ kind: "details" }));
      }

      return response.data;
    } catch (error) {
      if (getState().payroll.detailsRequestId === requestId) {
        dispatch(finishFetch({ kind: "details", error: getErrorMessage(error) }));
      }
      throw error;
    }
  };

// --------------------------------------------------
// 3. POST /payroll/runs
// --------------------------------------------------

export const createPayrollRun =
  (payload: { month: number; year: number }) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    dispatch(actionStart());

    try {
      const token = getToken(getState);

      const response = await apiRequest<
        ApiResponse<CreateRunResponse>
      >("/runs", token, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      dispatch(setCreatedRun(response.data));
      dispatch(actionSuccess(response.message));

      return response.data;
    } catch (error) {
      dispatch(payrollFailure(getErrorMessage(error)));
      throw error;
    }
  };

// --------------------------------------------------
// 4. PATCH /payroll/items/:id
// --------------------------------------------------

export interface UpdatePayrollItemPayload {
  other_earnings?: OtherEarning[];
  other_deductions?: OtherDeduction[];
  remarks?: string | null;
}

export const updatePayrollItem =
  (itemId: number, payload: UpdatePayrollItemPayload) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    dispatch(actionStart());

    try {
      const token = getToken(getState);

      const response = await apiRequest<
        ApiResponse<UpdateItemResponse>
      >(`/items/${itemId}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      dispatch(
        updatePayrollItemInState({
          ...response.data.payroll_item,
          id: itemId,
        })
      );

      dispatch(actionSuccess(response.message));

      return response.data.payroll_item;
    } catch (error) {
      dispatch(payrollFailure(getErrorMessage(error)));
      throw error;
    }
  };

// --------------------------------------------------
// 5. POST /payroll/runs/:id/recompute
// --------------------------------------------------

export const recomputePayroll =
  (runId: number) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    dispatch(actionStart());

    try {
      const token = getToken(getState);

      const response = await apiRequest<
        ApiResponse<RecomputeResponse>
      >(`/runs/${runId}/recompute`, token, {
        method: "POST",
      });

      dispatch(actionSuccess(response.message));

      // Refresh the run because recomputation changes payroll values.
      await dispatch(fetchPayrollRunDetails(runId));

      return response.data;
    } catch (error) {
      dispatch(payrollFailure(getErrorMessage(error)));
      throw error;
    }
  };

// --------------------------------------------------
// 6. POST /payroll/runs/:id/finalize
// --------------------------------------------------

export const finalizePayroll =
  (runId: number) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    dispatch(actionStart());

    try {
      const token = getToken(getState);

      const response = await apiRequest<
        ApiResponse<FinalizeResponse>
      >(`/runs/${runId}/finalize`, token, {
        method: "POST",
      });

      dispatch(
        updateRunStatus({
          runId,
          status: "FINALIZED",
        })
      );

      dispatch(actionSuccess(response.message));

      return response.data;
    } catch (error) {
      dispatch(payrollFailure(getErrorMessage(error)));
      throw error;
    }
  };

// --------------------------------------------------
// 7. GET /payroll/runs/:id/export
// --------------------------------------------------

export const exportPayroll =
  (runId: number, fileName: string) =>
  async (_dispatch: AppDispatch, getState: () => RootState) => {
    const token = getToken(getState);

    const response = await fetch(
      `${API_BASE_URL}/runs/${runId}/export`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);

      throw new Error(
        errorBody?.message ||
          `Export failed with status ${response.status}`
      );
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = downloadUrl;
 const safeFileName = fileName?.trim() || "payroll-export.xlsx";

link.download = safeFileName.toLowerCase().endsWith(".xlsx")
  ? safeFileName
  : `${safeFileName}.xlsx`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(downloadUrl);

    return true;
  };
