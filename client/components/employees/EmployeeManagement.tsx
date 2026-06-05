"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import {
  Department,
  Employee,
  EmployeeCreateInput,
  EmployeePositionDetail,
  EmployeeStatus,
  EmployeeUpdateInput,
  Position,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Calendar, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { DeleteModal } from "@/components/ui/DeleteModal";

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  national_id: string;
  status: EmployeeStatus;
};

type PositionAssignmentState = {
  departmentId: string;
  positionId: string;
  startDate: string;
};

const EMPLOYEE_STATUSES: EmployeeStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED"];

const emptyForm: FormState = {
  full_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  national_id: "",
  status: "ACTIVE",
};

const emptyPositionAssignment: PositionAssignmentState = {
  departmentId: "",
  positionId: "",
  startDate: new Date().toISOString().slice(0, 10),
};

function toDateTimeString(dateOnly: string): string {
  return `${dateOnly}T00:00:00`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentPositions, setDepartmentPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [positionAssignment, setPositionAssignment] = useState<PositionAssignmentState>(emptyPositionAssignment);
  const [formPositionDepartments, setFormPositionDepartments] = useState<Position[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<EmployeePositionDetail | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<EmployeePositionDetail[]>([]);
  const [assignmentDepartmentId, setAssignmentDepartmentId] = useState("");
  const [assignmentPositionId, setAssignmentPositionId] = useState("");
  const [assignmentStartDate, setAssignmentStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const loadEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeesData, departmentsData] = await Promise.all([
        apiClient.employee.getAll(0, 100),
        apiClient.department.getAll(0, 100),
      ]);
      setEmployees(employeesData);
      setDepartments(departmentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const loadPositionsForDepartment = async (departmentId: string) => {
    if (!departmentId) {
      setDepartmentPositions([]);
      return;
    }

    try {
      const positions = await apiClient.position.getAll(departmentId, 0, 100);
      setDepartmentPositions(positions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load positions");
      setDepartmentPositions([]);
    }
  };

  const loadPositionsForFormDepartment = async (departmentId: string) => {
    if (!departmentId) {
      setFormPositionDepartments([]);
      setPositionAssignment((current) => ({ ...current, positionId: "" }));
      return;
    }

    try {
      const positions = await apiClient.position.getAll(departmentId, 0, 100);
      setFormPositionDepartments(positions);
      setPositionAssignment((current) => ({ ...current, positionId: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load positions");
      setFormPositionDepartments([]);
    }
  };

  useEffect(() => {
    void loadEmployees();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setPositionAssignment(emptyPositionAssignment);
    setFormPositionDepartments([]);
    setEditingId(null);
  };

  const startEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone ?? "",
      date_of_birth: employee.date_of_birth ?? "",
      national_id: employee.national_id ?? "",
      status: employee.status,
    });
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload: EmployeeCreateInput | EmployeeUpdateInput = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      date_of_birth: form.date_of_birth || undefined,
      national_id: form.national_id.trim() || undefined,
      status: form.status,
    };

    try {
      let employeeId = editingId;

      if (editingId) {
        await apiClient.employee.update(editingId, payload);
      } else {
        const newEmployee = await apiClient.employee.create(payload as EmployeeCreateInput);
        employeeId = newEmployee.id;
      }

      // Assign position if provided during creation (only for new employees)
      if (!editingId && employeeId && positionAssignment.positionId) {
        const positionPayload = {
          employee_id: employeeId,
          position_id: positionAssignment.positionId,
          start_date: toDateTimeString(positionAssignment.startDate),
        };
        await apiClient.employee.assignPosition(employeeId, positionPayload);
      }

      await loadEmployees();
      toast.success(editingId ? "Employee updated" : "Employee created",
        editingId ? `${form.full_name} has been updated.` : `${form.full_name} has been added.`);
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save employee";
      setError(msg);
      toast.error("Save failed", msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteEmployee = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiClient.employee.delete(deleteTarget.id);
      toast.success("Employee deleted", `${deleteTarget.full_name} has been removed.`);
      await loadEmployees();
      if (editingId === deleteTarget.id) resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete employee";
      setError(msg);
      toast.error("Delete failed", msg);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openPositionModal = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setError(null);
    setAssignmentStartDate(new Date().toISOString().slice(0, 10));
    setAssignmentPositionId("");
    setCurrentAssignment(null);
    setAssignmentHistory([]);

    try {
      const [current, history] = await Promise.all([
        apiClient.employee.getCurrentPosition(employee.id),
        apiClient.employee.getPositionHistory(employee.id),
      ]);

      setCurrentAssignment(current);
      setAssignmentHistory(history);

      const departmentId = current?.position?.department_id || departments[0]?.id || "";
      setAssignmentDepartmentId(departmentId);
      await loadPositionsForDepartment(departmentId);
    } catch {
      const fallbackDepartmentId = departments[0]?.id || "";
      setAssignmentDepartmentId(fallbackDepartmentId);
      await loadPositionsForDepartment(fallbackDepartmentId);
    }
  };

  const closePositionModal = () => {
    setSelectedEmployee(null);
    setCurrentAssignment(null);
    setAssignmentHistory([]);
    setAssignmentDepartmentId("");
    setAssignmentPositionId("");
    setAssignmentStartDate(new Date().toISOString().slice(0, 10));
  };

  const handleDepartmentChange = async (departmentId: string) => {
    setAssignmentDepartmentId(departmentId);
    setAssignmentPositionId("");
    await loadPositionsForDepartment(departmentId);
  };

  const submitAssignment = async () => {
    if (!selectedEmployee || !assignmentDepartmentId || !assignmentPositionId || !assignmentStartDate) {
      setError("Please select a department, position and start date");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      employee_id: selectedEmployee.id,
      position_id: assignmentPositionId,
      start_date: toDateTimeString(assignmentStartDate),
    };

    try {
      if (currentAssignment) {
        await apiClient.employee.reassignPosition(selectedEmployee.id, payload);
      } else {
        await apiClient.employee.assignPosition(selectedEmployee.id, payload);
      }

      await openPositionModal(selectedEmployee);
      setAssignmentPositionId("");
      setAssignmentStartDate(new Date().toISOString().slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign position");
    } finally {
      setSaving(false);
    }
  };

  const endCurrentAssignment = async () => {
    if (!currentAssignment) return;

    setSaving(true);
    setError(null);
    try {
      await apiClient.employee.unassignPosition(currentAssignment.id, toDateTimeString(assignmentStartDate));
      if (selectedEmployee) {
        await openPositionModal(selectedEmployee);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end assignment");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadgeColor = (status: EmployeeStatus) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
      case "INACTIVE":
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
      case "SUSPENDED":
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300";
      case "TERMINATED":
        return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <section className="min-w-0 space-y-4">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Employees</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create, edit, and manage employee records</p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 grid-cols-1">
        <div className="space-y-4 min-w-0">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <form onSubmit={submitForm} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Full Name</span>
                  <input
                    value={form.full_name}
                    onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                    className="field"
                    placeholder="Full name"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="field"
                    placeholder="email@example.com"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Phone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="field"
                    placeholder="+250 7xx xxx xxx"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as EmployeeStatus }))}
                    className="field"
                  >
                    {EMPLOYEE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Date of Birth</span>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(event) => setForm((current) => ({ ...current, date_of_birth: event.target.value }))}
                    className="field"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">National ID</span>
                  <input
                    value={form.national_id}
                    onChange={(event) => setForm((current) => ({ ...current, national_id: event.target.value }))}
                    className="field"
                    placeholder="ID number"
                  />
                </label>
              </div>

              {!editingId && (
                <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Assign Position (Optional)</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">Department</span>
                      <select
                        value={positionAssignment.departmentId}
                        onChange={(event) => {
                          setPositionAssignment((current) => ({ ...current, departmentId: event.target.value }));
                          void loadPositionsForFormDepartment(event.target.value);
                        }}
                        className="field"
                      >
                        <option value="">Select department</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">Position</span>
                      <select
                        value={positionAssignment.positionId}
                        onChange={(event) => setPositionAssignment((current) => ({ ...current, positionId: event.target.value }))}
                        className="field"
                        disabled={!positionAssignment.departmentId}
                      >
                        <option value="">
                          {positionAssignment.departmentId ? "Select position" : "Select a department first"}
                        </option>
                        {formPositionDepartments.map((position) => (
                          <option key={position.id} value={position.id}>
                            {position.title} {position.is_vacant ? "• Vacant" : "• Occupied"}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="space-y-1 text-sm">
                    <span className="text-slate-600 dark:text-slate-300">Start Date</span>
                    <input
                    type="date"
                    value={positionAssignment.startDate}
                    onChange={(event) => setPositionAssignment((current) => ({ ...current, startDate: event.target.value }))}
                    className="field"
                    />
                  </label>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Update" : "Create"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium dark:border-slate-800">
              All employees
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
              </div>
            ) : employees.length > 0 ? (
              <>
                {/* Mobile Card View */}
                <div className="block md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className={cn("p-4 space-y-3", employee.status === "ACTIVE" ? "" : "opacity-60")}
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{employee.full_name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{employee.email}</p>
                        {employee.phone && (
                          <p className="text-sm text-slate-600 dark:text-slate-300">{employee.phone}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-xs font-medium",
                            getStatusBadgeColor(employee.status)
                          )}
                        >
                          {employee.status.charAt(0) + employee.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => startEdit(employee)}
                          className="w-full inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void openPositionModal(employee)}
                          className="w-full inline-flex items-center justify-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-950/30"
                        >
                          <Calendar className="h-3.5 w-3.5" /> Position
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(employee)}
                          className="w-full inline-flex items-center justify-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Phone</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {employees.map((employee) => (
                        <tr key={employee.id} className={cn(employee.status === "ACTIVE" ? "" : "opacity-60")}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900 dark:text-slate-100">{employee.full_name}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{employee.email}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{employee.phone || "-"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "rounded-full px-2 py-1 text-xs font-medium",
                                getStatusBadgeColor(employee.status)
                              )}
                            >
                              {employee.status.charAt(0) + employee.status.slice(1).toLowerCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(employee)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void openPositionModal(employee)}
                                className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-950/30"
                              >
                                <Calendar className="h-3.5 w-3.5" /> Position
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(employee)}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="px-4 py-8 text-sm text-slate-500">No employees found.</div>
            )}
          </div>
        </div>

      </div>

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full rounded-t-lg border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900 sm:max-w-3xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                  Position Management - {selectedEmployee.full_name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose a department first, then pick a position from that department.
                </p>
              </div>
              <button
                type="button"
                onClick={closePositionModal}
                className="flex-shrink-0 rounded-md p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40 grid-cols-1 md:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Department</span>
                  <select
                    value={assignmentDepartmentId}
                    onChange={(event) => void handleDepartmentChange(event.target.value)}
                    className="field"
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm md:col-span-2">
                  <span className="text-slate-600 dark:text-slate-300">Position</span>
                  <select
                    value={assignmentPositionId}
                    onChange={(event) => setAssignmentPositionId(event.target.value)}
                    className="field"
                    disabled={!assignmentDepartmentId}
                  >
                    <option value="">
                      {assignmentDepartmentId ? "Select position" : "Select a department first"}
                    </option>
                    {departmentPositions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm md:col-span-3">
                  <span className="text-slate-600 dark:text-slate-300">Start Date</span>
                  <input
                    type="date"
                    value={assignmentStartDate}
                    onChange={(event) => setAssignmentStartDate(event.target.value)}
                    className="field"
                  />
                </label>

                <div className="flex flex-col gap-2 md:col-span-3 md:flex-row md:items-center">
                  <button
                    type="button"
                    onClick={() => void submitAssignment()}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {currentAssignment ? "Reassign Position" : "Assign Position"}
                  </button>
                  {currentAssignment && (
                    <button
                      type="button"
                      onClick={() => void endCurrentAssignment()}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      End Current Assignment
                    </button>
                  )}
                </div>
              </div>

              {currentAssignment && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/40">
                  <h3 className="mb-2 text-sm font-medium text-emerald-900 dark:text-emerald-100">Current Position</h3>
                  <div className="grid gap-2 text-sm text-emerald-800 dark:text-emerald-200 md:grid-cols-2">
                    <p><strong>Position:</strong> {currentAssignment.position.title}</p>
                    <p><strong>Department:</strong> {departments.find((department) => department.id === currentAssignment.position.department_id)?.name ?? "-"}</p>
                    <p><strong>Start Date:</strong> {formatDate(currentAssignment.start_date)}</p>
                    <p><strong>Status:</strong> {currentAssignment.is_current ? "Current" : "Past"}</p>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="mb-3 text-sm font-medium text-slate-900 dark:text-slate-100">Position History</h3>
                {assignmentHistory.length > 0 ? (
                  <div className="space-y-2">
                    {assignmentHistory.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-start justify-between gap-3 rounded bg-slate-50 p-3 text-sm dark:bg-slate-950/40"
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{assignment.position.title}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {departments.find((department) => department.id === assignment.position.department_id)?.name ?? "-"}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {formatDate(assignment.start_date)}{assignment.end_date ? ` - ${formatDate(assignment.end_date)}` : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded px-2 py-1 text-xs font-medium",
                            assignment.is_current
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          )}
                        >
                          {assignment.is_current ? "Current" : "Past"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No position assignments yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteModal
        open={!!deleteTarget}
        title="Delete Employee"
        description="This will permanently remove the employee and all their records."
        itemName={deleteTarget?.full_name ?? ""}
        loading={deleting}
        onConfirm={() => void deleteEmployee()}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}