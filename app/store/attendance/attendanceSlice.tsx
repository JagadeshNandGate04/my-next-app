
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
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

export interface EmployeeAttendance {
  user_id: number;
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

export interface AttendanceDay {
  date: string;
  summary: Record<string, unknown> | null;
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
// 1. GET ADMIN DAILY ATTENDANCE
// --------------------------------------------------

export const fetchDailyAttendance = createAsyncThunk<
  DailyAttendanceData,
  string,
  { state: RootState; rejectValue: string }
>(
  "attendance/fetchDailyAttendance",
  async (date, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue("Authentication token not found");
      }

      const response = await fetch(
        `${ATTENDANCE_API}/admin/daily?date=${encodeURIComponent(date)}`,
        {
          method: "GET",
          headers: getAuthHeaders(token),
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response));
      }

      const result: ApiResponse<DailyAttendanceData> =
        await response.json();

      return result.data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Unable to fetch daily attendance"
      );
    }
  }
);

// --------------------------------------------------
// 2. GET ADMIN MONTHLY ATTENDANCE
// --------------------------------------------------

export const fetchMonthlyAttendance = createAsyncThunk<
  MonthlyAttendanceData,
  MonthlyAttendanceParams,
  { state: RootState; rejectValue: string }
>(
  "attendance/fetchMonthlyAttendance",
  async ({ user_id, month, year }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue("Authentication token not found");
      }

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

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response));
      }

      const result: ApiResponse<MonthlyAttendanceData> =
        await response.json();

      return result.data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Unable to fetch monthly attendance"
      );
    }
  }
);

// --------------------------------------------------
// 3. ADD MANUAL ATTENDANCE CORRECTION
// --------------------------------------------------

export const addAttendanceCorrection = createAsyncThunk<
  unknown,
  AddCorrectionPayload,
  {
    state: RootState;
    dispatch: any;
    rejectValue: string;
  }
>(
  "attendance/addAttendanceCorrection",
  async (payload, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue("Authentication token not found");
      }

      const response = await fetch(
        `${ATTENDANCE_API}/admin/correction`,
        {
          method: "POST",
          headers: getAuthHeaders(token),
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response));
      }

      const result = await response.json();

      // Refresh the daily attendance for the punch date.
      const punchDate = payload.punched_at.slice(0, 10);

      dispatch(fetchDailyAttendance(punchDate));

      return result;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Unable to add attendance correction"
      );
    }
  }
);

// --------------------------------------------------
// 4. VOID ATTENDANCE CORRECTION
// --------------------------------------------------

export const voidAttendanceCorrection = createAsyncThunk<
  unknown,
  VoidCorrectionPayload,
  {
    state: RootState;
    dispatch: any;
    rejectValue: string;
  }
>(
  "attendance/voidAttendanceCorrection",
  async ({ id, reason }, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue("Authentication token not found");
      }

      const response = await fetch(
        `${ATTENDANCE_API}/admin/correction/${id}/void`,
        {
          method: "POST",
          headers: getAuthHeaders(token),
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        return rejectWithValue(await getErrorMessage(response));
      }

      const result = await response.json();

      // Refresh the currently displayed attendance date.
      const currentDate = getState().attendance.dailyAttendance?.date;

      if (currentDate) {
        dispatch(fetchDailyAttendance(currentDate));
      }

      return result;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Unable to void attendance correction"
      );
    }
  }
);

// --------------------------------------------------
// REDUX STATE
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

// --------------------------------------------------
// ATTENDANCE SLICE
// --------------------------------------------------

const attendanceSlice = createSlice({
  name: "attendance",
  initialState,
  reducers: {
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

  extraReducers: (builder) => {
    // DAILY ATTENDANCE

    builder
      .addCase(fetchDailyAttendance.pending, (state) => {
        state.dailyLoading = true;
        state.dailyError = null;
      })
      .addCase(fetchDailyAttendance.fulfilled, (state, action) => {
        state.dailyLoading = false;
        state.dailyAttendance = action.payload;
      })
      .addCase(fetchDailyAttendance.rejected, (state, action) => {
        state.dailyLoading = false;
        state.dailyError =
          action.payload || "Failed to fetch daily attendance";
      });

    // MONTHLY ATTENDANCE

    builder
      .addCase(fetchMonthlyAttendance.pending, (state) => {
        state.monthlyLoading = true;
        state.monthlyError = null;
      })
      .addCase(fetchMonthlyAttendance.fulfilled, (state, action) => {
        state.monthlyLoading = false;
        state.monthlyAttendance = action.payload;
      })
      .addCase(fetchMonthlyAttendance.rejected, (state, action) => {
        state.monthlyLoading = false;
        state.monthlyError =
          action.payload || "Failed to fetch monthly attendance";
      });

    // ADD CORRECTION

    builder
      .addCase(addAttendanceCorrection.pending, (state) => {
        state.correctionLoading = true;
        state.correctionError = null;
        state.correctionSuccess = null;
      })
      .addCase(addAttendanceCorrection.fulfilled, (state, action) => {
        state.correctionLoading = false;
        state.correctionSuccess =
          (action.payload as { message?: string })?.message ||
          "Attendance correction added successfully";
      })
      .addCase(addAttendanceCorrection.rejected, (state, action) => {
        state.correctionLoading = false;
        state.correctionError =
          action.payload || "Failed to add attendance correction";
      });

    // VOID CORRECTION

    builder
      .addCase(voidAttendanceCorrection.pending, (state) => {
        state.voidLoading = true;
        state.voidError = null;
        state.voidSuccess = null;
      })
      .addCase(voidAttendanceCorrection.fulfilled, (state, action) => {
        state.voidLoading = false;
        state.voidSuccess =
          (action.payload as { message?: string })?.message ||
          "Attendance correction voided successfully";
      })
      .addCase(voidAttendanceCorrection.rejected, (state, action) => {
        state.voidLoading = false;
        state.voidError =
          action.payload || "Failed to void attendance correction";
      });
  },
});

export const {
  clearAttendanceErrors,
  clearAttendanceMessages,
  clearMonthlyAttendance,
} = attendanceSlice.actions;

export default attendanceSlice.reducer;
