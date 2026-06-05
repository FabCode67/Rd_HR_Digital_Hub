"use client";

import React, { useEffect, useRef, useState } from "react";
import { PositionTreeNode, Employee, Position } from "@/lib/types";
import {
  ChevronDown, ChevronRight, AlertCircle,
  Loader2, Plus, Trash2, X, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

interface PositionNodeProps {
  node: PositionTreeNode;
  level?: number;
  onPositionUpdated?: () => void;
  departmentMap?: Record<string, string>;
}

export default function PositionNode({ node, level = 0, onPositionUpdated, departmentMap }: PositionNodeProps) {
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

  // Preload flag — fetch on hover so modal opens instantly
  const preloaded = useRef(false);
  const preloading = useRef(false);

  // Measure each child card's center X for accurate connector lines
  const childCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [childCenters, setChildCenters] = useState<number[]>([]);
  const [childRowWidth, setChildRowWidth] = useState(0);
  const childRowRef = useRef<HTMLDivElement>(null);
  const childCount = node.children?.length ?? 0;

  const measureChildCenters = () => {
    if (!childRowRef.current) return;
    const rowRect = childRowRef.current.getBoundingClientRect();
    const centers = childCardRefs.current
      .filter(Boolean)
      .map((el) => {
        const rect = el!.getBoundingClientRect();
        return rect.left - rowRect.left + rect.width / 2;
      });
    setChildCenters(centers);
    setChildRowWidth(childRowRef.current.offsetWidth);
  };

  useEffect(() => {
    if (!expanded || !childRowRef.current) return;
    const ob = new ResizeObserver(measureChildCenters);
    ob.observe(childRowRef.current);
    measureChildCenters();
    return () => ob.disconnect();
  }, [expanded, childCount]);

  const isVacant = node.is_vacant;
  const hasChildren = childCount > 0;
  const employeeName = node.employee?.full_name ?? null;
  const departmentName = departmentMap?.[node.department_id] ?? null;

  // ── Core data loader ──────────────────────────────────────────────────────
  // KEY FIX: fetch all position histories in parallel (Promise.all) instead
  // of sequential awaits inside a for-loop. Cuts N×RTT down to 1×RTT.
  const loadPositionDetails = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      // Fetch position metadata and full employee list in parallel
      const [pos, allEmployees] = await Promise.all([
        apiClient.position.getById(node.id),
        apiClient.employee.getAll(0, 200),
      ]);

      setPositionDetails(pos);
      setNewBand(pos.band || "");

      // Fetch ALL position histories in parallel — one round-trip per employee
      // instead of sequential awaits
      const historiesSettled = await Promise.allSettled(
        allEmployees.map((emp) =>
          apiClient.employee.getPositionHistory(emp.id).then((hist) => ({ emp, hist }))
        )
      );

      const assigned: Employee[] = [];
      const available: Employee[] = [];

      for (const result of historiesSettled) {
        if (result.status !== "fulfilled") continue;
        const { emp, hist } = result.value;
        const isCurrent = hist.some((h) => h.is_current && h.position.id === node.id);
        if (isCurrent) assigned.push(emp);
        else available.push(emp);
      }

      setAssignedEmployees(assigned);
      setAvailableEmployees(available);
      preloaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load position details");
    } finally {
      if (showLoading) setLoading(false);
      preloading.current = false;
    }
  };

  // ── Preload on hover — so modal opens instantly ───────────────────────────
  const handleMouseEnter = () => {
    if (preloaded.current || preloading.current) return;
    preloading.current = true;
    loadPositionDetails(false); // silent — no loading spinner on card
  };

  // ── Open modal — data likely already ready from hover preload ─────────────
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
    // If preload hasn't finished yet, show the loading spinner inside modal
    if (!preloaded.current) {
      setLoading(true);
    }
  };

  // Once open, ensure data is loaded (covers edge case where user clicked
  // before hover preload finished)
  useEffect(() => {
    if (open && !preloaded.current && !preloading.current) {
      loadPositionDetails(true);
    } else if (open && preloaded.current) {
      setLoading(false);
    }
  }, [open]);

  const handleAddEmployee = async () => {
    if (!selectedEmployeeId) return;
    setSaving(true); setError(null);
    try {
      await apiClient.employee.assignPosition(selectedEmployeeId, {
        employee_id: selectedEmployeeId,
        position_id: node.id,
        start_date: new Date().toISOString(),
      });
      setSelectedEmployeeId("");
      preloaded.current = false;
      await loadPositionDetails(false);
      onPositionUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign employee");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    setSaving(true); setError(null);
    try {
      const positions = await apiClient.employee.getPositionHistory(employeeId);
      const empPos = positions.find((p) => p.is_current && p.position.id === node.id);
      if (empPos) {
        await apiClient.employee.unassignPosition(empPos.id, new Date().toISOString());
        preloaded.current = false;
        await loadPositionDetails(false);
        onPositionUpdated?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove employee");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBand = async () => {
    if (!positionDetails) return;
    setSaving(true); setError(null);
    try {
      await apiClient.position.update(node.id, { ...positionDetails, band: newBand || undefined });
      setPositionDetails((c) => c ? { ...c, band: newBand || undefined } : null);
      onPositionUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update band");
    } finally {
      setSaving(false);
    }
  };

  const STEM = 20;
  const DROP = 20;

  return (
    <div className="flex flex-col items-center">
      {/* ── Position Card */}
      <div
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        className={cn(
          "group relative w-44 cursor-pointer rounded-2xl border-2 px-3 py-3 text-center shadow-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-md",
          isVacant
            ? "border-rose-300 bg-white dark:bg-slate-800 dark:border-rose-700 hover:border-rose-400"
            : "border-sky-400 bg-sky-500 hover:bg-sky-500/90 dark:bg-sky-600 dark:border-sky-500",
          open ? "ring-2 ring-offset-2 ring-sky-400 dark:ring-offset-slate-900" : ""
        )}
      >
        {isVacant && (
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">
            <AlertCircle size={9} /> Vacant
          </span>
        )}

        {hasChildren && (
          <button
            className={cn(
              "absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm bg-white dark:bg-slate-800 transition-colors",
              isVacant ? "border-rose-300 text-rose-500" : "border-sky-400 text-sky-600"
            )}
            onClick={(e) => { e.stopPropagation(); setExpanded((s) => !s); }}
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        )}

        <div className="space-y-1.5">
          <p className={cn("text-[12px] font-bold leading-tight", isVacant ? "text-slate-800 dark:text-slate-100" : "text-white")}>
            {node.title}
          </p>
          {employeeName && (
            <div className={cn("flex items-center justify-center gap-1", isVacant ? "text-slate-600 dark:text-slate-300" : "text-sky-100")}>
              <UserCheck size={11} />
              <span className="text-[11px] font-medium truncate max-w-[110px]">{employeeName}</span>
            </div>
          )}
          <div className="space-y-0.5">
            <p className={cn("text-[10px] font-medium", isVacant ? "text-slate-500 dark:text-slate-400" : "text-sky-100")}>
              {node.level}
            </p>
            {node.band && (
              <p className={cn("text-[10px]", isVacant ? "text-slate-400" : "text-sky-100/80")}>
                {node.band}
              </p>
            )}
            {departmentName && (
              <p className={cn(
                "text-[10px] font-medium truncate rounded px-1 py-0.5 mt-0.5",
                isVacant
                  ? "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                  : "bg-white/20 text-white/90"
              )}>
                {departmentName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Child connector + children */}
      {expanded && hasChildren && (
        <div className="relative mt-3 flex flex-col items-center">
          <div className="w-px border-l-2 border-dashed border-slate-300 dark:border-slate-600" style={{ height: STEM }} />

          {childCenters.length > 1 && childRowWidth > 0 && (
            <svg
              className="absolute pointer-events-none overflow-visible"
              style={{ top: STEM, left: 0 }}
              width={childRowWidth}
              height={DROP}
            >
              <line
                x1={childCenters[0]} y1={0}
                x2={childCenters[childCenters.length - 1]} y2={0}
                stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 3"
                className="text-slate-300 dark:text-slate-600"
              />
              {childCenters.map((cx, i) => (
                <line key={i}
                  x1={cx} y1={0} x2={cx} y2={DROP}
                  stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 3"
                  className="text-slate-300 dark:text-slate-600"
                />
              ))}
            </svg>
          )}

          {childCount === 1 && (
            <div className="w-px border-l-2 border-dashed border-slate-300 dark:border-slate-600" style={{ height: DROP }} />
          )}

          <div
            ref={childRowRef}
            className="flex flex-wrap justify-center gap-4"
            style={{ paddingTop: childCount > 1 ? DROP : 0 }}
          >
            {node.children!.map((child, i) => (
              <div
                key={child.id}
                ref={(el) => { childCardRefs.current[i] = el; }}
                className="flex flex-col items-center"
              >
                <PositionNode
                  node={child}
                  level={level + 1}
                  onPositionUpdated={onPositionUpdated}
                  departmentMap={departmentMap}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className={cn(
              "flex items-start justify-between gap-3 rounded-t-2xl px-6 py-4 border-b border-slate-100 dark:border-slate-800",
              isVacant ? "bg-rose-50 dark:bg-rose-950/30" : "bg-sky-50 dark:bg-sky-950/30"
            )}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isVacant ? <AlertCircle size={16} className="text-rose-500" /> : <UserCheck size={16} className="text-sky-500" />}
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{node.title}</h2>
                  {isVacant && <span className="rounded-full bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-300">Vacant</span>}
                </div>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {node.level}{node.band ? ` • Band: ${node.band}` : ""}{departmentName ? ` • ${departmentName}` : ""}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="flex-shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  <p className="text-sm text-slate-400">Loading position details…</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Band</label>
                    <div className="flex gap-2">
                      <input type="text" value={newBand} onChange={(e) => setNewBand(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-sky-400 dark:text-slate-100"
                        placeholder="e.g., A1, B2" />
                      <button onClick={handleUpdateBand} disabled={saving || newBand === (node.band || "")}
                        className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                      </button>
                    </div>
                  </div>

                  <hr className="border-slate-100 dark:border-slate-800" />

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Assigned Employees ({assignedEmployees.length})
                    </h3>
                    {assignedEmployees.length > 0 ? (
                      <div className="space-y-2">
                        {assignedEmployees.map((emp) => (
                          <div key={emp.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{emp.full_name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{emp.email}</p>
                            </div>
                            <button onClick={() => handleRemoveEmployee(emp.id)} disabled={saving}
                              className="ml-3 flex-shrink-0 rounded-lg border border-red-200 dark:border-red-800 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500">No employees assigned yet.</p>
                    )}
                  </div>

                  <hr className="border-slate-100 dark:border-slate-800" />

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add Employee</h3>
                    {availableEmployees.length > 0 ? (
                      <div className="flex gap-2">
                        <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}
                          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-sky-400 dark:text-slate-100">
                          <option value="">Select an employee</option>
                          {availableEmployees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                          ))}
                        </select>
                        <button onClick={handleAddEmployee} disabled={!selectedEmployeeId || saving}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
                          <Plus size={15} /> Add
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500">All employees are already assigned.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
