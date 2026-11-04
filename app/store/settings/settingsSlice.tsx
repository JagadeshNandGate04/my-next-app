
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "../store";

// ============================================================
// TYPES
// ============================================================

export interface ShiftSettings {
  start: string;
  end: string;
}

export interface Settings {
  shift?: ShiftSettings;
  break_allowance_min?: number;
  grace_min?: number;
  full_day_hours?: number;
  half_day_hours?: number;
  weekly_off_days?: number[];
  duplicate_punch_window_min?: number;
  permission_monthly_min?: number;
  permission_unit_min?: number;
  leave_monthly_accrual?: number;
  leave_balance_cap?: number;
  payroll_divisor?: "CALENDAR_DAYS";
  [key: string]: unknown;
}

export interface Holiday {
  id: number;
  holiday_date: string;
  name: string;
  year: number;
  created_at?: string;
  updated_at?: string;
}

export interface SettingsResponse {
  success: boolean;
  message: string;
  data: {
    settings: Settings;
  };
}

export interface UpdateSettingsResponse {
  success: boolean;
  message: string;
  data: {
    updated_count: number;
    changes: {
      key: string;
      before: unknown;
      after: unknown;
      audit_id: number;
    }[];
  };
}

export interface HolidaysResponse {
  success: boolean;
  message: string;
  data: {
    year: number;
    holidays: Holiday[];
  };
}

export interface HolidayResponse {
  success: boolean;
  message: string;
  data: {
    holiday: Holiday;
    affected_users: number;
    audit_id: number;
  };
}

// ============================================================
// API CONFIGURATION
// ============================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SETTINGS_URL = `${API_URL}/api/v1/settings`;

// ============================================================
// API REQUEST HELPER
// ============================================================

