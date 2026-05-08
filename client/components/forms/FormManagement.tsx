'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import FormBuilder from './FormBuilder';
import { Edit2, Trash2, Plus, UserPlus, Users, UserMinus } from 'lucide-react';
import type { Employee, Form } from '@/lib/types';

interface AssignedStaff {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  assigned_at: string;
}

const FormManagement: React.FC = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [assignmentFormId, setAssignmentFormId] = useState<string | null>(null);
  const [selectedEmployeeByForm, setSelectedEmployeeByForm] = useState<Record<string, string>>({});
  const [assignedStaffByForm, setAssignedStaffByForm] = useState<Record<string, AssignedStaff[]>>({});
  const [isAssigningByForm, setIsAssigningByForm] = useState<Record<string, boolean>>({});
  const [isLoadingAssignedByForm, setIsLoadingAssignedByForm] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStaff = async (): Promise<Employee[]> => {
    const pageSize = 100;
    let skip = 0;
    const collected: Employee[] = [];

    while (true) {
      const page = await apiClient.employee.getAll(skip, pageSize);
      if (!page || page.length === 0) {
        break;
      }

      collected.push(...page);
      if (page.length < pageSize) {
        break;
      }

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
      setStaff((employeesResponse || []).filter((employee) => employee.role !== 'admin'));
    } catch (err) {
      setError('Failed to load forms and staff');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadForms = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.form.getAllForms();
      setForms(response || []);
    } catch (err) {
      setError('Failed to load forms');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignedStaff = async (formId: string) => {
    setIsLoadingAssignedByForm((prev) => ({ ...prev, [formId]: true }));
    try {
      const assigned = await apiClient.form.getStaffAssignedToForm(formId);
      setAssignedStaffByForm((prev) => ({
        ...prev,
        [formId]: (assigned || []) as AssignedStaff[],
      }));
    } catch (err) {
      setError('Failed to load assigned staff for this form');
      console.error(err);
    } finally {
      setIsLoadingAssignedByForm((prev) => ({ ...prev, [formId]: false }));
    }
  };

  const toggleAssignmentPanel = async (formId: string) => {
    if (assignmentFormId === formId) {
      setAssignmentFormId(null);
      return;
    }

    setAssignmentFormId(formId);
    await loadAssignedStaff(formId);
  };

  const handleAssignForm = async (formId: string) => {
    const employeeId = selectedEmployeeByForm[formId];
    if (!employeeId) {
      setError('Please select a staff member to assign this form');
      return;
    }

    setIsAssigningByForm((prev) => ({ ...prev, [formId]: true }));
    try {
      await apiClient.form.assignFormToEmployee(formId, employeeId);
      setError(null);
      setSuccessMessage('Form assigned successfully');
      await loadAssignedStaff(formId);
    } catch (err) {
      setError('Failed to assign form to staff member');
      console.error(err);
    } finally {
      setIsAssigningByForm((prev) => ({ ...prev, [formId]: false }));
    }
  };

  const handleUnassignForm = async (formId: string, employeeId: string) => {
    setIsAssigningByForm((prev) => ({ ...prev, [formId]: true }));
    try {
      await apiClient.form.unassignFormFromEmployee(formId, employeeId);
      setError(null);
      setSuccessMessage('Form unassigned successfully');
      await loadAssignedStaff(formId);
    } catch (err) {
      setError('Failed to unassign form from staff member');
      console.error(err);
    } finally {
      setIsAssigningByForm((prev) => ({ ...prev, [formId]: false }));
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form?')) {
      return;
    }

    try {
      await apiClient.form.deleteForm(formId);
      setForms(forms.filter((f) => f.id !== formId));
      if (selectedFormId === formId) {
        setSelectedFormId(null);
        setIsCreating(false);
      }
    } catch (err) {
      setError('Failed to delete form');
      console.error(err);
    }
  };

  const handleFormSaved = () => {
    loadForms();
    setSelectedFormId(null);
    setIsCreating(false);
  };

  if (isCreating || selectedFormId) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setIsCreating(false);
            setSelectedFormId(null);
          }}
          className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
        >
          ← Back to Forms
        </button>
        <FormBuilder
          formId={selectedFormId || undefined}
          onFormSaved={handleFormSaved}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Form Management</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Create New Form
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-green-700">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-gray-500">Loading forms...</div>
      ) : forms.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
          <p className="mb-4">No forms yet. Create your first form to get started.</p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            Create Form
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => (
            <div key={form.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{form.name}</h3>
                  {form.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {form.description.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>{form.fields?.length || 0} fields</span>
                    <span>
                      Status:{' '}
                      <span className={form.is_active ? 'text-green-600' : 'text-gray-400'}>
                        {form.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                    <span>Created: {new Date(form.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => toggleAssignmentPanel(form.id)}
                    className="rounded-md bg-indigo-100 p-2 text-indigo-700 hover:bg-indigo-200"
                    title="Assign to staff"
                  >
                    <UserPlus size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedFormId(form.id)}
                    className="rounded-md bg-blue-100 p-2 text-blue-600 hover:bg-blue-200"
                    title="Edit form"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteForm(form.id)}
                    className="rounded-md bg-red-100 p-2 text-red-600 hover:bg-red-200"
                    title="Delete form"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {assignmentFormId === form.id && (
                <div className="mt-4 rounded-md border border-indigo-200 bg-indigo-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-900">
                    <Users size={16} />
                    Assign this form to staff
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <select
                      value={selectedEmployeeByForm[form.id] || ''}
                      onChange={(e) =>
                        setSelectedEmployeeByForm((prev) => ({
                          ...prev,
                          [form.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm md:max-w-sm"
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
                      {isAssigningByForm[form.id] ? 'Assigning...' : 'Assign Form'}
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-900">
                      Assigned Staff
                    </p>

                    {isLoadingAssignedByForm[form.id] ? (
                      <p className="text-sm text-gray-600">Loading assigned staff...</p>
                    ) : (assignedStaffByForm[form.id] || []).length === 0 ? (
                      <p className="text-sm text-gray-600">No staff assigned to this form yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {(assignedStaffByForm[form.id] || []).map((entry) => (
                          <li
                            key={`${form.id}-${entry.employee_id}`}
                            className="flex items-center justify-between rounded-md border border-indigo-100 bg-white px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{entry.employee_name}</p>
                              <p className="text-xs text-gray-500">{entry.employee_email}</p>
                            </div>
                            <button
                              onClick={() => handleUnassignForm(form.id, entry.employee_id)}
                              disabled={isAssigningByForm[form.id]}
                              className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:opacity-60"
                            >
                              <UserMinus size={14} />
                              Unassign
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
