
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "../store";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const API_ENDPOINTS = {
  leave: {
    list: "/api/v1/leave/admin/requests",
    decide: "/api/v1/leave/admin",
  },
  permission: {
    list: "/api/v1/permission/admin/permissions",
    decide: "/api/v1/permission/admin",
  },
  regularization: {
    list: "/api/v1/regularization/admin/requests",
    decide: "/api/v1/regularization/admin",
  },
};

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export type RequestType = "leave" | "permission" | "regularization";

export type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type DecisionAction = "APPROVE" | "REJECT";

export interface RequestFilters {
  status?: RequestStatus | "";
  month?: number | string;
  year?: number | string;
}

export interface RequestEmployee {
  id?: number;
  user_id?: number;
  emp_code?: string | null;
  name?: string;
  employee_name?: string;
  email?: string;
  employee_email?: string;
  phone?: string | null;
  employee_phone?: string | null;
  designation?: string | null;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  from_date: string;
  to_date: string;
  days: number;
  reason: string;
  is_retroactive: boolean;
  status: RequestStatus;
  decided_by: number | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
  emp_code?: string | null;
  employee_name?: string;
  employee_email?: string;
  employee_phone?: string | null;
  designation?: string | null;
}

export interface PermissionRequest {
  id: number;
  user_id: number;
  perm_date: string;
  start_time: string;
  minutes: number;
  reason: string;
  is_retroactive: boolean;
  status: RequestStatus;
  decided_by: number | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
  emp_code?: string | null;
  employee_name?: string;
  employee_email?: string;
  employee_phone?: string | null;
  designation?: string | null;
}

export interface RegularizationPunch {
  id: number;
  punched_at: string;
  direction: "IN" | "OUT";
  verify_mode?: string;
  source?: string;
}

export interface RegularizationEmployee {
  id: number;
  emp_code: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
}

export interface RegularizationDayContext {
  status: string | null;
  first_in: string | null;
  last_out: string | null;
  work_min: number | null;
  break_min: number | null;
  permission_min: number | null;
  is_late: boolean | null;
  excess_break: boolean | null;
  needs_regularization: boolean | null;
  lop_value: number | null;
  is_locked: boolean | null;
}

export interface RegularizationRequest {
  id: number;
  work_date: string;
  type: "MISSED_IN" | "MISSED_OUT" | "BOTH";
  claimed_in: string | null;
  claimed_out: string | null;
  reason: string;
  status: RequestStatus;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
  employee: RegularizationEmployee;
  day_context: RegularizationDayContext;
  punches: RegularizationPunch[];
}

export interface DecideRequestPayload {
  id: number;
  type: RequestType;
  action: DecisionAction;
  note: string;
}

export interface RequestListResponse<T> {
  success: boolean;
  data: {
    requests: T[];
  };
  count: number;
  message?: string;
}

export interface DecisionResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string | {
    code?: string;
    message?: string;
  };
}

// --------------------------------------------------
// REDUX STATE
// --------------------------------------------------

interface RequestState {
  leaveRequests: LeaveRequest[];
  permissionRequests: PermissionRequest[];
  regularizationRequests: RegularizationRequest[];

  leaveLoading: boolean;
  permissionLoading: boolean;
  regularizationLoading: boolean;

  leaveError: string | null;
  permissionError: string | null;
  regularizationError: string | null;

  deciding: boolean;
  decisionError: string | null;
  decisionSuccess: string | null;

  totalLeaveRequests: number;
  totalPermissionRequests: number;
  totalRegularizationRequests: number;
}

const initialState: RequestState = {
  leaveRequests: [],
  permissionRequests: [],
  regularizationRequests: [],

  leaveLoading: false,
  permissionLoading: false,
  regularizationLoading: false,

  leaveError: null,
  permissionError: null,
  regularizationError: null,

  deciding: false,
  decisionError: null,
  decisionSuccess: null,

  totalLeaveRequests: 0,
  totalPermissionRequests: 0,
  totalRegularizationRequests: 0,
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getApiUrl = (): string => {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured in .env.local");
  }

  return API_URL.replace(/\/+$/, "");
};

const extractErrorMessage = (
  data: unknown,
  fallback: string
): string => {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return fallback;
  }

  const response = data as Record<string, unknown>;

  if (typeof response.message === "string" && response.message.trim()) {
    return response.message;
  }

  if (typeof response.error === "string" && response.error.trim()) {
    return response.error;
  }

  if (response.error && typeof response.error === "object") {
    const nestedError = response.error as Record<string, unknown>;

    if (
      typeof nestedError.message === "string" &&
      nestedError.message.trim()
    ) {
      return nestedError.message;
    }
  }

  return fallback;
};

const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return extractErrorMessage(error, fallback);
};

