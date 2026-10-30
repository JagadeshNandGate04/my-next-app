
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "../store";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const AUTH_STORAGE_KEY = "attendance-auth";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  role?: string;
  emp_code?: string | null;
  status?: string;
  [key: string]: unknown;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  } | string;
  data?: {
    user?: AuthUser;
    token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

// Forgot Password Types

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyResetOtpPayload {
  email: string;
  otp: string;
}

export interface ResetPasswordPayload {
  email: string;
  reset_token: string;
  new_password: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
}

export interface VerifyResetOtpResponse {
  success: boolean;
  message?: string;
  data?: {
    reset_token: string;
    expires_in: number;
  };
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
}

// --------------------------------------------------
// AUTH STATE
// --------------------------------------------------

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  isAuthenticated: boolean;

  loading: boolean;
  error: string | null;

  changingPassword: boolean;
  passwordError: string | null;
  passwordSuccess: string | null;

  // Forgot Password

  forgotPasswordLoading: boolean;
  forgotPasswordError: string | null;
  forgotPasswordMessage: string | null;

  // Verify OTP

  verifyingResetOtp: boolean;
  otpError: string | null;
  resetToken: string | null;
  resetTokenExpiresIn: number | null;

  // Reset Password

  resettingPassword: boolean;
  resetPasswordError: string | null;
  resetPasswordSuccess: string | null;
}

interface StoredSession {
  user: AuthUser;
  token: string;
  refreshToken: string | null;
  expiresIn: number | null;
}

// --------------------------------------------------
// INITIAL STATE
// --------------------------------------------------

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  expiresIn: null,
  isAuthenticated: false,

  loading: false,
  error: null,

  changingPassword: false,
  passwordError: null,
  passwordSuccess: null,

  forgotPasswordLoading: false,
  forgotPasswordError: null,
  forgotPasswordMessage: null,

  verifyingResetOtp: false,
  otpError: null,
  resetToken: null,
  resetTokenExpiresIn: null,

  resettingPassword: false,
  resetPasswordError: null,
  resetPasswordSuccess: null,
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getApiUrl = (): string => {
  if (!API_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not configured in .env.local"
    );
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

  if (
    typeof response.message === "string" &&
    response.message.trim()
  ) {
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

  if (response.data && typeof response.data === "object") {
    const nestedData = response.data as Record<string, unknown>;

    if (
      typeof nestedData.message === "string" &&
      nestedData.message.trim()
    ) {
      return nestedData.message;
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
    const message = extractErrorMessage(
      data,
      `Request failed with status ${response.status}`
    );

    throw new Error(message);
  }

  if (data === null) {
    throw new Error("Invalid server response. Please try again.");
  }

  return data as T;
};

// --------------------------------------------------
// SESSION STORAGE
// --------------------------------------------------

const saveSession = (session: StoredSession): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify(session)
    );
  }
};

const removeSession = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

