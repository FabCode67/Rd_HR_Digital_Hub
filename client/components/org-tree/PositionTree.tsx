"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import PositionNode, {
  ExpandedCtx, subtreeWidth,
  CARD_GAP, CARD_GAP_EXPANDED, DROP_H,
} from "./PositionNode";
import { PositionTreeNode } from "@/lib/types";

interface PositionTreeProps {
  positions: PositionTreeNode[];
  level?: number;
  onPositionUpdated?: () => void;
  departmentMap: Record<string, string>;
}

export default function PositionTree({
  positions, level = 0, onPositionUpdated, departmentMap,
}: PositionTreeProps) {
  // ── Shared expanded state ──────────────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Auto-center scroll on mount ───────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      if (el.scrollWidth > el.clientWidth) {
        el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [positions]);

  // Re-center when expanded state changes (tree grows/shrinks)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      if (el.scrollWidth > el.clientWidth) {
        // Only nudge toward center; don't jump aggressively
        const target = (el.scrollWidth - el.clientWidth) / 2;
        el.scrollLeft = el.scrollLeft * 0.4 + target * 0.6;
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [expandedIds]);

  if (!positions.length) return null;

  // ── Compute top-level layout (dynamic — depends on expandedIds) ───────────
  const childWidths = positions.map(p => subtreeWidth(p, expandedIds));
  const anyExpanded = positions.some(p => expandedIds.has(p.id));
  const gap         = anyExpanded ? CARD_GAP_EXPANDED : CARD_GAP;
  const totalWidth  = childWidths.reduce((a, b) => a + b, 0)
    + gap * (positions.length - 1);

  let cursor = 0;
  const cardCentres = childWidths.map(w => {
    const centre = cursor + w / 2;
    cursor += w + gap;
    return centre;
  });

  const barLeft  = cardCentres[0];
  const barRight = cardCentres[cardCentres.length - 1];

  return (
    <ExpandedCtx.Provider value={{ expandedIds, toggle }}>
      <div ref={scrollRef} className="overflow-x-auto pb-4">
        <div
          style={{ width: totalWidth, minWidth: totalWidth }}
          className="relative transition-all duration-300"
        >
          {/* Top-level connector SVG */}
          <svg
            width={totalWidth}
            height={DROP_H}
            className="absolute top-0 left-0 pointer-events-none overflow-visible"
            style={{ zIndex: 0 }}
          >
            {positions.length > 1 && (
              <line
                x1={barLeft} y1={0}
                x2={barRight} y2={0}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                className="stroke-slate-300 dark:stroke-slate-600"
              />
            )}
            {cardCentres.map((cx, i) => (
              <line
                key={i}
                x1={cx} y1={0}
                x2={cx} y2={DROP_H}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                className="stroke-slate-300 dark:stroke-slate-600"
              />
            ))}
          </svg>

          {/* Top-level node row */}
          <div
            className="flex flex-row items-start flex-nowrap transition-all duration-300"
            style={{ gap, paddingTop: DROP_H }}
          >
            {positions.map(p => (
              <PositionNode
                key={p.id}
                node={p}
                level={level}
                onPositionUpdated={onPositionUpdated}
                departmentMap={departmentMap}
              />
            ))}
          </div>
        </div>
      </div>
    </ExpandedCtx.Provider>
  );
}
