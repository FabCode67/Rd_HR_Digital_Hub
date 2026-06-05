"use client";

import React, { useRef, useEffect, useState } from "react";
import PositionNode from "./PositionNode";
import { PositionTreeNode } from "@/lib/types";

interface PositionTreeProps {
  positions: PositionTreeNode[];
  level?: number;
  onPositionUpdated?: () => void;
  departmentMap: Record<string, string>;
}

/**
 * Renders a horizontal row of position nodes with SVG connector lines.
 */
export default function PositionTree({ positions, level = 0, onPositionUpdated, departmentMap }: PositionTreeProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [centers, setCenters] = useState<number[]>([]);
  const [rowWidth, setRowWidth] = useState(0);

  const measure = () => {
    if (!rowRef.current) return;
    const rowRect = rowRef.current.getBoundingClientRect();
    const cx = cardRefs.current
      .filter(Boolean)
      .map((el) => {
        const r = el!.getBoundingClientRect();
        return r.left - rowRect.left + r.width / 2;
      });
    setCenters(cx);
    setRowWidth(rowRef.current.offsetWidth);
  };

  useEffect(() => {
    if (!rowRef.current) return;
    const ob = new ResizeObserver(measure);
    ob.observe(rowRef.current);
    measure();
    return () => ob.disconnect();
  }, [positions.length]);

  if (!positions.length) return null;

  const STEM_H = 24;
  const DROP_H = 20;

  return (
    <div className="relative">
      {/* SVG connector lines — drawn using real measured card centers */}
      {positions.length > 1 && centers.length > 1 && rowWidth > 0 && (
        <svg
          className="absolute top-0 left-0 pointer-events-none overflow-visible"
          width={rowWidth}
          height={STEM_H + DROP_H}
          style={{ zIndex: 0 }}
        >
          {/* Horizontal bar from first to last card center */}
          <line
            x1={centers[0]}
            y1={STEM_H}
            x2={centers[centers.length - 1]}
            y2={STEM_H}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            className="text-slate-300 dark:text-slate-600"
          />
          {/* Vertical drop to each card center */}
          {centers.map((cx, i) => (
            <line
              key={i}
              x1={cx} y1={STEM_H}
              x2={cx} y2={STEM_H + DROP_H}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              className="text-slate-300 dark:text-slate-600"
            />
          ))}
        </svg>
      )}

      {/* Single node — just a short stem */}
      {positions.length === 1 && (
        <div className="flex justify-center">
          <div
            className="w-px border-l-2 border-dashed border-slate-300 dark:border-slate-600"
            style={{ height: STEM_H + DROP_H }}
          />
        </div>
      )}

      {/* Node row — each card gets a ref for real center measurement */}
      <div
        ref={rowRef}
        className="relative flex flex-wrap justify-center gap-4"
        style={{ paddingTop: STEM_H + DROP_H }}
      >
        {positions.map((p, i) => (
          <div
            key={p.id}
            ref={(el) => { cardRefs.current[i] = el; }}
            className="flex flex-col items-center"
          >
            <PositionNode
              node={p}
              level={level}
              onPositionUpdated={onPositionUpdated}
              departmentMap={departmentMap}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