// --------------------------------------------------
// SLICE
// --------------------------------------------------

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    // LOGIN

    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },

    loginSuccess: (
      state,
      action: PayloadAction<StoredSession>
    ) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.expiresIn = action.payload.expiresIn;
      state.isAuthenticated = true;
      state.error = null;
    },

    loginFailure: (
      state,
      action: PayloadAction<string>
    ) => {
      state.loading = false;
      state.error = action.payload;
    },

    // RESTORE SESSION

    restoreSession: (
      state,
      action: PayloadAction<StoredSession>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.expiresIn = action.payload.expiresIn;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },

    // LOGOUT

    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.expiresIn = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;

      state.changingPassword = false;
      state.passwordError = null;
      state.passwordSuccess = null;

      state.forgotPasswordLoading = false;
      state.forgotPasswordError = null;
      state.forgotPasswordMessage = null;

      state.verifyingResetOtp = false;
      state.otpError = null;
      state.resetToken = null;
      state.resetTokenExpiresIn = null;

      state.resettingPassword = false;
      state.resetPasswordError = null;
      state.resetPasswordSuccess = null;
    },

    // CHANGE PASSWORD

    changePasswordStart: (state) => {
      state.changingPassword = true;
      state.passwordError = null;
      state.passwordSuccess = null;
    },

    changePasswordSuccess: (
      state,
      action: PayloadAction<string>
    ) => {
      state.changingPassword = false;
      state.passwordSuccess = action.payload;
      state.passwordError = null;
    },

    changePasswordFailure: (
      state,
      action: PayloadAction<string>
    ) => {
      state.changingPassword = false;
      state.passwordError = action.payload;
    },

    // FORGOT PASSWORD

    forgotPasswordStart: (state) => {
      state.forgotPasswordLoading = true;
      state.forgotPasswordError = null;
      state.forgotPasswordMessage = null;

      state.otpError = null;
      state.resetToken = null;
      state.resetTokenExpiresIn = null;

      state.resetPasswordError = null;
      state.resetPasswordSuccess = null;
    },

    forgotPasswordSuccess: (
      state,
      action: PayloadAction<string>
    ) => {
      state.forgotPasswordLoading = false;
      state.forgotPasswordMessage = action.payload;
      state.forgotPasswordError = null;
    },

    forgotPasswordFailure: (
      state,
      action: PayloadAction<string>
    ) => {
      state.forgotPasswordLoading = false;
      state.forgotPasswordError = action.payload;
    },

    // VERIFY OTP

    verifyResetOtpStart: (state) => {
      state.verifyingResetOtp = true;
      state.otpError = null;
      state.resetToken = null;
      state.resetTokenExpiresIn = null;
    },

    verifyResetOtpSuccess: (
      state,
      action: PayloadAction<{
        resetToken: string;
        expiresIn: number;
      }>
    ) => {
      state.verifyingResetOtp = false;
      state.resetToken = action.payload.resetToken;
      state.resetTokenExpiresIn = action.payload.expiresIn;
      state.otpError = null;
    },

    verifyResetOtpFailure: (
      state,
      action: PayloadAction<string>
    ) => {
      state.verifyingResetOtp = false;
      state.otpError = action.payload;
    },

    // RESET PASSWORD

    resetPasswordStart: (state) => {
      state.resettingPassword = true;
      state.resetPasswordError = null;
      state.resetPasswordSuccess = null;
    },

    resetPasswordSuccess: (
      state,
      action: PayloadAction<string>
    ) => {
      state.resettingPassword = false;
      state.resetPasswordSuccess = action.payload;
      state.resetPasswordError = null;

      state.resetToken = null;
      state.resetTokenExpiresIn = null;
    },

    resetPasswordFailure: (
      state,
      action: PayloadAction<string>
    ) => {
      state.resettingPassword = false;
      state.resetPasswordError = action.payload;
    },

    // CLEAR FORGOT PASSWORD STATE

    clearForgotPasswordState: (state) => {
      state.forgotPasswordLoading = false;
      state.forgotPasswordError = null;
      state.forgotPasswordMessage = null;

      state.verifyingResetOtp = false;
      state.otpError = null;
      state.resetToken = null;
      state.resetTokenExpiresIn = null;

      state.resettingPassword = false;
      state.resetPasswordError = null;
      state.resetPasswordSuccess = null;
    },

    // GENERAL

    clearAuthError: (state) => {
      state.error = null;
    },

    clearPasswordMessages: (state) => {
      state.passwordError = null;
      state.passwordSuccess = null;
    },
  },
});

// --------------------------------------------------
// EXPORT ACTIONS
// --------------------------------------------------

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  restoreSession,
  logout,

  changePasswordStart,
  changePasswordSuccess,
  changePasswordFailure,

  forgotPasswordStart,
  forgotPasswordSuccess,
  forgotPasswordFailure,

  verifyResetOtpStart,
  verifyResetOtpSuccess,
  verifyResetOtpFailure,

  resetPasswordStart,
  resetPasswordSuccess,
  resetPasswordFailure,

  clearForgotPasswordState,

  clearAuthError,
  clearPasswordMessages,
} = authSlice.actions;

export default authSlice.reducer;

// --------------------------------------------------
// LOGIN
// POST /api/v1/auth/login
// --------------------------------------------------

export const login =
  (credentials: LoginPayload) =>
  async (dispatch: AppDispatch): Promise<AuthResponse> => {
    dispatch(loginStart());

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        }
      );

      const result = await parseResponse<AuthResponse>(response);

      if (!result.success) {
        throw new Error(
          extractErrorMessage(
            result,
            "Unable to sign in. Please check your credentials."
          )
        );
      }

      if (!result.data?.user || !result.data?.token) {
        throw new Error(
          "Login response is missing user information or authentication token."
        );
      }

      const session: StoredSession = {
        user: result.data.user,
        token: result.data.token,
        refreshToken: result.data.refresh_token || null,
        expiresIn: result.data.expires_in || null,
      };

      dispatch(loginSuccess(session));
      saveSession(session);

      return result;
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Unable to sign in. Please try again."
      );

      dispatch(loginFailure(message));

      throw new Error(message);
    }
  };

// --------------------------------------------------
// RESTORE SESSION
// --------------------------------------------------

export const initializeAuth =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    try {
      if (typeof window === "undefined") return;

      const storedSession = localStorage.getItem(AUTH_STORAGE_KEY);

      if (!storedSession) return;

      const session = JSON.parse(storedSession) as StoredSession;

      if (!session.user || !session.token) {
        removeSession();
        return;
      }

      dispatch(restoreSession(session));
    } catch {
      removeSession();
      dispatch(logout());
    }
  };

// --------------------------------------------------
// REFRESH TOKEN
// POST /api/v1/auth/refresh
// --------------------------------------------------

