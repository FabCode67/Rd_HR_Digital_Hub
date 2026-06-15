"use client";

import React, { useRef, useEffect } from "react";
import PositionNode from "./PositionNode";
import { PositionTreeNode } from "@/lib/types";

interface PositionTreeProps {
  positions: PositionTreeNode[];
  level?: number;
  onPositionUpdated?: () => void;
  departmentMap: Record<string, string>;
}

// Must match PositionNode constants exactly
const CARD_W   = 140;
const CARD_GAP = 12;
const DROP_H   = 16;

function subtreeWidth(node: PositionTreeNode): number {
  const children = node.children ?? [];
  if (children.length === 0) return CARD_W;
  const total = children.reduce((acc, c) => acc + subtreeWidth(c), 0)
    + CARD_GAP * (children.length - 1);
  return Math.max(CARD_W, total);
}

export default function PositionTree({
  positions, level = 0, onPositionUpdated, departmentMap,
}: PositionTreeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-center the scroll position when the tree first renders
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Small delay lets the browser finish layout before we measure
    const timer = setTimeout(() => {
      const scrollWidth  = el.scrollWidth;
      const clientWidth  = el.clientWidth;
      if (scrollWidth > clientWidth) {
        el.scrollLeft = (scrollWidth - clientWidth) / 2;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [positions]);

  if (!positions.length) return null;

  const childWidths = positions.map(subtreeWidth);
  const totalWidth  = childWidths.reduce((a, b) => a + b, 0)
    + CARD_GAP * (positions.length - 1);

  let cursor = 0;
  const cardCentres = childWidths.map(w => {
    const centre = cursor + w / 2;
    cursor += w + CARD_GAP;
    return centre;
  });

  const barLeft  = cardCentres[0];
  const barRight = cardCentres[cardCentres.length - 1];

  return (
    <div ref={scrollRef} className="overflow-x-auto pb-4">
      <div style={{ width: totalWidth, minWidth: totalWidth }} className="relative">
        {/* SVG connector lines at the top of this level */}
        {positions.length > 0 && (
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
        )}

        {/* Node row */}
        <div
          className="flex flex-row items-start flex-nowrap"
          style={{ gap: CARD_GAP, paddingTop: DROP_H }}
        >
          {positions.map((p) => (
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
  );
}
