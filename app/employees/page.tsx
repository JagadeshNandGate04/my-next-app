"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Users,
  UserPlus,
  RefreshCw,
  Download,
  Search,
  IndianRupee,
  History,
  Briefcase,
  X,
  Edit3,
  PencilLine,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import type { AppDispatch, RootState } from "@/app/store/store";
import SalaryDetails, { SalaryHistoryContent } from "@/app/components/SalaryDetails";
import {
  fetchEmployees,
  fetchEmployeeById,
  fetchEmployeeSalary,
  createEmployee,
  updateEmployee,
  clearEmployeeMessages,
  clearEmployeeSalary,
  type Employee,
} from "@/app/store/employee/employeeSlice";
import {
  fetchDesignations,
  createDesignation,
  clearDesignationCreateError,
} from "@/app/store/settings/settingsSlice";

type PayrollFilter = "ALL" | "WITH_STRUCTURE" | "PENDING";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const getPageItems = (current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", total];
  if (current >= total - 3) {
    return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total];
};

interface EmployeeFormData {
  emp_code: string;
  name: string;
  email: string;
  phone: string;
  date_of_joining: string;
  designation: string;
  status: "ACTIVE" | "INACTIVE";
  basic: string;
  hra: string;
  special_allowance: string;
}

// THEME COLOURS (same three blues as the dashboard)
const SKY = "#7BBDE8";
const SKY_LIGHT = "#bfe0f5";
const BLUE = "#1b64da";
const INK = "#0f172a";

const today = () => {
  const date = new Date();
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().slice(0, 10);
};

const emptyForm = (dateOfJoining = ""): EmployeeFormData => ({
  emp_code: "",
  name: "",
  email: "",
  phone: "",
  date_of_joining: dateOfJoining,
  designation: "",
  status: "ACTIVE",
  basic: "",
  hra: "0",
  special_allowance: "0",
});

// Parse YYYY-MM-DD as a local date to avoid timezone date shifts.
const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  const datePart = dateString.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return "—";

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const calculateTenure = (
  dateString: string | null | undefined,
  todayDate: Date | null
) => {
  if (!dateString || !todayDate) return "—";

  const datePart = dateString.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  const joiningDate = new Date(year, month - 1, day);

  if (Number.isNaN(joiningDate.getTime())) return "—";

  let months =
    (todayDate.getFullYear() - joiningDate.getFullYear()) * 12 +
    todayDate.getMonth() -
    joiningDate.getMonth();

  if (todayDate.getDate() < joiningDate.getDate()) months -= 1;
  months = Math.max(0, months);

  if (months >= 12) {
    const years = (months / 12).toFixed(1);
    return `${years} yrs tenure`;
  }

  // return `${months} mos tenure`;
};

