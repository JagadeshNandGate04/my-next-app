import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export interface AdminNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface NotificationState {
  notifications: AdminNotification[];
  pagination: NotificationPagination | null;
  unreadCount: number;
  loading: boolean;
  unreadLoading: boolean;
  markingAll: boolean;
  markingId: string | null;
  error: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface NotificationListData {
  notifications: AdminNotification[];
  pagination?: NotificationPagination;
}

interface MarkReadData {
  notification: {
    id: string;
    is_read: boolean;
    read_at: string | null;
  };
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.88:5001"
).replace(/\/+$/, "");
const NOTIFICATIONS_API = `${API_URL}/api/v1/notifications/admin`;

const REQUEST_TABS: Record<string, "leaves" | "permissions" | "regularizations"> = {
  leave_request: "leaves",
  permission_request: "permissions",
  regularization_request: "regularizations",
};

const TYPE_TABS: Record<string, "leaves" | "permissions" | "regularizations"> = {
  LEAVE_REQUEST: "leaves",
  PERMISSION_REQUEST: "permissions",
  REGULARIZATION_REQUEST: "regularizations",
};

// Returns the page (and request) a notification refers to, or null if it has no target.
export const getNotificationHref = (
  notification: Pick<AdminNotification, "type" | "entity_type" | "entity_id">
): string | null => {
  const tab =
    (notification.entity_type && REQUEST_TABS[notification.entity_type]) ||
    TYPE_TABS[notification.type];
  if (!tab) return null;

  const params = new URLSearchParams({ tab, status: "pending" });
  if (notification.entity_id) params.set("id", notification.entity_id);
  params.set("from", "notification");

  return `/requests?${params.toString()}`;
};

const initialState: NotificationState = {
  notifications: [],
  pagination: null,
  unreadCount: 0,
  loading: false,
  unreadLoading: false,
  markingAll: false,
  markingId: null,
  error: null,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getToken = (state: RootState): string => {
  const token = state.auth.token;
  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }
  return token;
};

const request = async <T,>(
  path: string,
  token: string,
  method: "GET" | "PATCH" = "GET"
): Promise<ApiEnvelope<T>> => {
  const response = await fetch(`${NOTIFICATIONS_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const result: unknown = await response.json().catch(() => null);

  if (!response.ok || !isRecord(result) || result.success !== true) {
    throw new Error(
      isRecord(result) && typeof result.message === "string"
        ? result.message
        : `Notification request failed (${response.status} ${response.statusText}).`
    );
  }

  return {
    success: true,
    ...(typeof result.message === "string" ? { message: result.message } : {}),
    data: result.data as T | undefined,
  };
};

export const fetchAdminNotifications = createAsyncThunk<
  NotificationListData,
  void,
  { state: RootState }
>("notifications/fetchAll", async (_, { getState }) => {
  const result = await request<NotificationListData>(
    "/get-notifications",
    getToken(getState())
  );
  const notifications = result.data?.notifications;

  if (!Array.isArray(notifications)) {
    throw new Error("The notification response did not contain a notification list.");
  }

  return {
    notifications,
    pagination: result.data?.pagination,
  };
});

export const fetchAdminUnreadCount = createAsyncThunk<
  number,
  void,
  { state: RootState }
>("notifications/fetchUnreadCount", async (_, { getState }) => {
  const result = await request<{ unread_count: number }>(
    "/unread-count",
    getToken(getState())
  );
  const count = result.data?.unread_count;

  if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
    throw new Error("The unread notification response contained an invalid count.");
  }

  return count;
});

export const markAllAdminNotificationsRead = createAsyncThunk<
  { readAt: string },
  void,
  { state: RootState }
>("notifications/markAllRead", async (_, { getState }) => {
  const result = await request<{ updated_count: number }>(
    "/mark-all-as-read",
    getToken(getState()),
    "PATCH"
  );
  const count = result.data?.updated_count;

  if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
    throw new Error("The mark-all-read response contained an invalid update count.");
  }

  return { readAt: new Date().toISOString() };
});

export const markAdminNotificationRead = createAsyncThunk<
  MarkReadData["notification"],
  string,
  { state: RootState }
>("notifications/markRead", async (id, { getState }) => {
  const result = await request<MarkReadData>(
    `/${encodeURIComponent(id)}/read`,
    getToken(getState()),
    "PATCH"
  );
  const notification = result.data?.notification;

  if (
    !notification ||
    String(notification.id) !== id ||
    notification.is_read !== true ||
    (notification.read_at !== null && typeof notification.read_at !== "string")
  ) {
    throw new Error("The mark-read response did not contain a valid notification.");
  }

  return notification;
});

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    clearAdminNotifications: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.pagination = action.payload.pagination ?? null;
      })
      .addCase(fetchAdminNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Unable to load notifications.";
      })
      .addCase(fetchAdminUnreadCount.pending, (state) => {
        state.unreadLoading = true;
      })
      .addCase(fetchAdminUnreadCount.fulfilled, (state, action) => {
        state.unreadLoading = false;
        state.unreadCount = action.payload;
      })
      .addCase(fetchAdminUnreadCount.rejected, (state, action) => {
        state.unreadLoading = false;
        state.error = action.error.message ?? "Unable to load unread notifications.";
      })
      .addCase(markAllAdminNotificationsRead.pending, (state) => {
        state.markingAll = true;
        state.error = null;
      })
      .addCase(markAllAdminNotificationsRead.fulfilled, (state, action) => {
        state.markingAll = false;
        state.unreadCount = 0;
        state.notifications = state.notifications.map((notification) => ({
          ...notification,
          is_read: true,
          read_at: notification.read_at ?? action.payload.readAt,
        }));
      })
      .addCase(markAllAdminNotificationsRead.rejected, (state, action) => {
        state.markingAll = false;
        state.error = action.error.message ?? "Unable to mark notifications as read.";
      })
      .addCase(markAdminNotificationRead.pending, (state, action) => {
        state.markingId = action.meta.arg;
        state.error = null;
      })
      .addCase(markAdminNotificationRead.fulfilled, (state, action) => {
        state.markingId = null;
        const notification = state.notifications.find(
          (item) => item.id === action.payload.id
        );
        if (notification && !notification.is_read) {
          notification.is_read = true;
          notification.read_at = action.payload.read_at;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAdminNotificationRead.rejected, (state, action) => {
        state.markingId = null;
        state.error = action.error.message ?? "Unable to mark notification as read.";
      });
  },
});

export const { clearAdminNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;