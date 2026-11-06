
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
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

export interface EmployeeSalary {
  employee: {
    id: string | number;
    emp_code: string;
    name: string;
    email: string;
    designation: string;
    status: string;
  };
  salary_structure: {
    basic: number;
    hra: number;
    da: number;
    special_allowance: number;
    gross: number;
    effective_from: string;
    effective_to: string | null;
  } | null;
}

export interface UpdateEmployeeSalaryPayload {
  id: number;
  basic: number;
  hra: number;
  da: number;
  special_allowance: number;
  effective_from: string;
}

export interface SalaryRevision extends NonNullable<EmployeeSalary["salary_structure"]> {
  id: string | number;
  previous_gross: number | null;
  salary_difference: number | null;
  salary_change_percentage: number | null;
  change_type: string;
  status: string;
  duration_days: number;
}

export interface EmployeeSalaryHistory {
  total_salary_revisions: number;
  initial_gross: number | null;
  latest_gross: number | null;
  revisions: SalaryRevision[];
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
  salary: EmployeeSalary | null;
  salaryLoading: boolean;
  salaryError: string | null;
  salaryRequestId: string | null;
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

const parseSalaryStructure = (structure: unknown, employeeId: number): NonNullable<EmployeeSalary["salary_structure"]> => {
  if (
    !isRecord(structure) ||
    (typeof structure.user_id !== "string" && typeof structure.user_id !== "number") ||
    String(structure.user_id) !== String(employeeId) ||
    typeof structure.effective_from !== "string" ||
    (typeof structure.effective_to !== "string" && structure.effective_to !== null)
  ) {
    throw new Error("Unexpected salary structure.");
  }

  const amount = (value: unknown): number => {
    if (
      (typeof value !== "string" && typeof value !== "number") ||
      (typeof value === "string" && !/^\d+(?:\.\d+)?$/.test(value.trim())) ||
      !Number.isFinite(Number(value)) ||
      Number(value) < 0
    ) {
      throw new Error("Invalid salary amount.");
    }
    return Number(value);
  };

  return {
    basic: amount(structure.basic),
    hra: amount(structure.hra),
    da: amount(structure.da),
    special_allowance: amount(structure.special_allowance),
    gross: amount(structure.gross),
    effective_from: structure.effective_from,
    effective_to: structure.effective_to,
  };
};

const parseSalaryResponse = (result: unknown, employeeId: number): EmployeeSalary => {
  if (!isRecord(result) || !isRecord(result.data)) {
    throw new Error("Salary lookup returned an unexpected response format.");
  }

  const { employee, salary_structure: structure } = result.data;
  if (
    !isRecord(employee) ||
    (typeof employee.id !== "string" && typeof employee.id !== "number") ||
    String(employee.id) !== String(employeeId) ||
    typeof employee.emp_code !== "string" ||
    typeof employee.name !== "string" ||
    typeof employee.email !== "string" ||
    typeof employee.designation !== "string" ||
    typeof employee.status !== "string"
  ) {
    throw new Error("Salary lookup returned unexpected employee details.");
  }

  const salaryEmployee = {
    id: employee.id,
    emp_code: employee.emp_code,
    name: employee.name,
    email: employee.email,
    designation: employee.designation,
    status: employee.status,
  };

  if (structure === null) {
    return { employee: salaryEmployee, salary_structure: null };
  }
  return {
    employee: salaryEmployee,
    salary_structure: parseSalaryStructure(structure, employeeId),
  };
};

export const fetchEmployeeSalary = createAsyncThunk<
  EmployeeSalary,
  number,
  { state: RootState }
>("employees/fetchSalary", async (id, { getState, signal }) => {
  const token = getState().auth.token;
  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }

  const response = await fetch(`${ADMIN_EMPLOYEE_API}/${encodeURIComponent(id)}/salary`, {
    method: "GET",
    headers: getAuthHeaders(token),
    cache: "no-store",
    signal,
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok || (isRecord(result) && result.success === false)) {
    throw new Error(
      isRecord(result) && typeof result.message === "string"
        ? result.message
        : `Salary lookup failed (${response.status} ${response.statusText}).`
    );
  }
  if (result === null) {
    throw new Error("Salary lookup returned an invalid server response.");
  }
  return parseSalaryResponse(result, id);
});

export const fetchEmployeeSalaryHistory = createAsyncThunk<
  EmployeeSalaryHistory,
  number,
  { state: RootState }
>("employees/fetchSalaryHistory", async (id, { getState, signal }) => {
  const token = getState().auth.token;
  if (!token) throw new Error("Authentication token not found. Please log in again.");

  const response = await fetch(`${ADMIN_EMPLOYEE_API}/${encodeURIComponent(id)}/salary/history`, {
    method: "GET",
    headers: getAuthHeaders(token),
    cache: "no-store",
    signal,
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok || (isRecord(result) && result.success === false)) {
    throw new Error(
      isRecord(result) && typeof result.message === "string"
        ? result.message
        : `Salary history lookup failed (${response.status} ${response.statusText}).`
    );
  }
  if (!isRecord(result) || result.success !== true || !isRecord(result.data) ||
      !isRecord(result.data.employee) || String(result.data.employee.id) !== String(id) ||
      !isRecord(result.data.summary) || !Array.isArray(result.data.salary_history)) {
    throw new Error("Salary history returned an unexpected response.");
  }

  const number = (value: unknown, nullable = false): number | null => {
    if (value === null && nullable) return null;
    if ((typeof value !== "number" && typeof value !== "string") ||
        (typeof value === "string" && !/^-?\d+(?:\.\d+)?$/.test(value.trim())) ||
        !Number.isFinite(Number(value))) {
      throw new Error("Salary history returned an invalid numeric value.");
    }
    return Number(value);
  };

  const revisions = result.data.salary_history.map((item: unknown): SalaryRevision => {
    if (!isRecord(item) || (typeof item.id !== "string" && typeof item.id !== "number") ||
        typeof item.status !== "string" || typeof item.change_type !== "string") {
      throw new Error("Salary history returned an invalid revision.");
    }
    const duration = number(item.duration_days);
    if (duration === null || duration < 0 || !Number.isInteger(duration)) {
      throw new Error("Salary history returned an invalid duration.");
    }
    return {
      ...parseSalaryStructure(item, id),
      id: item.id,
      previous_gross: number(item.previous_gross, true),
      salary_difference: number(item.salary_difference, true),
      salary_change_percentage: number(item.salary_change_percentage, true),
      change_type: item.change_type,
      status: item.status,
      duration_days: duration,
    };
  });
  const summary = result.data.summary;
  const total = number(summary.total_salary_revisions);
  if (total === null || total < 0 || !Number.isInteger(total)) {
    throw new Error("Salary history returned an invalid revision count.");
  }
  return {
    total_salary_revisions: total,
    initial_gross: number(summary.initial_gross, true),
    latest_gross: number(summary.latest_gross, true),
    revisions,
  };
});

export const updateEmployeeSalary = createAsyncThunk<
  { id: number; salary_structure: NonNullable<EmployeeSalary["salary_structure"]> },
  UpdateEmployeeSalaryPayload,
  { state: RootState; rejectValue: { message: string; reloadRequired: boolean } }
>("employees/updateSalary", async ({ id, ...payload }, { getState, rejectWithValue }) => {
  const token = getState().auth.token;
  if (!token) throw new Error("Authentication token not found. Please log in again.");

  let response: Response;
  try {
    response = await fetch(`${ADMIN_EMPLOYEE_API}/${encodeURIComponent(id)}/salary`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return rejectWithValue({
      message: "Could not confirm whether the salary was saved. Reload salary details before trying again.",
      reloadRequired: true,
    });
  }
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok || (isRecord(result) && result.success === false)) {
    throw new Error(
      isRecord(result) && typeof result.message === "string"
        ? result.message
        : `Salary update failed (${response.status} ${response.statusText}).`
    );
  }
  try {
    if (!isRecord(result) || result.success !== true || !isRecord(result.data) ||
        !isRecord(result.data.employee) || String(result.data.employee.id) !== String(id)) {
      throw new Error("Unexpected response.");
    }
    return { id, salary_structure: parseSalaryStructure(result.data.salary_structure, id) };
  } catch {
    return rejectWithValue({
      message: "The salary may have been saved, but the server response was invalid. Reload salary details before trying again.",
      reloadRequired: true,
    });
  }
});

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
  salary: null,
  salaryLoading: false,
  salaryError: null,
  salaryRequestId: null,
};

const employeeSlice = createSlice({
  name: "employees",
  initialState,
  reducers: {
    clearEmployeeSalary: (state) => {
      state.salary = null;
      state.salaryLoading = false;
      state.salaryError = null;
      state.salaryRequestId = null;
    },
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
        (employee) => String(employee.id) === String(action.payload.id)
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
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployeeSalary.pending, (state, action) => {
        state.salary = null;
        state.salaryError = null;
        state.salaryLoading = true;
        state.salaryRequestId = action.meta.requestId;
      })
      .addCase(fetchEmployeeSalary.fulfilled, (state, action) => {
        if (state.salaryRequestId !== action.meta.requestId) return;
        state.salary = action.payload;
        state.salaryLoading = false;
        state.salaryRequestId = null;
      })
      .addCase(fetchEmployeeSalary.rejected, (state, action) => {
        if (state.salaryRequestId !== action.meta.requestId) return;
        state.salaryLoading = false;
        state.salaryError = action.error.message || "Unable to load salary details.";
        state.salaryRequestId = null;
      })
      .addCase(updateEmployeeSalary.fulfilled, (state, action) => {
        if (state.salary && String(state.salary.employee.id) === String(action.payload.id)) {
          state.salary.salary_structure = action.payload.salary_structure;
        }
      });
  },
});

export const {
  clearEmployeeSalary,
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
