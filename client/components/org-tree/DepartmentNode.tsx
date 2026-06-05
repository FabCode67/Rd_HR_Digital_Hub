"use client";

import React, { useEffect, useState } from "react";
import { Department } from "@/lib/types";
import { ChevronDown, ChevronRight, Building2, Loader2 } from "lucide-react";
import PositionTree from "./PositionTree";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DepartmentNodeProps {
  department: Department;
  level?: number;
}

/** Recursively collect { id -> name } from a nested dept tree response */
function collectDeptMap(node: any, acc: Record<string, string> = {}): Record<string, string> {
  if (node?.id && node?.name) acc[node.id] = node.name;
  for (const child of node?.children ?? []) collectDeptMap(child, acc);
  return acc;
}

export default function DepartmentNode({ department, level = 0 }: DepartmentNodeProps) {
  const [expanded, setExpanded] = useState(level === 0); // auto-expand top-level
  const [childDepts, setChildDepts] = useState<Department[] | null>(null);
  const [positions, setPositions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [departmentMap, setDepartmentMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const tree = await apiClient.department.getHierarchy(department.id);
        if (!mounted) return;
        setChildDepts(tree.children || []);
        setPositions(tree.positions || []);
        setDepartmentMap(collectDeptMap(tree));
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (expanded && childDepts === null && positions === null) {
      load();
    }
    return () => { mounted = false; };
  }, [expanded, department.id, childDepts, positions]);

  const handlePositionUpdated = async () => {
    setLoading(true);
    try {
      const tree = await apiClient.department.getHierarchy(department.id);
      setChildDepts(tree.children || []);
      setPositions(tree.positions || []);
      setDepartmentMap(collectDeptMap(tree));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const hasContent =
    (childDepts && childDepts.length > 0) || (positions && positions.length > 0);

  const totalPositions = positions?.length ?? 0;
  const vacantCount = positions?.filter((p: any) => p.is_vacant).length ?? 0;

  return (
    <div>
      {/* ── Department Header Card ───────────────────────────────────────── */}
      <div
        role="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((s) => !s)}
        className={cn(
          "group flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer select-none transition-all duration-200",
          expanded
            ? "border-violet-400 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30 shadow-sm shadow-violet-100 dark:shadow-none dark:border-violet-700"
            : "border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800/60 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/60 dark:hover:bg-violet-950/20"
        )}
      >
        {/* Chevron */}
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/50 transition-colors">
          {hasContent ? (
            expanded ? (
              <ChevronDown size={15} className="text-violet-600 dark:text-violet-400" />
            ) : (
              <ChevronRight size={15} className="text-violet-600 dark:text-violet-400" />
            )
          ) : (
            <Building2 size={15} className="text-violet-400" />
          )}
        </div>

        {/* Dept icon */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500 shadow-sm">
          <Building2 size={18} className="text-white" />
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {department.name}
            </span>
            {loading && <Loader2 size={12} className="animate-spin text-violet-400" />}
          </div>
          {department.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {department.description}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {totalPositions > 0 && (
            <span className="rounded-full bg-violet-100 dark:bg-violet-900/50 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
              {totalPositions} position{totalPositions !== 1 ? "s" : ""}
            </span>
          )}
          {vacantCount > 0 && (
            <span className="rounded-full bg-rose-100 dark:bg-rose-900/40 px-2.5 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-300">
              {vacantCount} vacant
            </span>
          )}
        </div>
      </div>

      {/* ── Expanded Content with connector lines ───────────────────────── */}
      {expanded && (
        <div className="ml-6 mt-1 pl-5 border-l-2 border-dashed border-violet-200 dark:border-violet-800">
          {/* Positions section */}
          {positions && positions.length > 0 && (
            <div className="pt-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Positions
                </span>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
              <PositionTree
                positions={positions}
                level={level + 1}
                onPositionUpdated={handlePositionUpdated}
                departmentMap={departmentMap}
              />
            </div>
          )}

          {/* Child departments */}
          {childDepts && childDepts.length > 0 && (
            <div className="pt-4 space-y-2">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Sub-departments
                </span>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
              {childDepts.map((c) => (
                <DepartmentNode key={c.id} department={c} level={level + 1} />
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center gap-2 py-4 pl-1 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Loading…
            </div>
          )}

          {/* Empty */}
          {!loading && hasContent === false && (
            <p className="py-4 pl-1 text-sm text-slate-400 dark:text-slate-500">No positions or sub-departments.</p>
          )}
        </div>
      )}
    </div>
  );
}
