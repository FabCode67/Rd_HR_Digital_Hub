"use client";

import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from "react";
import { apiClient } from "@/lib/api";
import { Department, Employee, Position, PositionLevel } from "@/lib/types";
import {
  Loader2, Building2, Briefcase, Users,
  BadgeCheck, TrendingUp, AlertCircle,
  FileSpreadsheet, Presentation, Download,
  Settings2, X, CheckSquare, Square, ChevronDown, ChevronUp,
  CalendarRange, RotateCcw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
  PieChart, Pie, Cell, Sector,
} from "recharts";

// ─── helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;
const MAX_PAGES = 20; // safety limit — prevents infinite loop if API always returns full pages

async function fetchAllPages<T>(
  loader: (skip: number, limit: number) => Promise<T[]>
): Promise<T[]> {
  let skip = 0;
  let page = 0;
  const items: T[] = [];
  while (page < MAX_PAGES) {
    const batch = await loader(skip, PAGE_SIZE);
    items.push(...batch);
    if (batch.length < PAGE_SIZE) break;  // last page
    skip += PAGE_SIZE;
    page++;
  }
  return items;
}

function fmt(n: number) { return Math.round(n).toString(); }
function pct(n: number) { return `${Math.round(n)}%`; }
function calcAge(dob: string): number {
  const now = new Date();
  const d   = new Date(dob);
  return Math.floor((now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

// ─── palette ─────────────────────────────────────────────────────────────────

const COLORS = {
  sky:     "#0ea5e9",
  indigo:  "#6366f1",
  emerald: "#10b981",
  amber:   "#f59e0b",
  rose:    "#f43f5e",
  violet:  "#8b5cf6",
  teal:    "#14b8a6",
  slate:   "#64748b",
  cyan:    "#06b6d4",
  orange:  "#f97316",
};

const PIE_PALETTE = [
  COLORS.emerald, COLORS.rose, COLORS.amber, COLORS.sky,
  COLORS.violet, COLORS.teal, COLORS.indigo, COLORS.orange,
];

const LEVEL_COLORS: Record<string, string> = {
  Director:         COLORS.indigo,
  Head:             COLORS.sky,
  Manager:          COLORS.emerald,
  "Senior Manager": COLORS.teal,
  "Assistant Manager": COLORS.violet,
  Officer:          COLORS.amber,
  "Graduate Trainee": COLORS.orange,
  Intern:           COLORS.slate,
};

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  label, value, detail, sub, icon, accent,
}: {
  label: string; value: string; detail: string; sub?: string;
  icon: ReactNode; accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`h-1 w-full ${accent}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <div className={`rounded-xl p-2 ${accent.replace("bg-", "bg-").replace("500", "100")} dark:bg-slate-800`}>
            <span className={accent.replace("bg-", "text-")}>{icon}</span>
          </div>
        </div>
        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {value}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Chart wrapper ────────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      {label && <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color || entry.fill }}>
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Active pie shape ─────────────────────────────────────────────────────────

function ActivePieShape(props: any) {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value,
  } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill={fill} className="text-base font-bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize={12}>
        {value} · {(percent * 100).toFixed(0)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 16}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions,   setPositions]   = useState<Position[]>([]);
  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const [positionTree, setPositionTree] = useState<any[]>([]);
  const [empDeptMap, setEmpDeptMap]     = useState<Record<string,string>>({});
  const [leaveSummary, setLeaveSummary]           = useState<any>(null);
  const [performanceSummary, setPerformanceSummary] = useState<any>(null);
  const [exitSummary, setExitSummary]               = useState<any>(null);
  const [turnoverData, setTurnoverData]               = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(false); // leave/performance/turnover refetch
  const [error,       setError]       = useState<string | null>(null);
  const [exporting,   setExporting]   = useState<"excel"|"pptx"|null>(null);
  const [showExportBuilder, setShowExportBuilder] = useState(false);

  // ── Global date range filter ───────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState("");  // e.g. "2024-01-01"
  const [dateTo,   setDateTo]   = useState("");  // e.g. "2025-01-01"
  const isFiltered = !!(dateFrom || dateTo);

  const inRange = useCallback((dateStr: string | null | undefined): boolean => {
    if (!dateStr) return true; // no date = always include
    const d = dateStr.slice(0, 10);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo   && d > dateTo)   return false;
    return true;
  }, [dateFrom, dateTo]);

  // Date-filtered employees (by created_at / hire date)
  const filteredEmployees = useMemo(
    () => isFiltered ? employees.filter(e => inRange((e as any).created_at)) : employees,
    [employees, inRange, isFiltered]
  );

  // Positions are NEVER filtered by date — they represent current org structure.
  // Fill rate always shows current state of all positions.
  const filteredPositions = positions;

  // Filter exit records by exit_date within range
  const filteredExitSummary = useMemo(() => {
    if (!exitSummary || !isFiltered) return exitSummary;
    const exits = (exitSummary.exits ?? []).filter((e: any) => inRange(e.exit_date));
    const by_reason: Record<string,number> = {};
    const by_type:   Record<string,number> = {};
    const by_dept:   Record<string,number> = {};
    exits.forEach((e: any) => {
      if (e.exit_reason) by_reason[e.exit_reason] = (by_reason[e.exit_reason] ?? 0) + 1;
      if (e.exit_type)   by_type[e.exit_type]     = (by_type[e.exit_type]     ?? 0) + 1;
      if (e.department_name) by_dept[e.department_name] = (by_dept[e.department_name] ?? 0) + 1;
    });
    return { ...exitSummary, exits, total: exits.length, by_reason, by_type, by_department: by_dept };
  }, [exitSummary, isFiltered, inRange]);

  // Filter leave records within range
  const filteredLeaveSummary = useMemo(() => {
    if (!leaveSummary || !isFiltered) return leaveSummary;
    const employees = (leaveSummary.employees ?? []).map((e: any) => ({
      ...e,
      records: (e.records ?? []).filter((r: any) => inRange(r.start_date)),
    }));
    return { ...leaveSummary, employees };
  }, [leaveSummary, isFiltered, inRange]);

  // Filter performance reviews within range — recomputes rating distribution
  // and department variance client-side (mirrors the server's own math) so
  // the Performance Analytics charts track the exact date window, not just
  // whichever whole year the API happened to fetch.
  const filteredPerformanceSummary = useMemo(() => {
    if (!performanceSummary) return performanceSummary;
    if (!isFiltered) return performanceSummary;

    const employees = (performanceSummary.employees ?? []).map((e: any) => ({
      ...e,
      reviews: (e.reviews ?? []).filter((r: any) => inRange(r.reviewed_at || r.created_at)),
    }));

    const finalised = employees.flatMap((e: any) =>
      (e.reviews ?? []).filter((r: any) => !r.is_draft)
    );

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    finalised.forEach((r: any) => { dist[r.rating] = (dist[r.rating] ?? 0) + 1; });

    const byDeptMap = new Map<string, number[]>();
    employees.forEach((e: any) => {
      const dept = e.department || "Unknown";
      (e.reviews ?? []).filter((r: any) => !r.is_draft).forEach((r: any) => {
        if (!byDeptMap.has(dept)) byDeptMap.set(dept, []);
        byDeptMap.get(dept)!.push(r.rating);
      });
    });
    const by_department = [...byDeptMap.entries()]
      .filter(([, ratings]) => ratings.length > 0)
      .map(([department, ratings]) => {
        const n   = ratings.length;
        const avg = ratings.reduce((a, b) => a + b, 0) / n;
        const variance = n > 1 ? ratings.reduce((s, r) => s + (r - avg) ** 2, 0) / n : 0;
        return {
          department, count: n,
          avg_rating: Math.round(avg * 100) / 100,
          min_rating: Math.min(...ratings),
          max_rating: Math.max(...ratings),
          variance:   Math.round(variance * 1000) / 1000,
          std_dev:    Math.round(Math.sqrt(variance) * 1000) / 1000,
          spread:     Math.max(...ratings) - Math.min(...ratings),
        };
      })
      .sort((a, b) => b.avg_rating - a.avg_rating);

    const reviewed = employees.filter((e: any) => (e.reviews ?? []).length > 0).length;
    const avg_rating = finalised.length
      ? Math.round((finalised.reduce((s: number, r: any) => s + r.rating, 0) / finalised.length) * 100) / 100
      : null;

    return {
      ...performanceSummary,
      employees,
      reviewed,
      pending: employees.length - reviewed,
      average_rating: avg_rating,
      rating_distribution: dist,
      by_department,
    };
  }, [performanceSummary, isFiltered, inRange]);

  const dateRangeLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return "All time";
    if (dateFrom && dateTo)   return `${dateFrom} → ${dateTo}`;
    if (dateFrom)             return `From ${dateFrom}`;
    return `Up to ${dateTo}`;
  }, [dateFrom, dateTo]);

  // Backend leave/performance/turnover endpoints are scoped to a single
  // `year`, not an arbitrary from–to range. Derive the most relevant year
  // from the active filter so those network calls (and therefore the charts
  // fed by them) actually track what the user picked, instead of always
  // requesting the current year.
  const filterYear = useMemo(() => {
    if (dateTo)   return new Date(dateTo).getFullYear();
    if (dateFrom) return new Date(dateFrom).getFullYear();
    return new Date().getFullYear();
  }, [dateFrom, dateTo]);

  // ── Export section config ──────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0,10);
  const yearStart = `${new Date().getFullYear()}-01-01`;

  type SectionKey = "overview"|"employees"|"gender"|"departments"|"positions"|"leave"|"performance"|"exits"|"turnover";
  type SectionCfg = { enabled: boolean; from: string; to: string };

  const [sections, setSections] = useState<Record<SectionKey, SectionCfg>>({
    overview:    { enabled: true, from: yearStart, to: today },
    employees:   { enabled: true, from: yearStart, to: today },
    gender:      { enabled: true, from: yearStart, to: today },
    departments: { enabled: true, from: yearStart, to: today },
    positions:   { enabled: true, from: yearStart, to: today },
    leave:       { enabled: true, from: yearStart, to: today },
    performance: { enabled: true, from: yearStart, to: today },
    exits:       { enabled: true, from: yearStart, to: today },
    turnover:    { enabled: true, from: yearStart, to: today },
  });

  const SECTION_META: Record<SectionKey, { label: string; desc: string; icon: string; color: string }> = {
    overview:    { label: "Executive Summary",   desc: "KPIs, headcount, fill rate, vacancies",           icon: "📊", color: "text-sky-600"     },
    employees:   { label: "Employee Report",     desc: "Full staff directory with status & contracts",    icon: "👥", color: "text-emerald-600" },
    gender:      { label: "Gender Report",       desc: "Male/female split, contract type by gender",      icon: "⚧️", color: "text-pink-600"    },
    departments: { label: "Departments",         desc: "Org structure and department hierarchy",          icon: "🏢", color: "text-indigo-600"  },
    positions:   { label: "Positions",           desc: "All positions with fill rates by department",     icon: "💼", color: "text-violet-600"  },
    leave:       { label: "Leave Report",        desc: "Annual leave, sick, maternity — by employee",    icon: "🏖️", color: "text-cyan-600"    },
    performance: { label: "Performance Report",  desc: "Mid-year & end-year ratings, KPI goals",         icon: "⭐", color: "text-amber-600"   },
    exits:       { label: "Exit Report",         desc: "Departures by reason, type and department",      icon: "🚪", color: "text-rose-600"    },
    turnover:    { label: "Turnover & Retention",  desc: "Turnover rate, retention gauge, monthly trend",  icon: "🔄", color: "text-indigo-600"  },
  };

  const toggleSection = (key: SectionKey) =>
    setSections(s => ({ ...s, [key]: { ...s[key], enabled: !s[key].enabled } }));
  const updateSection = (key: SectionKey, field: "from"|"to", val: string) =>
    setSections(s => ({ ...s, [key]: { ...s[key], [field]: val } }));
  const enabledCount = Object.values(sections).filter(s => s.enabled).length;

  // Pie active slice state
  const [vacancyActive,   setVacancyActive]   = useState(0);
  const [statusActive,    setStatusActive]    = useState(0);
  const [deptActive,      setDeptActive]      = useState(0);

  // Core org data — loaded once. Employees/positions are filtered client-side
  // (see filteredEmployees above), so this never needs to refetch on date change.
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const [depts, pos, emps, tree, deptMap] = await Promise.all([
          fetchAllPages((s, l) => apiClient.department.getAll(s, l)),
          fetchAllPages((s, l) => apiClient.position.getAll(undefined, s, l)),
          fetchAllPages((s, l) => apiClient.employee.getAll(s, l)),
          apiClient.position.getOrganizationTree().catch(() => []),
          apiClient.position.getEmployeeDeptMap().catch(() => ({})),
        ]);
        if (!mounted) return;
        setDepartments(depts); setPositions(pos); setEmployees(emps);
        setPositionTree(tree); setEmpDeptMap(deptMap);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  // Leave / performance / turnover are year-scoped on the backend, so this
  // effect re-runs whenever the date filter's target year changes — this is
  // what makes the /leave/summary, /performance/summary and /exits/turnover
  // requests actually follow the picker instead of always hitting the
  // current year. `exits.list()` is unscoped and already filtered precisely
  // client-side via filteredExitSummary, so it's refetched here too just to
  // keep everything in this group refreshing together.
  useEffect(() => {
    let mounted = true;
    setSecondaryLoading(true);
    Promise.allSettled([
      apiClient.leave.getSummary(filterYear),
      apiClient.performance.getSummary(filterYear),
      apiClient.exits.list(),
      apiClient.exits.getTurnover(filterYear),
    ]).then(([leaveResult, perfResult, exitResult, turnoverResult]) => {
      if (!mounted) return;
      if (leaveResult.status    === "fulfilled") setLeaveSummary(leaveResult.value);
      if (perfResult.status     === "fulfilled") setPerformanceSummary(perfResult.value);
      if (exitResult.status     === "fulfilled") setExitSummary(exitResult.value);
      if (turnoverResult.status === "fulfilled") setTurnoverData(turnoverResult.value);
    }).finally(() => { if (mounted) setSecondaryLoading(false); });
    return () => { mounted = false; };
  }, [filterYear]);

  // ── Derived KPI metrics ────────────────────────────────────────────────────
  const headcountMetrics = useMemo(() => {
    const total  = filteredEmployees.length;
    const male   = filteredEmployees.filter((e: any) => e.gender === "male").length;
    const female = filteredEmployees.filter((e: any) => e.gender === "female").length;
    const none   = total - male - female;
    const malePct   = total > 0 ? Math.round((male   / total) * 100) : 0;
    const femalePct = total > 0 ? Math.round((female / total) * 100) : 0;
    return { total, male, female, none, malePct, femalePct };
  }, [filteredEmployees]);

  const avgAgeMetrics = useMemo(() => {
    const now = new Date();
    const ages = filteredEmployees
      .filter((e: any) => e.date_of_birth)
      .map((e: any) => {
        const dob = new Date(e.date_of_birth);
        return Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      })
      .filter(age => age > 15 && age < 80);
    const avg = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
    const min = ages.length > 0 ? Math.min(...ages) : 0;
    const max = ages.length > 0 ? Math.max(...ages) : 0;
    return { avg, min, max, count: ages.length };
  }, [filteredEmployees]);

  const bandMetrics = useMemo(() => {
    const LOWER  = ["B1","B2","B3","B4"];
    const MID    = ["B5","B6","B7"];
    const UPPER  = ["B8","B9","B10"];
    const SPEC   = ["DSA","GT","Intern"];
    const withBand = filteredPositions.filter(p => p.band);
    const total    = withBand.length || 1;
    const lower  = withBand.filter(p => LOWER.includes(p.band ?? "")).length;
    const mid    = withBand.filter(p => MID.includes(p.band ?? "")).length;
    const upper  = withBand.filter(p => UPPER.includes(p.band ?? "")).length;
    const spec   = withBand.filter(p => SPEC.includes(p.band ?? "")).length;
    const lowerPct = Math.round((lower / total) * 100);
    return { lower, mid, upper, spec, total: withBand.length, lowerPct };
  }, [filteredPositions]);

  const attritionMetrics = useMemo(() => {
    if (!turnoverData) return null;
    return {
      rate:      turnoverData.turnover_rate,
      retention: turnoverData.retention_rate,
      exits:     turnoverData.exits_this_year,
      voluntary: turnoverData.voluntary_exits,
      yoy:       turnoverData.yoy_change,
    };
  }, [turnoverData]);

  // leaveUtilMetrics declared after filteredLeaveEmps below

  const a = useMemo(() => {
    const filled   = filteredPositions.filter(p => !p.is_vacant).length;
    const vacant   = filteredPositions.filter(p =>  p.is_vacant).length;
    const active   = filteredEmployees.filter(e => e.status === "ACTIVE").length;
    const inactive = filteredEmployees.filter(e => e.status === "INACTIVE").length;
    const suspended= filteredEmployees.filter(e => e.status === "SUSPENDED").length;
    const terminated=filteredEmployees.filter(e => e.status === "TERMINATED").length;
    const fillRate = filteredPositions.length > 0 ? (filled / filteredPositions.length) * 100 : 0;

    // Positions by department (bar chart)
    const deptPositionMap = new Map<string, { filled: number; vacant: number }>();
    filteredPositions.forEach(p => {
      const dept = departments.find(d => d.id === p.department_id)?.name ?? "Unknown";
      const cur = deptPositionMap.get(dept) ?? { filled: 0, vacant: 0 };
      p.is_vacant ? cur.vacant++ : cur.filled++;
      deptPositionMap.set(dept, cur);
    });
    const deptBar = [...deptPositionMap.entries()]
      .map(([name, { filled, vacant }]) => ({ name, Filled: filled, Vacant: vacant }))
      .sort((a, b) => (b.Filled + b.Vacant) - (a.Filled + a.Vacant))
      .slice(0, 8);

    // Position level bar chart
    const LEVELS: PositionLevel[] = [
      "Managing Director","Executive Director","Director",
      "Head of Department","Senior Manager","Manager",
      "Assistant Manager","Team Leader","Senior Officer",
      "Officer","Graduate Trainee","Intern",
    ];
    const levelBar = LEVELS
      .map(level => ({
        name: level.length > 12 ? level.replace(" Manager","Mgr").replace("Graduate Trainee","Grad") : level,
        fullName: level,
        count: filteredPositions.filter(p => p.level === level).length,
        fill: LEVEL_COLORS[level],
      }))
      .filter(l => l.count > 0);

    // Vacancy pie
    const vacancyPie = [
      { name: "Filled",  value: filled, fill: COLORS.emerald },
      { name: "Vacant",  value: vacant, fill: COLORS.rose },
    ].filter(d => d.value > 0);

    // Employee status pie
    const statusPie = [
      { name: "Active",     value: active,     fill: COLORS.emerald },
      { name: "Exited",     value: inactive,   fill: COLORS.amber },
      { name: "Suspended",  value: suspended,  fill: COLORS.orange },
      { name: "Terminated", value: terminated, fill: COLORS.rose },
    ].filter(d => d.value > 0);

    // Department size pie (top 6)
    const deptSizePie = [...deptPositionMap.entries()]
      .map(([name, { filled, vacant }], i) => ({
        name, value: filled + vacant, fill: PIE_PALETTE[i % PIE_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);

    // Monthly additions — filtered by date range
    const now = new Date();
    const srcPos = isFiltered ? filteredPositions : positions;
    const srcEmp = isFiltered ? filteredEmployees : employees;
    const earliestPos  = srcPos.reduce((min, p) => (p as any).created_at && (p as any).created_at < min ? (p as any).created_at : min, now.toISOString());
    const earliestEmp  = srcEmp.reduce((min, e) => (e as any).created_at && (e as any).created_at < min ? (e as any).created_at : min, now.toISOString());
    const earliest     = earliestPos < earliestEmp ? earliestPos : earliestEmp;
    const startDate    = earliest ? new Date(earliest) : new Date();
    startDate.setDate(1);

    const now2 = new Date();
    const allMonths: { key: string; label: string }[] = [];
    const cur2 = new Date(startDate);
    while (cur2 <= now2) {
      allMonths.push({
        key:   `${cur2.getFullYear()}-${String(cur2.getMonth() + 1).padStart(2, "0")}`,
        label: cur2.toLocaleString("default", { month: "short", year: "2-digit" }),
      });
      cur2.setMonth(cur2.getMonth() + 1);
    }
    const monthRange = allMonths.length > 0 ? allMonths : Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return {
        key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      };
    });

    const posLine = monthRange.map(({ key, label }) => ({
      month:     label,
      Positions: srcPos.filter(p => (p as any).created_at?.startsWith(key)).length,
      Employees: srcEmp.filter(e => (e as any).created_at?.startsWith(key)).length,
    }));

    return {
      filled, vacant, active, inactive, suspended, terminated,
      fillRate, deptBar, levelBar, vacancyPie, statusPie,
      deptSizePie, posLine,
    };
  }, [departments, filteredPositions, filteredEmployees, positions, employees, isFiltered]);

  const performanceMetrics = useMemo(() => {
    // Shadow with the date-filtered version so the rest of this function
    // (unchanged below) automatically tracks the global date filter.
    const performanceSummary = filteredPerformanceSummary;
    if (!performanceSummary) return null;
    const byDept: any[] = performanceSummary.by_department ?? [];
    const dist: Record<number,number> = performanceSummary.rating_distribution ?? {};
    const allRatings = Object.entries(dist).flatMap(([r, c]) => Array(c).fill(Number(r)));
    const totalReviewed = allRatings.length;

    const RATING_META: Record<number,{label:string;color:string;bg:string}> = {
      5: { label: "Outstanding",           color: COLORS.emerald, bg: "bg-emerald-500" },
      4: { label: "Exceeded Expectations", color: COLORS.cyan,    bg: "bg-cyan-500"    },
      3: { label: "Succeeded",             color: COLORS.sky,     bg: "bg-sky-500"     },
      2: { label: "Meets Some",            color: COLORS.amber,   bg: "bg-amber-500"   },
      1: { label: "Unsatisfactory",        color: COLORS.rose,    bg: "bg-rose-500"    },
    };

    // Rating distribution for bar chart
    const ratingDist = [5,4,3,2,1].map(r => ({
      rating: r,
      label:  RATING_META[r].label,
      count:  dist[r] ?? 0,
      color:  RATING_META[r].color,
      bg:     RATING_META[r].bg,
    }));

    // Dept avg rating chart data
    const deptAvgBar = byDept.map((d: any, i: number) => ({
      name:       d.department.length > 20 ? d.department.slice(0,19)+"…" : d.department,
      fullName:   d.department,
      avg:        d.avg_rating,
      count:      d.count,
      min:        d.min_rating,
      max:        d.max_rating,
      spread:     d.spread,
      std_dev:    d.std_dev,
      fill:       PIE_PALETTE[i % PIE_PALETTE.length],
    }));

    // Variance bar chart — higher std_dev = more variance
    const varianceBar = [...deptAvgBar]
      .sort((a, b) => b.std_dev - a.std_dev);

    // Best and worst dept
    const best  = byDept[0];
    const worst = byDept[byDept.length - 1];
    const gap   = byDept.length > 1 ? (best?.avg_rating - worst?.avg_rating).toFixed(2) : null;

    // Cycle split (mid_year vs end_year)
    const midYearRatings: number[] = [];
    const endYearRatings: number[] = [];
    (performanceSummary.employees ?? []).forEach((e: any) => {
      (e.reviews ?? []).filter((r: any) => !r.is_draft).forEach((r: any) => {
        if (r.cycle === "mid_year") midYearRatings.push(r.rating);
        else endYearRatings.push(r.rating);
      });
    });
    const midAvg = midYearRatings.length ? (midYearRatings.reduce((a,b)=>a+b,0)/midYearRatings.length).toFixed(2) : null;
    const endAvg = endYearRatings.length ? (endYearRatings.reduce((a,b)=>a+b,0)/endYearRatings.length).toFixed(2) : null;

    return {
      totalReviewed, byDept, deptAvgBar, varianceBar, ratingDist,
      RATING_META, best, worst, gap, midAvg, endAvg,
      midYearCount: midYearRatings.length, endYearCount: endYearRatings.length,
      avgRating: performanceSummary.average_rating,
      reviewed:  performanceSummary.reviewed,
      pending:   performanceSummary.pending,
    };
  }, [filteredPerformanceSummary]);

  const [leaveDeptFilter, setLeaveDeptFilter] = useState<string>(""); // dept id or ""

  // Build a flat dept tree with indent levels for the dropdown
  const deptTree = useMemo(() => {
    const result: { id: string; name: string; level: number; fullName: string }[] = [];
    const addChildren = (parentId: string | null, level: number) => {
      departments
        .filter(d => (parentId === null ? !d.parent_id : d.parent_id === parentId))
        .forEach(d => {
          result.push({ id: d.id, name: d.name, level, fullName: d.name });
          addChildren(d.id, level + 1);
        });
    };
    addChildren(null, 0);
    return result;
  }, [departments]);

  // Get all descendant dept IDs for a given dept (inclusive)
  const getDeptSubtree = useCallback((deptId: string): Set<string> => {
    const ids = new Set<string>();
    const add = (id: string) => {
      ids.add(id);
      departments.filter(d => d.parent_id === id).forEach(d => add(d.id));
    };
    add(deptId);
    return ids;
  }, [departments]);

  // email -> department_id: comes directly from backend (EmployeePosition join)
  const emailToDeptId = useMemo(() => new Map(Object.entries(empDeptMap)), [empDeptMap]);

  // Filtered leave employees (dept filter applied on top of date filter)
  const filteredLeaveEmps = useMemo(() => {
    if (!filteredLeaveSummary?.employees) return [];
    if (!leaveDeptFilter) return filteredLeaveSummary.employees;
    const subtree = getDeptSubtree(leaveDeptFilter);
    return filteredLeaveSummary.employees.filter((e: any) => {
      const deptId = emailToDeptId.get(e.email);
      return deptId && subtree.has(deptId);
    });
  }, [filteredLeaveSummary, leaveDeptFilter, getDeptSubtree, emailToDeptId]);

  // leaveUtilMetrics uses filteredLeaveEmps so must come after it
  const leaveUtilMetrics = useMemo(() => {
    if (!filteredLeaveSummary) return null;
    const emps: any[] = leaveDeptFilter
      ? filteredLeaveEmps
      : (filteredLeaveSummary.employees ?? []);
    const totalEntitlement = emps.reduce((s: number, e: any) => s + (e.annual_entitlement ?? 0), 0);
    const annualUsed = emps.reduce((s: number, e: any) => {
      const approved = (e.records ?? []).filter((r: any) => r.status === "approved" && r.leave_type === "annual");
      return s + approved.reduce((ss: number, r: any) => ss + (r.days_taken ?? 0), 0);
    }, 0);
    const rate = totalEntitlement > 0 ? Math.round((annualUsed / totalEntitlement) * 100) : 0;
    const onLeave = filteredLeaveSummary.on_leave_now ?? 0;
    return { rate, annualUsed, totalEntitlement, onLeave };
  }, [filteredLeaveSummary, filteredLeaveEmps, leaveDeptFilter]);

  // Recompute leaveMetrics from filteredLeaveEmps
  const leaveMetrics = useMemo(() => {
    if (!filteredLeaveSummary?.employees?.length) return null;
    const emps: any[] = leaveDeptFilter
      ? filteredLeaveEmps
      : filteredLeaveSummary.employees;

    // Totals per leave type
    const totals = { annual: 0, sick: 0, maternity: 0, paternity: 0, compassionate: 0 };
    let totalDays = 0;
    let totalEntitlement = 0;
    let fullyUsed = 0;
    let notUsed = 0;

    emps.forEach((e: any) => {
      totalEntitlement += e.annual_entitlement ?? 0;
      (e.allocations ?? []).forEach((a: any) => {
        const used = a.used_days ?? 0;
        totalDays += used;
        const lt = a.leave_type as keyof typeof totals;
        if (lt in totals) totals[lt] += used;
      });
      const annualAlloc = e.allocations?.find((a: any) => a.leave_type === "annual");
      const used = annualAlloc?.used_days ?? 0;
      if (used >= (e.annual_entitlement ?? 21)) fullyUsed++;
      if (used === 0) notUsed++;
    });

    // Utilisation rate (annual leave used vs entitled)
    const utilisationRate = totalEntitlement > 0
      ? Math.round((totals.annual / totalEntitlement) * 100) : 0;

    // Leave type breakdown for pie/bar
    const byType = [
      { name: "Annual",        days: totals.annual,        fill: COLORS.cyan,    short: "AN" },
      { name: "Sick",          days: totals.sick,          fill: COLORS.amber,   short: "SK" },
      { name: "Maternity",     days: totals.maternity,     fill: COLORS.violet,  short: "MT" },
      { name: "Paternity",     days: totals.paternity,     fill: COLORS.sky,     short: "PT" },
      { name: "Compassionate", days: totals.compassionate, fill: COLORS.teal,    short: "CM" },
    ].filter(d => d.days > 0);

    // Per-employee utilisation (annual leave only, top 10 by used days)
    const perEmployee = emps
      .map((e: any) => {
        const alloc = e.allocations?.find((a: any) => a.leave_type === "annual");
        return {
          name:        e.employee_name?.split(" ")[0] ?? "?",
          fullName:    e.employee_name ?? "",
          used:        alloc?.used_days ?? 0,
          entitlement: e.annual_entitlement ?? 21,
          remaining:   alloc?.remaining ?? e.annual_entitlement ?? 21,
          contract:    e.employment_type ?? "",
        };
      })
      .sort((a, b) => b.used - a.used)
      .slice(0, 10);

    // Avg days used per employee
    const avgUsed = emps.length > 0 ? Math.round(totals.annual / emps.length) : 0;

    return {
      totalDays, totals, utilisationRate, byType,
      perEmployee, avgUsed, fullyUsed, notUsed,
      totalEmployees: emps.length, totalEntitlement,
    };
  }, [filteredLeaveSummary, filteredLeaveEmps, leaveDeptFilter]);

  const exitMetrics = useMemo(() => {
    if (!filteredExitSummary) return null;
    const exits: any[] = filteredExitSummary.exits ?? [];
    const byDept = Object.entries(filteredExitSummary.by_department ?? {})
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0,17)+"…" : name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const byReason = [
      { name: "Resignation",     value: filteredExitSummary.by_reason?.resignation     ?? 0, fill: COLORS.amber  },
      { name: "Termination",     value: filteredExitSummary.by_reason?.termination     ?? 0, fill: COLORS.rose   },
      { name: "End of Contract", value: filteredExitSummary.by_reason?.end_of_contract ?? 0, fill: COLORS.slate  },
    ].filter(d => d.value > 0);
    const regrettable    = filteredExitSummary.by_type?.regrettable     ?? 0;
    const nonRegrettable = filteredExitSummary.by_type?.non_regrettable ?? 0;
    return { exits, byDept, byReason, regrettable, nonRegrettable, total: filteredExitSummary.total ?? 0 };
  }, [filteredExitSummary]);

  // Turnover & Retention, recomputed from the *exactly* date-filtered exit
  // list (filteredExitSummary, which is unscoped by year and already filters
  // precisely by exit_date) rather than the year-locked /exits/turnover
  // endpoint. Rates still borrow the headcount baseline from that endpoint
  // since the app doesn't track historical headcount snapshots per date —
  // that would need a schema change to compute exactly for an arbitrary range.
  const filteredTurnoverData = useMemo(() => {
    if (!turnoverData) return null;
    if (!isFiltered)   return turnoverData;

    const exits: any[] = filteredExitSummary?.exits ?? [];
    const voluntary_exits   = exits.filter((e: any) => e.exit_reason === "resignation").length;
    const involuntary_exits = exits.length - voluntary_exits;

    const byMonth = new Map<string, { month_label: string; resignations: number; terminations: number; end_of_contract: number; exits: number; regrettable: number }>();
    exits.forEach((e: any) => {
      if (!e.exit_date) return;
      const d = new Date(e.exit_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = byMonth.get(key) ?? {
        month_label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
        resignations: 0, terminations: 0, end_of_contract: 0, exits: 0, regrettable: 0,
      };
      cur.exits++;
      if (e.exit_reason === "resignation")     cur.resignations++;
      if (e.exit_reason === "termination")     cur.terminations++;
      if (e.exit_reason === "end_of_contract") cur.end_of_contract++;
      if (e.exit_type   === "regrettable")     cur.regrettable++;
      byMonth.set(key, cur);
    });
    const monthly = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, m]) => m);

    const deptMap = new Map<string, number>();
    exits.forEach((e: any) => {
      const d = e.department_name || "Unknown";
      deptMap.set(d, (deptMap.get(d) ?? 0) + 1);
    });
    const by_department = [...deptMap.entries()]
      .map(([department, n]) => {
        const deptObj = departments.find(dep => dep.name === department);
        const positionsInDept = deptObj ? positions.filter(p => p.department_id === deptObj.id).length : 1;
        return {
          department, exits: n,
          positions: Math.max(positionsInDept, 1),
          rate: Math.round((n / Math.max(positionsInDept, 1)) * 1000) / 10,
        };
      })
      .sort((a, b) => b.exits - a.exits);

    const avg_headcount  = turnoverData.avg_headcount || Math.max(filteredEmployees.length, 1);
    const turnover_rate  = Math.round((exits.length / avg_headcount) * 1000) / 10;
    const retention_rate = Math.round((100 - turnover_rate) * 10) / 10;
    const voluntary_rate = Math.round((voluntary_exits / avg_headcount) * 1000) / 10;

    return {
      ...turnoverData,
      exits_this_year: exits.length,
      voluntary_exits, involuntary_exits, voluntary_rate,
      turnover_rate, retention_rate,
      monthly, by_department,
    };
  }, [turnoverData, filteredExitSummary, isFiltered, departments, positions, filteredEmployees.length]);

  // ── export ───────────────────────────────────────────────────────
  const exportData = useMemo(() => ({
    departments, positions, employees, leaveSummary, performanceSummary, turnoverData, exitSummary, metrics: a,
  }), [departments, positions, employees, leaveSummary, performanceSummary, turnoverData, exitSummary, a]);

  const handleExcel = useCallback(async () => {
    setExporting("excel"); setShowExportBuilder(false);
    try {
      const { exportExcel } = await import("@/lib/analyticsExport");
      await exportExcel(exportData, sections);
    } catch (e) { console.error("Excel export failed:", e); }
    finally { setExporting(null); }
  }, [exportData, sections]);

  const handlePptx = useCallback(async () => {
    setExporting("pptx"); setShowExportBuilder(false);
    try {
      const { exportPowerPoint } = await import("@/lib/analyticsExport");
      await exportPowerPoint(exportData, sections);
    } catch (e) { console.error("PPTX export failed:", e); }
    finally { setExporting(null); }
  }, [exportData, sections]);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6 min-w-0">

      {/* Hero header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Analytics Dashboard</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Organization Overview</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              Live metrics from departments, positions, and employees — updated on every page load.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{departments.length} Departments</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{filteredPositions.length}{isFiltered ? ` of ${positions.length}` : ""} Positions</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{filteredEmployees.length}{isFiltered ? ` of ${employees.length}` : ""} Employees</span>
              {isFiltered && (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-cyan-300 font-medium">
                  📅 {dateRangeLabel}
                </span>
              )}
            </div>
          </div>
          {/* Export builder trigger */}
          {!loading && !error && (
            <div className="shrink-0">
              <button
                onClick={() => setShowExportBuilder(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              >
                <Settings2 className="h-4 w-4" />
                Build & Export Report
                {enabledCount > 0 && (
                  <span className="ml-1 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-900">
                    {enabledCount}
                  </span>
                )}
              </button>
              {exporting && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating {exporting === "excel" ? "Excel" : "PowerPoint"}…
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-slate-400" />
          <span className="text-sm text-slate-500">Loading analytics…</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      ) : (
        <>
          {/* ── Global Date Range Filter Bar ── */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3.5 shadow-sm">
            <div className="flex items-center gap-2 shrink-0">
              <CalendarRange className="h-4 w-4 text-cyan-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filter Period</span>
              {secondaryLoading && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> Refreshing leave / performance / turnover…
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-8">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="bg-transparent text-sm text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              </div>
              <span className="text-slate-400 font-bold">→</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-6">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="bg-transparent text-sm text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              </div>

              {/* Quick presets */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "This Year",  from: `${new Date().getFullYear()}-01-01`, to: new Date().toISOString().slice(0,10) },
                  { label: "Last Year",  from: `${new Date().getFullYear()-1}-01-01`, to: `${new Date().getFullYear()-1}-12-31` },
                  { label: "Last 6 mo",  from: new Date(Date.now() - 180*86400000).toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) },
                  { label: "Last 3 mo",  from: new Date(Date.now() -  90*86400000).toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      dateFrom === p.from && dateTo === p.to
                        ? "bg-cyan-500 text-white"
                        : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-cyan-300 hover:text-cyan-600 dark:hover:text-cyan-400"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active filter badge + reset */}
            {isFiltered ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  {filteredEmployees.length} employees · {filteredPositions.length} positions
                </span>
                <button
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-400 shrink-0">Showing all-time data</span>
            )}
          </div>

          {/* ── 6 KPI Cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {/* 1. Staff Headcount + Gender */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="h-1 w-full bg-cyan-500" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Staff Headcount</p>
                  <div className="rounded-xl bg-cyan-100 dark:bg-slate-800 p-2"><Users className="h-4 w-4 text-cyan-600" /></div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">{headcountMetrics.total}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{a.active} active · {filteredEmployees.length - a.active} exited/inactive</p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>♂ Male {headcountMetrics.malePct}%</span>
                    <span>♀ Female {headcountMetrics.femalePct}%</span>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${headcountMetrics.malePct}%` }} />
                    <div className="h-full bg-pink-500 transition-all" style={{ width: `${headcountMetrics.femalePct}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{headcountMetrics.male} male</span>
                    <span className="text-slate-400">{headcountMetrics.none > 0 ? `${headcountMetrics.none} unspecified` : ""}</span>
                    <span className="font-semibold text-pink-600 dark:text-pink-400">{headcountMetrics.female} female</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Average Age */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="h-1 w-full bg-violet-500" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Average Age</p>
                  <div className="rounded-xl bg-violet-100 dark:bg-slate-800 p-2"><BadgeCheck className="h-4 w-4 text-violet-600" /></div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {avgAgeMetrics.avg > 0 ? `${avgAgeMetrics.avg} yrs` : "—"}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {avgAgeMetrics.count > 0 ? `Range: ${avgAgeMetrics.min}–${avgAgeMetrics.max} yrs` : "Add date of birth to employees"}
                </p>
                {avgAgeMetrics.count > 0 && (
                  <div className="mt-3 flex gap-2">
                    {[
                      { label: "<30",   count: filteredEmployees.filter((e: any) => e.date_of_birth && calcAge(e.date_of_birth) < 30).length,  color: "bg-cyan-500"   },
                      { label: "30–40", count: filteredEmployees.filter((e: any) => e.date_of_birth && calcAge(e.date_of_birth) >= 30 && calcAge(e.date_of_birth) < 40).length, color: "bg-violet-500" },
                      { label: "40–50", count: filteredEmployees.filter((e: any) => e.date_of_birth && calcAge(e.date_of_birth) >= 40 && calcAge(e.date_of_birth) < 50).length, color: "bg-amber-500"  },
                      { label: "50+",   count: filteredEmployees.filter((e: any) => e.date_of_birth && calcAge(e.date_of_birth) >= 50).length,  color: "bg-rose-500"   },
                    ].map(g => (
                      <div key={g.label} className="flex-1 text-center">
                        <div className={`mx-auto h-1.5 w-full rounded-full ${g.color} mb-1`} />
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{g.count}</p>
                        <p className="text-[9px] text-slate-400">{g.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Band Distribution */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="h-1 w-full bg-amber-500" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Band Distribution</p>
                  <div className="rounded-xl bg-amber-100 dark:bg-slate-800 p-2"><Briefcase className="h-4 w-4 text-amber-600" /></div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">{bandMetrics.total}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Positions with band assigned</p>
                <div className="mt-3 space-y-1.5">
                  {[
                    { label: "B1–B4",    value: bandMetrics.lower, color: "bg-emerald-500" },
                    { label: "B5–B7",    value: bandMetrics.mid,   color: "bg-amber-500"  },
                    { label: "B8–B10",   value: bandMetrics.upper, color: "bg-violet-500" },
                    { label: "DSA/GT/Int",value: bandMetrics.spec,  color: "bg-slate-400"  },
                  ].map(b => {
                    const pctVal = bandMetrics.total > 0 ? Math.round((b.value / bandMetrics.total) * 100) : 0;
                    return (
                      <div key={b.label} className="flex items-center gap-2">
                        <span className="w-16 text-[10px] text-slate-500 dark:text-slate-400 shrink-0">{b.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded-full ${b.color}`} style={{ width: `${pctVal}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{pctVal}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. Attrition Rate */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className={`h-1 w-full ${
                !attritionMetrics ? "bg-slate-300" :
                attritionMetrics.rate > 15 ? "bg-rose-500" :
                attritionMetrics.rate > 8  ? "bg-amber-500" : "bg-emerald-500"
              }`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Attrition Rate</p>
                  <div className="rounded-xl bg-rose-100 dark:bg-slate-800 p-2"><TrendingUp className="h-4 w-4 text-rose-600" /></div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {attritionMetrics ? `${attritionMetrics.rate}%` : "—"}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {attritionMetrics ? `${attritionMetrics.exits} exits · ${attritionMetrics.retention}% retained` : "Loading…"}
                </p>
                {attritionMetrics && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">Voluntary exits</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{attritionMetrics.voluntary}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">YoY change</span>
                      <span className={`font-semibold ${
                        attritionMetrics.yoy <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}>{attritionMetrics.yoy > 0 ? "+" : ""}{attritionMetrics.yoy}%</span>
                    </div>
                    <div className="mt-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-center" style={{
                      background: attritionMetrics.rate > 15 ? "#fff1f2" : attritionMetrics.rate > 8 ? "#fffbeb" : "#f0fdf4",
                      color:      attritionMetrics.rate > 15 ? "#e11d48" : attritionMetrics.rate > 8 ? "#d97706" : "#16a34a",
                    }}>
                      {attritionMetrics.rate <= 8 ? "✅ Healthy" : attritionMetrics.rate <= 15 ? "⚠️ Moderate" : "🔴 High — review urgently"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Fill Rate */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className={`h-1 w-full ${
                a.fillRate >= 85 ? "bg-emerald-500" : a.fillRate >= 70 ? "bg-amber-500" : "bg-rose-500"
              }`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Fill Rate</p>
                  <div className="rounded-xl bg-emerald-100 dark:bg-slate-800 p-2"><AlertCircle className="h-4 w-4 text-emerald-600" /></div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">{pct(a.fillRate)}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{a.filled} of {positions.length} positions filled</p>
                <p className="mt-0.5 text-[10px] text-slate-400 italic">Current org structure — not affected by the date filter</p>
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-full rounded-full transition-all ${
                      a.fillRate >= 85 ? "bg-emerald-500" : a.fillRate >= 70 ? "bg-amber-500" : "bg-rose-500"
                    }`} style={{ width: `${Math.min(a.fillRate, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{a.filled} filled</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">{a.vacant} vacant</span>
                  </div>
                  <div className="rounded-lg px-2 py-1 text-[10px] font-semibold text-center" style={{
                    background: a.fillRate >= 85 ? "#f0fdf4" : a.fillRate >= 70 ? "#fffbeb" : "#fff1f2",
                    color:      a.fillRate >= 85 ? "#16a34a" : a.fillRate >= 70 ? "#d97706" : "#e11d48",
                  }}>
                    {a.fillRate >= 85 ? "✅ Well staffed" : a.fillRate >= 70 ? "⚠️ Recruitment needed" : "🔴 Critical vacancies"}
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Leave Utilisation */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className={`h-1 w-full ${
                !leaveUtilMetrics ? "bg-slate-300" :
                leaveUtilMetrics.rate >= 80 ? "bg-rose-500" :
                leaveUtilMetrics.rate >= 50 ? "bg-amber-500" : "bg-cyan-500"
              }`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Leave Utilisation</p>
                  <div className="rounded-xl bg-cyan-100 dark:bg-slate-800 p-2"><Building2 className="h-4 w-4 text-cyan-600" /></div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {leaveUtilMetrics ? `${leaveUtilMetrics.rate}%` : "—"}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {leaveUtilMetrics ? `${leaveUtilMetrics.annualUsed} of ${leaveUtilMetrics.totalEntitlement} days used` : "Loading…"}
                </p>
                {leaveUtilMetrics && (
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full rounded-full transition-all ${
                        leaveUtilMetrics.rate >= 80 ? "bg-rose-500" :
                        leaveUtilMetrics.rate >= 50 ? "bg-amber-500" : "bg-cyan-500"
                      }`} style={{ width: `${Math.min(leaveUtilMetrics.rate, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">On leave now</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{leaveUtilMetrics.onLeave} employee{leaveUtilMetrics.onLeave !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="rounded-lg px-2 py-1 text-[10px] font-semibold text-center" style={{
                      background: leaveUtilMetrics.rate >= 80 ? "#fff1f2" : leaveUtilMetrics.rate >= 50 ? "#fffbeb" : "#ecfeff",
                      color:      leaveUtilMetrics.rate >= 80 ? "#e11d48" : leaveUtilMetrics.rate >= 50 ? "#d97706" : "#0891b2",
                    }}>
                      {leaveUtilMetrics.rate >= 80 ? "🔴 High — monitor coverage" :
                       leaveUtilMetrics.rate >= 50 ? "⚠️ Moderate utilisation" :
                       "✅ Healthy utilisation"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Row 1: Bar charts ── */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Positions by department — stacked bar */}
            <ChartCard
              title="Positions by Department"
              subtitle="Filled vs vacant split across departments"
            >
              {a.deptBar.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={a.deptBar} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:[&>line]:stroke-slate-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }}
                      angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="Filled" stackId="a" fill={COLORS.emerald} radius={[0,0,0,0]} />
                    <Bar dataKey="Vacant" stackId="a" fill={COLORS.rose}    radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-10 text-center text-sm text-slate-400">No data yet</p>}
            </ChartCard>

            {/* Position level distribution — horizontal bar */}
            <ChartCard
              title="Position Level Distribution"
              subtitle="Headcount by organizational tier"
            >
              {a.levelBar.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={a.levelBar} layout="vertical"
                    margin={{ top: 4, right: 24, left: 60, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"
                      className="dark:[&>line]:stroke-slate-700" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} width={60} />
                    <Tooltip content={<CustomTooltip />}
                      formatter={(v, _, p) => [v, p.payload.fullName]} />
                    <Bar dataKey="count" radius={[0,4,4,0]}>
                      {a.levelBar.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-10 text-center text-sm text-slate-400">No data yet</p>}
            </ChartCard>
          </div>

          {/* ── Monthly Additions — full-width horizontal scroll ── */}
          <ChartCard
            title="Monthly Additions"
            subtitle={`New positions and employees created each month · ${a.posLine.length} month${a.posLine.length !== 1 ? "s" : ""} of history — scroll to explore`}
          >
            {a.posLine.length <= 1 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Not enough history yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  This chart fills in as positions and employees are added over time — each month becomes its own data point.
                  Currently showing <strong>{a.posLine[0]?.month}</strong> with {a.posLine[0]?.Positions ?? 0} positions and {a.posLine[0]?.Employees ?? 0} employees.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div style={{ minWidth: Math.max(a.posLine.length * 70, 700) }}>
                  <ResponsiveContainer width="100%" height={300} minWidth={Math.max(a.posLine.length * 70, 700)}>
                    <LineChart
                      data={a.posLine}
                      margin={{ top: 12, right: 24, left: 0, bottom: 8 }}
                    >
                      <defs>
                        <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={COLORS.indigo} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={COLORS.emerald} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"
                        className="dark:[&>line]:stroke-slate-700" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        interval={0}
                        angle={a.posLine.length > 18 ? -35 : 0}
                        textAnchor={a.posLine.length > 18 ? "end" : "middle"}
                        height={a.posLine.length > 18 ? 50 : 30}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} width={32} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="Positions" stroke={COLORS.indigo}
                        strokeWidth={2.5} dot={{ r: 3.5, fill: COLORS.indigo }} activeDot={{ r: 6 }}
                        fill="url(#posGrad)" />
                      <Line type="monotone" dataKey="Employees" stroke={COLORS.emerald}
                        strokeWidth={2.5} dot={{ r: 3.5, fill: COLORS.emerald }} activeDot={{ r: 6 }}
                        fill="url(#empGrad)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {/* Quick stats footer */}
            {a.posLine.length > 0 && (() => {
              const totalPos = a.posLine.reduce((s, m) => s + m.Positions, 0);
              const totalEmp = a.posLine.reduce((s, m) => s + m.Employees, 0);
              const peakMonth = [...a.posLine].sort((x, y) => (y.Positions + y.Employees) - (x.Positions + x.Employees))[0];
              return (
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 text-indigo-700 dark:text-indigo-300 font-medium">
                    {totalPos} positions added total
                  </span>
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 text-emerald-700 dark:text-emerald-300 font-medium">
                    {totalEmp} employees added total
                  </span>
                  {peakMonth && (peakMonth.Positions + peakMonth.Employees) > 0 && (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-slate-600 dark:text-slate-400 font-medium">
                      Peak month: {peakMonth.month}
                    </span>
                  )}
                </div>
              );
            })()}
          </ChartCard>

          {/* ── Row 3: Pie / Donut charts ── */}
          <div className="grid gap-4 lg:grid-cols-3">

            {/* Vacancy donut */}
            <ChartCard
              title="Vacancy Status"
              subtitle="Filled vs vacant positions"
            >
              {a.vacancyPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={a.vacancyPie}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      dataKey="value"
                      activeIndex={vacancyActive}
                      activeShape={ActivePieShape}
                      onMouseEnter={(_, i) => setVacancyActive(i)}
                    >
                      {a.vacancyPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="py-10 text-center text-sm text-slate-400">No data yet</p>}
              <div className="mt-2 flex justify-center gap-4 text-xs">
                {a.vacancyPie.map(d => (
                  <span key={d.name} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                    <span className="text-slate-600 dark:text-slate-400">{d.name} ({d.value})</span>
                  </span>
                ))}
              </div>
            </ChartCard>

            {/* Employee status pie */}
            <ChartCard
              title="Employee Status"
              subtitle="Breakdown by employment status"
            >
              {a.statusPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={a.statusPie}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      dataKey="value"
                      activeIndex={statusActive}
                      activeShape={ActivePieShape}
                      onMouseEnter={(_, i) => setStatusActive(i)}
                    >
                      {a.statusPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="py-10 text-center text-sm text-slate-400">No data yet</p>}
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
                {a.statusPie.map(d => (
                  <span key={d.name} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                    <span className="text-slate-600 dark:text-slate-400">{d.name} ({d.value})</span>
                  </span>
                ))}
              </div>
            </ChartCard>

            {/* Dept size pie */}
            <ChartCard
              title="Positions per Department"
              subtitle="Share of total positions (top 7 departments)"
            >
              {a.deptSizePie.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={a.deptSizePie}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={88}
                      dataKey="value"
                      activeIndex={deptActive}
                      activeShape={ActivePieShape}
                      onMouseEnter={(_, i) => setDeptActive(i)}
                    >
                      {a.deptSizePie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="py-10 text-center text-sm text-slate-400">No departments with positions yet</p>}
              <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px]">
                {a.deptSizePie.map(d => (
                  <span key={d.name} className="flex items-center gap-1">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: d.fill }} />
                    <span className="text-slate-500 dark:text-slate-400 truncate max-w-[80px]">{d.name}</span>
                  </span>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* ── Performance Analytics ── */}
          {performanceMetrics && performanceMetrics.totalReviewed > 0 && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Performance Analytics</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* KPI strip */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Reviews Completed", value: String(performanceMetrics.reviewed),    accent: "bg-emerald-500", sub: `${performanceMetrics.pending} pending` },
                  { label: "Avg Rating",         value: performanceMetrics.avgRating ? `${performanceMetrics.avgRating}/5` : "—", accent: "bg-amber-500", sub: "Overall organisation average" },
                  { label: "Mid-Year Avg",       value: performanceMetrics.midAvg ? `${performanceMetrics.midAvg}/5` : "—",       accent: "bg-sky-500",   sub: `${performanceMetrics.midYearCount} reviews` },
                  { label: "End-Year Avg",       value: performanceMetrics.endAvg ? `${performanceMetrics.endAvg}/5` : "—",       accent: "bg-violet-500",sub: `${performanceMetrics.endYearCount} reviews` },
                ].map(k => (
                  <div key={k.label} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className={`h-1 w-full ${k.accent}`} />
                    <div className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{k.label}</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{k.value}</p>
                      <p className="mt-1 text-xs text-slate-400">{k.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts row 1 */}
              <div className="grid gap-4 lg:grid-cols-2">

                {/* Rating distribution — horizontal bar */}
                <ChartCard title="Rating Distribution" subtitle="How employees are rated across the 1–5 scale">
                  <div className="space-y-2.5 pt-1">
                    {performanceMetrics.ratingDist.map(r => {
                      const pctVal = performanceMetrics.totalReviewed > 0
                        ? Math.round((r.count / performanceMetrics.totalReviewed) * 100) : 0;
                      return (
                        <div key={r.rating} className="flex items-center gap-3">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold ${r.bg}`}>
                            {r.rating}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-600 dark:text-slate-400 truncate pr-2">{r.label}</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">{r.count} ({pctVal}%)</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pctVal}%`, background: r.color }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Mid vs End year comparison */}
                  {performanceMetrics.midAvg && performanceMetrics.endAvg && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {[
                        { label: "Mid-Year Avg", val: performanceMetrics.midAvg, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/30" },
                        { label: "End-Year Avg", val: performanceMetrics.endAvg, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30" },
                      ].map(c => (
                        <div key={c.label} className={`rounded-xl p-3 text-center ${c.bg}`}>
                          <p className={`text-xl font-bold ${c.color}`}>{c.val}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{c.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ChartCard>

                {/* Dept avg rating — bar chart */}
                <ChartCard title="Average Rating by Department" subtitle="Which departments perform highest and lowest">
                  {performanceMetrics.deptAvgBar.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(performanceMetrics.deptAvgBar.length * 38, 160)}>
                      <BarChart data={performanceMetrics.deptAvgBar} layout="vertical"
                        margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"
                          className="dark:[&>line]:stroke-slate-700" />
                        <XAxis type="number" domain={[0, 5]} ticks={[1,2,3,4,5]}
                          tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis type="category" dataKey="name"
                          tick={{ fontSize: 10, fill: "#94a3b8" }} width={130} />
                        <Tooltip content={<CustomTooltip />}
                          formatter={(v: any, _: any, p: any) => [
                            `${v}/5 (${p.payload.count} reviews, spread: ${p.payload.spread})`,
                            p.payload.fullName,
                          ]} />
                        <Bar dataKey="avg" name="Avg Rating" radius={[0, 4, 4, 0]}>
                          {performanceMetrics.deptAvgBar.map((d: any, i: number) => (
                            <Cell key={i} fill={d.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="py-8 text-center text-sm text-slate-400">No department data.</p>}
                </ChartCard>
              </div>

              {/* Charts row 2 — Variance (full width) */}
              <div className="grid gap-4">

                {/* Variance bar — std_dev per department */}
                <ChartCard title="Performance Variance by Department"
                  subtitle="Standard deviation — higher value means more spread in employee ratings">
                  {performanceMetrics.varianceBar.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(performanceMetrics.varianceBar.length * 38, 160)}>
                      <BarChart data={performanceMetrics.varianceBar} layout="vertical"
                        margin={{ top: 4, right: 56, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"
                          className="dark:[&>line]:stroke-slate-700" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis type="category" dataKey="name"
                          tick={{ fontSize: 10, fill: "#94a3b8" }} width={130} />
                        <Tooltip content={<CustomTooltip />}
                          formatter={(v: any, _: any, p: any) => [
                            `σ ${v} (min ${p.payload.min}, max ${p.payload.max})`,
                            "Std Deviation",
                          ]} />
                        <Bar dataKey="std_dev" name="Std Deviation" radius={[0, 4, 4, 0]}>
                          {performanceMetrics.varianceBar.map((d: any, i: number) => (
                            <Cell key={i}
                              fill={d.std_dev >= 1.5 ? COLORS.rose : d.std_dev >= 0.8 ? COLORS.amber : COLORS.emerald} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="py-8 text-center text-sm text-slate-400">Need multiple reviews per dept.</p>}
                  {/* Legend */}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    {[
                      { color: COLORS.emerald, label: "Low variance (σ < 0.8) — consistent team" },
                      { color: COLORS.amber,   label: "Medium variance (σ 0.8–1.5) — some spread" },
                      { color: COLORS.rose,    label: "High variance (σ ≥ 1.5) — needs attention" },
                    ].map(l => (
                      <span key={l.label} className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                        <span className="text-slate-500 dark:text-slate-400">{l.label}</span>
                      </span>
                    ))}
                  </div>
                </ChartCard>

              </div>
            </>
          )}

          {/* ── Leave Analytics ── */}
          {leaveMetrics && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Leave Analytics</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Department filter */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0">Filter by Department:</span>
                <div className="flex-1 min-w-48">
                  <select
                    value={leaveDeptFilter}
                    onChange={e => setLeaveDeptFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="">All Departments</option>
                    {deptTree.map(d => (
                      <option key={d.id} value={d.id}>
                        {"\u00a0".repeat(d.level * 3)}{d.level > 0 ? "└ " : ""}{d.name}
                      </option>
                    ))}
                  </select>
                </div>
                {leaveDeptFilter && (
                  <>
                    <div className="flex items-center gap-1.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 px-3 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                      <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                        {departments.find(d => d.id === leaveDeptFilter)?.name}
                        {getDeptSubtree(leaveDeptFilter).size > 1 && (
                          <span className="ml-1 text-cyan-500">+{getDeptSubtree(leaveDeptFilter).size - 1} sub</span>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => setLeaveDeptFilter("")}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <span className="text-xs text-slate-400">
                  {filteredLeaveEmps.length} of {filteredLeaveSummary?.employees?.length ?? 0} employee{filteredLeaveSummary?.employees?.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Leave KPI strip */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total Days Taken",    value: leaveMetrics.totalDays,        accent: "bg-cyan-500",    sub: "All leave types combined" },
                  { label: "Annual Leave Used",   value: leaveMetrics.totals.annual,    accent: "bg-sky-500",     sub: `${leaveMetrics.utilisationRate}% utilisation rate` },
                  { label: "Avg Days / Employee", value: leaveMetrics.avgUsed,          accent: "bg-violet-500",  sub: "Annual leave average" },
                  { label: "Not Used Leave",      value: leaveMetrics.notUsed,          accent: "bg-amber-500",   sub: `${leaveMetrics.totalEmployees - leaveMetrics.notUsed} employees have taken leave` },
                ].map(k => (
                  <div key={k.label} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className={`h-1 w-full ${k.accent}`} />
                    <div className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{k.label}</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{k.value}</p>
                      <p className="mt-1 text-xs text-slate-400">{k.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Leave charts */}
              <div className="grid gap-4 lg:grid-cols-2">

                {/* Leave by type — horizontal bar */}
                <ChartCard title="Leave Days by Type" subtitle="Total days taken across all leave categories">
                  {leaveMetrics.byType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={leaveMetrics.byType} layout="vertical"
                        margin={{ top: 4, right: 48, left: 16, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"
                          className="dark:[&>line]:stroke-slate-700" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} width={90} />
                        <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v} days`, "Used"]} />
                        <Bar dataKey="days" name="Days Used" radius={[0, 4, 4, 0]}>
                          {leaveMetrics.byType.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="py-8 text-center text-sm text-slate-400">No leave data yet.</p>}
                  {/* Type legend */}
                  <div className="mt-3 flex flex-wrap gap-3">
                    {leaveMetrics.byType.map(d => (
                      <span key={d.name} className="flex items-center gap-1.5 text-xs">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                        <span className="text-slate-600 dark:text-slate-400">{d.name}: <strong className="text-slate-800 dark:text-slate-200">{d.days}d</strong></span>
                      </span>
                    ))}
                  </div>
                </ChartCard>

                {/* Annual leave utilisation per employee — bar */}
                <ChartCard title="Annual Leave Utilisation" subtitle={`Days used vs entitlement — top 10 employees by usage${leaveDeptFilter ? ` · ${departments.find(d => d.id === leaveDeptFilter)?.name ?? ""}` : ""}`}>
                  {leaveMetrics.perEmployee.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={leaveMetrics.perEmployee}
                        margin={{ top: 4, right: 8, left: -20, bottom: 32 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"
                          className="dark:[&>line]:stroke-slate-700" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }}
                          angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />}
                          formatter={(v, n) => [`${v} days`, n]}
                          labelFormatter={(_, p) => p[0]?.payload?.fullName ?? ""} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Bar dataKey="entitlement" name="Entitlement" fill={COLORS.slate} radius={[0,0,0,0]} opacity={0.3} />
                        <Bar dataKey="used"        name="Used"        fill={COLORS.cyan}  radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="py-8 text-center text-sm text-slate-400">No annual leave data.</p>}
                </ChartCard>
              </div>

              {/* Leave utilisation rate + breakdown insight */}
              <div className="grid gap-4 lg:grid-cols-3">

                {/* Utilisation donut */}
                <ChartCard title="Annual Leave Utilisation Rate" subtitle="% of total entitlement consumed">
                  <div className="flex flex-col items-center justify-center py-4 gap-3">
                    {/* Circular progress */}
                    <div className="relative flex h-36 w-36 items-center justify-center">
                      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="12"
                          className="dark:stroke-slate-800" />
                        <circle cx="60" cy="60" r="50" fill="none"
                          stroke={leaveMetrics.utilisationRate >= 80 ? COLORS.rose
                            : leaveMetrics.utilisationRate >= 50 ? COLORS.amber
                            : COLORS.emerald}
                          strokeWidth="12"
                          strokeDasharray={`${leaveMetrics.utilisationRate * 3.14} 314`}
                          strokeLinecap="round" />
                      </svg>
                      <div className="absolute text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{leaveMetrics.utilisationRate}%</p>
                        <p className="text-[10px] text-slate-400">Utilised</p>
                      </div>
                    </div>
                    <div className="w-full space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Total Entitlement</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{leaveMetrics.totalEntitlement} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Annual Leave Used</span>
                        <span className="font-semibold text-cyan-600 dark:text-cyan-400">{leaveMetrics.totals.annual} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Remaining</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{leaveMetrics.totalEntitlement - leaveMetrics.totals.annual} days</span>
                      </div>
                    </div>
                  </div>
                </ChartCard>

                {/* Leave type donut */}
                <ChartCard title="Leave Type Split" subtitle="Proportion of days by category">
                  {leaveMetrics.byType.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={190}>
                        <PieChart>
                          <Pie data={leaveMetrics.byType.map(d => ({ name: d.name, value: d.days, fill: d.fill }))}
                            cx="50%" cy="50%" innerRadius={52} outerRadius={80} dataKey="value">
                            {leaveMetrics.byType.map((d, i) => <Cell key={i} fill={d.fill} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} formatter={v => [`${v} days`]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-1 space-y-1">
                        {leaveMetrics.byType.map(d => {
                          const pctVal = leaveMetrics.totalDays > 0 ? Math.round((d.days / leaveMetrics.totalDays) * 100) : 0;
                          return (
                            <div key={d.name} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                                <span className="text-slate-600 dark:text-slate-400">{d.name}</span>
                              </span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{d.days}d · {pctVal}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : <p className="py-8 text-center text-sm text-slate-400">No leave data.</p>}
                </ChartCard>

                {/* Insight card */}
                <ChartCard title="Leave Insights" subtitle="Key observations from leave data">
                  <div className="space-y-3 pt-1">
                    {[
                      {
                        label: "Fully Used Entitlement",
                        value: `${leaveMetrics.fullyUsed} employees`,
                        color: "text-rose-600 dark:text-rose-400",
                        bg: "bg-rose-50 dark:bg-rose-950/30",
                        note: leaveMetrics.fullyUsed > 0 ? "Used all annual leave — burnout risk if work demands are high" : "No employees have exhausted their leave",
                      },
                      {
                        label: "Zero Leave Taken",
                        value: `${leaveMetrics.notUsed} employees`,
                        color: "text-amber-600 dark:text-amber-400",
                        bg: "bg-amber-50 dark:bg-amber-950/30",
                        note: leaveMetrics.notUsed > 0 ? "Haven't taken any leave — may indicate work pressure or disengagement" : "All employees have taken at least some leave",
                      },
                      {
                        label: "Sick Leave Total",
                        value: `${leaveMetrics.totals.sick} days`,
                        color: "text-violet-600 dark:text-violet-400",
                        bg: "bg-violet-50 dark:bg-violet-950/30",
                        note: leaveMetrics.totals.sick > leaveMetrics.totalEmployees * 3 ? "Above average — consider a staff wellness review" : "Within expected range",
                      },
                      {
                        label: "Utilisation Rate",
                        value: `${leaveMetrics.utilisationRate}%`,
                        color: leaveMetrics.utilisationRate > 80 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
                        bg: leaveMetrics.utilisationRate > 80 ? "bg-rose-50 dark:bg-rose-950/30" : "bg-emerald-50 dark:bg-emerald-950/30",
                        note: leaveMetrics.utilisationRate > 80 ? "High utilisation — ensure adequate staffing cover" : "Healthy leave utilisation across the workforce",
                      },
                    ].map(item => (
                      <div key={item.label} className={`rounded-xl p-3 ${item.bg}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{item.label}</span>
                          <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              </div>
            </>
          )}

          {/* ── Turnover & Retention Analysis ── */}
          {/* IIFE shadows `turnoverData` with the date-filtered version below,
              so every reference inside this block tracks the filter without
              having to touch each usage individually. */}
          {turnoverData && (() => {
            const turnoverData = filteredTurnoverData as any;
            return (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Turnover &amp; Retention</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* KPI strip */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  {
                    label: "Turnover Rate",
                    value: `${turnoverData.turnover_rate}%`,
                    accent: turnoverData.turnover_rate > 15 ? "bg-rose-500" : turnoverData.turnover_rate > 8 ? "bg-amber-500" : "bg-emerald-500",
                    sub: `${turnoverData.year} · Industry avg ~10–15%`,
                  },
                  {
                    label: "Retention Rate",
                    value: `${turnoverData.retention_rate}%`,
                    accent: turnoverData.retention_rate >= 90 ? "bg-emerald-500" : turnoverData.retention_rate >= 80 ? "bg-amber-500" : "bg-rose-500",
                    sub: "Employees who stayed",
                  },
                  {
                    label: "Voluntary Exits",
                    value: String(turnoverData.voluntary_exits),
                    accent: "bg-amber-500",
                    sub: `${turnoverData.voluntary_rate}% voluntary turnover`,
                  },
                  {
                    label: "Involuntary Exits",
                    value: String(turnoverData.involuntary_exits),
                    accent: "bg-rose-500",
                    sub: "Terminations + end of contract",
                  },
                  {
                    label: "vs Last Year",
                    value: turnoverData.prev_year_exits === 0
                      ? "New"
                      : `${turnoverData.yoy_change > 0 ? "+" : ""}${turnoverData.yoy_change}%`,
                    accent: turnoverData.yoy_change > 0 ? "bg-rose-500" : "bg-emerald-500",
                    sub: `${turnoverData.prev_year_exits} exits in ${turnoverData.year - 1}`,
                  },
                ].map(k => (
                  <div key={k.label} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className={`h-1 w-full ${k.accent}`} />
                    <div className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-snug">{k.label}</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{k.value}</p>
                      <p className="mt-1 text-xs text-slate-400">{k.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Headcount vs exits overview */}
              <div className="grid gap-4 lg:grid-cols-3">

                {/* Retention gauge */}
                <ChartCard title="Retention Rate" subtitle={`${turnoverData.year} workforce stability`}>
                  <div className="flex flex-col items-center py-4 gap-4">
                    <div className="relative flex h-40 w-40 items-center justify-center">
                      <svg className="h-40 w-40 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="14"
                          className="dark:stroke-slate-800" />
                        <circle cx="60" cy="60" r="50" fill="none"
                          stroke={turnoverData.retention_rate >= 90 ? COLORS.emerald : turnoverData.retention_rate >= 80 ? COLORS.amber : COLORS.rose}
                          strokeWidth="14"
                          strokeDasharray={`${Math.min(turnoverData.retention_rate, 100) * 3.14} 314`}
                          strokeLinecap="round" />
                      </svg>
                      <div className="absolute text-center">
                        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{turnoverData.retention_rate}%</p>
                        <p className="text-xs text-slate-400">Retained</p>
                      </div>
                    </div>
                    <div className="w-full space-y-2 text-xs">
                      {[
                        { label: "Active Employees",    value: turnoverData.active_now,         color: "text-emerald-600 dark:text-emerald-400" },
                        { label: "Exited This Year",    value: turnoverData.exits_this_year,    color: "text-rose-600 dark:text-rose-400"    },
                        { label: "Avg Headcount",       value: turnoverData.avg_headcount,       color: "text-slate-600 dark:text-slate-400"  },
                        { label: "Total Employees",     value: turnoverData.total_employees,     color: "text-slate-600 dark:text-slate-400"  },
                      ].map(r => (
                        <div key={r.label} className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">{r.label}</span>
                          <span className={`font-bold ${r.color}`}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                    {/* Interpretation */}
                    <div className={`w-full rounded-xl p-3 text-center ${
                      turnoverData.retention_rate >= 90 ? "bg-emerald-50 dark:bg-emerald-950/30" :
                      turnoverData.retention_rate >= 80 ? "bg-amber-50 dark:bg-amber-950/30" :
                      "bg-rose-50 dark:bg-rose-950/30"
                    }`}>
                      <p className={`text-xs font-semibold ${
                        turnoverData.retention_rate >= 90 ? "text-emerald-700 dark:text-emerald-300" :
                        turnoverData.retention_rate >= 80 ? "text-amber-700 dark:text-amber-300" :
                        "text-rose-700 dark:text-rose-300"
                      }`}>
                        {turnoverData.retention_rate >= 90
                          ? "Excellent retention — workforce is highly stable"
                          : turnoverData.retention_rate >= 80
                          ? "Good retention — minor attrition pressure, monitor closely"
                          : "High turnover — urgent review of compensation, culture and management needed"}
                      </p>
                    </div>
                  </div>
                </ChartCard>

                {/* Voluntary vs involuntary */}
                <ChartCard title="Exit Composition" subtitle="Voluntary resignations vs employer-initiated">
                  <div className="space-y-4 pt-2">
                    {[
                      { label: "Voluntary (Resignation)",       value: turnoverData.voluntary_exits,   total: turnoverData.exits_this_year, color: "bg-amber-500",   text: "text-amber-700 dark:text-amber-300",   note: "Employee-initiated — review engagement & compensation" },
                      { label: "Involuntary (Termination/EOC)", value: turnoverData.involuntary_exits, total: turnoverData.exits_this_year, color: "bg-rose-500",    text: "text-rose-700 dark:text-rose-300",     note: "Employer-initiated — review hiring quality & contract use" },
                    ].map(item => {
                      const pctVal = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0;
                      return (
                        <div key={item.label} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${item.text}`}>{item.label}</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.value} ({pctVal}%)</span>
                          </div>
                          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pctVal}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 italic">{item.note}</p>
                        </div>
                      );
                    })}

                    {/* Rate context */}
                    <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Rate Benchmarks</p>
                      {[
                        { label: "Turnover Rate",   value: `${turnoverData.turnover_rate}%`,  note: turnoverData.turnover_rate <= 10 ? "✅ Healthy" : turnoverData.turnover_rate <= 20 ? "⚠️ Moderate" : "🔴 High" },
                        { label: "Voluntary Rate",  value: `${turnoverData.voluntary_rate}%`, note: turnoverData.voluntary_rate <= 8  ? "✅ Healthy" : turnoverData.voluntary_rate <= 15  ? "⚠️ Moderate" : "🔴 High" },
                        { label: "YoY Change",      value: `${turnoverData.yoy_change > 0 ? "+" : ""}${turnoverData.yoy_change}%`, note: turnoverData.yoy_change <= 0 ? "✅ Improving" : "📈 Increasing" },
                      ].map(r => (
                        <div key={r.label} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">{r.label}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{r.value} {r.note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>

                {/* Dept turnover table */}
                <ChartCard title="Turnover by Department" subtitle="Exits and rate per department">
                  {turnoverData.by_department.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800">
                            {["Department","Exits","Positions","Rate"].map(h => (
                              <th key={h} className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {turnoverData.by_department.map((d: any, i: number) => (
                            <tr key={d.department} className={i === 0 ? "bg-rose-50 dark:bg-rose-950/20" : ""}>
                              <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-300 max-w-[100px] truncate">
                                {i === 0 && <span className="mr-1">⚠️</span>}{d.department}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-rose-600 dark:text-rose-400">{d.exits}</td>
                              <td className="py-2 px-2 text-center text-slate-500">{d.positions}</td>
                              <td className="py-2 px-2 text-center">
                                <span className={`font-bold ${
                                  d.rate >= 20 ? "text-rose-600 dark:text-rose-400" :
                                  d.rate >= 10 ? "text-amber-600 dark:text-amber-400" :
                                  "text-emerald-600 dark:text-emerald-400"
                                }`}>{d.rate}%</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-400">No exits recorded this year.</p>
                  )}
                </ChartCard>
              </div>

              {/* Monthly exit trend */}
              <ChartCard title="Monthly Exit Trend" subtitle={`Exits by month · ${turnoverData.year} · Breakdown by reason`}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={turnoverData.monthly.filter((m: any) => m.exits > 0)}
                    margin={{ top: 4, right: 24, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"
                      className="dark:[&>line]:stroke-slate-700" />
                    <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="resignations"    name="Resignation"     fill={COLORS.amber}   stackId="a" radius={[0,0,0,0]} />
                    <Bar dataKey="terminations"    name="Termination"     fill={COLORS.rose}    stackId="a" radius={[0,0,0,0]} />
                    <Bar dataKey="end_of_contract" name="End of Contract" fill={COLORS.slate}   stackId="a" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                {/* Monthly insight */}
                {(() => {
                  const peakMonth = [...turnoverData.monthly].sort((a: any, b: any) => b.exits - a.exits)[0];
                  if (peakMonth?.exits === 0) return null;
                  return (
                    <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">📊 Monthly Insight</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Peak exits occurred in <strong>{peakMonth.month_label}</strong> with {peakMonth.exits} departure{peakMonth.exits !== 1 ? "s" : ""}.
                        {peakMonth.resignations > peakMonth.terminations
                          ? " Voluntary resignations dominated — consider exit interviews to understand push factors."
                          : " Terminations dominated — review performance management and hiring quality for this period."}
                        {turnoverData.yoy_change > 10 && " Year-over-year exits have increased significantly — immediate retention initiatives are recommended."}
                        {turnoverData.yoy_change <= 0 && " Compared to last year, turnover is trending positively."}
                      </p>
                    </div>
                  );
                })()}
              </ChartCard>
            </>
            );
          })()}

          {/* ── Exit Analysis ── */}
          {exitMetrics && exitMetrics.total > 0 && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Exit Analysis</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Exit KPI strip */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total Exits",       value: exitMetrics.total,           accent: "bg-slate-500",   sub: "All time" },
                  { label: "Resignations",      value: filteredExitSummary?.by_reason?.resignation ?? 0,     accent: "bg-amber-500",  sub: "Voluntary" },
                  { label: "Terminations",      value: filteredExitSummary?.by_reason?.termination ?? 0,     accent: "bg-rose-500",   sub: "Employer-initiated" },
                  { label: "Regrettable Exits", value: exitMetrics.regrettable,     accent: "bg-violet-500", sub: "Talent we wanted to keep" },
                ].map(k => (
                  <div key={k.label} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className={`h-1 w-full ${k.accent}`} />
                    <div className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{k.label}</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{k.value}</p>
                      <p className="mt-1 text-xs text-slate-400">{k.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Exit charts row */}
              <div className="grid gap-4 lg:grid-cols-2">

                {/* Exits by department — horizontal bar */}
                <ChartCard title="Exits by Department" subtitle="Number of exited employees per department">
                  {exitMetrics.byDept.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(exitMetrics.byDept.length * 36, 180)}>
                      <BarChart data={exitMetrics.byDept} layout="vertical"
                        margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"
                          className="dark:[&>line]:stroke-slate-700" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} width={140} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Exits" fill={COLORS.rose} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="py-8 text-center text-sm text-slate-400">No exits recorded yet.</p>}
                </ChartCard>

                {/* Exits by reason — donut + type breakdown */}
                <ChartCard title="Exit Reasons &amp; Types" subtitle="Why employees left and whether it was regrettable">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Reason donut */}
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">By Reason</p>
                      {exitMetrics.byReason.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={exitMetrics.byReason} cx="50%" cy="50%"
                              innerRadius={45} outerRadius={72} dataKey="value">
                              {exitMetrics.byReason.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <p className="py-8 text-center text-xs text-slate-400">No data</p>}
                      <div className="mt-1 space-y-1">
                        {exitMetrics.byReason.map(d => (
                          <div key={d.name} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                              <span className="text-slate-600 dark:text-slate-400">{d.name}</span>
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Type split */}
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">By Type</p>
                      <div className="space-y-3 mt-4">
                        {[
                          { label: "Regrettable",     value: exitMetrics.regrettable,    color: "bg-rose-500",    text: "text-rose-700 dark:text-rose-300",     note: "Talent lost" },
                          { label: "Non-Regrettable", value: exitMetrics.nonRegrettable,  color: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", note: "Accepted departure" },
                        ].map(t => {
                          const pct = exitMetrics.total > 0 ? Math.round((t.value / exitMetrics.total) * 100) : 0;
                          return (
                            <div key={t.label}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className={`font-semibold ${t.text}`}>{t.label}</span>
                                <span className="text-slate-500 dark:text-slate-400">{t.value} ({pct}%)</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div className={`h-full rounded-full ${t.color}`} style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">{t.note}</p>
                            </div>
                          );
                        })}
                        {/* Retention insight */}
                        {exitMetrics.total > 0 && (
                          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Retention Insight</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                              {exitMetrics.regrettable > exitMetrics.nonRegrettable
                                ? `${Math.round(exitMetrics.regrettable / exitMetrics.total * 100)}% of exits are regrettable. Review compensation and career development to improve retention.`
                                : `${Math.round(exitMetrics.nonRegrettable / exitMetrics.total * 100)}% of exits are non-regrettable — attrition is largely healthy and manageable.`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ChartCard>
              </div>
            </>
          )}
        </>
      )}
      {/* ── Export Builder Modal ── */}
      {showExportBuilder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowExportBuilder(false)}>
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-cyan-500" /> Build Custom Report
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose sections and date ranges, then export to Excel or PowerPoint
                </p>
              </div>
              <button onClick={() => setShowExportBuilder(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Select all / none */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-2.5 shrink-0 bg-slate-50 dark:bg-slate-900/60">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{enabledCount}</span> of {Object.keys(sections).length} sections selected
              </span>
              <div className="flex gap-3">
                <button onClick={() => setSections(s => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { ...v, enabled: true }])) as typeof s)}
                  className="text-xs font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 transition-colors">Select all</button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <button onClick={() => setSections(s => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { ...v, enabled: false }])) as typeof s)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 transition-colors">Clear all</button>
              </div>
            </div>

            {/* Section list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {(Object.entries(SECTION_META) as [SectionKey, typeof SECTION_META[SectionKey]][]).map(([key, meta]) => {
                const cfg = sections[key];
                return (
                  <div key={key} className={`rounded-xl border-2 transition-all ${
                    cfg.enabled
                      ? "border-cyan-200 bg-cyan-50/50 dark:border-cyan-900/40 dark:bg-cyan-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  }`}>
                    {/* Section header row */}
                    <button
                      onClick={() => toggleSection(key)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-xl">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${
                          cfg.enabled ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-500"
                        }`}>{meta.label}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{meta.desc}</p>
                      </div>
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                        cfg.enabled
                          ? "border-cyan-500 bg-cyan-500"
                          : "border-slate-300 dark:border-slate-600"
                      }`}>
                        {cfg.enabled && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    </button>

                    {/* Date range — only shown when enabled */}
                    {cfg.enabled && (
                      <div className="px-4 pb-3 pt-0">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-12">From</span>
                          <input type="date" value={cfg.from}
                            onChange={e => updateSection(key, "from", e.target.value)}
                            className="flex-1 bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none" />
                          <span className="text-slate-300 dark:text-slate-600">→</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-6">To</span>
                          <input type="date" value={cfg.to}
                            onChange={e => updateSection(key, "to", e.target.value)}
                            className="flex-1 bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
              {enabledCount === 0 && (
                <p className="mb-3 text-center text-xs text-amber-600 dark:text-amber-400">
                  ⚠ Select at least one section to export.
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowExportBuilder(false)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleExcel} disabled={!!exporting || enabledCount === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 disabled:opacity-50 transition-colors">
                  {exporting === "excel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  {exporting === "excel" ? "Generating…" : "Excel"}
                </button>
                <button onClick={handlePptx} disabled={!!exporting || enabledCount === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50 transition-colors">
                  {exporting === "pptx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Presentation className="h-4 w-4" />}
                  {exporting === "pptx" ? "Generating…" : "PowerPoint"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
