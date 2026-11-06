
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppDispatch } from "../store";
import type { RootState } from "@/app/store/store";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";

const ATTENDANCE_API = `${API_URL}/api/v1/attendance`;

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export type AttendanceStatus =
  | "PRESENT"
  | "HALF_DAY"
  | "ABSENT"
  | "LEAVE"
  | "HOLIDAY"
  | "WEEKLY_OFF"
  | "INSUFFICIENT";

export type PunchDirection = "IN" | "OUT";

export interface AttendanceFlags {
  is_late: boolean;
  excess_break: boolean;
  needs_regularization: boolean;
}

export interface AttendanceLopValues {
  calculated_lop_value?: number | string | null;
  adjusted_lop_value?: number | string | null;
  lop_value?: number | string | null;
  lop_adjustment?: unknown;
}

export interface EmployeeAttendance extends AttendanceLopValues {
  user_id: number | string;
  emp_code: string;
  name: string;
  designation: string;
  status: AttendanceStatus;
  live_status: "IN" | "OUT";
  first_in: string | null;
  last_out: string | null;
  work_min: number;
  flags: AttendanceFlags;
  is_locked: boolean;
}

export interface DailyAttendanceData {
  date: string;
  employees: EmployeeAttendance[];
  total: number;
}

export interface CorrectionPunch {
  id: number;
  user_id: number;
  punched_at: string;
  direction: PunchDirection;
  source?: string;
  reason: string;
  created_by?: number;
  is_voided: boolean;
  created_at?: string;
}

export interface AttendanceDay extends AttendanceLopValues {
  date: string;
  summary: (Record<string, unknown> & AttendanceLopValues & {
    first_in?: string | null;
    last_out?: string | null;
    is_late?: boolean;
    excess_break?: boolean;
    needs_regularization?: boolean;
  }) | null;
  punches: Record<string, unknown>[];
  raw_punches: Record<string, unknown>[];
  corrections: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  leave: Record<string, unknown>[];
  permissions: Record<string, unknown>[];
  flags: AttendanceFlags & {
    is_locked: boolean;
  };
}

