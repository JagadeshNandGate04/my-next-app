"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Users,
  UserPlus,
  RefreshCw,
  Download,
  Search,
  IndianRupee,
  Briefcase,
  X,
  ExternalLink,
  Edit3,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import type { AppDispatch, RootState } from "@/app/store/store";
import {
  fetchEmployees,
  fetchEmployeeById,
  createEmployee,
  updateEmployee,
  clearEmployeeMessages,
  type Employee,
} from "@/app/store/employee/employeeSlice";

type PayrollFilter = "ALL" | "WITH_STRUCTURE" | "PENDING";

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

const DESIGNATIONS = [
  "Senior Frontend Dev",
  "Backend Engineer",
  "UI UX Designer",
  "QA Specialist",
  "HR Executive",
  "Operations Lead",
];

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
  designation: "Senior Frontend Dev",
  status: "ACTIVE",
  basic: "",
  hra: "0",
  special_allowance: "0",
});

const formatINR = (value?: number | null) => {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const formatK = (value?: number | null) => {
  if (value === undefined || value === null) return "0k";
  return `${(Number(value) / 1000).toFixed(
    Number(value) % 1000 === 0 ? 0 : 1
  )}k`;
};

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

  return `${months} mos tenure`;
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
  } = useSelector((state: RootState) => state.employees);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDesignation, setSelectedDesignation] = useState("All");
  const [payrollFilter, setPayrollFilter] = useState<PayrollFilter>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm());
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const isSaving = createLoading || updateLoading;

  useEffect(() => {
    const timerId = window.setTimeout(() => setCurrentDate(new Date()), 0);
    dispatch(fetchEmployees());

    return () => window.clearTimeout(timerId);
  }, [dispatch]);

  useEffect(() => {
    return () => {
      dispatch(clearEmployeeMessages());
    };
  }, [dispatch]);

  const nextEmpCode = useMemo(() => {
    const maxNumber = employees.reduce((max, employee) => {
      const match = employee.emp_code?.match(/EMP(\d+)/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    return `EMP${String(maxNumber + 1).padStart(3, "0")}`;
  }, [employees]);

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

  const designationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeEmployees.forEach((employee) => {
      counts[employee.designation] =
        (counts[employee.designation] || 0) + 1;
    });
    return counts;
  }, [activeEmployees]);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return employees.filter((employee) => {
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
  }, [employees, searchQuery, selectedDesignation, payrollFilter]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const nameRegex = /^[A-Za-z ]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;
    const designationRegex = /^[A-Za-z ]+$/;

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
    } else if (!designationRegex.test(formData.designation.trim())) {
      errors.designation = "Designation can contain only letters and spaces";
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

  const resetForm = () => {
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
    setEditingEmployee(null);
    dispatch(clearEmployeeMessages());
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
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
    setIsModalOpen(true);
  };

  const handleViewEmployee = async (id: number) => {
    setDetailLoadingId(id);
    setDetailError(null);
    setViewingEmployee(null);

    try {
      const employee = await dispatch(fetchEmployeeById({ id }));
      setViewingEmployee(employee);
    } catch (error) {
      setDetailError(
        error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
          ? error.message
          : "Unable to load employee details."
      );
    } finally {
      setDetailLoadingId(null);
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
    `w-full px-4 py-2.5 rounded-xl bg-[#f8fafc] border text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
      formErrors[field] || validationErrors[field]
        ? "border-rose-400 focus:ring-rose-200"
        : "border-[#d5dbe1] focus:ring-[#7BBDE8]"
    }`;

  const getFieldError = (field: string) =>
    formErrors[field] || validationErrors[field];

  return (
    <div className="min-h-screen bg-[#f0f6fa] text-[#1e293b] font-sans antialiased">
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1440px] mx-auto space-y-6">
          {/* Page heading */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-[#0f172a] tracking-tight">
                Employee Directory & Workforce Management
              </h1>
              <p className="text-sm font-medium text-[#64748b] mt-1.5 max-w-2xl">
                Oversee active personnel, organizational roles, contact
                information, and current gross salary structures.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => dispatch(fetchEmployees())}
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
                <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-mono font-bold tracking-wider">
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
                  Total Active Headcount
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-black tracking-tight">
                    {loading ? "—" : totalHeadcount}
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
                    {currentQuarterJoiners}
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
                    {new Intl.NumberFormat("en-IN").format(totalGrossPayroll)}
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
                    {distinctDesignations.length}
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
          <div className="bg-white border border-[#d5dbe1] rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-xl">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by employee name, EMP code, email, phone, or designation..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#f8fafc] border border-[#d5dbe1] text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7BBDE8]"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {[
                  {
                    key: "ALL",
                    label: `All Payroll (${employees.length})`,
                  },
                  {
                    key: "WITH_STRUCTURE",
                    label: `With Structure (${
                      employees.filter((employee) =>
                        Boolean(employee.salary_structure_id)
                      ).length
                    })`,
                  },
                  {
                    key: "PENDING",
                    label: `Pending Structure (${
                      employees.filter(
                        (employee) => !employee.salary_structure_id
                      ).length
                    })`,
                  },
                ].map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() =>
                      setPayrollFilter(pill.key as PayrollFilter)
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      payrollFilter === pill.key
                        ? "bg-[#1b64da] text-white shadow-sm"
                        : "bg-[#eaf4fc] text-slate-600 hover:bg-[#dcecf9]"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
                Designation:
              </span>

              <button
                type="button"
                onClick={() => setSelectedDesignation("All")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  selectedDesignation === "All"
                    ? "bg-[#1b64da] text-white"
                    : "bg-[#eaf4fc] text-slate-600 hover:bg-[#dcecf9]"
                }`}
              >
                All ({employees.length})
              </button>

              {distinctDesignations.map((designation) => (
                <button
                  key={designation}
                  type="button"
                  onClick={() => setSelectedDesignation(designation)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    selectedDesignation === designation
                      ? "bg-[#1b64da] text-white"
                      : "bg-[#eaf4fc] text-slate-600 hover:bg-[#dcecf9]"
                  }`}
                >
                  {designation} ({designationCounts[designation] || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Employee table */}
          <div className="bg-white border border-[#d5dbe1] rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 lg:p-6 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1b64da]" />
                <h2 className="text-lg font-black text-[#0f172a] tracking-tight">
                  Employee Roster & Salary Structure
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#eaf4fc] text-[#1b64da] border border-[#d6e8f7]">
                  Showing {filteredEmployees.length} records
                </span>
              </div>

              {/* <div className="text-xs font-mono font-bold text-slate-400">
                GET{" "}
                <span className="text-[#1b64da]">
                  /api/v1/employees/all-employees
                </span>
              </div> */}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#eaf4fc] border-b border-[#d6e8f7] text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Emp Code</th>
                    <th className="py-4 px-6">Designation</th>
                    <th className="py-4 px-6">Contact</th>
                    <th className="py-4 px-6">Joining Date</th>
                    <th className="py-4 px-6">Gross Salary</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e2e8f0] text-sm">
                  {loading && employees.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-14 text-center text-sm text-slate-500"
                      >
                        <span className="inline-flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#1b64da]" />
                          Loading employees...
                        </span>
                      </td>
                    </tr>
                  ) : filteredEmployees.length > 0 ? (
                    filteredEmployees.map((employee) => (
                      <tr
                        key={employee.id}
                        className="hover:bg-[#f5faff] transition-all duration-150 group"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5 min-w-[200px]">
                            <div
                              className={`w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                                employee.name
                              )} text-white font-black flex items-center justify-center text-sm shadow-md group-hover:scale-105 transition-transform duration-150 tracking-wider`}
                            >
                              {getInitials(employee.name)}
                            </div>
                            <div>
                              <div className="font-bold text-[#0f172a] group-hover:text-[#1b64da] transition-colors text-sm">
                                {employee.name}
                              </div>
                              <div className="text-xs text-[#64748b] font-medium">
                                Employee
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-[#eaf4fc] border border-[#d6e8f7] font-mono font-bold text-xs text-[#1b64da]">
                            {employee.emp_code}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#eaf4fc] text-[#1b64da] border border-[#d6e8f7] whitespace-nowrap">
                            {employee.designation}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex flex-col text-xs text-[#475569] space-y-1 min-w-[190px]">
                            <span className="font-mono text-slate-700">
                              {employee.email}
                            </span>
                            <span className="font-mono text-slate-500 font-bold">
                              +91 {employee.phone}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="text-xs font-bold text-[#0f172a]">
                            {formatDate(employee.date_of_joining)}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                            {calculateTenure(
                              employee.date_of_joining,
                              currentDate
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          {employee.gross !== undefined &&
                          employee.gross !== null ? (
                            <div>
                              <div className="font-black text-[#0f172a] text-sm">
                                {formatINR(employee.gross)}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span>B: {formatK(employee.basic)}</span>
                                <span>•</span>
                                <span>H: {formatK(employee.hra)}</span>
                                <span>•</span>
                                <span>
                                  SA: {formatK(employee.special_allowance)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-[#0a47b3] bg-[#bfe0f5] px-2 py-0.5 rounded-full border border-[#7BBDE8]">
                              Structure Pending
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
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

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              title={`View ${employee.name}`}
                              aria-label={`View ${employee.name}`}
                              onClick={() => handleViewEmployee(employee.id)}
                              disabled={detailLoadingId === employee.id}
                              className="p-2 rounded-xl text-slate-500 hover:text-[#1b64da] hover:bg-[#eaf4fc] transition-colors disabled:opacity-50 disabled:cursor-wait"
                            >
                              {detailLoadingId === employee.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <ExternalLink className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              title={`Edit ${employee.name}`}
                              onClick={() => openEditModal(employee)}
                              className="p-2 rounded-xl text-slate-500 hover:text-[#1b64da] hover:bg-[#eaf4fc] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-sm text-slate-400"
                      >
                        {employees.length === 0
                          ? "No employees have been added yet."
                          : "No employees found matching the search criteria."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-[#f7f9fd] border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748b] gap-2">
              <span>
                Showing {filteredEmployees.length} of {employees.length}{" "}
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
        </div>
      </main>

      {(viewingEmployee || detailError) && (
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
                  Employee Details
                </h2>
                {viewingEmployee && (
                  <p className="text-xs text-[#64748b] mt-1">
                    {viewingEmployee.emp_code}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingEmployee(null);
                  setDetailError(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#eaf4fc]"
                aria-label="Close employee details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {detailError}
              </div>
            ) : viewingEmployee ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                {[
                  ["Name", viewingEmployee.name],
                  ["Employee Code", viewingEmployee.emp_code],
                  ["Email", viewingEmployee.email],
                  ["Phone", viewingEmployee.phone || "—"],
                  ["Designation", viewingEmployee.designation || "—"],
                  [
                    "Joining Date",
                    formatDate(viewingEmployee.date_of_joining),
                  ],
                  ["Status", viewingEmployee.status],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-[#f5faff] border border-[#d6e8f7] p-3"
                  >
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-[#0f172a] break-words">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
        </div>
      )}

      {/* Create or edit employee modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-[#d5dbe1] rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#eaf4fc] border border-[#d6e8f7] flex items-center justify-center text-[#1b64da]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-[#0f172a]">
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
                  <select
                    value={formData.designation}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        designation: event.target.value,
                      })
                    }
                    className={inputClass("designation")}
                  >
                    {DESIGNATIONS.map((designation) => (
                      <option key={designation} value={designation}>
                        {designation}
                      </option>
                    ))}
                  </select>
                  {getFieldError("designation") && (
                    <p className="text-xs text-rose-600 mt-1 font-semibold">
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
              <div>
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
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#1b64da] hover:bg-[#1552b5] text-white shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
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