"use client";

import React, { useEffect, useState } from "react";
import { Department } from "@/lib/types";
import { ChevronDown, ChevronRight, Building2 } from "lucide-react";
import PositionTree from "./PositionTree";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DepartmentNodeProps {
  department: Department;
  level?: number;
}

export default function DepartmentNode({ department, level = 0 }: DepartmentNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [childDepts, setChildDepts] = useState<Department[] | null>(null);
  const [positions, setPositions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const tree = await apiClient.department.getHierarchy(department.id);
        if (!mounted) return;
        setChildDepts(tree.children || []);
        setPositions(tree.positions || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (expanded && (!childDepts || !positions)) {
      load();
    }
    return () => {
      mounted = false;
    };
  }, [expanded, department.id, childDepts, positions]);

  const hasContent = (childDepts && childDepts.length > 0) || (positions && positions.length > 0);

  return (
    <div className="group">
      {/* Department Header */}
      <div
        className={cn(
          "flex items-start gap-2 py-2 px-3 rounded-lg border-2 cursor-pointer transition-all",
          expanded
            ? "border-purple-400 bg-purple-50 dark:bg-purple-950/20"
            : "border-purple-300 bg-purple-50/50 dark:bg-purple-950/10 hover:border-purple-400"
        )}
        onClick={() => setExpanded((s) => !s)}
      >
        {/* Expand/Collapse Chevron */}
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
          {hasContent ? (
            expanded ? (
              <ChevronDown size={16} className="text-purple-600 dark:text-purple-400" />
            ) : (
              <ChevronRight size={16} className="text-purple-600 dark:text-purple-400" />
            )
          ) : null}
        </div>

        {/* Department Icon and Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="text-purple-600 dark:text-purple-400 flex-shrink-0" size={18} />
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 truncate">{department.name}</h3>
            {!hasContent && (
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">No positions</span>
            )}
          </div>
          {department.description && (
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1 ml-6">{department.description}</p>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="ml-4 mt-3 space-y-3 border-l-2 border-purple-300 dark:border-purple-700 pl-4">
          {loading && (
            <div className="text-sm text-muted-foreground py-2">Loading department structure…</div>
          )}

          {/* Positions */}
          {positions && positions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Positions</p>
              <PositionTree positions={positions} level={level + 1} />
            </div>
          )}

          {/* Child Departments */}
          {childDepts && childDepts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Departments</p>
              <div className="space-y-2">
                {childDepts.map((c) => (
                  <DepartmentNode key={c.id} department={c} level={level + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
