import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "../store";

export type DashboardPeriod = "day" | "week" | "month";

export interface DashboardEmployee {
  id: string | number;
  emp_code: string;
  name: string;
  designation?: string;
  work_min?: number;
  is_late?: boolean;
  first_in?: string | null;
  last_out?: string | null;
  last_punch_at?: string;
  attendance_status?: string;
}

interface ChartItem {
  date: string;
  work_minutes: number;
  work_hours: number;
  employees_worked: number;
  late_count: number;
  absent_count: number;
}

export interface DashboardData {
  date: string;
  period: DashboardPeriod;
  attendance_summary: {
    total_employees: number;
    total_work_minutes: number;
    total_worked_hours: number;
    late_count: number;
  };
  active_employees: DashboardEmployee[];
  attendance_chart: ChartItem[];
  today: {
    counts: {
      in: number;
      out: number;
      absent: number;
      on_leave: number;
      weekly_off: number;
      insufficient: number;
      no_punch_yet: number;
      total_employees: number;
    };
    employees: {
      in: DashboardEmployee[];
      out: DashboardEmployee[];
      absent: DashboardEmployee[];
      on_leave: DashboardEmployee[];
      weekly_off: DashboardEmployee[];
      insufficient: DashboardEmployee[];
      no_punch_yet: DashboardEmployee[];
    };
  };
  pending_requests: {
    leave: number;
    permission: number;
    regularization: number;
    total: number;
  };
  devices: {
    total: number;
    ok: number;
    alert: number;
    inactive: number;
  };
  unregularized_days_this_month: number;
}

interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardData;
}

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.88:5001"
).replace(/\/+$/, "");

const initialState: DashboardState = {
  data: null,
  loading: true,
  error: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    fetchDashboardStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchDashboardSuccess: (state, action: PayloadAction<DashboardData>) => {
      state.loading = false;
      state.data = action.payload;
    },
    fetchDashboardFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearDashboard: (state) => {
      state.data = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  fetchDashboardStart,
  fetchDashboardSuccess,
  fetchDashboardFailure,
  clearDashboard,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;

const getAuthToken = (stateToken: string | null): string | null => {
  if (stateToken) return stateToken;
  if (typeof window === "undefined") return null;

  try {
    const storedAuth = localStorage.getItem("attendance-auth");
    if (!storedAuth) return localStorage.getItem("token");

    const parsed = JSON.parse(storedAuth) as {
      token?: string;
      accessToken?: string;
      data?: { token?: string };
      auth?: { token?: string };
    };

    return (
      parsed.token ||
      parsed.accessToken ||
      parsed.data?.token ||
      parsed.auth?.token ||
      localStorage.getItem("token") ||
      null
    );
  } catch {
    return localStorage.getItem("token");
  }
};

const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const result = await response.json();
    return result.message || "Something went wrong";
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

export const fetchDashboard =
  (period: DashboardPeriod) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<DashboardData> => {
    dispatch(fetchDashboardStart());

    try {
      const token = getAuthToken(getState().auth.token);
      if (!token) {
        throw Object.assign(new Error("Authentication token not found"), {
          unauthorized: true,
        });
      }

      const response = await fetch(
        `${API_URL}/api/v1/admin/dashboard?period=${period}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw Object.assign(new Error(await getErrorMessage(response)), {
          unauthorized: response.status === 401,
        });
      }

      const result: DashboardResponse = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Unable to fetch dashboard data.");
      }

      dispatch(fetchDashboardSuccess(result.data));
      return result.data;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Something went wrong while fetching dashboard data.";
      dispatch(fetchDashboardFailure(message));
      throw error instanceof Error ? error : new Error(message);
    }
  };
