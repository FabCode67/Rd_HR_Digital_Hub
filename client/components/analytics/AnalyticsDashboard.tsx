"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/api";
import { Department, Employee, Position, PositionLevel } from "@/lib/types";
import {
  Loader2, Building2, BriefcaseBusiness, Users,
  BadgeCheck, TrendingUp, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
  PieChart, Pie, Cell, Sector,
} from "recharts";

// ─── helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

async function fetchAllPages<T>(
  loader: (skip: number, limit: number) => Promise<T[]>
): Promise<T[]> {
  let skip = 0;
  const items: T[] = [];
  while (true) {
    const batch = await loader(skip, PAGE_SIZE);
    items.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return items;
}

function fmt(n: number) { return Math.round(n).toString(); }
function pct(n: number) { return `${Math.round(n)}%`; }

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
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  // Pie active slice state
  const [vacancyActive,   setVacancyActive]   = useState(0);
  const [statusActive,    setStatusActive]    = useState(0);
  const [deptActive,      setDeptActive]      = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const [depts, pos, emps] = await Promise.all([
          fetchAllPages((s, l) => apiClient.department.getAll(s, l)),
          fetchAllPages((s, l) => apiClient.position.getAll(undefined, s, l)),
          fetchAllPages((s, l) => apiClient.employee.getAll(s, l)),
        ]);
        if (!mounted) return;
        setDepartments(depts); setPositions(pos); setEmployees(emps);
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

  const a = useMemo(() => {
    const filled   = positions.filter(p => !p.is_vacant).length;
    const vacant   = positions.filter(p =>  p.is_vacant).length;
    const active   = employees.filter(e => e.status === "ACTIVE").length;
    const inactive = employees.filter(e => e.status === "INACTIVE").length;
    const suspended= employees.filter(e => e.status === "SUSPENDED").length;
    const terminated=employees.filter(e => e.status === "TERMINATED").length;
    const fillRate = positions.length > 0 ? (filled / positions.length) * 100 : 0;

    // Positions by department (bar chart)
    const deptPositionMap = new Map<string, { filled: number; vacant: number }>();
    positions.forEach(p => {
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
        count: positions.filter(p => p.level === level).length,
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
      { name: "Inactive",   value: inactive,   fill: COLORS.amber },
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

    // Line chart: positions per month (by created_at, last 6 months)
    const now = new Date();
    const months: { key: string; label: string }[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      };
    });

    const posLine = months.map(({ key, label }) => ({
      month: label,
      Positions: positions.filter(p => p.created_at?.startsWith(key)).length,
      Employees: employees.filter(e => e.created_at?.startsWith(key)).length,
    }));

    // Running cumulative line (total growth)
    let cumPos = 0, cumEmp = 0;
    const growthLine = months.map(({ key, label }) => {
      cumPos += positions.filter(p => p.created_at?.startsWith(key)).length;
      cumEmp += employees.filter(e => e.created_at?.startsWith(key)).length;
      return { month: label, "Total Positions": cumPos, "Total Employees": cumEmp };
    });

    return {
      filled, vacant, active, inactive, suspended, terminated,
      fillRate, deptBar, levelBar, vacancyPie, statusPie,
      deptSizePie, posLine, growthLine,
    };
  }, [departments, positions, employees]);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6 min-w-0">

      {/* Hero header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Analytics Dashboard</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Organization Overview</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-300">
          Live metrics from departments, positions, and employees — updated on every page load.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {departments.length} Departments
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {positions.length} Positions
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {employees.length} Employees
          </span>
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
          {/* ── KPI cards ── */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <MetricCard label="Departments" value={fmt(departments.length)}
              detail={`${departments.filter(d => !d.parent_id).length} root units`}
              icon={<Building2 className="h-4 w-4"/>} accent="bg-sky-500" />
            <MetricCard label="Positions" value={fmt(positions.length)}
              detail={`${a.filled} filled · ${a.vacant} vacant`}
              icon={<BriefcaseBusiness className="h-4 w-4"/>} accent="bg-indigo-500" />
            <MetricCard label="Employees" value={fmt(employees.length)}
              detail={`${a.active} active`} sub={`${a.inactive + a.suspended} need attention`}
              icon={<Users className="h-4 w-4"/>} accent="bg-emerald-500" />
            <MetricCard label="Fill Rate" value={pct(a.fillRate)}
              detail={`${a.filled} of ${positions.length} filled`}
              icon={<BadgeCheck className="h-4 w-4"/>} accent="bg-amber-500" />
            <MetricCard label="Vacancies" value={fmt(a.vacant)}
              detail={positions.length > 0 ? `${pct((a.vacant/positions.length)*100)} open` : "No positions"}
              icon={<AlertCircle className="h-4 w-4"/>} accent="bg-rose-500" />
            <MetricCard label="Growth (6 mo)" value={`+${a.posLine.reduce((s,m) => s + m.Positions,0)}`}
              detail="New positions added"
              sub={`+${a.posLine.reduce((s,m) => s + m.Employees,0)} employees`}
              icon={<TrendingUp className="h-4 w-4"/>} accent="bg-violet-500" />
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

          {/* ── Row 2: Line charts ── */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Monthly additions */}
            <ChartCard
              title="Monthly Additions"
              subtitle="New positions and employees created each month (last 6 months)"
            >
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={a.posLine} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"
                    className="dark:[&>line]:stroke-slate-700" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Positions" stroke={COLORS.indigo}
                    strokeWidth={2.5} dot={{ r: 4, fill: COLORS.indigo }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Employees" stroke={COLORS.emerald}
                    strokeWidth={2.5} dot={{ r: 4, fill: COLORS.emerald }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Cumulative growth */}
            <ChartCard
              title="Cumulative Growth"
              subtitle="Running total of positions and employees over time"
            >
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={a.growthLine} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"
                    className="dark:[&>line]:stroke-slate-700" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Total Positions" stroke={COLORS.sky}
                    strokeWidth={2.5} strokeDasharray="5 3"
                    dot={{ r: 4, fill: COLORS.sky }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Total Employees" stroke={COLORS.amber}
                    strokeWidth={2.5} strokeDasharray="5 3"
                    dot={{ r: 4, fill: COLORS.amber }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

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
        </>
      )}
    </section>
  );
}
