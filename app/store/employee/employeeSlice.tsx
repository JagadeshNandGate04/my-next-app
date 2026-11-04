
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppDispatch } from "../store";
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

const employeeSlice = createSlice({
  name: "employees",
  initialState,
  reducers: {
    fetchEmployeesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchEmployeesSuccess: (state, action: PayloadAction<Employee[]>) => {
      state.loading = false;
      state.employees = action.payload;
      state.error = null;
    },
    fetchEmployeesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    createEmployeeStart: (state) => {
      state.createLoading = true;
      state.createError = null;
      state.validationErrors = {};
      state.successMessage = null;
    },
    createEmployeeSuccess: (state, action: PayloadAction<Employee>) => {
      state.createLoading = false;
      state.employees.push(action.payload);
      state.employees.sort((a, b) => a.name.localeCompare(b.name));
      state.successMessage = "Employee created successfully";
      state.createError = null;
      state.validationErrors = {};
    },
    createEmployeeFailure: (state, action: PayloadAction<ApiError>) => {
      state.createLoading = false;
      state.createError = action.payload.message;
      state.validationErrors = action.payload.errors || {};
    },
    updateEmployeeStart: (state) => {
      state.updateLoading = true;
      state.updateError = null;
      state.validationErrors = {};
      state.successMessage = null;
    },
    updateEmployeeSuccess: (
      state,
      action: PayloadAction<UpdateEmployeePayload>
    ) => {
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
    },
    updateEmployeeFailure: (state, action: PayloadAction<ApiError>) => {
      state.updateLoading = false;
      state.updateError = action.payload.message;
      state.validationErrors = action.payload.errors || {};
    },
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
});

export const {
  clearEmployeeMessages,
  clearEmployeeValidationErrors,
  fetchEmployeesStart,
  fetchEmployeesSuccess,
  fetchEmployeesFailure,
  createEmployeeStart,
  createEmployeeSuccess,
  createEmployeeFailure,
  updateEmployeeStart,
  updateEmployeeSuccess,
  updateEmployeeFailure,
} = employeeSlice.actions;

export default employeeSlice.reducer;

// --------------------------------------------------
// Fetch Employee By ID
// GET /api/v1/employees/employees/:id
// --------------------------------------------------

export const fetchEmployeeById =
  ({ id }: FetchEmployeeByIdPayload) =>
  async (_dispatch: AppDispatch, getState: () => RootState): Promise<Employee> => {
    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
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
        throw new Error(
          result?.message ||
          `Employee lookup failed (${response.status} ${response.statusText}).`
        );
      }

      const employee = getEmployeeFromResponse(result);

      if (!employee) {
        throw new Error("Employee lookup returned an unexpected response format.");
      }

      return employee;
    } catch (error) {
      console.error("Fetch employee by ID error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Something went wrong while fetching employee details."
      );
    }
  };

// --------------------------------------------------
// Fetch All Employees
// --------------------------------------------------

export const fetchEmployees =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<Employee[] | null> => {
    dispatch(fetchEmployeesStart());

    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
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
        throw new Error(
          result?.message || `Failed to fetch employees (${response.status})`
        );
      }

      const employees = getEmployeesFromResponse(result);

      if (!employees) {
        throw new Error(
          "Employee API returned an unexpected response format. Check the browser console."
        );
      }

      dispatch(fetchEmployeesSuccess(employees));
      return employees;
    } catch (error) {
      console.error("Fetch employees error:", error);
      const message = error instanceof Error
        ? error.message
        : "Something went wrong while fetching employees.";
      dispatch(fetchEmployeesFailure(message));
      return null;
    }
  };

// --------------------------------------------------
// Create Employee
// --------------------------------------------------

export const createEmployee =
  (employeeData: CreateEmployeePayload) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<Employee> => {
    dispatch(createEmployeeStart());

    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
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
        const error = Object.assign(
          new Error(
            result?.message ||
            (response.ok
              ? "The employee API rejected the request."
              : `Employee request failed (${response.status} ${response.statusText}).`)
          ),
          {
            errors: result?.errors || {},
          }
        );
        throw error;
      }

      const employee = getEmployeeFromResponse(result);

      if (!employee) {
        throw new Error(
          "Employee was created, but the API response format was unexpected. Refresh the employee list."
        );
      }

      dispatch(createEmployeeSuccess(employee));
      return employee;
    } catch (error) {
      console.error("Create employee error:", error);
      const apiError: ApiError = {
        message: error instanceof Error
          ? error.message
          : "Something went wrong while creating employee.",
        errors:
          typeof error === "object" && error !== null && "errors" in error
            ? (error.errors as Record<string, string>)
            : {},
      };
      dispatch(createEmployeeFailure(apiError));
      throw new Error(apiError.message);
    }
  };

// --------------------------------------------------
// Update Employee
// --------------------------------------------------

export const updateEmployee =
  ({ id, ...employeeData }: UpdateEmployeePayload) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<UpdateEmployeePayload> => {
    dispatch(updateEmployeeStart());

    try {
      const token = getState().auth.token;

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
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
        const error = Object.assign(
          new Error(
            result?.message ||
            (response.ok
              ? "The employee API rejected the update."
              : `Employee update failed (${response.status} ${response.statusText}).`)
          ),
          { errors: result?.errors || {} }
        );
        throw error;
      }

      const updatedEmployee = { id, ...employeeData };
      dispatch(updateEmployeeSuccess(updatedEmployee));
      return updatedEmployee;
    } catch (error) {
      console.error("Update employee error:", error);
      const apiError: ApiError = {
        message: error instanceof Error
          ? error.message
          : "Something went wrong while updating employee.",
        errors:
          typeof error === "object" && error !== null && "errors" in error
            ? (error.errors as Record<string, string>)
            : {},
      };
      dispatch(updateEmployeeFailure(apiError));
      throw new Error(apiError.message);
    }
  };
