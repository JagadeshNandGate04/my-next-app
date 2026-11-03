
import {
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import type { RootState, AppDispatch } from "../store";
import { refreshAuthToken } from "../auth/authSlice";

// ==================================================
// TYPES
// ==================================================

export interface AuditLog {
  id: number | string;
  actor_id: number | string | null;
  actor_name: string | null;
  actor_emp_code: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogFilters {
  action: string;
  entity_type: string;
  actor_id: string;
  from_date: string;
  to_date: string;
  page: number;
  limit: number;
}

export interface AuditLogPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  count: number;
}

interface AuditState {
  logs: AuditLog[];
  selectedLog: AuditLog | null;
  pagination: AuditLogPagination;
  filters: AuditLogFilters;
  listLoading: boolean;
  detailLoading: boolean;
  error: string | null;
  detailError: string | null;
}

// ==================================================
// API CONFIGURATION
// ==================================================

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || ""
).replace(/\/+$/, "");

// Matches:
// app.use("/api/v1/audit", auditRoutes)
//
// router.get("/admin/audit-logs", ...)
// router.get("/admin/audit-logs/:id", ...)

const AUDIT_LOGS_URL =
  `${API_BASE_URL}/api/v1/audit/admin/audit-logs`;

// ==================================================
// INITIAL VALUES
// ==================================================

export const initialAuditFilters: AuditLogFilters = {
  action: "",
  entity_type: "",
  actor_id: "",
  from_date: "",
  to_date: "",
  page: 1,
  limit: 10,
};

const initialPagination: AuditLogPagination = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
  count: 0,
};

const initialState: AuditState = {
  logs: [],
  selectedLog: null,
  pagination: initialPagination,
  filters: initialAuditFilters,
  listLoading: false,
  detailLoading: false,
  error: null,
  detailError: null,
};

// ==================================================
// API RESPONSE TYPES
// ==================================================

interface AuditLogsResponse {
  success: boolean;
  message: string;
  data: AuditLog[];
  pagination: AuditLogPagination;
}

interface AuditLogDetailResponse {
  success: boolean;
  message: string;
  data: AuditLog;
}

// ==================================================
// ERROR HELPER
// ==================================================

async function getErrorMessage(
  response: Response
): Promise<string> {
  try {
    const result = await response.json();

    return (
      result.message ||
      `Request failed with status ${response.status}`
    );
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

// ==================================================
// AUTHENTICATED API REQUEST
// ==================================================

async function authenticatedFetch(
  url: string,
  options: RequestInit,
  token: string,
  dispatch: AppDispatch
): Promise<Response> {
  const makeRequest = (accessToken: string) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  };

  let response = await makeRequest(token);

  // If access token expired, refresh and retry once.
  if (response.status === 401) {
    const newToken = await dispatch(refreshAuthToken());

    if (!newToken) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    response = await makeRequest(newToken);
  }

  return response;
}

// ==================================================
// FETCH AUDIT LOGS
// GET /api/v1/audit/admin/audit-logs
// ==================================================

interface AuditThunkConfig {
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: string;
}

export const fetchAuditLogs = createAsyncThunk<
  {
    logs: AuditLog[];
    pagination: AuditLogPagination;
  },
  Partial<AuditLogFilters> | undefined,
  AuditThunkConfig
>(
  "audit/fetchAuditLogs",
  async (
    filters,
    { getState, dispatch, rejectWithValue }
  ) => {
    try {
      if (!API_BASE_URL) {
        return rejectWithValue(
          "API URL is missing. Configure NEXT_PUBLIC_API_URL."
        );
      }

      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue(
          "Authentication token is missing. Please log in."
        );
      }

      const queryFilters: AuditLogFilters = {
        ...initialAuditFilters,
        ...filters,
      };

      const params = new URLSearchParams();

      if (queryFilters.action) {
        params.append("action", queryFilters.action);
      }

      if (queryFilters.entity_type) {
        params.append(
          "entity_type",
          queryFilters.entity_type
        );
      }

      if (queryFilters.actor_id) {
        params.append("actor_id", queryFilters.actor_id);
      }

      if (queryFilters.from_date) {
        params.append(
          "from_date",
          queryFilters.from_date
        );
      }

      if (queryFilters.to_date) {
        params.append("to_date", queryFilters.to_date);
      }

      params.append("page", String(queryFilters.page));
      params.append("limit", String(queryFilters.limit));

      const response = await authenticatedFetch(
        `${AUDIT_LOGS_URL}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
        token,
        dispatch
      );

      if (!response.ok) {
        return rejectWithValue(
          await getErrorMessage(response)
        );
      }

      const result: AuditLogsResponse =
        await response.json();

      if (!result.success) {
        return rejectWithValue(
          result.message || "Failed to fetch audit logs."
        );
      }

      return {
        logs: result.data || [],
        pagination: result.pagination || initialPagination,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Something went wrong while fetching audit logs."
      );
    }
  }
);

// ==================================================
// FETCH AUDIT LOG DETAILS
// GET /api/v1/audit/admin/audit-logs/:id
// ==================================================

export const fetchAuditLogById = createAsyncThunk<
  AuditLog,
  number | string,
  AuditThunkConfig
>(
  "audit/fetchAuditLogById",
  async (
    id,
    { getState, dispatch, rejectWithValue }
  ) => {
    try {
      if (!API_BASE_URL) {
        return rejectWithValue(
          "API URL is missing. Configure NEXT_PUBLIC_API_URL."
        );
      }

      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue(
          "Authentication token is missing. Please log in."
        );
      }

      const response = await authenticatedFetch(
        `${AUDIT_LOGS_URL}/${encodeURIComponent(String(id))}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
        token,
        dispatch
      );

      if (!response.ok) {
        return rejectWithValue(
          await getErrorMessage(response)
        );
      }

      const result: AuditLogDetailResponse =
        await response.json();

      if (!result.success || !result.data) {
        return rejectWithValue(
          result.message ||
            "Failed to fetch audit log details."
        );
      }

      return result.data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Something went wrong while fetching audit log details."
      );
    }
  }
);

