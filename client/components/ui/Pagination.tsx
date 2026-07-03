"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Shared pagination bar used by every data table in the app. Keeps rendered
 * row count bounded (the actual perf win for wide/rich tables — DOM node
 * count, not network latency, is the bottleneck once data is already in
 * memory) and gives a consistent Prev/Next + page-size UI everywhere.
 */
export function Pagination({
  page, pageSize, total, onPageChange, onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  itemLabel = "items",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = total === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const endIdx = Math.min(clampedPage * pageSize, total);

  if (total === 0) return null;

  const goto = (p: number) => onPageChange(Math.min(Math.max(1, p), totalPages));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-5 py-3">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Showing <strong className="text-slate-700 dark:text-slate-300">{startIdx}–{endIdx}</strong> of{" "}
          <strong className="text-slate-700 dark:text-slate-300">{total}</strong> {itemLabel}
        </span>
        <select
          value={pageSize}
          onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
          className="ml-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-cyan-400"
        >
          {pageSizeOptions.map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goto(1)}
          disabled={clampedPage <= 1}
          className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="First page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => goto(clampedPage - 1)}
          disabled={clampedPage <= 1}
          className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="px-2 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
          Page {clampedPage} of {totalPages}
        </span>
        <button
          onClick={() => goto(clampedPage + 1)}
          disabled={clampedPage >= totalPages}
          className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => goto(totalPages)}
          disabled={clampedPage >= totalPages}
          className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Last page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
