'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import FormBuilder from './FormBuilder';
import {
  Edit2, Trash2, Plus, UserPlus, Users, UserMinus,
  BarChart2, X, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { Employee, Form } from '@/lib/types';

interface AssignedStaff {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  assigned_at: string;
}

interface FormResponseSummary {
  id: string;
  employee_id: string;
  form_id: string;
  is_completed: boolean;
  submitted_at: string | null;
  created_at: string;
}

// ─── Inline Delete Confirm ───────────────────────────────────────────────────
const DeleteConfirm: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({
  onConfirm,
  onCancel,
}) => (
  <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 px-3 py-2">
    <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
    <span className="text-sm text-red-700 dark:text-red-300">Delete this form?</span>
    <button
      onClick={onConfirm}
      className="ml-1 rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700"
    >
      Yes, delete
    </button>
    <button
      onClick={onCancel}
      className="rounded bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
    >
      Cancel
    </button>
  </div>
);

// ─── Progress Tracker Panel ───────────────────────────────────────────────────
const ProgressPanel: React.FC<{
  form: Form;
  assignedStaff: AssignedStaff[];
  responses: FormResponseSummary[];
  isLoading: boolean;
}> = ({ form, assignedStaff, responses, isLoading }) => {
  const totalAssigned = assignedStaff.length;
  const completed = responses.filter((r) => r.is_completed).length;
  const inProgress = responses.filter((r) => !r.is_completed).length;
  const notStarted = Math.max(0, totalAssigned - responses.length);
  const pct = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

  const getStatusForStaff = (employeeId: string) => {
    const r = responses.find((res) => res.employee_id === employeeId);
    if (!r) return 'not_started';
    return r.is_completed ? 'completed' : 'in_progress';
  };

  const getSubmittedAt = (employeeId: string) => {
    const r = responses.find((res) => res.employee_id === employeeId);
    return r?.submitted_at ?? null;
  };

  return (
    <div className="mt-4 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 font-semibold text-violet-900 dark:text-violet-200">
        <BarChart2 size={16} />
        Completion Progress
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading progress data…</p>
      ) : (
        <>
          {/* Summary bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{completed} of {totalAssigned} completed</span>
              <span className="font-semibold text-violet-700 dark:text-violet-300">{pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs pt-1">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} /> {completed} completed
              </span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Clock size={12} /> {inProgress} in progress
              </span>
              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <AlertCircle size={12} /> {notStarted} not started
              </span>
            </div>
          </div>

          {/* Per-staff breakdown */}
          {assignedStaff.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No staff assigned yet.</p>
          ) : (
            <ul className="space-y-2">
              {assignedStaff.map((s) => {
                const status = getStatusForStaff(s.employee_id);
                const submittedAt = getSubmittedAt(s.employee_id);
                return (
                  <li
                    key={s.employee_id}
                    className="flex items-center justify-between rounded-md border border-violet-100 dark:border-violet-800/50 bg-white dark:bg-gray-800/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {s.employee_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.employee_email}</p>
                      {submittedAt && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Submitted {new Date(submittedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span
                      className={`ml-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0 ${
                        status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : status === 'in_progress'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {status === 'completed' && <CheckCircle2 size={11} />}
                      {status === 'in_progress' && <Clock size={11} />}
                      {status === 'not_started' && <AlertCircle size={11} />}
                      {status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In progress' : 'Not started'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const FormManagement: React.FC = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [assignmentFormId, setAssignmentFormId] = useState<string | null>(null);
  const [progressFormId, setProgressFormId] = useState<string | null>(null);
  const [selectedEmployeeByForm, setSelectedEmployeeByForm] = useState<Record<string, string>>({});
  const [assignedStaffByForm, setAssignedStaffByForm] = useState<Record<string, AssignedStaff[]>>({});
  const [responsesByForm, setResponsesByForm] = useState<Record<string, FormResponseSummary[]>>({});
  const [isAssigningByForm, setIsAssigningByForm] = useState<Record<string, boolean>>({});
  const [isLoadingAssignedByForm, setIsLoadingAssignedByForm] = useState<Record<string, boolean>>({});
  const [isLoadingProgressByForm, setIsLoadingProgressByForm] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadStaff = async (): Promise<Employee[]> => {
    const pageSize = 100;
    let skip = 0;
    const collected: Employee[] = [];
    while (true) {
      const page = await apiClient.employee.getAll(skip, pageSize);
      if (!page || page.length === 0) break;
      collected.push(...page);
      if (page.length < pageSize) break;
      skip += pageSize;
    }
    return collected;
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [formsResponse, employeesResponse] = await Promise.all([
        apiClient.form.getAllForms(),
        loadStaff(),
      ]);
      setForms(formsResponse || []);
      setStaff((employeesResponse || []).filter((e) => e.role !== 'admin'));
    } catch {
      showToast('error', 'Failed to load forms and staff');
    } finally {
      setIsLoading(false);
    }
  };

  const loadForms = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.form.getAllForms();
      setForms(response || []);
    } catch {
      showToast('error', 'Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignedStaff = async (formId: string) => {
    setIsLoadingAssignedByForm((p) => ({ ...p, [formId]: true }));
    try {
      const assigned = await apiClient.form.getStaffAssignedToForm(formId);
      setAssignedStaffByForm((p) => ({ ...p, [formId]: (assigned || []) as AssignedStaff[] }));
    } catch {
      showToast('error', 'Failed to load assigned staff');
    } finally {
      setIsLoadingAssignedByForm((p) => ({ ...p, [formId]: false }));
    }
  };

  const loadProgressData = async (formId: string) => {
    setIsLoadingProgressByForm((p) => ({ ...p, [formId]: true }));
    try {
      // Ensure we have assigned staff first
      if (!assignedStaffByForm[formId]) {
        await loadAssignedStaff(formId);
      }
      const responses = await apiClient.form.getFormResponses(formId);
      setResponsesByForm((p) => ({ ...p, [formId]: (responses || []) as FormResponseSummary[] }));
    } catch {
      showToast('error', 'Failed to load progress data');
    } finally {
      setIsLoadingProgressByForm((p) => ({ ...p, [formId]: false }));
    }
  };

  const toggleAssignmentPanel = async (formId: string) => {
    if (assignmentFormId === formId) {
      setAssignmentFormId(null);
      return;
    }
    // Close progress if open
    if (progressFormId === formId) setProgressFormId(null);
    setAssignmentFormId(formId);
    await loadAssignedStaff(formId);
  };

  const toggleProgressPanel = async (formId: string) => {
    if (progressFormId === formId) {
      setProgressFormId(null);
      return;
    }
    // Close assignment if open
    if (assignmentFormId === formId) setAssignmentFormId(null);
    setProgressFormId(formId);
    await loadProgressData(formId);
  };

  const handleAssignForm = async (formId: string) => {
    const employeeId = selectedEmployeeByForm[formId];
    if (!employeeId) {
      showToast('error', 'Please select a staff member');
      return;
    }
    setIsAssigningByForm((p) => ({ ...p, [formId]: true }));
    try {
      await apiClient.form.assignFormToEmployee(formId, employeeId);
      showToast('success', 'Form assigned successfully');
      setSelectedEmployeeByForm((p) => ({ ...p, [formId]: '' }));
      await loadAssignedStaff(formId);
    } catch {
      showToast('error', 'Failed to assign form');
    } finally {
      setIsAssigningByForm((p) => ({ ...p, [formId]: false }));
    }
  };

  const handleUnassignForm = async (formId: string, employeeId: string) => {
    setIsAssigningByForm((p) => ({ ...p, [formId]: true }));
    try {
      await apiClient.form.unassignFormFromEmployee(formId, employeeId);
      showToast('success', 'Form unassigned successfully');
      await loadAssignedStaff(formId);
    } catch {
      showToast('error', 'Failed to unassign form');
    } finally {
      setIsAssigningByForm((p) => ({ ...p, [formId]: false }));
    }
  };

  const handleDeleteForm = async (formId: string) => {
    try {
      await apiClient.form.deleteForm(formId);
      setForms((prev) => prev.filter((f) => f.id !== formId));
      if (selectedFormId === formId) { setSelectedFormId(null); setIsCreating(false); }
      showToast('success', 'Form deleted');
    } catch {
      showToast('error', 'Failed to delete form');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleFormSaved = () => {
    loadForms();
    setSelectedFormId(null);
    setIsCreating(false);
  };

  // ── FormBuilder view ────────────────────────────────────────────────────────
  if (isCreating || selectedFormId) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setIsCreating(false); setSelectedFormId(null); }}
          className="rounded-md bg-gray-200 dark:bg-gray-700 px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ← Back to Forms
        </button>
        <FormBuilder formId={selectedFormId || undefined} onFormSaved={handleFormSaved} />
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Form Management</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Create New Form
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 dark:text-gray-400">Loading forms…</div>
      ) : forms.length === 0 ? (
        <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center text-gray-600 dark:text-gray-400">
          <p className="mb-4">No forms yet. Create your first form to get started.</p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            <Plus size={18} /> Create Form
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => (
            <div
              key={form.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Form header row */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{form.name}</h3>
                  {form.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {form.description.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{form.fields?.length || 0} fields</span>
                    <span>
                      Status:{' '}
                      <span className={form.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                        {form.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                    <span>Created: {new Date(form.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="ml-4 flex gap-2 flex-shrink-0">
                  {/* Progress button */}
                  <button
                    onClick={() => toggleProgressPanel(form.id)}
                    className={`rounded-md p-2 ${
                      progressFormId === form.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60'
                    }`}
                    title="Track progress"
                  >
                    <BarChart2 size={18} />
                  </button>
                  {/* Assign button */}
                  <button
                    onClick={() => toggleAssignmentPanel(form.id)}
                    className={`rounded-md p-2 ${
                      assignmentFormId === form.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60'
                    }`}
                    title="Assign to staff"
                  >
                    <UserPlus size={18} />
                  </button>
                  {/* Edit button */}
                  <button
                    onClick={() => setSelectedFormId(form.id)}
                    className="rounded-md bg-blue-100 dark:bg-blue-900/40 p-2 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60"
                    title="Edit form"
                  >
                    <Edit2 size={18} />
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => setConfirmDeleteId(form.id)}
                    className="rounded-md bg-red-100 dark:bg-red-900/40 p-2 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60"
                    title="Delete form"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Inline delete confirmation */}
              {confirmDeleteId === form.id && (
                <div className="mt-3">
                  <DeleteConfirm
                    onConfirm={() => handleDeleteForm(form.id)}
                    onCancel={() => setConfirmDeleteId(null)}
                  />
                </div>
              )}

              {/* Progress panel */}
              {progressFormId === form.id && (
                <ProgressPanel
                  form={form}
                  assignedStaff={assignedStaffByForm[form.id] || []}
                  responses={responsesByForm[form.id] || []}
                  isLoading={isLoadingProgressByForm[form.id] || false}
                />
              )}

              {/* Assignment panel */}
              {assignmentFormId === form.id && (
                <div className="mt-4 rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                    <Users size={16} />
                    Assign this form to staff
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <select
                      value={selectedEmployeeByForm[form.id] || ''}
                      onChange={(e) =>
                        setSelectedEmployeeByForm((p) => ({ ...p, [form.id]: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm md:max-w-sm"
                    >
                      <option value="">Select staff member</option>
                      {staff.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.full_name} ({employee.email})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleAssignForm(form.id)}
                      disabled={isAssigningByForm[form.id]}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      <UserPlus size={16} />
                      {isAssigningByForm[form.id] ? 'Assigning…' : 'Assign Form'}
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-900 dark:text-indigo-200">
                      Assigned Staff
                    </p>

                    {isLoadingAssignedByForm[form.id] ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
                    ) : (assignedStaffByForm[form.id] || []).length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400">No staff assigned yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {(assignedStaffByForm[form.id] || []).map((entry) => (
                          <li
                            key={`${form.id}-${entry.employee_id}`}
                            className="flex items-center justify-between rounded-md border border-indigo-100 dark:border-indigo-800/50 bg-white dark:bg-gray-800/50 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {entry.employee_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{entry.employee_email}</p>
                            </div>
                            <button
                              onClick={() => handleUnassignForm(form.id, entry.employee_id)}
                              disabled={isAssigningByForm[form.id]}
                              className="inline-flex items-center gap-1 rounded-md bg-red-100 dark:bg-red-900/40 px-2 py-1 text-xs text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 disabled:opacity-60"
                            >
                              <UserMinus size={14} /> Unassign
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormManagement;