async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error("API URL is not configured");
  }

  const response = await fetch(`${SETTINGS_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || result.error || result.code || "Something went wrong",
    );
  }

  return result as T;
}

// ============================================================
// INITIAL STATE AND ACTIONS
// ============================================================

interface SettingsState {
  settings: Settings;
  holidays: Holiday[];
  selectedYear: number;
  settingsLoading: boolean;
  settingsUpdating: boolean;
  holidaysLoading: boolean;
  holidayCreating: boolean;
  holidayDeleting: boolean;
  error: string | null;
  updateError: string | null;
  holidayError: string | null;
  successMessage: string | null;
  updatedCount: number;
  affectedUsers: number;
}

const initialState: SettingsState = {
  settings: {},
  holidays: [],
  selectedYear: new Date().getFullYear(),
  settingsLoading: false,
  settingsUpdating: false,
  holidaysLoading: false,
  holidayCreating: false,
  holidayDeleting: false,
  error: null,
  updateError: null,
  holidayError: null,
  successMessage: null,
  updatedCount: 0,
  affectedUsers: 0,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    fetchSettingsStart: (state) => {
      state.settingsLoading = true;
      state.error = null;
    },
    fetchSettingsSuccess: (state, action: PayloadAction<SettingsResponse>) => {
      state.settingsLoading = false;
      state.settings = action.payload.data.settings;
    },
    fetchSettingsFailure: (state, action: PayloadAction<string>) => {
      state.settingsLoading = false;
      state.error = action.payload;
    },
    updateSettingsStart: (state) => {
      state.settingsUpdating = true;
      state.updateError = null;
      state.successMessage = null;
    },
    updateSettingsSuccess: (state, action: PayloadAction<UpdateSettingsResponse>) => {
      state.settingsUpdating = false;
      for (const change of action.payload.data.changes) {
        state.settings[change.key] = change.after;
      }
      state.updatedCount = action.payload.data.updated_count;
      state.successMessage = action.payload.message;
    },
    updateSettingsFailure: (state, action: PayloadAction<string>) => {
      state.settingsUpdating = false;
      state.updateError = action.payload;
    },
    fetchHolidaysStart: (state) => {
      state.holidaysLoading = true;
      state.holidayError = null;
    },
    fetchHolidaysSuccess: (state, action: PayloadAction<HolidaysResponse>) => {
      state.holidaysLoading = false;
      state.holidays = action.payload.data.holidays;
      state.selectedYear = action.payload.data.year;
    },
    fetchHolidaysFailure: (state, action: PayloadAction<string>) => {
      state.holidaysLoading = false;
      state.holidayError = action.payload;
    },
    createHolidayStart: (state) => {
      state.holidayCreating = true;
      state.holidayError = null;
      state.successMessage = null;
    },
    createHolidaySuccess: (state, action: PayloadAction<HolidayResponse>) => {
      state.holidayCreating = false;
      const newHoliday = action.payload.data.holiday;
      if (newHoliday.year === state.selectedYear) {
        state.holidays.push(newHoliday);
        state.holidays.sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
      }
      state.affectedUsers = action.payload.data.affected_users;
      state.successMessage = action.payload.message;
    },
    createHolidayFailure: (state, action: PayloadAction<string>) => {
      state.holidayCreating = false;
      state.holidayError = action.payload;
    },
    deleteHolidayStart: (state) => {
      state.holidayDeleting = true;
      state.holidayError = null;
      state.successMessage = null;
    },
    deleteHolidaySuccess: (state, action: PayloadAction<HolidayResponse>) => {
      state.holidayDeleting = false;
      const deletedId = action.payload.data.holiday.id;
      state.holidays = state.holidays.filter((holiday) => holiday.id !== deletedId);
      state.affectedUsers = action.payload.data.affected_users;
      state.successMessage = action.payload.message;
    },
    deleteHolidayFailure: (state, action: PayloadAction<string>) => {
      state.holidayDeleting = false;
      state.holidayError = action.payload;
    },
    clearSettingsError: (state) => {
      state.error = null;
      state.updateError = null;
      state.holidayError = null;
    },
    clearSettingsMessage: (state) => {
      state.successMessage = null;
      state.updatedCount = 0;
      state.affectedUsers = 0;
    },
    setSelectedYear: (state, action: PayloadAction<number>) => {
      state.selectedYear = action.payload;
    },
    clearSettings: (state) => {
      state.settings = {};
      state.holidays = [];
      state.error = null;
      state.updateError = null;
      state.holidayError = null;
      state.successMessage = null;
    },
  },
});

export const {
  clearSettingsError,
  clearSettingsMessage,
  setSelectedYear,
  clearSettings,
  fetchSettingsStart,
  fetchSettingsSuccess,
  fetchSettingsFailure,
  updateSettingsStart,
  updateSettingsSuccess,
  updateSettingsFailure,
  fetchHolidaysStart,
  fetchHolidaysSuccess,
  fetchHolidaysFailure,
  createHolidayStart,
  createHolidaySuccess,
  createHolidayFailure,
  deleteHolidayStart,
  deleteHolidaySuccess,
  deleteHolidayFailure,
} = settingsSlice.actions;

export default settingsSlice.reducer;

// ============================================================
// FETCH SETTINGS
// ============================================================

export const fetchSettings =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<SettingsResponse | null> => {
    dispatch(fetchSettingsStart());

  try {
    const token = getState().auth.token;

    if (!token) {
      throw new Error("Authentication token not found");
    }

    const result = await apiRequest<SettingsResponse>(
      "/get/settings",
      token,
      { method: "GET" },
    );
    dispatch(fetchSettingsSuccess(result));
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch settings";
    dispatch(fetchSettingsFailure(message));
    return null;
  }
};

// ============================================================
// UPDATE SETTINGS
// ============================================================

export const updateSettings =
  ({ settings }: { settings: Partial<Settings> }) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<UpdateSettingsResponse> => {
    dispatch(updateSettingsStart());

    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const result = await apiRequest<UpdateSettingsResponse>(
        "/update/settings",
        token,
        {
          method: "PUT",
          body: JSON.stringify({ settings }),
        },
      );
      dispatch(updateSettingsSuccess(result));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update settings";
      dispatch(updateSettingsFailure(message));
      throw new Error(message);
    }
  };

// ============================================================
// FETCH HOLIDAYS
// ============================================================

export const fetchHolidays =
  (year: number) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<HolidaysResponse | null> => {
    dispatch(fetchHolidaysStart());

    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const result = await apiRequest<HolidaysResponse>(
        `/getHolidays?year=${year}`,
        token,
        { method: "GET" },
      );
      dispatch(fetchHolidaysSuccess(result));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch holidays";
      dispatch(fetchHolidaysFailure(message));
      return null;
    }
  };

// ============================================================
// CREATE HOLIDAY
// ============================================================

export interface CreateHolidayPayload {
  holiday_date: string;
  name: string;
}

export const createHoliday =
  (holidayData: CreateHolidayPayload) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<HolidayResponse> => {
    dispatch(createHolidayStart());

    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const result = await apiRequest<HolidayResponse>(
        "/createHoliday",
        token,
        {
          method: "POST",
          body: JSON.stringify(holidayData),
        },
      );
      dispatch(createHolidaySuccess(result));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create holiday";
      dispatch(createHolidayFailure(message));
      throw new Error(message);
    }
  };

// ============================================================
// DELETE HOLIDAY
// ============================================================

export const deleteHoliday =
  (holidayId: number) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<HolidayResponse> => {
    dispatch(deleteHolidayStart());

    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const result = await apiRequest<HolidayResponse>(
        `/deleteHoliday/${holidayId}`,
        token,
        { method: "DELETE" },
      );
      dispatch(deleteHolidaySuccess(result));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete holiday";
      dispatch(deleteHolidayFailure(message));
      throw new Error(message);
    }
  };