export interface MonthlyAttendanceData {
  employee: {
    id: number;
    emp_code: string;
    name: string;
    email: string;
    phone?: string | null;
    designation: string;
    date_of_joining?: string | null;
    status: string;
  };
  month: number;
  year: number;
  totals: {
    present: number;
    half: number;
    absent: number;
    leave: number;
    holiday: number;
    weekly_off: number;
    insufficient: number;
    late_count: number;
    work_minutes: number;
    work_hours: number;
    lop_value: number;
  };
  days: AttendanceDay[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface MonthlyAttendanceParams {
  user_id: number;
  month: number;
  year: number;
}

interface AddCorrectionPayload {
  user_id: number;
  punched_at: string;
  direction: PunchDirection;
  reason: string;
}

interface AdjustLopPayload {
  user_id: number;
  work_date: string;
  new_lop: number;
  reason: string;
}

interface VoidCorrectionPayload {
  id: number;
  reason: string;
}

// --------------------------------------------------
// API HELPER
// --------------------------------------------------

const getAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const result = await response.json();
    return result.message || "Something went wrong";
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

// --------------------------------------------------
// REDUX STATE AND ACTIONS
// --------------------------------------------------

interface AttendanceState {
  dailyAttendance: DailyAttendanceData | null;
  monthlyAttendance: MonthlyAttendanceData | null;
  dailyLoading: boolean;
  monthlyLoading: boolean;
  correctionLoading: boolean;
  voidLoading: boolean;
  dailyError: string | null;
  monthlyError: string | null;
  correctionError: string | null;
  voidError: string | null;
  correctionSuccess: string | null;
  voidSuccess: string | null;
}

const initialState: AttendanceState = {
  dailyAttendance: null,
  monthlyAttendance: null,
  dailyLoading: false,
  monthlyLoading: false,
  correctionLoading: false,
  voidLoading: false,
  dailyError: null,
  monthlyError: null,
  correctionError: null,
  voidError: null,
  correctionSuccess: null,
  voidSuccess: null,
};

const attendanceSlice = createSlice({
  name: "attendance",
  initialState,
  reducers: {
    fetchDailyAttendanceStart: (state) => {
      state.dailyLoading = true;
      state.dailyError = null;
    },
    fetchDailyAttendanceSuccess: (
      state,
      action: PayloadAction<DailyAttendanceData>
    ) => {
      state.dailyLoading = false;
      state.dailyAttendance = action.payload;
    },
    fetchDailyAttendanceFailure: (state, action: PayloadAction<string>) => {
      state.dailyLoading = false;
      state.dailyError = action.payload;
    },
    fetchMonthlyAttendanceStart: (state) => {
      state.monthlyLoading = true;
      state.monthlyError = null;
    },
    fetchMonthlyAttendanceSuccess: (
      state,
      action: PayloadAction<MonthlyAttendanceData>
    ) => {
      state.monthlyLoading = false;
      state.monthlyAttendance = action.payload;
    },
    fetchMonthlyAttendanceFailure: (state, action: PayloadAction<string>) => {
      state.monthlyLoading = false;
      state.monthlyError = action.payload;
    },
    addAttendanceCorrectionStart: (state) => {
      state.correctionLoading = true;
      state.correctionError = null;
      state.correctionSuccess = null;
    },
    addAttendanceCorrectionSuccess: (
      state,
      action: PayloadAction<{ message?: string }>
    ) => {
      state.correctionLoading = false;
      state.correctionSuccess =
        action.payload.message || "Attendance correction added successfully";
    },
    addAttendanceCorrectionFailure: (state, action: PayloadAction<string>) => {
      state.correctionLoading = false;
      state.correctionError = action.payload;
    },
    clearCorrectionFeedback: (state) => {
      state.correctionError = null;
      state.correctionSuccess = null;
    },
    voidAttendanceCorrectionStart: (state) => {
      state.voidLoading = true;
      state.voidError = null;
      state.voidSuccess = null;
    },
    voidAttendanceCorrectionSuccess: (
      state,
      action: PayloadAction<{ message?: string }>
    ) => {
      state.voidLoading = false;
      state.voidSuccess =
        action.payload.message || "Attendance correction voided successfully";
    },
    voidAttendanceCorrectionFailure: (state, action: PayloadAction<string>) => {
      state.voidLoading = false;
      state.voidError = action.payload;
    },
    clearAttendanceErrors: (state) => {
      state.dailyError = null;
      state.monthlyError = null;
      state.correctionError = null;
      state.voidError = null;
    },
    clearAttendanceMessages: (state) => {
      state.correctionSuccess = null;
      state.voidSuccess = null;
    },
    clearMonthlyAttendance: (state) => {
      state.monthlyAttendance = null;
    },
  },
});

export const {
  clearAttendanceErrors,
  clearAttendanceMessages,
  clearMonthlyAttendance,
  fetchDailyAttendanceStart,
  fetchDailyAttendanceSuccess,
  fetchDailyAttendanceFailure,
  fetchMonthlyAttendanceStart,
  fetchMonthlyAttendanceSuccess,
  fetchMonthlyAttendanceFailure,
  addAttendanceCorrectionStart,
  addAttendanceCorrectionSuccess,
  addAttendanceCorrectionFailure,
  clearCorrectionFeedback,
  voidAttendanceCorrectionStart,
  voidAttendanceCorrectionSuccess,
  voidAttendanceCorrectionFailure,
} = attendanceSlice.actions;

export default attendanceSlice.reducer;

// --------------------------------------------------
// 1. GET ADMIN DAILY ATTENDANCE
// --------------------------------------------------

export const fetchDailyAttendance =
  (date: string) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<DailyAttendanceData | null> => {
    dispatch(fetchDailyAttendanceStart());

    try {
      const token = getState().auth.token;

      if (!token) throw new Error("Authentication token not found");

      const response = await fetch(
        `${ATTENDANCE_API}/admin/daily?date=${encodeURIComponent(date)}`,
        {
          method: "GET",
          headers: getAuthHeaders(token),
          cache: "no-store",
        }
      );

      if (!response.ok) throw new Error(await getErrorMessage(response));

      const result: ApiResponse<DailyAttendanceData> = await response.json();
      dispatch(fetchDailyAttendanceSuccess(result.data));
      return result.data;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Unable to fetch daily attendance";
      dispatch(fetchDailyAttendanceFailure(message));
      return null;
    }
  };

// --------------------------------------------------
// 2. GET ADMIN MONTHLY ATTENDANCE
// --------------------------------------------------

export const fetchMonthlyAttendance =
  ({ user_id, month, year }: MonthlyAttendanceParams) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<MonthlyAttendanceData | null> => {
    dispatch(fetchMonthlyAttendanceStart());

    try {
      const token = getState().auth.token;

      if (!token) throw new Error("Authentication token not found");

      const query = new URLSearchParams({
        user_id: String(user_id),
        month: String(month),
        year: String(year),
      });

      const response = await fetch(
        `${ATTENDANCE_API}/admin/monthly?${query.toString()}`,
        {
          method: "GET",
          headers: getAuthHeaders(token),
          cache: "no-store",
        }
      );

      if (!response.ok) throw new Error(await getErrorMessage(response));

      const result: ApiResponse<MonthlyAttendanceData> = await response.json();
      dispatch(fetchMonthlyAttendanceSuccess(result.data));
      return result.data;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Unable to fetch monthly attendance";
      dispatch(fetchMonthlyAttendanceFailure(message));
      return null;
    }
  };

// --------------------------------------------------
// 3. ADD MANUAL ATTENDANCE CORRECTION
// --------------------------------------------------

export const adjustAttendanceLop =
  (payload: AdjustLopPayload) =>
  async (_dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const token = getState().auth.token;
    if (!token) throw new Error("Authentication token not found. Please log in again.");

    let response: Response;
    try {
      response = await fetch(`${ATTENDANCE_API}/admin/lop-adjustment`, {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error("Unable to confirm whether the LOP adjustment was saved. Refresh attendance before trying again.");
    }

    let result: unknown;
    try {
      result = await response.json();
    } catch {
      throw new Error(response.ok
        ? "The adjustment may have been saved, but the server response was invalid. Refresh attendance before trying again."
        : `Unable to adjust LOP (HTTP ${response.status}).`);
    }

    if (!result || typeof result !== "object" || !("success" in result)) {
      throw new Error(response.ok
        ? "The adjustment may have been saved, but the server response was invalid. Refresh attendance before trying again."
        : `Unable to adjust LOP (HTTP ${response.status}).`);
    }
    if (!response.ok || result.success !== true) {
      const message = "message" in result && typeof result.message === "string"
        ? result.message : `Unable to adjust LOP (HTTP ${response.status}).`;
      const code = "error" in result && typeof result.error === "string" ? result.error : null;
      throw new Error(code ? `${message} (${code})` : message);
    }
  };

export const addAttendanceCorrection =
  (payload: AddCorrectionPayload) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<{ message?: string }> => {
    dispatch(addAttendanceCorrectionStart());

    try {
      const token = getState().auth.token;

      if (!token) throw new Error("Authentication token not found");

      const response = await fetch(`${ATTENDANCE_API}/admin/correction`, {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(await getErrorMessage(response));

      const result: { message?: string } = await response.json();
      dispatch(addAttendanceCorrectionSuccess(result));

      return result;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Unable to add attendance correction";
      dispatch(addAttendanceCorrectionFailure(message));
      throw new Error(message);
    }
  };
// --------------------------------------------------
// 4. VOID ATTENDANCE CORRECTION
// --------------------------------------------------

export const voidAttendanceCorrection =
  ({ id, reason }: VoidCorrectionPayload) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<{ message?: string }> => {
    dispatch(voidAttendanceCorrectionStart());

    try {
      const token = getState().auth.token;

      if (!token) throw new Error("Authentication token not found");

      const response = await fetch(`${ATTENDANCE_API}/admin/correction/${id}/void`, {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) throw new Error(await getErrorMessage(response));

      const result: { message?: string } = await response.json();
      dispatch(voidAttendanceCorrectionSuccess(result));

      const currentDate = getState().attendance.dailyAttendance?.date;
      if (currentDate) dispatch(fetchDailyAttendance(currentDate));

      return result;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Unable to void attendance correction";
      dispatch(voidAttendanceCorrectionFailure(message));
      throw new Error(message);
    }
  };
