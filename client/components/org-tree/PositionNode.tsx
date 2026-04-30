"use client";

import React, { useState } from "react";
import { PositionTreeNode } from "@/lib/types";
import { ChevronDown, ChevronRight, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PositionNodeProps {
  node: PositionTreeNode;
  level?: number;
}

export default function PositionNode({ node, level = 0 }: PositionNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const isVacant = node.is_vacant;

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
            {node.employee && (
              <div className={cn("flex items-center justify-center gap-1.5", isVacant ? "text-slate-700" : "text-white")}>
                <User size={12} className={isVacant ? "text-slate-500" : "text-white/90"} />
                <span className="font-medium">{node.employee.full_name}</span>
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
              <PositionNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Details Drawer */}
 
    </div>
  );
}