export const refreshAuthToken =
  () =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<string> => {
    const refreshToken = getState().auth.refreshToken;

    if (!refreshToken) {
      throw new Error("Refresh token not available. Please sign in again.");
    }

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
          }),
        }
      );

      const result = await parseResponse<{
        success: boolean;
        message?: string;
        error?: {
          message?: string;
        } | string;
        data?: {
          token?: string;
          expires_in?: number;
        };
      }>(response);

      if (!result.success || !result.data?.token) {
        throw new Error(
          extractErrorMessage(
            result,
            "Unable to refresh session."
          )
        );
      }

      const currentState = getState().auth;

      if (!currentState.user) {
        throw new Error("User session not found. Please sign in again.");
      }

      const session: StoredSession = {
        user: currentState.user,
        token: result.data.token,
        refreshToken,
        expiresIn: result.data.expires_in || null,
      };

      dispatch(restoreSession(session));
      saveSession(session);

      return result.data.token;
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Session expired. Please sign in again."
      );

      removeSession();
      dispatch(logout());

      throw new Error(message);
    }
  };

// --------------------------------------------------
// CHANGE PASSWORD
// POST /api/v1/auth/changepassword
// --------------------------------------------------

export const changePassword =
  (payload: ChangePasswordPayload) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<void> => {
    dispatch(changePasswordStart());

    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch(
        `${getApiUrl()}/api/v1/auth/changepassword`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await parseResponse<{
        success: boolean;
        message?: string;
        error?: {
          message?: string;
        } | string;
      }>(response);

      if (!result.success) {
        throw new Error(
          extractErrorMessage(
            result,
            "Unable to change password."
          )
        );
      }

      dispatch(
        changePasswordSuccess(
          result.message || "Password changed successfully."
        )
      );
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Unable to change password."
      );

      dispatch(changePasswordFailure(message));

      throw new Error(message);
    }
  };

// --------------------------------------------------
// FORGOT PASSWORD
// POST /api/v1/auth/forgot-password
// --------------------------------------------------

export const forgotPassword =
  (payload: ForgotPasswordPayload) =>
  async (
    dispatch: AppDispatch
  ): Promise<ForgotPasswordResponse> => {
    dispatch(forgotPasswordStart());

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result =
        await parseResponse<ForgotPasswordResponse>(response);

      if (!result.success) {
        throw new Error(
          extractErrorMessage(
            result,
            "Unable to send OTP. Please try again."
          )
        );
      }

      dispatch(
        forgotPasswordSuccess(
          result.message ||
            "If an account exists with this email, a password reset OTP has been sent."
        )
      );

      return result;
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Unable to send OTP. Please try again."
      );

      dispatch(forgotPasswordFailure(message));

      throw new Error(message);
    }
  };

// --------------------------------------------------
// VERIFY RESET OTP
// POST /api/v1/auth/verify-reset-otp
// --------------------------------------------------

export const verifyResetOtp =
  (payload: VerifyResetOtpPayload) =>
  async (
    dispatch: AppDispatch
  ): Promise<VerifyResetOtpResponse> => {
    dispatch(verifyResetOtpStart());

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/auth/verify-reset-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: payload.email,
            otp: String(payload.otp),
          }),
        }
      );

      const result =
        await parseResponse<VerifyResetOtpResponse>(response);

      if (!result.success || !result.data?.reset_token) {
        throw new Error(
          extractErrorMessage(
            result,
            "OTP verification failed. Please try again."
          )
        );
      }

      dispatch(
        verifyResetOtpSuccess({
          resetToken: result.data.reset_token,
          expiresIn: result.data.expires_in,
        })
      );

      return result;
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "OTP verification failed. Please try again."
      );

      dispatch(verifyResetOtpFailure(message));

      throw new Error(message);
    }
  };

// --------------------------------------------------
// RESET PASSWORD
// POST /api/v1/auth/reset-password
// --------------------------------------------------

export const resetPassword =
  (payload: ResetPasswordPayload) =>
  async (
    dispatch: AppDispatch
  ): Promise<ResetPasswordResponse> => {
    dispatch(resetPasswordStart());

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result =
        await parseResponse<ResetPasswordResponse>(response);

      if (!result.success) {
        throw new Error(
          extractErrorMessage(
            result,
            "Unable to reset password. Please try again."
          )
        );
      }

      dispatch(
        resetPasswordSuccess(
          result.message || "Password reset successfully."
        )
      );

      return result;
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Unable to reset password. Please try again."
      );

      dispatch(resetPasswordFailure(message));

      throw new Error(message);
    }
  };

// --------------------------------------------------
// SAVE FCM TOKEN
// POST /api/v1/auth/fcm-token
// --------------------------------------------------

export const saveFcmToken =
  (fcmToken: string) =>
  async (
    _dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<void> => {
    const token = getState().auth.token;

    if (!token) {
      throw new Error("Please sign in again.");
    }

    const response = await fetch(
      `${getApiUrl()}/api/v1/auth/fcm-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          token: fcmToken,
        }),
      }
    );

    const result = await parseResponse<{
      success: boolean;
      message?: string;
      error?: {
        message?: string;
      } | string;
    }>(response);

    if (!result.success) {
      throw new Error(
        extractErrorMessage(
          result,
          "Unable to save notification token."
        )
      );
    }
  };

// --------------------------------------------------
// LOGOUT
// Local logout (backend logout route is not available)
// --------------------------------------------------

export const performLogout =
  () =>
  (dispatch: AppDispatch): void => {
    removeSession();
    dispatch(logout());
  };