const parseResponse = async <T,>(
  response: Response
): Promise<T> => {
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(
        data,
        `Request failed with status ${response.status}`
      )
    );
  }

  if (data === null) {
    throw new Error("Invalid server response. Please try again.");
  }

  return data as T;
};

const buildQueryString = (filters: RequestFilters): string => {
  const params = new URLSearchParams();

  if (filters.status) {
    params.append("status", filters.status);
  }

  if (filters.month !== undefined && filters.month !== "") {
    params.append("month", String(filters.month));
  }

  if (filters.year !== undefined && filters.year !== "") {
    params.append("year", String(filters.year));
  }

  const query = params.toString();

  return query ? `?${query}` : "";
};

// Validate the common API list response before updating Redux.
const validateListResponse = <T,>(
  result: RequestListResponse<T>
): T[] => {
  if (!result.success) {
    throw new Error(
      extractErrorMessage(result, "Unable to fetch requests.")
    );
  }

  if (!result.data || !Array.isArray(result.data.requests)) {
    throw new Error(
      "Invalid API response: expected data.requests to be an array."
    );
  }

  return result.data.requests;
};

// --------------------------------------------------
// REDUX SLICE
// --------------------------------------------------

const requestSlice = createSlice({
  name: "requests",
  initialState,

  reducers: {
    fetchRequestsStart: (
      state,
      action: PayloadAction<RequestType>
    ) => {
      const type = action.payload;

      if (type === "leave") {
        state.leaveLoading = true;
        state.leaveError = null;
      } else if (type === "permission") {
        state.permissionLoading = true;
        state.permissionError = null;
      } else {
        state.regularizationLoading = true;
        state.regularizationError = null;
      }
    },

    fetchLeaveRequestsSuccess: (
      state,
      action: PayloadAction<{
        requests: LeaveRequest[];
        count: number;
      }>
    ) => {
      state.leaveLoading = false;
      state.leaveRequests = action.payload.requests;
      state.totalLeaveRequests = action.payload.count;
      state.leaveError = null;
    },

    fetchPermissionRequestsSuccess: (
      state,
      action: PayloadAction<{
        requests: PermissionRequest[];
        count: number;
      }>
    ) => {
      state.permissionLoading = false;
      state.permissionRequests = action.payload.requests;
      state.totalPermissionRequests = action.payload.count;
      state.permissionError = null;
    },

    fetchRegularizationRequestsSuccess: (
      state,
      action: PayloadAction<{
        requests: RegularizationRequest[];
        count: number;
      }>
    ) => {
      state.regularizationLoading = false;
      state.regularizationRequests = action.payload.requests;
      state.totalRegularizationRequests = action.payload.count;
      state.regularizationError = null;
    },

    fetchRequestsFailure: (
      state,
      action: PayloadAction<{
        type: RequestType;
        error: string;
      }>
    ) => {
      const { type, error } = action.payload;

      if (type === "leave") {
        state.leaveLoading = false;
        state.leaveError = error;
      } else if (type === "permission") {
        state.permissionLoading = false;
        state.permissionError = error;
      } else {
        state.regularizationLoading = false;
        state.regularizationError = error;
      }
    },

    decideRequestStart: (state) => {
      state.deciding = true;
      state.decisionError = null;
      state.decisionSuccess = null;
    },

    decideRequestSuccess: (
      state,
      action: PayloadAction<{
        type: RequestType;
        id: number;
        action: DecisionAction;
        message: string;
      }>
    ) => {
      const { type, id, action: decision, message } = action.payload;

      const newStatus: RequestStatus =
        decision === "APPROVE" ? "APPROVED" : "REJECTED";

      if (type === "leave") {
        state.leaveRequests = state.leaveRequests.map((request) =>
          request.id === id
            ? { ...request, status: newStatus }
            : request
        );
      } else if (type === "permission") {
        state.permissionRequests = state.permissionRequests.map(
          (request) =>
            request.id === id
              ? { ...request, status: newStatus }
              : request
        );
      } else {
        state.regularizationRequests =
          state.regularizationRequests.map((request) =>
            request.id === id
              ? { ...request, status: newStatus }
              : request
          );
      }

      state.deciding = false;
      state.decisionSuccess = message;
      state.decisionError = null;
    },

    decideRequestFailure: (
      state,
      action: PayloadAction<string>
    ) => {
      state.deciding = false;
      state.decisionError = action.payload;
    },

    clearRequestMessages: (state) => {
      state.decisionError = null;
      state.decisionSuccess = null;
    },

    clearRequestErrors: (state) => {
      state.leaveError = null;
      state.permissionError = null;
      state.regularizationError = null;
      state.decisionError = null;
    },

    clearAllRequests: (state) => {
      state.leaveRequests = [];
      state.permissionRequests = [];
      state.regularizationRequests = [];

      state.totalLeaveRequests = 0;
      state.totalPermissionRequests = 0;
      state.totalRegularizationRequests = 0;

      state.leaveError = null;
      state.permissionError = null;
      state.regularizationError = null;

      state.decisionError = null;
      state.decisionSuccess = null;
    },
  },
});

