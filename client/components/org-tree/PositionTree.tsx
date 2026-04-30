"use client";

import PositionNode from "./PositionNode";
import { PositionTreeNode } from "@/lib/types";

interface PositionTreeProps {
  positions: PositionTreeNode[];
  level?: number;
}

export default function PositionTree({ positions, level = 0 }: PositionTreeProps) {
  return (
    <div className="overflow-x-auto pb-6">
      <div className="min-w-max flex justify-center">
        <div className="flex items-start justify-center gap-10 pt-8">
          {positions.map((p) => (
            <PositionNode key={p.id} node={p} level={level} />
          ))}
        </div>
      </div>
    </div>
  );
}
