import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export interface WorkdaySwapEmployee {
  id: string;
  emp_code: string;
  name: string;
}

export interface WorkdaySwap {
  id: string;
  holiday_date: string;
  replacement_date: string;
  reason: string;
  employees: WorkdaySwapEmployee[];
}

export interface CreateWorkdaySwapPayload {
  holiday_date: string;
  replacement_date: string;
  user_ids: (number | string)[];
  reason: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const isId = (value: unknown): value is string =>
  typeof value === "string" && /^[1-9]\d*$/.test(value);

function isWorkdaySwap(value: unknown): value is WorkdaySwap {
  return isRecord(value) &&
    isId(value.id) &&
    isDate(value.holiday_date) &&
    isDate(value.replacement_date) &&
    typeof value.reason === "string" &&
    Array.isArray(value.employees) &&
    value.employees.every(
      (employee: unknown) =>
        isRecord(employee) && isId(employee.id) &&
        typeof employee.emp_code === "string" && typeof employee.name === "string",
    );
}

async function request(
  path: string,
  token: string | null,
  options: RequestInit,
): Promise<unknown> {
  if (!token) throw new Error("Authentication token not found. Please log in again.");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new Error("API URL is not configured.");
  const isMutation = options.method !== "GET";
  let response: Response;
  try {
    response = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/v1/settings${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(isMutation
      ? "The request could not be confirmed. Refresh the swap list before retrying."
      : "Could not connect to the workday swap server.");
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error(isMutation
      ? "The server returned an invalid response. Refresh the swap list before retrying."
      : `The server returned an invalid response (${response.status}).`);
  }
  if (!response.ok || !isRecord(result) || result.success !== true) {
    const message = isRecord(result) && typeof result.message === "string"
      ? result.message
      : `Workday swap request failed (${response.status}).`;
    throw new Error(message);
  }
  return result;
}

export const fetchWorkdaySwaps = createAsyncThunk<
  { year: number; swaps: WorkdaySwap[] },
  number,
  { state: RootState }
>("workdaySwaps/fetch", async (year, { getState }) => {
  const result = await request(`/getWorkdaySwaps?year=${encodeURIComponent(year)}`, getState().auth.token, { method: "GET" });
  if (!isRecord(result) || !isRecord(result.data) || result.data.year !== year ||
      !Array.isArray(result.data.workday_swaps) || !result.data.workday_swaps.every(isWorkdaySwap)) {
    throw new Error("The server returned an invalid workday swap list.");
  }
  return { year, swaps: result.data.workday_swaps };
});

export const createWorkdaySwap = createAsyncThunk<
  WorkdaySwap,
  CreateWorkdaySwapPayload,
  { state: RootState }
>("workdaySwaps/create", async (payload, { getState }) => {
  if (!isDate(payload.holiday_date) || !isDate(payload.replacement_date) ||
      payload.holiday_date === payload.replacement_date) {
    throw new Error("Choose two different valid dates.");
  }
  if (!payload.reason.trim()) throw new Error("Enter a reason for the swap.");
  if (!payload.user_ids.length) throw new Error("Select at least one employee.");
  const userIds = payload.user_ids.map((id) => {
    if ((typeof id !== "string" && typeof id !== "number") ||
        (typeof id === "string" && !/^[1-9]\d*$/.test(id))) {
      throw new Error("A selected employee has an invalid ID. Refresh the employee list and try again.");
    }
    const numericId = Number(id);
    if (!Number.isSafeInteger(numericId) || numericId <= 0) {
      throw new Error("A selected employee has an invalid or unsupported ID. Refresh the employee list and try again.");
    }
    return numericId;
  });
  const result = await request("/createWorkdaySwap", getState().auth.token, {
    method: "POST",
    body: JSON.stringify({ ...payload, user_ids: userIds }),
  });
  if (!isRecord(result) || !isRecord(result.data) || !isWorkdaySwap(result.data.workday_swap)) {
    throw new Error("The swap may have been created, but the server response was invalid. Refresh the list before retrying.");
  }
  return result.data.workday_swap;
});

export const deleteWorkdaySwap = createAsyncThunk<
  string,
  string,
  { state: RootState }
>("workdaySwaps/delete", async (id, { getState }) => {
  if (!isId(id)) throw new Error("Invalid workday swap ID.");
  const result = await request(`/deleteWorkdaySwap/${encodeURIComponent(id)}`, getState().auth.token, { method: "DELETE" });
  if (!isRecord(result) || !isRecord(result.data) ||
      !isWorkdaySwap(result.data.workday_swap) || result.data.workday_swap.id !== id) {
    throw new Error("The swap may have been deleted, but the server response was invalid. Refresh the list before retrying.");
  }
  return id;
});

interface WorkdaySwapState {
  swaps: WorkdaySwap[];
  year: number | null;
  loading: boolean;
  requestId: string | null;
  error: string | null;
  creating: boolean;
  deletingId: string | null;
}

const initialState: WorkdaySwapState = {
  swaps: [], year: null, loading: false, requestId: null, error: null,
  creating: false, deletingId: null,
};

const workdaySwapSlice = createSlice({
  name: "workdaySwaps",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkdaySwaps.pending, (state, action) => {
        state.loading = true;
        state.requestId = action.meta.requestId;
        state.year = action.meta.arg;
        state.swaps = [];
        state.error = null;
      })
      .addCase(fetchWorkdaySwaps.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.loading = false;
        state.swaps = action.payload.swaps;
        state.requestId = null;
      })
      .addCase(fetchWorkdaySwaps.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.loading = false;
        state.error = action.error.message ?? "Failed to fetch workday swaps.";
        state.requestId = null;
      })
      .addCase(createWorkdaySwap.pending, (state) => { state.creating = true; })
      .addCase(createWorkdaySwap.fulfilled, (state, action) => {
        state.creating = false;
        if (state.year === Number(action.payload.holiday_date.slice(0, 4))) {
          state.swaps.unshift(action.payload);
        }
      })
      .addCase(createWorkdaySwap.rejected, (state) => { state.creating = false; })
      .addCase(deleteWorkdaySwap.pending, (state, action) => { state.deletingId = action.meta.arg; })
      .addCase(deleteWorkdaySwap.fulfilled, (state, action) => {
        state.deletingId = null;
        state.swaps = state.swaps.filter((swap) => swap.id !== action.payload);
      })
      .addCase(deleteWorkdaySwap.rejected, (state) => { state.deletingId = null; });
  },
});

export default workdaySwapSlice.reducer;