// --------------------------------------------------
// ACTION EXPORTS
// --------------------------------------------------

export const {
  fetchRequestsStart,
  fetchLeaveRequestsSuccess,
  fetchPermissionRequestsSuccess,
  fetchRegularizationRequestsSuccess,
  fetchRequestsFailure,
  decideRequestStart,
  decideRequestSuccess,
  decideRequestFailure,
  clearRequestMessages,
  clearRequestErrors,
  clearAllRequests,
} = requestSlice.actions;

export default requestSlice.reducer;

// --------------------------------------------------
// FETCH ADMIN LEAVE REQUESTS
// --------------------------------------------------

export const fetchAdminLeaveRequests =
  (filters: RequestFilters = {}) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<RequestListResponse<LeaveRequest>> => {
    dispatch(fetchRequestsStart("leave"));

    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch(
        `${getApiUrl()}${API_ENDPOINTS.leave.list}${buildQueryString(filters)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result =
        await parseResponse<RequestListResponse<LeaveRequest>>(response);

      const requests = validateListResponse(result);

      dispatch(
        fetchLeaveRequestsSuccess({
          requests,
          count: Number.isFinite(result.count) ? result.count : requests.length,
        })
      );

      return result;
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Unable to fetch leave requests."
      );

      dispatch(fetchRequestsFailure({ type: "leave", error: message }));
      throw new Error(message);
    }
  };

// --------------------------------------------------
// FETCH ADMIN PERMISSION REQUESTS
// --------------------------------------------------

export const fetchAdminPermissionRequests =
  (filters: RequestFilters = {}) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<RequestListResponse<PermissionRequest>> => {
    dispatch(fetchRequestsStart("permission"));

    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch(
        `${getApiUrl()}${API_ENDPOINTS.permission.list}${buildQueryString(filters)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result =
        await parseResponse<RequestListResponse<PermissionRequest>>(response);

      const requests = validateListResponse(result);

      dispatch(
        fetchPermissionRequestsSuccess({
          requests,
          count: Number.isFinite(result.count) ? result.count : requests.length,
        })
      );

      return result;
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Unable to fetch permission requests."
      );

      dispatch(
        fetchRequestsFailure({ type: "permission", error: message })
      );

      throw new Error(message);
    }
  };

// --------------------------------------------------
// FETCH ADMIN REGULARIZATION REQUESTS
// --------------------------------------------------

export const fetchAdminRegularizationRequests =
  (filters: Pick<RequestFilters, "status"> = {}) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<RequestListResponse<RegularizationRequest>> => {
    dispatch(fetchRequestsStart("regularization"));

    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch(
        `${getApiUrl()}${API_ENDPOINTS.regularization.list}${buildQueryString(filters)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result =
        await parseResponse<RequestListResponse<RegularizationRequest>>(response);

      const requests = validateListResponse(result);

      dispatch(
        fetchRegularizationRequestsSuccess({
          requests,
          count: Number.isFinite(result.count) ? result.count : requests.length,
        })
      );

      return result;
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Unable to fetch regularization requests."
      );

      dispatch(
        fetchRequestsFailure({
          type: "regularization",
          error: message,
        })
      );

      throw new Error(message);
    }
  };

// --------------------------------------------------
// DECIDE ADMIN REQUEST
// --------------------------------------------------

export const decideAdminRequest =
  (payload: DecideRequestPayload) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<DecisionResponse> => {
    dispatch(decideRequestStart());

    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Please sign in again.");
      }

      if (!payload.note.trim()) {
        throw new Error("Decision note is required.");
      }

      const endpoint = API_ENDPOINTS[payload.type].decide;

      const response = await fetch(
        `${getApiUrl()}${endpoint}/${payload.id}/decide`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: payload.action,
            note: payload.note.trim(),
          }),
        }
      );

      const result = await parseResponse<DecisionResponse>(response);

      if (!result.success) {
        throw new Error(
          extractErrorMessage(result, "Unable to process this request.")
        );
      }

      dispatch(
        decideRequestSuccess({
          type: payload.type,
          id: payload.id,
          action: payload.action,
          message:
            result.message ||
            `Request ${payload.action.toLowerCase()}d successfully.`,
        })
      );

      return result;
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Unable to process this request."
      );

      dispatch(decideRequestFailure(message));
      throw new Error(message);
    }
  };