const getAvatarGradient = (name: string) => {
  const gradients = [
    "from-[#7BBDE8] to-[#1b64da]",
    "from-[#1b64da] to-[#0a47b3]",
    "from-[#a9d6f2] to-[#4aa3df]",
    "from-[#5aa6e3] to-[#2f78e6]",
    "from-[#6fb5e6] to-[#0a47b3]",
    "from-[#8cc8ec] to-[#3b82e8]",
    "from-[#4aa3df] to-[#0a47b3]",
    "from-[#74b9e8] to-[#1b64da]",
    "from-[#68b0e4] to-[#2f78e6]",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return gradients[Math.abs(hash) % gradients.length];
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function EmployeeDirectoryPage() {
  const dispatch = useDispatch<AppDispatch>();

  const {
    employees,
    loading,
    createLoading,
    updateLoading,
    error,
    createError,
    updateError,
    validationErrors,
    successMessage,
    salary,
    salaryLoading,
    salaryError,
    pagination,
    overallTotal,
    knownDesignations,
    maxEmpNumber,
  } = useSelector((state: RootState) => state.employees);
  const { designations, designationsLoading, designationLoadError, designationCreating, designationCreateError } =
    useSelector((state: RootState) => state.settings);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDesignation, setSelectedDesignation] = useState("All");
  const [payrollFilter, setPayrollFilter] = useState<PayrollFilter>("ALL");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [customDesignation, setCustomDesignation] = useState(false);
  const [newDesignation, setNewDesignation] = useState("");
  const [designationOpen, setDesignationOpen] = useState(false);
  const [designationActive, setDesignationActive] = useState(0);
  const designationRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [salaryEmployee, setSalaryEmployee] = useState<Employee | null>(null);
  const [historyEmployeeId, setHistoryEmployeeId] = useState<number | null>(null);
  const salaryPanelRef = useRef<HTMLElement>(null);
  const detailRequestRef = useRef(0);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm());
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const isSaving = createLoading || updateLoading || designationCreating;
  const hasEmployeeChanges = editingEmployee !== null && (
    formData.emp_code.trim() !== editingEmployee.emp_code.trim() ||
    formData.name.trim() !== editingEmployee.name.trim() ||
    formData.email.trim().toLowerCase() !== editingEmployee.email.trim().toLowerCase() ||
    formData.phone.trim() !== (editingEmployee.phone || "").trim() ||
    formData.designation.trim() !== (editingEmployee.designation || "").trim() ||
    formData.date_of_joining !== editingEmployee.date_of_joining.slice(0, 10) ||
    formData.status !== editingEmployee.status
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => setCurrentDate(new Date()), 0);

    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timerId);
  }, [searchQuery]);

  const employeeQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch,
      designation: selectedDesignation,
    }),
    [page, pageSize, debouncedSearch, selectedDesignation]
  );

  useEffect(() => {
    dispatch(fetchEmployees(employeeQuery));
  }, [dispatch, employeeQuery]);

  const reloadEmployees = () => dispatch(fetchEmployees(employeeQuery));

  useEffect(() => {
    return () => {
      detailRequestRef.current += 1;
      dispatch(clearEmployeeMessages());
      dispatch(clearEmployeeSalary());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!salaryEmployee) return;

    salaryPanelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const employeeId = salaryEmployee.id;
      setSalaryEmployee(null);
      dispatch(clearEmployeeSalary());
      document.getElementById(`employee-salary-button-${employeeId}`)?.focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, salaryEmployee]);

  const nextEmpCode = `EMP${String(maxEmpNumber + 1).padStart(3, "0")}`;

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === "ACTIVE"),
    [employees]
  );

  const totalHeadcount = activeEmployees.length;

  const currentQuarterJoiners = useMemo(() => {
    if (!currentDate) return 0;

    const quarterStartMonth = Math.floor(currentDate.getMonth() / 3) * 3;
    const quarterStart = new Date(
      currentDate.getFullYear(),
      quarterStartMonth,
      1
    );

    return activeEmployees.filter((employee) => {
      const [year, month, day] = employee.date_of_joining
        .slice(0, 10)
        .split("-")
        .map(Number);
      const joiningDate = new Date(year, month - 1, day);
      return joiningDate >= quarterStart && joiningDate <= currentDate;
    }).length;
  }, [activeEmployees, currentDate]);

  const totalGrossPayroll = activeEmployees.reduce(
    (total, employee) => total + Number(employee.gross || 0),
    0
  );

  const distinctDesignations = useMemo(
    () =>
      Array.from(
        new Set(activeEmployees.map((employee) => employee.designation))
      ).sort((a, b) => a.localeCompare(b)),
    [activeEmployees]
  );

  const serverPaginated = pagination !== null;

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return employees.filter((employee) => {
      if (serverPaginated) {
        const hasStructure = Boolean(employee.salary_structure_id);
        return payrollFilter === "ALL"
          ? true
          : payrollFilter === "WITH_STRUCTURE"
            ? hasStructure
            : !hasStructure;
      }

      const matchesSearch =
        !query ||
        employee.name.toLowerCase().includes(query) ||
        employee.emp_code.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.designation.toLowerCase().includes(query) ||
        employee.phone.includes(query);

      const matchesDesignation =
        selectedDesignation === "All" ||
        employee.designation === selectedDesignation;

      const hasSalaryStructure = Boolean(employee.salary_structure_id);

      const matchesPayroll =
        payrollFilter === "ALL"
          ? true
          : payrollFilter === "WITH_STRUCTURE"
            ? hasSalaryStructure
            : !hasSalaryStructure;

      return matchesSearch && matchesDesignation && matchesPayroll;
    });
  }, [employees, searchQuery, selectedDesignation, payrollFilter, serverPaginated]);

  const totalRecords = pagination ? pagination.total : filteredEmployees.length;
  const totalPages = pagination
    ? Math.max(1, pagination.total_pages)
    : Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const currentPage = pagination ? pagination.page : Math.min(page, totalPages);
  const pageStartIndex = (currentPage - 1) * pageSize;
  const paginatedEmployees = pagination
    ? filteredEmployees
    : filteredEmployees.slice(pageStartIndex, pageStartIndex + pageSize);
  const pageRowCount = pagination ? employees.length : paginatedEmployees.length;
  const pageRangeStart = pageRowCount === 0 ? 0 : pageStartIndex + 1;
  const pageRangeEnd = pageStartIndex + pageRowCount;
  const hasActiveFilters =
    searchQuery.trim() !== "" || selectedDesignation !== "All" || payrollFilter !== "ALL";
  const designationOptions = serverPaginated ? knownDesignations : distinctDesignations;

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const nameRegex = /^[A-Za-z ]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    } else if (!nameRegex.test(formData.name.trim())) {
      errors.name = "Name can contain only letters and spaces";
    }

    if (editingEmployee && !formData.emp_code.trim()) {
      errors.emp_code = "Employee code is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = "Enter a valid email address";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone is required";
    } else if (!phoneRegex.test(formData.phone.trim())) {
      errors.phone = "Phone number must contain exactly 10 digits";
    }

    if (!formData.date_of_joining) {
      errors.date_of_joining = "Date of joining is required";
    }

    if (!formData.designation.trim()) {
      errors.designation = "Designation is required";
    } else if (customDesignation) {
      errors.designation = "Add the new designation or choose one from the list.";
    }

    if (!editingEmployee) {
      const salaryFields = [
        ["basic", "Basic salary"],
        ["hra", "HRA"],
        ["special_allowance", "Special allowance"],
      ] as const;

      salaryFields.forEach(([field, label]) => {
        const value = formData[field].trim();
        const amount = Number(value);

        if (!value) {
          errors[field] = `${label} is required`;
        } else if (!Number.isFinite(amount) || amount < 0) {
          errors[field] = `${label} must be a non-negative number`;
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (!designationOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        designationRef.current &&
        !designationRef.current.contains(event.target as Node)
      ) {
        setDesignationOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [designationOpen]);

  // An existing designation that is not in the list is shown first.
  const designationNames = designations.map((item) => item.name);
  const designationItems =
    formData.designation && !designationNames.includes(formData.designation)
      ? [formData.designation, ...designationNames]
      : designationNames;
  const designationOtherIndex = designationItems.length;

  const openDesignationList = () => {
    const selected = designationItems.indexOf(formData.designation);
    setDesignationActive(selected >= 0 ? selected : 0);
    setDesignationOpen(true);
  };

  const chooseDesignation = (index: number) => {
    setDesignationOpen(false);
    if (index === designationOtherIndex) {
      setCustomDesignation(true);
      setNewDesignation("");
      dispatch(clearDesignationCreateError());
      return;
    }
    setFormData((current) => ({ ...current, designation: designationItems[index] }));
    setFormErrors((current) => ({ ...current, designation: "" }));
  };

  const handleAddDesignation = async () => {
    if (designationCreating || !newDesignation.trim()) return;
    try {
      const designation = await dispatch(createDesignation(newDesignation));
      setFormData((current) => ({ ...current, designation: designation.name }));
      setCustomDesignation(false);
      setNewDesignation("");
      setFormErrors((current) => ({ ...current, designation: "" }));
    } catch (error) {
      setFormErrors((current) => ({
        ...current,
        designation: error instanceof Error ? error.message : "Failed to create designation.",
      }));
    }
  };

  const handleDesignationKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && designationOpen) {
      event.preventDefault();
      event.stopPropagation();
      setDesignationOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!designationOpen) {
        openDesignationList();
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      const count = designationOtherIndex + 1;
      setDesignationActive((current) => (current + step + count) % count);
      return;
    }

    if ((event.key === "Enter" || event.key === " ") && designationOpen) {
      event.preventDefault();
      chooseDesignation(designationActive);
    }
  };

  const resetForm = () => {
    setDesignationOpen(false);
    setCustomDesignation(false);
    setNewDesignation("");
    dispatch(clearDesignationCreateError());
    setFormData(emptyForm(today()));
    setFormErrors({});
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingEmployee(null);
    resetForm();
    dispatch(clearEmployeeMessages());
  };

  const handleCreateEmployee = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (isSaving || (editingEmployee && !hasEmployeeChanges)) return;
    if (!validateForm()) return;

    setFormErrors({});

    try {
      if (editingEmployee) {
        await dispatch(
          updateEmployee({
            id: editingEmployee.id,
            emp_code: formData.emp_code.trim(),
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone.trim(),
            designation: formData.designation.trim(),
            date_of_joining: formData.date_of_joining,
            status: formData.status,
          })
        );
      } else {
        await dispatch(
          createEmployee({
            emp_code: nextEmpCode,
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone.trim(),
            date_of_joining: formData.date_of_joining,
            designation: formData.designation.trim(),
            basic: Number(formData.basic),
            hra: Number(formData.hra),
            special_allowance: Number(formData.special_allowance),
          })
        );
      }

      setIsModalOpen(false);
      setEditingEmployee(null);
      resetForm();
      reloadEmployees();
    } catch (err) {
      console.error(
        editingEmployee
          ? "Employee update failed:"
          : "Employee creation failed:",
        err
      );
    }
  };

  const openCreateModal = () => {
    detailRequestRef.current += 1;
    setDetailLoadingId(null);
    setDetailError(null);
    setEditingEmployee(null);
    dispatch(clearEmployeeMessages());
    resetForm();
    void dispatch(fetchDesignations());
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setCustomDesignation(false);
    setFormData({
      emp_code: employee.emp_code,
      name: employee.name,
      email: employee.email,
      phone: employee.phone || "",
      date_of_joining: employee.date_of_joining.slice(0, 10),
      designation: employee.designation || "",
      status: employee.status,
      basic: String(employee.basic ?? ""),
      hra: String(employee.hra ?? "0"),
      special_allowance: String(employee.special_allowance ?? "0"),
    });
    setFormErrors({});
    dispatch(clearEmployeeMessages());
    dispatch(clearDesignationCreateError());
    setNewDesignation("");
    void dispatch(fetchDesignations());
    setIsModalOpen(true);
  };

  const handleEditEmployee = async (id: number) => {
    const requestId = ++detailRequestRef.current;
    setDetailLoadingId(id);
    setDetailError(null);

    try {
      const employee = await dispatch(fetchEmployeeById({ id }));
      if (requestId !== detailRequestRef.current) return;
      if (employee.id !== Number(id)) {
        throw new Error("Employee lookup returned details for a different employee.");
      }
      openEditModal(employee);
    } catch (error) {
      if (requestId !== detailRequestRef.current) return;
      setDetailError(
        error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
          ? error.message
          : "Unable to load employee details."
      );
    } finally {
      if (requestId === detailRequestRef.current) setDetailLoadingId(null);
    }
  };

  const openSalaryPanel = (employee: Employee) => {
    detailRequestRef.current += 1;
    setDetailLoadingId(null);
    setDetailError(null);
    setHistoryEmployeeId(null);
    setSalaryEmployee(employee);
    dispatch(fetchEmployeeSalary(employee.id));
  };

  const closeSalaryPanel = () => {
    const employeeId = salaryEmployee?.id;
    setSalaryEmployee(null);
    dispatch(clearEmployeeSalary());
    if (employeeId !== undefined) {
      document.getElementById(`employee-salary-button-${employeeId}`)?.focus();
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "EMP Code",
      "Name",
      "Designation",
      "Email",
      "Phone",
      "Joining Date",
      "Gross Salary",
      "Status",
    ];

    const escapeCSV = (value: string | number) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = filteredEmployees.map((employee) => [
      employee.emp_code,
      employee.name,
      employee.designation,
      employee.email,
      employee.phone,
      employee.date_of_joining,
      employee.gross || 0,
      employee.status,
    ]);

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `nandgate-employees-${today()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-2.5 rounded-xl bg-[#f3f9fe] border text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
      formErrors[field] || validationErrors[field]
        ? "border-rose-400 focus:ring-rose-200"
        : "border-[#bfe0f5] focus:ring-[#7BBDE8]"
    }`;

  const getFieldError = (field: string) =>
    formErrors[field] || validationErrors[field];

  return (
    <div className="min-h-screen bg-[#f0f6fa] text-[#1e293b] font-sans antialiased">
      <main className="flex-1 min-w-0 py-4 sm:py-6 lg:py-8">
        <div className="mx-auto w-full max-w-[1700px] space-y-6 px-3 sm:px-5 lg:px-6">
          {/* Page heading */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-[#0f172a] tracking-tight">
                Employee Management
              </h1>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={reloadEmployees}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[#d5dbe1] text-xs font-bold text-[#475569] hover:bg-[#f1f6fc] shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-[#1b64da] ${
                    loading ? "animate-spin" : ""
                  }`}
                />
                Sync Data
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredEmployees.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[#d5dbe1] text-xs font-bold text-[#475569] hover:bg-[#f1f6fc] shadow-sm transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-[#1b64da]" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#1b64da] to-[#0047BA] hover:from-[#1552b5] hover:to-[#003893] text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Onboard Employee</span>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs font-mono font-bold tracking-wider">
                  {nextEmpCode}
                </span>
              </button>
            </div>
          </div>

          {/* API messages */}
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* KPI cards (three blues, same as the dashboard cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className="rounded-3xl p-6 shadow-sm flex items-center justify-between"
              style={{ backgroundColor: SKY_LIGHT, color: INK }}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Total Employees
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-black tracking-tight">
                    {loading ? "—" : serverPaginated ? overallTotal ?? pagination.total : totalHeadcount}
                  </span>
                  <span className="text-xs font-bold opacity-60">
                    active employees
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center text-[#1b64da]">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div
              className="rounded-3xl p-6 shadow-sm flex items-center justify-between"
              style={{ backgroundColor: SKY, color: INK }}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                  New Joiners (This Quarter)
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-black tracking-tight">
                    {serverPaginated ? "—" : currentQuarterJoiners}
                  </span>
                  <span className="text-xs font-bold opacity-60">
                    this quarter
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center text-[#1b64da]">
                <UserPlus className="w-6 h-6" />
              </div>
            </div>

            <div
              className="rounded-3xl p-6 shadow-sm flex items-center justify-between"
              style={{ backgroundColor: BLUE, color: "#ffffff" }}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Current Gross Payroll
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-black">₹</span>
                  <span className="text-3xl font-black tracking-tight">
                    {serverPaginated ? "—" : new Intl.NumberFormat("en-IN").format(totalGrossPayroll)}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center text-[#1b64da]">
                <IndianRupee className="w-6 h-6" />
              </div>
            </div>

            <div
              className="rounded-3xl p-6 shadow-sm flex items-center justify-between"
              style={{ backgroundColor: SKY_LIGHT, color: INK }}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Active Designations
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-black tracking-tight">
                    {designationOptions.length}
                  </span>
                  <span className="text-xs font-bold opacity-60">
                    role groups
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center text-[#1b64da]">
                <Briefcase className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Search and filters */}
          <div className="bg-white border border-[#d5dbe1] rounded-3xl p-4 sm:p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_16rem_14rem] lg:items-center">
              <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by employee name, EMP code, email, phone, or designation..."
                  aria-label="Search employees"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                  }}
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#f8fafc] border border-[#d5dbe1] text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                />
              </div>

              <div className="relative min-w-0">
                <Briefcase className="pointer-events-none w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <select
                  aria-label="Filter by designation"
                  value={selectedDesignation}
                  onChange={(event) => {
                    setSelectedDesignation(event.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none truncate pl-11 pr-10 py-2.5 rounded-2xl bg-[#f8fafc] border border-[#d5dbe1] text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                >
                  <option value="All">All designations</option>
                  {(selectedDesignation !== "All" && !designationOptions.includes(selectedDesignation)
                    ? [...designationOptions, selectedDesignation]
                    : designationOptions
                  ).map((designation) => (
                    <option key={designation} value={designation}>
                      {designation}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>

              <div className="relative min-w-0">
                <IndianRupee className="pointer-events-none w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <select
                  aria-label="Filter by payroll structure"
                  value={payrollFilter}
                  onChange={(event) => {
                    setPayrollFilter(event.target.value as PayrollFilter);
                    setPage(1);
                  }}
                  className="w-full appearance-none truncate pl-11 pr-10 py-2.5 rounded-2xl bg-[#f8fafc] border border-[#d5dbe1] text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                >
                  <option value="ALL">All payroll</option>
                  <option value="WITH_STRUCTURE">With structure</option>
                  <option value="PENDING">Pending structure</option>
                </select>
                <ChevronDown className="pointer-events-none w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Employee table */}
          <div className="flex min-w-0 flex-col items-start gap-4 xl:flex-row">
          <div className="min-w-0 w-full flex-1 bg-white border border-[#d5dbe1] rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 lg:p-6 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1b64da]" />
                <h2 className="text-lg font-black text-[#0f172a] tracking-tight">
                  Employee Roster & Salary Structure
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#eaf4fc] text-[#1b64da] border border-[#d6e8f7]">
                  Showing {totalRecords} records
                </span>
              </div>
           
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1255px] table-fixed border-collapse text-left">
                <colgroup>
                  <col className="w-[235px]" />
                  <col className="w-[115px]" />
                  <col className="w-[185px]" />
                  <col className="w-[235px]" />
                  <col className="w-[130px]" />
                  <col className="w-[110px]" />
                  <col className="w-[245px]" />
                </colgroup>
                <thead>
                  <tr className="bg-[#eaf4fc] border-b border-[#d6e8f7] text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th scope="col" className="whitespace-nowrap py-4 pl-[74px] pr-4">Employee</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-4">Emp Code</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-4">Designation</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-4">Contact</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-4">Joining Date</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-4">Status</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-4 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e2e8f0] text-sm">
                  {loading && employees.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-14 text-center text-sm text-slate-500"
                      >
                        <span className="inline-flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#1b64da]" />
                          Loading employees...
                        </span>
                      </td>
                    </tr>
                  ) : filteredEmployees.length > 0 ? (
                    paginatedEmployees.map((employee) => (
                      <React.Fragment key={employee.id}>
                      <tr
                        className="hover:bg-[#f5faff] transition-all duration-150 group"
                      >
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                                employee.name
                              )} text-white font-black flex items-center justify-center text-sm shadow-md group-hover:scale-105 transition-transform duration-150 tracking-wider`}
                            >
                              {getInitials(employee.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="break-words font-bold text-[#0f172a] group-hover:text-[#1b64da] transition-colors text-sm">
                                {employee.name}
                              </div>
                              <div className="text-xs text-[#64748b] font-medium">
                                Employee
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <span className="inline-block max-w-full break-all rounded-lg border border-[#d6e8f7] bg-[#eaf4fc] px-2.5 py-1 font-mono text-xs font-bold text-[#1b64da]">
                            {employee.emp_code}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <span className="inline-block max-w-full break-words rounded-xl border border-[#d6e8f7] bg-[#eaf4fc] px-3 py-1 text-xs font-bold text-[#1b64da]">
                            {employee.designation}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-col space-y-1 text-xs text-[#475569]">
                            <span className="break-all font-mono text-slate-700">
                              {employee.email}
                            </span>
                            <span className="break-all font-mono text-slate-500 font-bold">
                              +91 {employee.phone}
                            </span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 align-middle">
                          <div className="text-xs font-bold text-[#0f172a]">
                            {formatDate(employee.date_of_joining)}
                          </div>
                          <div className="text-xs font-medium text-slate-500 mt-0.5">
                            {calculateTenure(
                              employee.date_of_joining,
                              currentDate
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 align-middle">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border shadow-sm ${
                              employee.status === "ACTIVE"
                                ? "bg-[#e1f1fb] text-[#0a47b3] border-[#7BBDE8]"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                employee.status === "ACTIVE"
                                  ? "bg-[#1b64da]"
                                  : "bg-slate-400"
                              }`}
                            />
                            {employee.status}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`employee-salary-button-${employee.id}`}
                              type="button"
                              title={`View salary for ${employee.name}`}
                              aria-label={`View salary for ${employee.name}`}
                              aria-haspopup="dialog"
                              aria-expanded={salaryEmployee?.id === employee.id}
                              onClick={() => openSalaryPanel(employee)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#c7e1f4] bg-[#eef7fd] text-[#1b64da] transition-colors hover:bg-[#dceffc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b64da]"
                            >
                              <IndianRupee className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title={`Edit ${employee.name}`}
                              aria-label={`Edit ${employee.name}`}
                              onClick={() => handleEditEmployee(employee.id)}
                              disabled={detailLoadingId !== null}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:border-[#c7e1f4] hover:bg-[#eef7fd] hover:text-[#1b64da] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b64da] disabled:cursor-wait disabled:opacity-50"
                            >
                              {detailLoadingId === employee.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Edit3 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {historyEmployeeId === employee.id && (
                        <tr>
                          <td colSpan={7} className="bg-[#f5faff] px-4 py-4">
                            <section id={`salary-history-${employee.id}`} aria-label={`Salary history for ${employee.name}`} className="sticky left-4 w-[calc(100vw-4rem)] max-w-[760px] rounded-2xl border border-[#d6e8f7] bg-white p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="flex items-center gap-2 text-base font-bold text-slate-900"><History className="h-4 w-4 text-blue-600" /> Salary history</h3>
                                  <p className="mt-1 text-sm text-slate-600">{employee.name} · {employee.emp_code}</p>
                                </div>
                                <button type="button" aria-label="Close salary history" onClick={() => {
                                  setHistoryEmployeeId(null);
                                  document.getElementById(`salary-history-button-${employee.id}`)?.focus();
                                }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <SalaryHistoryContent key={employee.id} employeeId={employee.id} />
                            </section>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-sm text-slate-400"
                      >
                        {totalRecords === 0 && !hasActiveFilters
                          ? "No employees have been added yet."
                          : "No employees found matching the search criteria."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalRecords > 0 && (
              <nav
                aria-label="Employee pagination"
                className="flex flex-col items-center justify-between gap-3 border-t border-[#e2e8f0] bg-white px-4 py-3 text-xs text-[#64748b] sm:flex-row"
              >
                <label className="flex items-center gap-2 font-semibold">
                  Rows per page
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#7BBDE8] focus:ring-2 focus:ring-[#7BBDE8]/30"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>

                <span className="font-semibold">
                  {pageRangeStart}–{pageRangeEnd} of {totalRecords}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-[#eef7fd] hover:text-[#1b64da] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {getPageItems(currentPage, totalPages).map((item) =>
                    typeof item === "string" ? (
                      <span key={item} className="px-1 text-slate-400" aria-hidden="true">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        aria-label={`Page ${item}`}
                        aria-current={item === currentPage ? "page" : undefined}
                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-bold transition-colors ${
                          item === currentPage
                            ? "border-[#1b64da] bg-[#1b64da] text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-[#eef7fd] hover:text-[#1b64da]"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-[#eef7fd] hover:text-[#1b64da] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </nav>
            )}

            <div className="p-4 bg-[#f7f9fd] border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748b] gap-2">
              <span>
                Showing {pageRowCount} of {totalRecords}{" "}
                employees
              </span>
              <span>
                Employee code preview:{" "}
                <strong className="font-mono text-[#1b64da]">
                  {nextEmpCode}
                </strong>
              </span>
            </div>
          </div>
          {salaryEmployee && (
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeSalaryPanel();
              }}
            >
              <section
                ref={salaryPanelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="salary-details-title"
                tabIndex={-1}
                className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-[#d6e8f7] bg-white shadow-2xl focus:outline-none"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[#d6e8f7] bg-[#f1f8fe] px-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1b64da] text-white">
                      <IndianRupee className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h2 id="salary-details-title" className="text-sm font-black text-[#0f172a]">Salary details</h2>
                      <p className="mt-0.5 break-words text-xs font-medium text-slate-600">
                        {salaryEmployee.name} <span className="text-slate-400">·</span> {salaryEmployee.emp_code}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeSalaryPanel}
                    aria-label="Close salary details"
                    className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b64da]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="overflow-y-auto p-4">
                  <SalaryDetails
                    key={salaryEmployee.id}
                    salary={salary}
                    loading={salaryLoading}
                    error={salaryError}
                    onRetry={() => dispatch(fetchEmployeeSalary(salaryEmployee.id))}
                  />
                </div>
              </section>
            </div>
          )}
          </div>
        </div>
      </main>

      {detailError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-details-title"
            className="bg-white border border-[#d5dbe1] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative my-8"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
              <div>
                <h2
                  id="employee-details-title"
                  className="font-black text-xl text-[#0f172a]"
                >
                  Unable to load employee details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailError(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#eaf4fc]"
                aria-label="Close employee details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              {detailError}
            </div>
          </section>
        </div>
      )}

      {/* Create or edit employee modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="employee-form-title" className="bg-white border border-[#bfe0f5] rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative my-8">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#d6e8f7] bg-[#eaf4fc] p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#eaf4fc] border border-[#d6e8f7] flex items-center justify-center text-[#1b64da]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="employee-form-title" className="font-black text-xl text-[#0f172a]">
                    {editingEmployee ? "Edit Employee" : "Onboard New Employee"}
                  </h3>
                  {editingEmployee ? (
                    <p className="text-xs text-[#64748b]">
                      Update employee details and account status.
                    </p>
                  ) : (
                    <p className="text-xs text-[#64748b]">
                      Next employee code preview:{" "}
                      <span className="font-mono font-bold text-[#1b64da]">
                        {nextEmpCode}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                aria-label="Close employee form"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#eaf4fc] disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(editingEmployee ? updateError : createError) && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {editingEmployee ? updateError : createError}
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="mt-5 space-y-4">
              {editingEmployee && (
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wider">
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    value={formData.emp_code}
                    onChange={(event) =>
                      setFormData({ ...formData, emp_code: event.target.value })
                    }
                    className={inputClass("emp_code")}
                  />
                  {getFieldError("emp_code") && (
                    <p className="text-xs text-rose-600 mt-1 font-semibold">
                      {getFieldError("emp_code")}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arjun Varma"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  className={inputClass("name")}
                />
                {getFieldError("name") && (
                  <p className="text-xs text-rose-600 mt-1 font-semibold">
                    {getFieldError("name")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wider">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    placeholder="name@nandgate.it"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData({ ...formData, email: event.target.value })
                    }
                    className={inputClass("email")}
                  />
                  {getFieldError("email") && (
                    <p className="text-xs text-rose-600 mt-1 font-semibold">
                      {getFieldError("email")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wider">
                    Phone (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    className={inputClass("phone")}
                  />
                  {getFieldError("phone") && (
                    <p className="text-xs text-rose-600 mt-1 font-semibold">
                      {getFieldError("phone")}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wider">
                    Designation *
                  </label>
                  {customDesignation ? (
                    <>
                      <input
                        type="text"
                        autoFocus
                        aria-label="New designation name"
                        value={newDesignation}
                        disabled={designationCreating}
                        onChange={(event) => {
                          setNewDesignation(event.target.value);
                          if (designationCreateError) dispatch(clearDesignationCreateError());
                          setFormErrors((current) => ({ ...current, designation: "" }));
                        }}
                        placeholder="New designation name"
                        maxLength={60}
                        className={inputClass("designation")}
                      />
                      <button type="button" onClick={() => void handleAddDesignation()}
                        disabled={designationCreating || !newDesignation.trim()}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#1b64da] px-3 py-2 text-xs font-bold text-white hover:bg-[#1552b5] disabled:opacity-50">
                        {designationCreating && <RefreshCw className="h-4 w-4 animate-spin" />}
                        {designationCreating ? "Adding..." : "Add designation"}
                      </button>
                      <button
                        type="button"
                        disabled={designationCreating}
                        onClick={() => {
                          setCustomDesignation(false);
                          setNewDesignation("");
                          dispatch(clearDesignationCreateError());
                          setFormErrors((current) => ({ ...current, designation: "" }));
                        }}
                        className="mt-2 block text-xs font-bold text-[#1b64da] hover:underline disabled:opacity-50"
                      >
                        Choose from the list instead
                      </button>
                    </>
                  ) : (
                    <div
                      ref={designationRef}
                      className="relative"
                      onKeyDown={handleDesignationKeyDown}
                    >
                      <button
                        type="button"
                        role="combobox"
                        aria-label="Designation"
                        aria-haspopup="listbox"
                        aria-expanded={designationOpen}
                        aria-controls="designation-listbox"
                        aria-activedescendant={
                          designationOpen ? `designation-option-${designationActive}` : undefined
                        }
                        onClick={() =>
                          designationOpen ? setDesignationOpen(false) : openDesignationList()
                        }
                        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-[#f3f9fe] px-4 py-2.5 text-left text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 ${
                          getFieldError("designation")
                            ? "border-rose-400 focus:ring-rose-200"
                            : designationOpen
                              ? "border-[#7BBDE8] bg-white ring-2 ring-[#7BBDE8]"
                              : "border-[#bfe0f5] focus:ring-[#7BBDE8]"
                        } ${formData.designation ? "text-slate-800" : "text-slate-400"}`}
                      >
                        <span className="truncate">
                          {formData.designation || "Select designation"}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                            designationOpen ? "rotate-180 text-[#1b64da]" : ""
                          }`}
                          aria-hidden="true"
                        />
                      </button>

                      {designationOpen && (
                        <div
                          id="designation-listbox"
                          role="listbox"
                          aria-label="Designation"
                          className="account-menu-enter absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-[#dcebf7] bg-white shadow-xl"
                        >
                          <div className="max-h-72 overflow-y-auto p-1.5">
                            {designationItems.map((item, index) => {
                              const selected = item === formData.designation;

                              return (
                                <div
                                  key={item}
                                  id={`designation-option-${index}`}
                                  role="option"
                                  aria-selected={selected}
                                  onMouseEnter={() => setDesignationActive(index)}
                                  onClick={() => chooseDesignation(index)}
                                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                                    selected ? "font-bold text-[#1b64da]" : "font-medium text-slate-700"
                                  } ${designationActive === index ? "bg-[#eaf4fc]" : ""}`}
                                >
                                  <span className="truncate">{item}</span>
                                  {selected && (
                                    <Check className="h-4 w-4 shrink-0 text-[#1b64da]" aria-hidden="true" />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div
                            id={`designation-option-${designationOtherIndex}`}
                            role="option"
                            aria-selected={false}
                            onMouseEnter={() => setDesignationActive(designationOtherIndex)}
                            onClick={() => chooseDesignation(designationOtherIndex)}
                            className={`flex cursor-pointer items-center gap-2 border-t border-[#e7f0f7] px-4 py-3 text-sm font-bold text-[#1b64da] transition-colors ${
                              designationActive === designationOtherIndex ? "bg-[#eaf4fc]" : "bg-[#f7fbff]"
                            }`}
                          >
                            <PencilLine className="h-4 w-4" aria-hidden="true" />
                            Add new designation…
                          </div>
                        </div>
                      )}
                      {designationsLoading && (
                        <p role="status" className="mt-1 text-xs text-slate-600">Loading designations...</p>
                      )}
                      {designationLoadError && (
                        <div role="alert" className="mt-1 text-xs text-rose-600">
                          <p>{designationLoadError}</p>
                          <button type="button" onClick={() => void dispatch(fetchDesignations())}
                            disabled={designationsLoading} className="font-bold underline disabled:opacity-50">Retry</button>
                        </div>
                      )}
                    </div>
                  )}
                  {getFieldError("designation") && (
                    <p role="alert" className="text-xs text-rose-600 mt-1 font-semibold">
                      {getFieldError("designation")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wider">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_joining}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        date_of_joining: event.target.value,
                      })
                    }
                    className={inputClass("date_of_joining")}
                  />
                  {getFieldError("date_of_joining") && (
                    <p className="text-xs text-rose-600 mt-1 font-semibold">
                      {getFieldError("date_of_joining")}
                    </p>
                  )}
                </div>
              </div>

              {editingEmployee && (
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5 uppercase tracking-wider">
                    Account Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        status: event.target.value as Employee["status"],
                      })
                    }
                    className={inputClass("status")}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}

              {!editingEmployee && (
              <div className="rounded-2xl border border-[#d6e8f7] bg-[#f3f9fe] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569] mb-3">
                  Salary Structure (INR)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {([
                    ["basic", "Basic *"],
                    ["hra", "HRA *"],
                    ["special_allowance", "Special Allowance *"],
                  ] as const).map(([field, label]) => (
                    <div key={field}>
                      <label
                        htmlFor={`employee-${field}`}
                        className="block text-xs font-bold text-[#475569] mb-1.5"
                      >
                        {label}
                      </label>
                      <input
                        id={`employee-${field}`}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={formData[field]}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            [field]: event.target.value,
                          })
                        }
                        className={inputClass(field)}
                      />
                      {getFieldError(field) && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold">
                          {getFieldError(field)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#64748b] hover:bg-[#eaf4fc] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || (editingEmployee !== null && !hasEmployeeChanges)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#1b64da] hover:bg-[#1552b5] text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {editingEmployee ? "Saving Changes..." : "Creating Employee..."}
                      </span>
                    </>
                  ) : (
                    <span>
                      {editingEmployee ? "Save Changes" : "Create Employee"}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => dispatch(clearEmployeeMessages())}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-success-title"
            className="w-full max-w-sm rounded-3xl border border-[#d6e8f7] bg-white p-7 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e1f1fb] text-[#1b64da]">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2
              id="employee-success-title"
              className="mt-4 text-xl font-black text-[#0f172a]"
            >
              Success
            </h2>
            <p className="mt-2 text-sm font-medium text-[#475569]">
              {successMessage}
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => dispatch(clearEmployeeMessages())}
              className="mt-6 w-full rounded-xl bg-[#1b64da] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1552b5] focus:outline-none focus:ring-2 focus:ring-[#7BBDE8] focus:ring-offset-2"
            >
              Close
            </button>
          </section>
        </div>
      )}
    </div>
  );
}