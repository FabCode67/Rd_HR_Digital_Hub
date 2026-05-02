"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import {
  Department,
  Position,
  PositionCreateInput,
  PositionUpdateInput,
  PositionLevel,
} from "@/lib/types";
import PositionNode from "@/components/org-tree/PositionNode";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";

type FormState = {
  title: string;
  description: string;
  department_id: string;
  parent_position_id: string;
  level: PositionLevel;
  band: string;
  is_active: boolean;
};

const POSITION_LEVELS: PositionLevel[] = [
  "Director",
  "Head",
  "Manager",
  "Senior Manager",
  "Assistant Manager",
  "Officer",
  "Graduate Trainee",
  "Intern",
];

const emptyForm: FormState = {
  title: "",
  description: "",
  department_id: "",
  parent_position_id: "",
  level: "Officer",
  band: "",
  is_active: true,
};

export default function PositionManagement() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [treeOpen, setTreeOpen] = useState(true);

  const rootPositions = useMemo(
    () => positions.filter((position) => !position.parent_position_id),
    [positions]
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [positionsData, departmentsData] = await Promise.all([
        apiClient.position.getAll(undefined, 0, 100),
        apiClient.department.getAll(0, 100),
      ]);
      setPositions(positionsData);
      setDepartments(departmentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (position: Position) => {
    setEditingId(position.id);
    setForm({
      title: position.title,
      description: position.description ?? "",
      department_id: position.department_id,
      parent_position_id: position.parent_position_id ?? "",
      level: position.level,
      band: position.band ?? "",
      is_active: position.is_active,
    });
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload: PositionCreateInput | PositionUpdateInput = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      department_id: form.department_id,
      parent_position_id: form.parent_position_id || null,
      level: form.level,
      band: form.band.trim() || undefined,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        await apiClient.position.update(editingId, payload);
      } else {
        await apiClient.position.create(payload as PositionCreateInput);
      }

      await loadData();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save position");
    } finally {
      setSaving(false);
    }
  };

  const deletePosition = async (position: Position) => {
    if (!confirm(`Delete ${position.title}?`)) return;

    setSaving(true);
    setError(null);
    try {
      await apiClient.position.delete(position.id);
      await loadData();
      if (editingId === position.id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete position");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Positions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create, edit, and organize positions</p>
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <form onSubmit={submitForm} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Title</span>
                  <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 outline-none focus:border-slate-400 dark:border-slate-700"
                    placeholder="Position title"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Department</span>
                  <select
                    value={form.department_id}
                    onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 outline-none focus:border-slate-400 dark:border-slate-700"
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Level</span>
                  <select
                    value={form.level}
                    onChange={(event) => setForm((current) => ({ ...current, level: event.target.value as PositionLevel }))}
                    className="w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 outline-none focus:border-slate-400 dark:border-slate-700"
                    required
                  >
                    {POSITION_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Parent Position</span>
                  <select
                    value={form.parent_position_id}
                    onChange={(event) => setForm((current) => ({ ...current, parent_position_id: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 outline-none focus:border-slate-400 dark:border-slate-700"
                  >
                    <option value="">No parent</option>
                    {positions
                      .filter((position) => position.id !== editingId)
                      .map((position) => (
                        <option key={position.id} value={position.id}>
                          {position.title}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Band</span>
                  <input
                    value={form.band}
                    onChange={(event) => setForm((current) => ({ ...current, band: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 outline-none focus:border-slate-400 dark:border-slate-700"
                    placeholder="e.g., A1, B2"
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
              All positions
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
              </div>
            ) : positions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium">Level</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {positions.map((position) => (
                      <tr key={position.id} className={cn(position.is_active ? "" : "opacity-60")}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{position.title}</div>
                          {position.description && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">{position.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {departments.find((dept) => dept.id === position.department_id)?.name ?? "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {position.level}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "rounded-full px-2 py-1 text-xs font-medium",
                            position.is_active
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          )}>
                            {position.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(position)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deletePosition(position)}
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
              <div className="px-4 py-8 text-sm text-slate-500">No positions found.</div>
            )}
          </div>
        </div>

        <div
          className={cn(
            "space-y-4 rounded-lg border border-slate-200 bg-white p-4 transition-all duration-200 dark:border-slate-800 dark:bg-slate-900",
            treeOpen ? "lg:w-[420px]" : "lg:w-14 lg:px-2 lg:py-4"
          )}
        >
          <button
            type="button"
            onClick={() => setTreeOpen((value) => !value)}
            aria-expanded={treeOpen}
            aria-controls="position-hierarchy-panel"
            className={cn(
              "flex w-full items-center justify-between rounded-md text-left text-sm font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60",
              treeOpen ? "px-1 py-1" : "h-full min-h-[180px] flex-col justify-center gap-3 px-0 py-2"
            )}
          >
            <span className={cn("flex items-center gap-2", !treeOpen && "flex-col gap-2") }>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {treeOpen ? "−" : "+"}
              </span>
              <span style={!treeOpen ? { writingMode: "vertical-rl", transform: "rotate(180deg)" } : undefined}>
                Hierarchy
              </span>
            </span>
            {treeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {treeOpen && (
            <div id="position-hierarchy-panel" className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              {rootPositions.length > 0 ? (
                rootPositions.map((position) => (
                  <PositionNode
                    key={position.id}
                    node={{ ...position, children: [] } as any}
                    level={0}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-500">No root positions to show.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
