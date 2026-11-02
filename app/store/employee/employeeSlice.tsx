
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../store";

// --------------------------------------------------
// Types
// --------------------------------------------------

export interface Employee {
  id: number;
  emp_code: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  date_of_joining: string;
  status: "ACTIVE" | "INACTIVE";
  salary_structure_id?: number | null;
  basic?: number | null;
  hra?: number | null;
  special_allowance?: number | null;
  gross?: number | null;
  effective_from?: string | null;
}

export interface CreateEmployeePayload {
  emp_code: string;
  name: string;
  email: string;
  phone: string;
  date_of_joining: string;
  designation: string;
  basic: number;
  hra: number;
  special_allowance: number;
}

export interface UpdateEmployeePayload {
  id: number;
  emp_code: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  date_of_joining: string;
  status: Employee["status"];
}

export interface FetchEmployeeByIdPayload {
  id: number;
}

interface ApiError {
  message: string;
  errors?: Record<string, string>;
}

interface EmployeeState {
  employees: Employee[];
  loading: boolean;
  createLoading: boolean;
  updateLoading: boolean;
  error: string | null;
  createError: string | null;
  updateError: string | null;
  validationErrors: Record<string, string>;
  successMessage: string | null;
}

// --------------------------------------------------
// API Configuration
// --------------------------------------------------

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

const EMPLOYEE_API = `${API_URL}/api/v1/employees`;
const EMPLOYEE_RESOURCE_API = `${EMPLOYEE_API}/employees`;
const ADMIN_EMPLOYEE_API = `${API_URL}/api/v1/admin/employees`;

const getAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

// --------------------------------------------------
// Response helpers
// --------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseEmployee = (value: unknown): Employee | null => {
  if (!isRecord(value)) return null;

  const id =
    typeof value.id === "number"
      ? value.id
      : typeof value.id === "string" && /^\d+$/.test(value.id)
        ? Number(value.id)
        : NaN;

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    typeof value.emp_code !== "string" ||
    typeof value.name !== "string" ||
    typeof value.email !== "string" ||
    (typeof value.phone !== "string" &&
      value.phone !== null &&
      value.phone !== undefined) ||
    (typeof value.designation !== "string" &&
      value.designation !== null &&
      value.designation !== undefined) ||
    typeof value.date_of_joining !== "string" ||
    (value.status !== "ACTIVE" && value.status !== "INACTIVE")
  ) {
    return null;
  }

  return {
    id,
    emp_code: value.emp_code,
    name: value.name,
    email: value.email,
    phone: typeof value.phone === "string" ? value.phone : "",
    designation:
      typeof value.designation === "string" ? value.designation : "",
    date_of_joining: value.date_of_joining,
    status: value.status,
  };
};

const getEmployeesFromResponse = (result: unknown): Employee[] | null => {
  if (Array.isArray(result)) return result;

  if (!isRecord(result)) return null;

  if (Array.isArray(result.data)) return result.data;

  if (isRecord(result.data) && Array.isArray(result.data.employees)) {
    return result.data.employees;
  }

  if (isRecord(result.data) && Array.isArray(result.data.rows)) {
    return result.data.rows;
  }

  if (Array.isArray(result.employees)) {
    return result.employees;
  }

  return null;
};

const getEmployeeFromResponse = (result: unknown): Employee | null => {
  if (!isRecord(result)) return null;

  const employee =
    (isRecord(result.data) ? result.data.employee ?? result.data : undefined) ??
    result.employee;

  return parseEmployee(employee);
};

// --------------------------------------------------
// Fetch Employee By ID
// GET /api/v1/employees/employees/:id
// --------------------------------------------------

export const fetchEmployeeById = createAsyncThunk<
  Employee,
  FetchEmployeeByIdPayload,
  {
    state: RootState;
    rejectValue: ApiError;
  }
>(
  "employees/fetchEmployeeById",
  async ({ id }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue({
          message: "Authentication token not found. Please log in again.",
        });
      }

      const response = await fetch(`${EMPLOYEE_RESOURCE_API}/${id}`, {
        method: "GET",
        headers: {
          ...getAuthHeaders(token),
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        return rejectWithValue({
          message:
            result?.message ||
            `Employee lookup failed (${response.status} ${response.statusText}).`,
        });
      }

      const employee = getEmployeeFromResponse(result);

      if (!employee) {
        return rejectWithValue({
          message: "Employee lookup returned an unexpected response format.",
        });
      }

      return employee;
    } catch (error) {
      console.error("Fetch employee by ID error:", error);

      return rejectWithValue({
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while fetching employee details.",
      });
    }
  }
);

// --------------------------------------------------
// Fetch All Employees
// --------------------------------------------------

export const fetchEmployees = createAsyncThunk<
  Employee[],
  void,
  {
    state: RootState;
    rejectValue: string;
  }
