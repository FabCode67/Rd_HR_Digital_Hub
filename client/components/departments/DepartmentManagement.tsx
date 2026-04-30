"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import {
  Department,
  DepartmentCreateInput,
  DepartmentUpdateInput,
} from "@/lib/types";
import DepartmentNode from "@/components/org-tree/DepartmentNode";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";

type FormState = {
  name: string;
  description: string;
  parent_id: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  parent_id: "",
  is_active: true,
};

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [treeOpen, setTreeOpen] = useState(true);

  const rootDepartments = useMemo(
    () => departments.filter((department) => !department.parent_id),
    [departments]
  );

  const loadDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.department.getAll(0, 100);
      setDepartments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDepartments();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (department: Department) => {
    setEditingId(department.id);
    setForm({
      name: department.name,
      description: department.description ?? "",
      parent_id: department.parent_id ?? "",
      is_active: department.is_active,
    });
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload: DepartmentCreateInput | DepartmentUpdateInput = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      parent_id: form.parent_id || null,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        await apiClient.department.update(editingId, payload);
      } else {
        await apiClient.department.create(payload as DepartmentCreateInput);
      }

      await loadDepartments();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  const deleteDepartment = async (department: Department) => {
    if (!confirm(`Delete ${department.name}?`)) return;

    setSaving(true);
    setError(null);
    try {
      await apiClient.department.delete(department.id);
      await loadDepartments();
      if (editingId === department.id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete department");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Departments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create, edit, and organize departments</p>
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

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <form onSubmit={submitForm} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Name</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 outline-none focus:border-slate-400 dark:border-slate-700"
                    placeholder="Department name"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Parent</span>
                  <select
                    value={form.parent_id}
                    onChange={(event) => setForm((current) => ({ ...current, parent_id: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 outline-none focus:border-slate-400 dark:border-slate-700"
                  >
                    <option value="">Root department</option>
                    {departments
                      .filter((department) => department.id !== editingId)
                      .map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1 text-sm">
                <span className="text-slate-600 dark:text-slate-300">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-20 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 outline-none focus:border-slate-400 dark:border-slate-700"
                  placeholder="Short description"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                />
                Active
              </label>

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
              All departments
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
              </div>
            ) : departments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Parent</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {departments.map((department) => (
                      <tr key={department.id} className={cn(department.is_active ? "" : "opacity-60") }>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{department.name}</div>
                          {department.description && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">{department.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {departments.find((parent) => parent.id === department.parent_id)?.name ?? "Root"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "rounded-full px-2 py-1 text-xs font-medium",
                            department.is_active
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          )}>
                            {department.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(department)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteDepartment(department)}
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
            ) : (
              <div className="px-4 py-8 text-sm text-slate-500">No departments found.</div>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setTreeOpen((value) => !value)}
            className="flex w-full items-center justify-between text-left text-sm font-medium"
          >
            <span>Hierarchy</span>
            {treeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {treeOpen && (
            <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              {rootDepartments.length > 0 ? (
                rootDepartments.map((department) => (
                  <DepartmentNode key={department.id} department={department} level={0} />
                ))
              ) : (
                <p className="text-sm text-slate-500">No root departments to show.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}