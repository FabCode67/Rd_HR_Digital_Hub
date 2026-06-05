"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

// ─── Single Toast ─────────────────────────────────────────────────────────────

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 4 s
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(item.id), 300);
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [item.id, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    error:   <XCircle     className="h-4 w-4 text-red-500"     />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    info:    <Info         className="h-4 w-4 text-sky-500"    />,
  };

  const borders = {
    success: "border-emerald-200 dark:border-emerald-800",
    error:   "border-red-200    dark:border-red-800",
    warning: "border-amber-200  dark:border-amber-800",
    info:    "border-sky-200    dark:border-sky-800",
  };

  return (
    <div className={cn(
      "flex w-80 items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg transition-all duration-300 dark:bg-slate-900",
      borders[item.type],
      visible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
    )}>
      <div className="mt-0.5 shrink-0">{icons[item.type]}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
        {item.message && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.message}</p>
        )}
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(item.id), 300); }}
        className="shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Toast Container ──────────────────────────────────────────────────────────

export function ToastContainer({ toasts, onDismiss }: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ─── useToast hook ────────────────────────────────────────────────────────────

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = (type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return {
    toasts,
    dismiss,
    success: (title: string, message?: string) => push("success", title, message),
    error:   (title: string, message?: string) => push("error",   title, message),
    warning: (title: string, message?: string) => push("warning", title, message),
    info:    (title: string, message?: string) => push("info",    title, message),
  };
}