>(
  "employees/fetchEmployees",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue("Authentication token not found. Please log in again.");
      }

      const requestUrl = `${EMPLOYEE_API}/all-employees`;

      console.log("Fetching employees from:", requestUrl);

      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          ...getAuthHeaders(token),
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const result = await response.json();

      console.log("Employee API response:", result);
      console.log("Employee API status:", response.status);

      if (!response.ok || result?.success === false) {
        return rejectWithValue(
          result?.message || `Failed to fetch employees (${response.status})`
        );
      }

      const employees = getEmployeesFromResponse(result);

      if (!employees) {
        return rejectWithValue(
          "Employee API returned an unexpected response format. Check the browser console."
        );
      }

      return employees;
    } catch (error) {
      console.error("Fetch employees error:", error);

      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Something went wrong while fetching employees."
      );
    }
  }
);

// --------------------------------------------------
// Create Employee
// --------------------------------------------------

export const createEmployee = createAsyncThunk<
  Employee,
  CreateEmployeePayload,
  {
    state: RootState;
    rejectValue: ApiError;
  }
>(
  "employees/createEmployee",
  async (employeeData, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue({
          message: "Authentication token not found. Please log in again.",
        });
      }

      const response = await fetch(
        EMPLOYEE_RESOURCE_API,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(employeeData),
        }
      );

      const result = await response.json();

      console.log("Create employee API response:", result);

      if (!response.ok || result?.success === false) {
        return rejectWithValue({
          message:
            result?.message ||
            (response.ok
              ? "The employee API rejected the request."
              : `Employee request failed (${response.status} ${response.statusText}).`),
          errors: result?.errors || {},
        });
      }

      const employee = getEmployeeFromResponse(result);

      if (!employee) {
        return rejectWithValue({
          message: "Employee was created, but the API response format was unexpected. Refresh the employee list.",
        });
      }

      return employee;
    } catch (error) {
      console.error("Create employee error:", error);

      return rejectWithValue({
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while creating employee.",
      });
    }
  }
);

// --------------------------------------------------
// Update Employee
// --------------------------------------------------

export const updateEmployee = createAsyncThunk<
  UpdateEmployeePayload,
  UpdateEmployeePayload,
  {
    state: RootState;
    rejectValue: ApiError;
  }
>(
  "employees/updateEmployee",
  async ({ id, ...employeeData }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) {
        return rejectWithValue({
          message: "Authentication token not found. Please log in again.",
        });
      }

      const response = await fetch(`${ADMIN_EMPLOYEE_API}/${id}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(employeeData),
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        return rejectWithValue({
          message:
            result?.message ||
            (response.ok
              ? "The employee API rejected the update."
              : `Employee update failed (${response.status} ${response.statusText}).`),
          errors: result?.errors || {},
        });
      }

      return { id, ...employeeData };
    } catch (error) {
      console.error("Update employee error:", error);

      return rejectWithValue({
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while updating employee.",
      });
    }
  }
);

// --------------------------------------------------
// Initial State
// --------------------------------------------------

const initialState: EmployeeState = {
  employees: [],
  loading: false,
  createLoading: false,
  updateLoading: false,
  error: null,
  createError: null,
  updateError: null,
  validationErrors: {},
  successMessage: null,
};

// --------------------------------------------------
// Employee Slice
// --------------------------------------------------

const employeeSlice = createSlice({
  name: "employees",
  initialState,

  reducers: {
    clearEmployeeMessages: (state) => {
      state.error = null;
      state.createError = null;
      state.updateError = null;
      state.validationErrors = {};
      state.successMessage = null;
    },

    clearEmployeeValidationErrors: (state) => {
      state.validationErrors = {};
    },
  },

  extraReducers: (builder) => {
    builder
      // Fetch pending
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      // Fetch successful
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload;
        state.error = null;
      })

      // Fetch failed
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch employees";
      })

      // Create pending
      .addCase(createEmployee.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
        state.validationErrors = {};
        state.successMessage = null;
      })

      // Create successful
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.createLoading = false;

        state.employees.push(action.payload);

        state.employees.sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        state.successMessage = "Employee created successfully";
        state.createError = null;
        state.validationErrors = {};
      })

      // Create failed
      .addCase(createEmployee.rejected, (state, action) => {
        state.createLoading = false;

        state.createError =
          action.payload?.message || "Failed to create employee";

        state.validationErrors =
          action.payload?.errors || {};
      })

      // Update pending
      .addCase(updateEmployee.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
        state.validationErrors = {};
        state.successMessage = null;
      })

      // Update successful
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.updateLoading = false;
        const index = state.employees.findIndex(
          (employee) => employee.id === action.payload.id
        );

        if (index !== -1) {
          state.employees[index] = {
            ...state.employees[index],
            ...action.payload,
          };
        }

        state.successMessage = "Employee updated successfully";
        state.updateError = null;
        state.validationErrors = {};
      })

      // Update failed
      .addCase(updateEmployee.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError =
          action.payload?.message || "Failed to update employee";
        state.validationErrors = action.payload?.errors || {};
      });
  },
});

// --------------------------------------------------
// Exports
// --------------------------------------------------

export const {
  clearEmployeeMessages,
  clearEmployeeValidationErrors,
} = employeeSlice.actions;

export default employeeSlice.reducer;
