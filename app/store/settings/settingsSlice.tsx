
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

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
// FETCH SETTINGS
// ============================================================

export const fetchSettings = createAsyncThunk<
  SettingsResponse,
  void,
  { state: RootState; rejectValue: string }
>("settings/fetchSettings", async (_, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token;

    if (!token) {
      return rejectWithValue("Authentication token not found");
    }

    return await apiRequest<SettingsResponse>(
      "/get/settings",
      token,
      { method: "GET" },
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch settings",
    );
  }
});

// ============================================================
// UPDATE SETTINGS
// ============================================================

export const updateSettings = createAsyncThunk<
  UpdateSettingsResponse,
  { settings: Partial<Settings> },
  { state: RootState; rejectValue: string }
>(
  "settings/updateSettings",
  async ({ settings }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue("Authentication token not found");
      }

      return await apiRequest<UpdateSettingsResponse>(
        "/update/settings",
        token,
        {
          method: "PUT",
          body: JSON.stringify({ settings }),
        },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update settings",
      );
    }
  },
);

// ============================================================
// FETCH HOLIDAYS
// ============================================================

export const fetchHolidays = createAsyncThunk<
  HolidaysResponse,
  number,
  { state: RootState; rejectValue: string }
>(
  "settings/fetchHolidays",
  async (year, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue("Authentication token not found");
      }

      return await apiRequest<HolidaysResponse>(
        `/getHolidays?year=${year}`,
        token,
        { method: "GET" },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch holidays",
      );
    }
  },
);

// ============================================================
// CREATE HOLIDAY
// ============================================================

export interface CreateHolidayPayload {
  holiday_date: string;
  name: string;
}

export const createHoliday = createAsyncThunk<
  HolidayResponse,
  CreateHolidayPayload,
  { state: RootState; rejectValue: string }
>(
  "settings/createHoliday",
  async (holidayData, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue("Authentication token not found");
      }

      return await apiRequest<HolidayResponse>(
        "/createHoliday",
        token,
        {
          method: "POST",
          body: JSON.stringify(holidayData),
        },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create holiday",
      );
    }
  },
);

// ============================================================
// DELETE HOLIDAY
// ============================================================

export const deleteHoliday = createAsyncThunk<
  HolidayResponse,
  number,
  { state: RootState; rejectValue: string }
>(
  "settings/deleteHoliday",
  async (holidayId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue("Authentication token not found");
      }

      return await apiRequest<HolidayResponse>(
        `/deleteHoliday/${holidayId}`,
        token,
        { method: "DELETE" },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete holiday",
      );
    }
  },
);

// ============================================================
// INITIAL STATE
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

// ============================================================
// SETTINGS SLICE
// ============================================================

const settingsSlice = createSlice({
  name: "settings",
  initialState,

  reducers: {
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

  extraReducers: (builder) => {
    // --------------------------------------------------------
    // FETCH SETTINGS
    // --------------------------------------------------------

    builder
      .addCase(fetchSettings.pending, (state) => {
        state.settingsLoading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        state.settings = action.payload.data.settings;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.error = action.payload || "Failed to fetch settings";
      });

    // --------------------------------------------------------
    // UPDATE SETTINGS
    // --------------------------------------------------------

    builder
      .addCase(updateSettings.pending, (state) => {
        state.settingsUpdating = true;
        state.updateError = null;
        state.successMessage = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.settingsUpdating = false;

        // Update local settings after successful API response.
        for (const change of action.payload.data.changes) {
          state.settings[change.key] = change.after;
        }

        state.updatedCount = action.payload.data.updated_count;
        state.successMessage = action.payload.message;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.settingsUpdating = false;
        state.updateError = action.payload || "Failed to update settings";
      });

    // --------------------------------------------------------
    // FETCH HOLIDAYS
    // --------------------------------------------------------

    builder
      .addCase(fetchHolidays.pending, (state) => {
        state.holidaysLoading = true;
        state.holidayError = null;
      })
      .addCase(fetchHolidays.fulfilled, (state, action) => {
        state.holidaysLoading = false;
        state.holidays = action.payload.data.holidays;
        state.selectedYear = action.payload.data.year;
      })
      .addCase(fetchHolidays.rejected, (state, action) => {
        state.holidaysLoading = false;
        state.holidayError = action.payload || "Failed to fetch holidays";
      });

    // --------------------------------------------------------
    // CREATE HOLIDAY
    // --------------------------------------------------------

    builder
      .addCase(createHoliday.pending, (state) => {
        state.holidayCreating = true;
        state.holidayError = null;
        state.successMessage = null;
      })
      .addCase(createHoliday.fulfilled, (state, action) => {
        state.holidayCreating = false;

        const newHoliday = action.payload.data.holiday;

        if (newHoliday.year === state.selectedYear) {
          state.holidays.push(newHoliday);

          state.holidays.sort((a, b) =>
            a.holiday_date.localeCompare(b.holiday_date),
          );
        }

        state.affectedUsers = action.payload.data.affected_users;
        state.successMessage = action.payload.message;
      })
      .addCase(createHoliday.rejected, (state, action) => {
        state.holidayCreating = false;
        state.holidayError = action.payload || "Failed to create holiday";
      });

    // --------------------------------------------------------
    // DELETE HOLIDAY
    // --------------------------------------------------------

    builder
      .addCase(deleteHoliday.pending, (state) => {
        state.holidayDeleting = true;
        state.holidayError = null;
        state.successMessage = null;
      })
      .addCase(deleteHoliday.fulfilled, (state, action) => {
        state.holidayDeleting = false;

        const deletedId = action.payload.data.holiday.id;

        state.holidays = state.holidays.filter(
          (holiday) => holiday.id !== deletedId,
        );

        state.affectedUsers = action.payload.data.affected_users;
        state.successMessage = action.payload.message;
      })
      .addCase(deleteHoliday.rejected, (state, action) => {
        state.holidayDeleting = false;
        state.holidayError = action.payload || "Failed to delete holiday";
      });
  },
});

// ============================================================
// EXPORTS
// ============================================================

export const {
  clearSettingsError,
  clearSettingsMessage,
  setSelectedYear,
  clearSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