// ==================================================
// AUDIT SLICE
// ==================================================

const auditSlice = createSlice({
  name: "audit",
  initialState,

  reducers: {
    // Update filters and reset pagination.
    setAuditFilters: (
      state,
      action: PayloadAction<
        Partial<AuditLogFilters>
      >
    ) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
        page: 1,
      };
    },

    // Change current page.
    setAuditPage: (
      state,
      action: PayloadAction<number>
    ) => {
      state.filters.page = Math.max(
        action.payload,
        1
      );
    },

    // Change number of records per page.
    setAuditLimit: (
      state,
      action: PayloadAction<number>
    ) => {
      state.filters.limit = Math.min(
        Math.max(action.payload, 1),
        100
      );

      state.filters.page = 1;
    },

    // Reset all filters.
    resetAuditFilters: (state) => {
      state.filters = {
        ...initialAuditFilters,
      };
    },

    // Close the detail inspector.
    clearSelectedAuditLog: (state) => {
      state.selectedLog = null;
      state.detailError = null;
    },

    // Clear API errors.
    clearAuditError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },

  extraReducers: (builder) => {
    // ----------------------------------------------
    // FETCH AUDIT LOGS
    // ----------------------------------------------

    builder
      .addCase(
        fetchAuditLogs.pending,
        (state) => {
          state.listLoading = true;
          state.error = null;
        }
      )

      .addCase(
        fetchAuditLogs.fulfilled,
        (state, action) => {
          state.listLoading = false;

          state.logs = action.payload.logs;

          state.pagination =
            action.payload.pagination;
        }
      )

      .addCase(
        fetchAuditLogs.rejected,
        (state, action) => {
          state.listLoading = false;

          state.error =
            action.payload ||
            "Failed to fetch audit logs.";
        }
      );

    // ----------------------------------------------
    // FETCH AUDIT LOG DETAILS
    // ----------------------------------------------

    builder
      .addCase(
        fetchAuditLogById.pending,
        (state) => {
          state.detailLoading = true;
          state.detailError = null;
        }
      )

      .addCase(
        fetchAuditLogById.fulfilled,
        (state, action) => {
          state.detailLoading = false;

          state.selectedLog = action.payload;
        }
      )

      .addCase(
        fetchAuditLogById.rejected,
        (state, action) => {
          state.detailLoading = false;

          state.detailError =
            action.payload ||
            "Failed to fetch audit log details.";
        }
      );
  },
});

// ==================================================
// EXPORTS
// ==================================================

export const {
  setAuditFilters,
  setAuditPage,
  setAuditLimit,
  resetAuditFilters,
  clearSelectedAuditLog,
  clearAuditError,
} = auditSlice.actions;

export default auditSlice.reducer;
