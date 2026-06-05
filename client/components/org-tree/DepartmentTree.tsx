"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Department } from "@/lib/types";
import { Loader2, Network } from "lucide-react";
import DepartmentNode from "./DepartmentNode";

interface DepartmentTreeProps {
  rootDepartments?: Department[];
}

export default function DepartmentTree({ rootDepartments }: DepartmentTreeProps) {
  const [roots, setRoots] = useState<Department[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadRoots() {
      setLoading(true);
      setError(null);
      try {
        const data = rootDepartments || (await apiClient.department.getRootDepartments());
        if (!mounted) return;
        setRoots(data || []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load departments");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRoots();
    return () => { mounted = false; };
  }, [rootDepartments]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40">
          <Network className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Organization Structure
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hierarchical view of all departments, positions, and staff
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-4 py-3 text-xs">
        <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
          <span className="h-3 w-3 rounded-sm bg-violet-500" />
          Department
        </span>
        <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
          <span className="h-3 w-3 rounded-sm bg-sky-500" />
          Filled Position
        </span>
        <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
          <span className="h-3 w-3 rounded-sm border-2 border-rose-400 bg-white dark:bg-slate-800" />
          Vacant Position
        </span>
        <span className="flex items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
          <span className="h-px w-5 border-t-2 border-dashed border-slate-400" />
          Reporting Line
        </span>
      </div>

      {/* Tree canvas */}
      <div className="overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <div className="min-h-[300px] p-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-violet-500 mr-2" size={22} />
              <span className="text-sm text-slate-500">Loading organizational structure…</span>
            </div>
          )}

          {error && (
            <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 p-5 text-center">
              <p className="font-medium text-red-700 dark:text-red-300">Failed to load structure</p>
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && (!roots || roots.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Network className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="font-medium text-slate-500 dark:text-slate-400">No departments found</p>
              <p className="mt-1 text-xs text-slate-400">Add departments to see the organization tree here</p>
            </div>
          )}

          {roots && roots.length > 0 && (
            <div className="space-y-4">
              {roots.map((dept) => (
                <DepartmentNode key={dept.id} department={dept} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
