"use client";

import React, { useEffect, useState } from "react";
import { PositionTreeNode, Employee, Position } from "@/lib/types";
import { ChevronDown, ChevronRight, User, AlertCircle, Loader2, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

interface PositionNodeProps {
  node: PositionTreeNode;
  level?: number;
  onPositionUpdated?: () => void;
}

export default function PositionNode({ node, level = 0, onPositionUpdated }: PositionNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignedEmployees, setAssignedEmployees] = useState<Employee[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [positionDetails, setPositionDetails] = useState<Position | null>(null);
  const [newBand, setNewBand] = useState(node.band || "");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const isVacant = node.is_vacant;

  const loadPositionDetails = async () => {
    if (!open) return;
    
    setLoading(true);
    setError(null);
    try {
      // Get position details
      const pos = await apiClient.position.getById(node.id);
      setPositionDetails(pos);
      setNewBand(pos.band || "");

      // Get all employees assigned to this position
      const allEmployees = await apiClient.employee.getAll(0, 100);
      const assigned: Employee[] = [];
      const available: Employee[] = [];

      for (const emp of allEmployees) {
        const positions = await apiClient.employee.getPositionHistory(emp.id);
        const currentPos = positions.find((p) => p.is_current && p.position.id === node.id);
        if (currentPos) {
          assigned.push(emp);
        } else {
          available.push(emp);
        }
      }

      setAssignedEmployees(assigned);
      setAvailableEmployees(available);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load position details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPositionDetails();
    }
  }, [open]);

  const handleAddEmployee = async () => {
    if (!selectedEmployeeId || !node.id) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        employee_id: selectedEmployeeId,
        position_id: node.id,
        start_date: new Date().toISOString(),
      };
      await apiClient.employee.assignPosition(selectedEmployeeId, payload);
      setSelectedEmployeeId("");
      await loadPositionDetails();
      onPositionUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign employee");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    if (!confirm("Remove this employee from the position?")) return;

    setSaving(true);
    setError(null);
    try {
      // Get the employee position detail to remove
      const positions = await apiClient.employee.getPositionHistory(employeeId);
      const empPos = positions.find((p) => p.is_current && p.position.id === node.id);
      if (empPos) {
        await apiClient.employee.unassignPosition(empPos.id, new Date().toISOString());
        await loadPositionDetails();
        onPositionUpdated?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove employee");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBand = async () => {
    if (!positionDetails || !node.id) return;

    setSaving(true);
    setError(null);
    try {
      await apiClient.position.update(node.id, {
        ...positionDetails,
        band: newBand || undefined,
      });
      setPositionDetails((current) => current ? { ...current, band: newBand || undefined } : null);
      onPositionUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update band");
    } finally {
      setSaving(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <div className="group flex flex-col items-center">
      <div className="relative w-[190px] sm:w-[210px]">
        <div className="absolute left-1/2 top-[-32px] h-8 w-px -translate-x-1/2 bg-slate-500/60" />
        <div
          className={cn(
            "relative rounded border p-3 text-center shadow-sm transition-all duration-150 cursor-pointer",
            isVacant
              ? "border-sky-500 bg-white hover:bg-sky-50"
              : "border-sky-700 bg-sky-500 hover:bg-sky-600",
            open ? "ring-2 ring-offset-2 ring-slate-300" : ""
          )}
          onClick={handleCardClick}
        >
          {/* Expand/Collapse Button */}
          {node.children && node.children.length > 0 && (
            <button
              className="absolute -left-6 top-1/2 -translate-y-1/2 rounded bg-white p-1 shadow hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((s) => !s);
              }}
            >
              {expanded ? (
                <ChevronDown size={16} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={16} className="text-muted-foreground" />
              )}
            </button>
          )}

          {/* Position Content */}
          <div className="space-y-1 text-[11px] leading-tight">
            {/* Title and Status */}
            <div className="space-y-0.5">
              <div>
                <h4
                  className={cn(
                    "font-semibold",
                    isVacant ? "text-slate-900" : "text-white"
                  )}
                >
                  {node.title}
                </h4>
                {isVacant && (
                  <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-red-600">
                    <AlertCircle size={12} />
                    Vacant
                  </p>
                )}
              </div>
            </div>

            {/* Employee Info */}
            {(assignedEmployees.length > 0 || node.employee) && (
              <div className={cn("flex items-center justify-center gap-1.5", isVacant ? "text-slate-700" : "text-white")}>
                <User size={12} className={isVacant ? "text-slate-500" : "text-white/90"} />
                <span className="font-medium">
                  {assignedEmployees.length > 1
                    ? `${assignedEmployees.length} employees`
                    : assignedEmployees.length === 1
                      ? assignedEmployees[0].full_name
                      : node.employee?.full_name}
                </span>
              </div>
            )}

            {/* Level and Band */}
            <div className={cn("space-y-0.5", isVacant ? "text-slate-800" : "text-white")}>
              <div className="font-medium">{node.level}</div>
              {node.band && (
                <div className="font-medium">{node.band}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Line for Children */}
      {expanded && node.children && node.children.length > 0 && (
        <div className="relative mt-6 flex justify-center">
          <div className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-slate-500/60" />
          <div className="absolute left-0 right-0 top-8 h-px bg-slate-500/60" />
          <div className="relative z-10 flex items-start justify-center gap-10 pt-8">
            {node.children.map((child) => (
              <PositionNode key={child.id} node={child} level={level + 1} onPositionUpdated={onPositionUpdated} />
            ))}
          </div>
        </div>
      )}

      {/* Position Management Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {node.title} - Manage Assignments
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {node.level} {node.band && `• Band: ${node.band}`}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex-shrink-0 rounded-md p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Update Band */}
                <div className="space-y-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                  <label className="space-y-1 text-sm">
                    <span className="text-slate-600 dark:text-slate-300">Band</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newBand}
                        onChange={(e) => setNewBand(e.target.value)}
                        className="flex-1 rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-700"
                        placeholder="e.g., A1, B2"
                      />
                      <button
                        onClick={handleUpdateBand}
                        disabled={saving || newBand === (node.band || "")}
                        className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                      </button>
                    </div>
                  </label>
                </div>

                {/* Assigned Employees */}
                <div className="space-y-3">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100">
                    Assigned Employees ({assignedEmployees.length})
                  </h3>
                  {assignedEmployees.length > 0 ? (
                    <div className="space-y-2">
                      {assignedEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900 dark:text-slate-100">{emp.full_name}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{emp.email}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveEmployee(emp.id)}
                            disabled={saving}
                            className="flex-shrink-0 ml-2 rounded-md border border-red-200 p-2 text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No employees assigned yet.</p>
                  )}
                </div>

                {/* Add Employee */}
                <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100">Add Employee</h3>
                  {availableEmployees.length > 0 ? (
                    <div className="flex gap-2">
                      <select
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="flex-1 rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-700"
                      >
                        <option value="">Select an employee</option>
                        {availableEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAddEmployee}
                        disabled={!selectedEmployeeId || saving}
                        className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-700 dark:hover:bg-emerald-800"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">All active employees are already assigned to positions.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}