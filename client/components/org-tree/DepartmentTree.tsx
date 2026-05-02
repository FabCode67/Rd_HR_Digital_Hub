"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Department } from "@/lib/types";
import { Loader2 } from "lucide-react";
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
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load departments");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadRoots();

    return () => {
      mounted = false;
    };
  }, [rootDepartments]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Organization Structure</h2>
        <p className="text-sm text-muted-foreground mt-1">View the hierarchical structure of all departments and positions</p>
      </div>

      <div className="bg-card border rounded-lg">
        <div className="p-6 space-y-4">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground mr-2" size={20} />
              <span className="text-sm text-muted-foreground">Loading organizational structure…</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">Error loading organization structure</p>
              <p className="text-xs text-destructive/70 mt-1">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && (!roots || roots.length === 0) && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No departments found.</p>
            </div>
          )}

          {/* Department Tree */}
          {roots && roots.length > 0 && (
            <div className="space-y-3">
              {roots.map((dept) => (
                <DepartmentNode key={dept.id} department={dept} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="flex items-start gap-2">
          <div className="mt-1 text-lg flex-shrink-0">📁</div>
          <div>
            <p className="font-medium text-foreground">Department</p>
            <p className="text-xs text-muted-foreground">Organizational unit</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-1 w-3 h-3 rounded bg-blue-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground">Filled Position</p>
            <p className="text-xs text-muted-foreground">Position with assigned employee</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-1 w-3 h-3 rounded border-2 border-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground">Vacant Position</p>
            <p className="text-xs text-muted-foreground">Position open for recruitment</p>
          </div>
        </div>
      </div>
    </div>
  );
}
