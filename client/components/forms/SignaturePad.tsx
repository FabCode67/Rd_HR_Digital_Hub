"use client";

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Pen, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
}

interface SignaturePadProps {
  value?: string;           // existing base64 PNG (e.g. when form already completed)
  onChange?: (dataURL: string) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  className?: string;
}

/**
 * A canvas-based hand-drawn signature pad.
 * Stores the result as a base64 PNG data URL.
 * Works on mouse and touch (mobile friendly).
 */
const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ value, onChange, disabled = false, label = "Signature", required = false, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing  = useRef(false);
    const lastPoint  = useRef<{ x: number; y: number } | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const [isDark, setIsDark] = useState(false);

    // Detect dark mode
    useEffect(() => {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const check = () => setIsDark(document.documentElement.classList.contains("dark"));
      check();
      const observer = new MutationObserver(check);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    }, []);

    // ── Canvas setup ──────────────────────────────────────────────────────────
    const initCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Retina / HiDPI scaling
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.fillStyle = isDark ? "#1e293b" : "#ffffff"; // slate-800 or white
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.strokeStyle = isDark ? "#e2e8f0" : "#0f172a"; // slate-200 or slate-900
      ctx.lineWidth   = 2.2;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
    }, [isDark]);

    useEffect(() => {
      initCanvas();
    }, [initCanvas]);

    // If a saved value is passed in (completed form) draw it onto the canvas
    useEffect(() => {
      if (value && value.startsWith("data:image")) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const img = new Image();
        img.onload = () => {
          const dpr  = window.devicePixelRatio || 1;
          const rect = canvas.getBoundingClientRect();
          ctx.clearRect(0, 0, rect.width, rect.height);
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = value;
        setIsEmpty(false);
      }
    }, [value]);

    // ── Pointer helpers ───────────────────────────────────────────────────────
    const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const canvas = canvasRef.current!;
      const rect   = canvas.getBoundingClientRect();
      if ("touches" in e) {
        const t = e.touches[0];
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      }
      return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      isDrawing.current = true;
      lastPoint.current = getPos(e);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current || disabled) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const current = getPos(e);
      const last    = lastPoint.current ?? current;

      ctx.beginPath();
      ctx.moveTo(last.x, last.y);

      // Quadratic curve for smoother strokes
      const midX = (last.x + current.x) / 2;
      const midY = (last.y + current.y) / 2;
      ctx.quadraticCurveTo(last.x, last.y, midX, midY);
      ctx.stroke();

      lastPoint.current = current;
      setIsEmpty(false);
    };

    const endDraw = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      lastPoint.current = null;

      // Fire onChange with the current canvas state
      const canvas = canvasRef.current;
      if (canvas && onChange) {
        onChange(canvas.toDataURL("image/png"));
      }
    };

    // ── Clear ─────────────────────────────────────────────────────────────────
    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = isDark ? "#1e293b" : "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      setIsEmpty(true);
      onChange?.("");
    }, [isDark, onChange]);

    // ── Imperative handle ─────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      clear,
      isEmpty: () => isEmpty,
      toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? "",
    }));

    return (
      <div className={cn("space-y-2", className)}>
        {/* Label */}
        <div className="flex items-center gap-2">
          <Pen className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </span>
          {!isEmpty && !disabled && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Signed
            </span>
          )}
        </div>

        {/* Canvas area */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border-2 transition-colors",
          disabled
            ? "border-slate-200 dark:border-slate-700 opacity-70"
            : isEmpty
              ? "border-dashed border-slate-300 dark:border-slate-600 hover:border-cyan-400 dark:hover:border-cyan-500"
              : "border-cyan-400 dark:border-cyan-500",
        )}>
          {/* Instruction overlay (only when empty and not disabled) */}
          {isEmpty && !disabled && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500">
              <Pen className="h-6 w-6" />
              <p className="text-xs font-medium">Draw your signature here</p>
              <p className="text-[10px]">Use mouse or finger on touch screens</p>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="block h-36 w-full touch-none cursor-crosshair"
            style={{ touchAction: "none" }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>

        {/* Toolbar */}
        {!disabled && (
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Sign above using your mouse or finger
            </p>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          </div>
        )}

        {/* Preview of completed signature (read-only) */}
        {disabled && value && value.startsWith("data:image") && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs text-emerald-700 dark:text-emerald-300">
              Signature captured and submitted
            </span>
          </div>
        )}
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";
export default SignaturePad;
