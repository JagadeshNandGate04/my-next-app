
import {
  createSlice,
  type PayloadAction,
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
// AUDIT ACTIONS
// ==================================================

const auditSlice = createSlice({
  name: "audit",
  initialState,
  reducers: {
    fetchAuditLogsStart: (state) => {
      state.listLoading = true;
      state.error = null;
    },
    fetchAuditLogsSuccess: (
      state,
      action: PayloadAction<{ logs: AuditLog[]; pagination: AuditLogPagination }>
    ) => {
      state.listLoading = false;
      state.logs = action.payload.logs;
      state.pagination = action.payload.pagination;
    },
    fetchAuditLogsFailure: (state, action: PayloadAction<string>) => {
      state.listLoading = false;
      state.error = action.payload;
    },
    fetchAuditLogByIdStart: (state) => {
      state.detailLoading = true;
      state.detailError = null;
    },
    fetchAuditLogByIdSuccess: (state, action: PayloadAction<AuditLog>) => {
      state.detailLoading = false;
      state.selectedLog = action.payload;
    },
    fetchAuditLogByIdFailure: (state, action: PayloadAction<string>) => {
      state.detailLoading = false;
      state.detailError = action.payload;
    },
    setAuditFilters: (state, action: PayloadAction<Partial<AuditLogFilters>>) => {
      state.filters = { ...state.filters, ...action.payload, page: 1 };
    },
    setAuditPage: (state, action: PayloadAction<number>) => {
      state.filters.page = Math.max(action.payload, 1);
    },
    setAuditLimit: (state, action: PayloadAction<number>) => {
      state.filters.limit = Math.min(Math.max(action.payload, 1), 100);
      state.filters.page = 1;
    },
    resetAuditFilters: (state) => {
      state.filters = { ...initialAuditFilters };
    },
    clearSelectedAuditLog: (state) => {
      state.selectedLog = null;
      state.detailError = null;
    },
    clearAuditError: (state) => {
      state.error = null;
      state.detailError = null;
    },
  },
});

export const {
  setAuditFilters,
  setAuditPage,
  setAuditLimit,
  resetAuditFilters,
  clearSelectedAuditLog,
  clearAuditError,
  fetchAuditLogsStart,
  fetchAuditLogsSuccess,
  fetchAuditLogsFailure,
  fetchAuditLogByIdStart,
  fetchAuditLogByIdSuccess,
  fetchAuditLogByIdFailure,
} = auditSlice.actions;

export default auditSlice.reducer;

// ==================================================
// FETCH AUDIT LOGS
// GET /api/v1/audit/admin/audit-logs
// ==================================================

export const fetchAuditLogs =
  (filters?: Partial<AuditLogFilters>) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<{ logs: AuditLog[]; pagination: AuditLogPagination } | null> => {
    dispatch(fetchAuditLogsStart());

    try {
      if (!API_BASE_URL) {
        throw new Error("API URL is missing. Configure NEXT_PUBLIC_API_URL.");
      }

      const token = getState().auth.token;
      if (!token) {
        throw new Error("Authentication token is missing. Please log in.");
      }

      const queryFilters: AuditLogFilters = {
        ...initialAuditFilters,
        ...filters,
      };
      const params = new URLSearchParams();

      if (queryFilters.action) params.append("action", queryFilters.action);
      if (queryFilters.entity_type) {
        params.append("entity_type", queryFilters.entity_type);
      }
      if (queryFilters.actor_id) params.append("actor_id", queryFilters.actor_id);
      if (queryFilters.from_date) {
        params.append("from_date", queryFilters.from_date);
      }
      if (queryFilters.to_date) params.append("to_date", queryFilters.to_date);
      params.append("page", String(queryFilters.page));
      params.append("limit", String(queryFilters.limit));

      const response = await authenticatedFetch(
        `${AUDIT_LOGS_URL}?${params.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
        token,
        dispatch
      );

      if (!response.ok) throw new Error(await getErrorMessage(response));

      const result: AuditLogsResponse = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to fetch audit logs.");
      }

      const data = {
        logs: result.data || [],
        pagination: result.pagination || initialPagination,
      };
      dispatch(fetchAuditLogsSuccess(data));
      return data;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Something went wrong while fetching audit logs.";
      dispatch(fetchAuditLogsFailure(message));
      return null;
    }
  };

// ==================================================
// FETCH AUDIT LOG DETAILS
// GET /api/v1/audit/admin/audit-logs/:id
// ==================================================

export const fetchAuditLogById =
  (id: number | string) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<AuditLog | null> => {
    dispatch(fetchAuditLogByIdStart());

    try {
      if (!API_BASE_URL) {
        throw new Error("API URL is missing. Configure NEXT_PUBLIC_API_URL.");
      }

      const token = getState().auth.token;
      if (!token) {
        throw new Error("Authentication token is missing. Please log in.");
      }

      const response = await authenticatedFetch(
        `${AUDIT_LOGS_URL}/${encodeURIComponent(String(id))}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
        token,
        dispatch
      );

      if (!response.ok) throw new Error(await getErrorMessage(response));

      const result: AuditLogDetailResponse = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.message || "Failed to fetch audit log details.");
      }

      dispatch(fetchAuditLogByIdSuccess(result.data));
      return result.data;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Something went wrong while fetching audit log details.";
      dispatch(fetchAuditLogByIdFailure(message));
      return null;
    }
  };
