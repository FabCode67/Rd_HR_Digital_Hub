"use client";

import React, { useRef, useState, useEffect } from "react";
import { PositionTreeNode, Employee, Position } from "@/lib/types";
import {
  ChevronDown, ChevronRight, AlertCircle,
  Loader2, Plus, Trash2, X, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

// ── Constants ──────────────────────────────────────────────────────────────────
const CARD_W  = 176; // px — matches w-44
const CARD_GAP = 20; // px — gap between sibling columns
const STEM_H  = 24;  // px — vertical line from card bottom to h-bar
const DROP_H  = 24;  // px — vertical line from h-bar to child card top

// ── Subtree width helper ───────────────────────────────────────────────────────
// A leaf owns exactly CARD_W.
// A parent owns max(CARD_W, sum-of-children + gaps).
// This is called recursively so every node knows exactly how wide its column is.
function subtreeWidth(node: PositionTreeNode): number {
  const children = node.children ?? [];
  if (children.length === 0) return CARD_W;
  const total = children.reduce((acc, c) => acc + subtreeWidth(c), 0)
    + CARD_GAP * (children.length - 1);
  return Math.max(CARD_W, total);
}

// ── PositionNode ───────────────────────────────────────────────────────────────
interface Props {
  node: PositionTreeNode;
  level?: number;
  onPositionUpdated?: () => void;
  departmentMap?: Record<string, string>;
}

export default function PositionNode({ node, level = 0, onPositionUpdated, departmentMap }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [assigned, setAssigned] = useState<Employee[]>([]);
  const [available, setAvailable] = useState<Employee[]>([]);
  const [details, setDetails]   = useState<Position | null>(null);
  const [newBand, setNewBand]   = useState(node.band || "");
  const [selEmp, setSelEmp]     = useState("");

  const preloaded  = useRef(false);
  const preloading = useRef(false);

  const isVacant      = node.is_vacant;
  const children      = node.children ?? [];
  const hasChildren   = children.length > 0;
  const employeeName  = node.employee?.full_name ?? null;
  const departmentName = departmentMap?.[node.department_id] ?? null;

  // Total width this node occupies (its whole subtree column)
  const myWidth = subtreeWidth(node);

  // ── Data load ─────────────────────────────────────────────────────────────
  const loadDetails = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [pos, allEmps] = await Promise.all([
        apiClient.position.getById(node.id),
        apiClient.employee.getAll(0, 200),
      ]);
      setDetails(pos);
      setNewBand(pos.band || "");

      const results = await Promise.allSettled(
        allEmps.map(e =>
          apiClient.employee.getPositionHistory(e.id).then(h => ({ e, h }))
        )
      );
      const a: Employee[] = [], av: Employee[] = [];
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const { e, h } = r.value;
        h.some(x => x.is_current && x.position.id === node.id) ? a.push(e) : av.push(e);
      }
      setAssigned(a);
      setAvailable(av);
      preloaded.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      if (showSpinner) setLoading(false);
      preloading.current = false;
    }
  };

  const onHover = () => {
    if (preloaded.current || preloading.current) return;
    preloading.current = true;
    loadDetails(false);
  };

  const onCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
    if (!preloaded.current) setLoading(true);
  };

  useEffect(() => {
    if (!open) return;
    if (!preloaded.current && !preloading.current) loadDetails(true);
    else if (preloaded.current) setLoading(false);
  }, [open]);

  const addEmployee = async () => {
    if (!selEmp) return;
    setSaving(true); setError(null);
    try {
      await apiClient.employee.assignPosition(selEmp, {
        employee_id: selEmp, position_id: node.id, start_date: new Date().toISOString(),
      });
      setSelEmp(""); preloaded.current = false;
      await loadDetails(false); onPositionUpdated?.();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const removeEmployee = async (empId: string) => {
    setSaving(true); setError(null);
    try {
      const hist = await apiClient.employee.getPositionHistory(empId);
      const ep = hist.find(p => p.is_current && p.position.id === node.id);
      if (ep) {
        await apiClient.employee.unassignPosition(ep.id, new Date().toISOString());
        preloaded.current = false;
        await loadDetails(false); onPositionUpdated?.();
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const updateBand = async () => {
    if (!details) return;
    setSaving(true); setError(null);
    try {
      await apiClient.position.update(node.id, { ...details, band: newBand || undefined });
      setDetails(d => d ? { ...d, band: newBand || undefined } : null);
      onPositionUpdated?.();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  // The outermost div is exactly `myWidth` wide.
  // The card (CARD_W) is centred inside it.
  // Children are laid out as columns below, each column = subtreeWidth(child).
  return (
    <div style={{ width: myWidth }} className="flex flex-col items-center flex-shrink-0">

      {/* ── Card ── */}
      <div
        onClick={onCardClick}
        onMouseEnter={onHover}
        style={{ width: CARD_W }}
        className={cn(
          "relative cursor-pointer rounded-2xl border-2 px-3 py-3 text-center shadow-sm",
          "transition-all duration-200 hover:scale-[1.03] hover:shadow-md flex-shrink-0",
          isVacant
            ? "border-rose-300 bg-white dark:bg-slate-800 dark:border-rose-700"
            : "border-sky-400 bg-sky-500 dark:bg-sky-600 dark:border-sky-500",
          open && "ring-2 ring-offset-2 ring-sky-400 dark:ring-offset-slate-900"
        )}
      >
        {isVacant && (
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">
            <AlertCircle size={9} /> Vacant
          </span>
        )}
        {hasChildren && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(s => !s); }}
            className={cn(
              "absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm bg-white dark:bg-slate-800",
              isVacant ? "border-rose-300 text-rose-500" : "border-sky-400 text-sky-600"
            )}
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
              <p className={cn("text-[10px]", isVacant ? "text-slate-400" : "text-sky-100/80")}>{node.band}</p>
            )}
            {departmentName && (
              <p className={cn(
                "text-[10px] font-medium truncate rounded px-1 py-0.5 mt-0.5",
                isVacant ? "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" : "bg-white/20 text-white/90"
              )}>
                {departmentName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Children (only when expanded) ── */}
      {expanded && hasChildren && (() => {
        // Pre-compute child column widths for connector geometry
        const childWidths = children.map(subtreeWidth);
        const totalChildWidth = childWidths.reduce((a, b) => a + b, 0)
          + CARD_GAP * (children.length - 1);

        // x-offset of each child column's centre, relative to the centre of myWidth
        // childColLeft[i] = left edge of child i's column relative to left edge of children row
        const childColLeft: number[] = [];
        let cursor = 0;
        for (let i = 0; i < children.length; i++) {
          childColLeft.push(cursor);
          cursor += childWidths[i] + CARD_GAP;
        }
        // Centre of each child's card (relative to left edge of children row)
        const childCardCentre = childColLeft.map((l, i) => l + childWidths[i] / 2);

        // Left edge of children row relative to centre of myWidth
        const rowLeft = (myWidth - totalChildWidth) / 2;

        // Connector SVG: drawn at the top of the children section
        // H-bar goes from first child card centre to last child card centre
        const barLeft  = childCardCentre[0];
        const barRight = childCardCentre[children.length - 1];
        const svgW     = totalChildWidth;
        const svgH     = STEM_H + DROP_H;

        return (
          <div className="flex flex-col items-center w-full">
            {/* Stem down from card */}
            <div style={{ width: 2, height: STEM_H, background: "var(--connector)" }} className="connector-line" />

            {/* Connector SVG + children row */}
            <div style={{ width: totalChildWidth, marginLeft: rowLeft - myWidth / 2 + totalChildWidth / 2 + "px", position: "relative" }}>
              {/* SVG connectors */}
              <svg
                width={svgW}
                height={svgH}
                className="absolute top-0 left-0 pointer-events-none overflow-visible"
                style={{ zIndex: 0 }}
              >
                {/* Horizontal bar */}
                {children.length > 1 && (
                  <line
                    x1={barLeft} y1={0}
                    x2={barRight} y2={0}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    className="stroke-slate-300 dark:stroke-slate-600"
                  />
                )}
                {/* Vertical drop to each child */}
                {childCardCentre.map((cx, i) => (
                  <line
                    key={i}
                    x1={cx} y1={0}
                    x2={cx} y2={DROP_H}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    className="stroke-slate-300 dark:stroke-slate-600"
                  />
                ))}
              </svg>

              {/* Children row — each child in its own fixed-width column */}
              <div
                className="flex flex-row items-start"
                style={{ gap: CARD_GAP, paddingTop: svgH }}
              >
                {children.map((child, i) => (
                  <PositionNode
                    key={child.id}
                    node={child}
                    level={level + 1}
                    onPositionUpdated={onPositionUpdated}
                    departmentMap={departmentMap}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
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
                <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
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
                      <input value={newBand} onChange={e => setNewBand(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-sky-400 dark:text-slate-100"
                        placeholder="e.g., A1, B2" />
                      <button onClick={updateBand} disabled={saving || newBand === (node.band || "")}
                        className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                      </button>
                    </div>
                  </div>
                  <hr className="border-slate-100 dark:border-slate-800" />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assigned ({assigned.length})</h3>
                    {assigned.length > 0 ? assigned.map(emp => (
                      <div key={emp.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{emp.full_name}</p>
                          <p className="text-xs text-slate-500">{emp.email}</p>
                        </div>
                        <button onClick={() => removeEmployee(emp.id)} disabled={saving}
                          className="rounded-lg border border-red-200 dark:border-red-800 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )) : <p className="text-sm text-slate-400">No employees assigned.</p>}
                  </div>
                  <hr className="border-slate-100 dark:border-slate-800" />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add Employee</h3>
                    {available.length > 0 ? (
                      <div className="flex gap-2">
                        <select value={selEmp} onChange={e => setSelEmp(e.target.value)}
                          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-sky-400 dark:text-slate-100">
                          <option value="">Select employee</option>
                          {available.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                        </select>
                        <button onClick={addEmployee} disabled={!selEmp || saving}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
                          <Plus size={15} /> Add
                        </button>
                      </div>
                    ) : <p className="text-sm text-slate-400">All employees already assigned.</p>}
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
