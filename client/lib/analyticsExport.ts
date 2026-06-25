"use client";

/**
 * analyticsExport.ts
 * Enhanced PowerPoint + Excel export with:
 *  - Date range filter
 *  - Gender breakdown (pie + bar)
 *  - Staff by department (bar)
 *  - Performance variance by department
 *  - Leave per department
 *  - Auto-generated interpretive commentary on every slide
 */

// ── Types ──────────────────────────────────────────────────────────────────────
export interface DateFilter { from: string; to: string }

export interface SectionConfig {
  overview:    { enabled: boolean; from: string; to: string };
  employees:   { enabled: boolean; from: string; to: string };
  gender:      { enabled: boolean; from: string; to: string };
  departments: { enabled: boolean; from: string; to: string };
  positions:   { enabled: boolean; from: string; to: string };
  leave:       { enabled: boolean; from: string; to: string };
  performance: { enabled: boolean; from: string; to: string };
  exits:       { enabled: boolean; from: string; to: string };
  turnover:    { enabled: boolean; from: string; to: string };
}

export interface AnalyticsData {
  departments:    any[];
  positions:      any[];
  employees:      any[];
  leaveSummary:   any;
  performanceSummary?: any;
  turnoverData?:  any;
  exitSummary?:   any;
  metrics: {
    filled: number; vacant: number; fillRate: number;
    active: number; inactive: number; suspended: number; terminated: number;
    deptBar:     { name: string; Filled: number; Vacant: number }[];
    levelBar:    { fullName: string; count: number }[];
    vacancyPie:  { name: string; value: number }[];
    statusPie:   { name: string; value: number }[];
    deptSizePie: { name: string; value: number }[];
  };
}

// ── Colour palette ─────────────────────────────────────────────────────────────
const C = {
  navy:    "1E293B",
  navyLt:  "2D3F56",
  cyan:    "06B6D4",
  green:   "10B981",
  red:     "F43F5E",
  amber:   "F59E0B",
  violet:  "8B5CF6",
  sky:     "0EA5E9",
  pink:    "EC4899",
  blue:    "3B82F6",
  orange:  "F97316",
  white:   "FFFFFF",
  light:   "F1F5F9",
  light2:  "E2E8F0",
  mid:     "CBD5E1",
  dark:    "475569",
  darkest: "1E293B",
};

const BAR_COLORS = [C.cyan, C.green, C.violet, C.amber, C.sky, C.pink, C.orange, C.blue];

// ── Interpretation engine ──────────────────────────────────────────────────────
function interpret(key: string, data: any): string {
  const d = data;
  switch (key) {

    case "gender": {
      const total = d.male + d.female;
      if (total === 0) return "No gender data recorded. Update employee profiles to enable gender analytics.";
      const malePct  = Math.round((d.male  / total) * 100);
      const femPct   = Math.round((d.female / total) * 100);
      const dom = malePct > femPct ? "male" : "female";
      const gap = Math.abs(malePct - femPct);
      if (gap < 10) return `Gender distribution is near-balanced: ${malePct}% male and ${femPct}% female. NCBA Rwanda demonstrates strong commitment to gender equity in staffing.`;
      return `The workforce is ${malePct}% male and ${femPct}% female — a ${gap}-point gap favouring ${dom} employees. HR should consider targeted ${dom === "male" ? "female" : "male"} recruitment initiatives to improve gender balance.`;
    }

    case "staff_by_dept": {
      const sorted = [...d.rows].sort((a: any, b: any) => b.count - a.count);
      const top = sorted[0]; const bot = sorted[sorted.length - 1];
      if (!top) return "No department data available.";
      return `${top.name} is the largest department with ${top.count} staff members, while ${bot.name} has the smallest team (${bot.count}). Consider whether resource allocation aligns with business priorities across all divisions.`;
    }

    case "vacancy": {
      const pct = Math.round(d.fillRate);
      const risk = pct < 70 ? "high vacancy risk" : pct < 85 ? "moderate vacancy levels" : "healthy occupancy";
      return `Position fill rate stands at ${pct}%, indicating ${risk}. ${d.vacant} positions remain open — ${d.vacant > 10 ? "urgent recruitment action is recommended" : "recruitment is on track to close these gaps"}.`;
    }

    case "leave_by_dept": {
      const sorted = [...d.rows].sort((a: any, b: any) => b.total_days - a.total_days);
      const top = sorted[0]; if (!top) return "No leave data available.";
      const totalDays = d.rows.reduce((s: number, r: any) => s + r.total_days, 0);
      const topShare  = Math.round((top.total_days / Math.max(totalDays, 1)) * 100);
      return `${top.name} accounts for ${topShare}% of all leave days taken (${top.total_days} days). ${top.total_days > 50 ? "This is notably high — management may want to review workload distribution and staff wellbeing in this department." : "Leave distribution across departments appears reasonable."} Total leave days taken: ${totalDays}.`;
    }

    case "perf_by_dept": {
      const sorted = [...d.rows].sort((a: any, b: any) => b.avg - a.avg);
      const top = sorted[0]; const bot = sorted.at(-1);
      if (!top || !bot) return "Performance data not yet available. Begin conducting mid-year and end-of-year reviews to populate this section.";
      if (top.dept === bot.dept) return `Only one department has performance data (${top.dept}, avg ${top.avg.toFixed(1)}/5). Encourage all departments to complete performance reviews.`;
      const spread = (top.avg - bot.avg).toFixed(1);
      return `${top.dept} leads with an average performance rating of ${top.avg.toFixed(1)}/5, while ${bot.dept} scores ${bot.avg.toFixed(1)}/5. The ${spread}-point spread highlights a performance variance that may warrant coaching support for lower-performing teams.`;
    }

    case "contract_split": {
      const total = d.permanent + d.temporary;
      if (total === 0) return "No contract data available.";
      const permPct = Math.round((d.permanent / total) * 100);
      const tempPct = 100 - permPct;
      return `${permPct}% of staff hold permanent contracts and ${tempPct}% are on temporary contracts. ${tempPct > 30 ? "The relatively high proportion of temporary staff may pose retention and knowledge-continuity risks." : "The workforce contract mix is healthy and reflects a stable core with flexible capacity."}`;
    }

    case "leave_types": {
      const { annual, sick, maternity, paternity, compassionate } = d;
      const dominant = [
        { t: "Annual", v: annual }, { t: "Sick", v: sick },
        { t: "Maternity", v: maternity }, { t: "Paternity", v: paternity },
        { t: "Compassionate", v: compassionate },
      ].sort((a, b) => b.v - a.v)[0];
      return `${dominant.t} leave accounts for the highest utilisation (${dominant.v} days). Sick leave stands at ${sick} days — ${sick > 30 ? "above typical benchmarks, suggesting a potential employee wellbeing concern worth addressing." : "within acceptable limits."}`;
    }

    case "fill_rate_trend": {
      const rows: any[] = d.rows;
      if (rows.length < 2) return "Insufficient trend data. More periods needed for trend analysis.";
      const last = rows[rows.length - 1];
      const prev = rows[rows.length - 2];
      const diff = (last.fillRate - prev.fillRate).toFixed(1);
      const dir  = parseFloat(diff) >= 0 ? "improved" : "declined";
      return `Position fill rate has ${dir} by ${Math.abs(parseFloat(diff))} percentage points in the most recent period (${last.month}: ${last.fillRate.toFixed(0)}% vs ${prev.month}: ${prev.fillRate.toFixed(0)}%). ${dir === "improved" ? "Recruitment efforts are yielding positive results." : "HR should accelerate hiring initiatives to reverse the downward trend."}`;
    }

    default: return "";
  }
}

// ── POWERPOINT EXPORT ──────────────────────────────────────────────────────────
export async function exportPowerPoint(data: AnalyticsData, sections: SectionConfig) {
  const pptxgen = (await import("pptxgenjs")).default;
  const pptx = new pptxgen();
  pptx.layout  = "LAYOUT_WIDE";
  pptx.title   = "NCBA Rwanda — HR Analytics Report";
  pptx.author  = "NCBA HR Digital Hub";

  const W = 13.33, H = 7.5;
  const now  = new Date();
  const year = now.getFullYear();
  const { metrics: m, departments, positions, employees } = data;

  // Helper: filter by section date range
  function filterByDate<T extends { created_at?: string }>(arr: T[], key: keyof SectionConfig): T[] {
    const s = sections[key];
    if (!s.from || !s.to) return arr;
    return arr.filter(e => {
      const d = (e.created_at || "").slice(0, 10);
      return d >= s.from && d <= s.to;
    });
  }

  // Build a readable period label per section
  function periodLabel(key: keyof SectionConfig) {
    const s = sections[key];
    return s.from && s.to ? `${s.from} → ${s.to}` : `Full Year ${year}`;
  }

  // Overall date label for cover (use overview or first enabled section)
  const firstEnabled = (Object.keys(sections) as (keyof SectionConfig)[]).find(k => sections[k].enabled);
  const dateLabel = firstEnabled ? periodLabel(firstEnabled) : `Full Year ${year}`;
  const footerText = `NCBA Rwanda · HR Digital Hub · ${dateLabel}`;

  // Derived data
  const filteredEmps = filterByDate(employees, "employees");
  const genderMale   = employees.filter((e: any) => e.gender === "male").length;
  const genderFemale = employees.filter((e: any) => e.gender === "female").length;
  const genderNone   = employees.length - genderMale - genderFemale;
  const permanent    = employees.filter((e: any) => e.employment_type === "permanent").length;
  const temporary    = employees.filter((e: any) => e.employment_type === "temporary").length;

  // Staff by department
  const deptEmpMap: Record<string, number> = {};
  departments.forEach((d: any) => { deptEmpMap[d.name] = 0; });
  positions.forEach((p: any) => {
    if (!p.is_vacant) {
      const dept = departments.find((d: any) => d.id === p.department_id)?.name;
      if (dept) deptEmpMap[dept] = (deptEmpMap[dept] || 0) + 1;
    }
  });
  const staffByDept = Object.entries(deptEmpMap)
    .map(([name, count]) => ({ name, count }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Leave by department — computed from approved records (year-filtered)
  const leaveByDept: Record<string, number> = {};
  if (data.leaveSummary?.employees) {
    data.leaveSummary.employees.forEach((e: any) => {
      const approvedRecords = (e.records || []).filter((r: any) => r.status === "approved");
      const totalUsed = approvedRecords.reduce((s: number, r: any) => s + (r.days_taken || 0), 0);
      if (totalUsed > 0) {
        const emp = employees.find((em: any) => em.email === e.email);
        if (emp) {
          const pos = positions.find((p: any) => !p.is_vacant && (p as any).employee_id === emp.id);
          const dept = pos ? departments.find((d: any) => d.id === pos.department_id)?.name : undefined;
          leaveByDept[dept || "Unknown"] = (leaveByDept[dept || "Unknown"] || 0) + totalUsed;
        }
      }
    });
  }
  const leaveByDeptRows = Object.entries(leaveByDept)
    .filter(([_, v]) => v > 0)
    .map(([name, total_days]) => ({ name, total_days }))
    .sort((a, b) => b.total_days - a.total_days)
    .slice(0, 10);

  // Leave types total — sum from actual approved leave RECORDS (not allocations)
  // Records are year-filtered by the backend; allocations.used_days accumulates across all time
  const leaveTotals = { annual: 0, sick: 0, maternity: 0, paternity: 0, compassionate: 0 };
  (data.leaveSummary?.employees ?? []).forEach((e: any) => {
    // Prefer records (actual leave taken, year-filtered by backend)
    const approvedRecords = (e.records || []).filter((r: any) => r.status === "approved");
    if (approvedRecords.length > 0) {
      approvedRecords.forEach((r: any) => {
        const lt = r.leave_type as keyof typeof leaveTotals;
        if (lt in leaveTotals) leaveTotals[lt] += r.days_taken || 0;
      });
    } else {
      // Fallback to allocations only when no records exist yet
      (e.allocations || []).forEach((a: any) => {
        const lt = a.leave_type as keyof typeof leaveTotals;
        if (lt in leaveTotals) leaveTotals[lt] += a.used_days || 0;
      });
    }
  });

  // Performance by department (from performanceSummary if available)
  const perfByDept: { dept: string; avg: number; count: number }[] = [];
  if (data.performanceSummary?.employees) {
    const deptRatings: Record<string, number[]> = {};
    data.performanceSummary.employees.forEach((e: any) => {
      (e.reviews || []).filter((r: any) => !r.is_draft).forEach((r: any) => {
        // Find dept from position
        const emp   = employees.find((em: any) => em.id === e.employee_id);
        const dept  = "General"; // fallback — without position join
        deptRatings[dept] = [...(deptRatings[dept] || []), r.rating];
      });
    });
    Object.entries(deptRatings).forEach(([dept, ratings]) => {
      const avg = ratings.reduce((s, v) => s + v, 0) / ratings.length;
      perfByDept.push({ dept, avg, count: ratings.length });
    });
  }
  // Use deptBar department names for chart reference
  void m.deptBar.map(d => d.name);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function addSlide(title: string, subtitle?: string) {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    // Left accent
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.07, h: H, fill: { color: C.cyan } });
    // Header
    s.addShape(pptx.ShapeType.rect, { x: 0.07, y: 0, w: W - 0.07, h: 1.05, fill: { color: C.navy } });
    s.addText(title, {
      x: 0.22, y: 0.12, w: W - 1.2, h: 0.55,
      fontSize: 22, bold: true, color: C.white, fontFace: "Arial",
    });
    if (subtitle) {
      s.addText(subtitle, {
        x: 0.22, y: 0.65, w: W - 1.2, h: 0.3,
        fontSize: 10, color: C.mid, fontFace: "Arial",
      });
    }
    // Date range badge
    s.addShape(pptx.ShapeType.roundRect, {
      x: W - 3.2, y: 0.18, w: 3.0, h: 0.3,
      fill: { color: C.navyLt }, line: { color: C.cyan, pt: 1 },
    });
    s.addText(dateLabel, {
      x: W - 3.2, y: 0.18, w: 3.0, h: 0.3,
      fontSize: 8, color: C.cyan, fontFace: "Arial", align: "center",
    });
    // Footer
    s.addText(footerText, {
      x: 0.22, y: H - 0.26, w: W - 0.44, h: 0.2,
      fontSize: 7, color: C.mid, fontFace: "Arial", align: "right",
    });
    return s;
  }

  function metricBox(s: any, x: number, y: number, w: number, h: number,
    label: string, value: string, accent: string, sub?: string) {
    s.addShape(pptx.ShapeType.rect, { x: x + 0.025, y: y + 0.025, w, h, fill: { color: C.light2 } });
    s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: C.white }, line: { color: C.light2, pt: 0.5 } });
    s.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.06, fill: { color: accent } });
    s.addText(label.toUpperCase(), {
      x: x + 0.1, y: y + 0.1, w: w - 0.2, h: 0.22,
      fontSize: 7, bold: true, color: C.dark, fontFace: "Arial", charSpacing: 1,
    });
    s.addText(value, {
      x: x + 0.1, y: y + 0.3, w: w - 0.2, h: 0.6,
      fontSize: 30, bold: true, color: C.navy, fontFace: "Arial",
    });
    if (sub) s.addText(sub, {
      x: x + 0.1, y: y + 0.88, w: w - 0.2, h: 0.2,
      fontSize: 7.5, color: C.dark, fontFace: "Arial",
    });
  }

  function interpretation(s: any, text: string, yPos = 6.55) {
    if (!text) return;
    s.addShape(pptx.ShapeType.rect, {
      x: 0.22, y: yPos, w: W - 0.44, h: 0.7,
      fill: { color: "EFF6FF" }, line: { color: "BFDBFE", pt: 0.75 },
    });
    s.addShape(pptx.ShapeType.rect, {
      x: 0.22, y: yPos, w: 0.06, h: 0.7, fill: { color: C.cyan },
    });
    s.addText("📊 Insight: " + text, {
      x: 0.35, y: yPos + 0.05, w: W - 0.65, h: 0.6,
      fontSize: 8.5, color: C.navy, fontFace: "Arial", italic: false,
    });
  }

  function hBar(s: any, rows: { name: string; value: number }[],
    x: number, y: number, w: number, h: number, color: string, maxVal?: number) {
    const max = maxVal ?? Math.max(...rows.map(r => r.value), 1);
    const rowH = h / rows.length;
    rows.forEach((r, i) => {
      const barW = (w - 2.2) * (r.value / max);
      const ry   = y + i * rowH;
      // bg track
      s.addShape(pptx.ShapeType.rect, {
        x: x + 2.0, y: ry + 0.05, w: w - 2.2, h: rowH - 0.1,
        fill: { color: C.light }, line: { color: C.light },
      });
      // bar
      if (r.value > 0) s.addShape(pptx.ShapeType.rect, {
        x: x + 2.0, y: ry + 0.05, w: Math.max(barW, 0.05), h: rowH - 0.1,
        fill: { color: color },
      });
      // label
      s.addText(r.name.length > 22 ? r.name.slice(0, 21) + "…" : r.name, {
        x, y: ry + 0.07, w: 1.9, h: rowH - 0.14,
        fontSize: 8, color: C.navy, fontFace: "Arial", align: "right",
      });
      // value
      s.addText(String(r.value), {
        x: x + 2.05 + barW, y: ry + 0.07, w: 0.6, h: rowH - 0.14,
        fontSize: 8, bold: true, color: C.navy, fontFace: "Arial",
      });
    });
  }

  function vBar(s: any, rows: { name: string; value: number; color?: string }[],
    x: number, y: number, w: number, h: number, defaultColor: string) {
    const max  = Math.max(...rows.map(r => r.value), 1);
    const barW = (w / rows.length) * 0.68;
    const gap  = (w / rows.length) * 0.32;
    rows.forEach((r, i) => {
      const bx  = x + i * (barW + gap) + gap / 2;
      const bh  = h * (r.value / max);
      const col = r.color ?? defaultColor;
      if (r.value > 0) s.addShape(pptx.ShapeType.rect, {
        x: bx, y: y + h - bh, w: barW, h: bh, fill: { color: col },
      });
      s.addText(String(r.value), {
        x: bx, y: y + h - bh - 0.2, w: barW, h: 0.18,
        fontSize: 7.5, bold: true, color: C.navy, fontFace: "Arial", align: "center",
      });
      const lbl = r.name.length > 9 ? r.name.slice(0, 8) + "…" : r.name;
      s.addText(lbl, {
        x: bx - 0.05, y: y + h + 0.04, w: barW + 0.1, h: 0.28,
        fontSize: 7, color: C.dark, fontFace: "Arial", align: "center", rotate: 315,
      });
    });
  }

  function addTable(s: any, x: number, y: number, w: number,
    headers: string[], rows: (string|number)[][], maxRows = 15) {
    const hRow = headers.map(h => ({
      text: h,
      options: { bold: true, color: C.white, fill: C.navy, fontSize: 8.5, fontFace: "Arial", align: "center" as const },
    }));
    const dRows = rows.slice(0, maxRows).map((row, ri) => row.map(cell => ({
      text: String(cell ?? ""),
      options: { fontSize: 8, fontFace: "Arial", fill: ri % 2 === 0 ? C.white : C.light, color: C.navy,
        border: [{ pt: 0.3, color: C.light2 }] },
    })));
    s.addTable([hRow, ...dRows], { x, y, w, rowH: 0.22, colW: headers.map(() => w / headers.length) });
  }

  // ── Pie chart (proportional stacked squares + legend) ────────────────────
  // pptxgenjs has no native pie — we draw a segmented rectangle as a pie proxy,
  // plus a clean legend with percentages.
  function drawPie(
    s: any,
    slices: { label: string; value: number; color: string }[],
    x: number, y: number, size: number,  // x/y = top-left of the pie square
    legendX: number, legendY: number, legendW: number
  ) {
    const total = slices.filter(sl => sl.value > 0).reduce((a, b) => a + b.value, 0);
    if (total === 0) return;
    const active = slices.filter(sl => sl.value > 0);

    // Draw segmented circle approximation using stacked horizontal arcs
    // We tile the square with proportional colored segments top-to-bottom
    let yOff = 0;
    active.forEach((sl, _idx) => {
      const segH = size * (sl.value / total);
      if (segH < 0.01) return;
      s.addShape(pptx.ShapeType.ellipse, {
        x: x, y: y + yOff,
        w: size, h: segH,
        fill: { color: sl.color },
        line: { color: sl.color, pt: 0 },
      });
      // Add % label inside large segments
      const pct = Math.round((sl.value / total) * 100);
      if (segH > 0.25) {
        s.addText(`${pct}%`, {
          x: x, y: y + yOff + segH / 2 - 0.1,
          w: size, h: 0.22,
          fontSize: pct > 15 ? 11 : 8,
          bold: true, color: C.white, fontFace: "Arial", align: "center",
        });
      }
      yOff += segH;
    });

    // Legend
    active.forEach((sl, i) => {
      const pct = Math.round((sl.value / total) * 100);
      const ly  = legendY + i * 0.35;
      s.addShape(pptx.ShapeType.ellipse, {
        x: legendX, y: ly + 0.04, w: 0.18, h: 0.18, fill: { color: sl.color },
      });
      s.addText(`${sl.label}: ${sl.value} (${pct}%)`, {
        x: legendX + 0.24, y: ly, w: legendW, h: 0.28,
        fontSize: 8.5, color: C.navy, fontFace: "Arial",
      });
    });
  }

  // ── SLIDE 1: Cover ─────────────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.navy };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.55, h: H, fill: { color: C.cyan } });
    s.addShape(pptx.ShapeType.rect, { x: W - 4.2, y: 0, w: 4.2, h: H, fill: { color: "162032" } });

    s.addText("NCBA RWANDA", { x: 0.75, y: 1.4, w: 8.5, h: 0.45,
      fontSize: 13, bold: true, color: C.cyan, fontFace: "Arial", charSpacing: 7 });
    s.addText("HR Analytics Report", { x: 0.75, y: 1.9, w: 8.5, h: 1.3,
      fontSize: 40, bold: true, color: C.white, fontFace: "Arial" });
    s.addText(dateLabel, { x: 0.75, y: 3.25, w: 8.5, h: 0.4,
      fontSize: 14, color: C.mid, fontFace: "Arial" });
    s.addText(`Generated: ${now.toLocaleDateString("en-GB", { day:"numeric",month:"long",year:"numeric" })} · ${filteredEmps.length} employees in period`,
      { x: 0.75, y: 6.85, w: 8, h: 0.28, fontSize: 9, color: C.dark, fontFace: "Arial" });

    // Right stat panel
    const stats = [
      { label: "Departments", val: departments.length },
      { label: "Positions",   val: positions.length   },
      { label: "Employees",   val: employees.length   },
    ];
    stats.forEach(({ label, val }, i) => {
      const sy = 1.4 + i * 1.55;
      s.addText(String(val), { x: W - 3.8, y: sy, w: 3.5, h: 1.0,
        fontSize: 56, bold: true, color: C.cyan, fontFace: "Arial", align: "center" });
      s.addText(label, { x: W - 3.8, y: sy + 1.0, w: 3.5, h: 0.3,
        fontSize: 11, color: C.mid, fontFace: "Arial", align: "center" });
    });
  }

  // ── SLIDE 2: Executive Summary ─────────────────────────────────────────────
  if (sections.overview.enabled) {
    const s = addSlide("Executive Summary", `Key workforce indicators · ${periodLabel("overview")}`);
    const boxes = [
      { label: "Total Employees",  value: String(employees.length),       accent: C.sky,    sub: `${permanent} permanent · ${temporary} temporary` },
      { label: "Active Staff",     value: String(m.active),               accent: C.green,  sub: `${Math.round((m.active/Math.max(employees.length,1))*100)}% activity rate` },
      { label: "Positions Filled", value: `${m.fillRate.toFixed(0)}%`,    accent: C.violet, sub: `${m.filled} of ${positions.length}` },
      { label: "Open Vacancies",   value: String(m.vacant),               accent: C.red,    sub: "Positions to fill" },
      { label: "Departments",      value: String(departments.length),      accent: C.amber,  sub: `${departments.filter((d:any)=>!d.parent_id).length} root divisions` },
      { label: "Male / Female",    value: `${genderMale}/${genderFemale}`, accent: C.cyan,  sub: genderMale + genderFemale > 0 ? `${Math.round(genderMale/(genderMale+genderFemale)*100)}% male` : "Gender not recorded" },
    ];
    const bw = 3.78, bh = 1.2, gap = 0.15, yS = 1.2;
    boxes.forEach((b, i) => {
      metricBox(s, 0.22 + (i % 3) * (bw + gap), yS + Math.floor(i / 3) * (bh + gap), bw, bh, b.label, b.value, b.accent, b.sub);
    });
    const active_rate = Math.round((m.active / Math.max(employees.length, 1)) * 100);
    interpretation(s, `${employees.length} employees across ${departments.length} departments. Active workforce rate is ${active_rate}%. ${m.vacant} open positions represent ${Math.round((m.vacant/Math.max(positions.length,1))*100)}% of the total position pool — ${m.vacant > 10 ? "recruitment should be prioritised" : "recruitment pipeline is manageable"}.`);
  }

  // ── SLIDE 3: Gender (part of employees section) ─────────────────────────────
  if (sections.gender.enabled) {
    const s = addSlide("Gender Distribution", "Workforce composition by gender");
    const total = genderMale + genderFemale + genderNone;

    // Summary boxes
    const boxes = [
      { label: "Male Employees",    value: String(genderMale),   accent: C.blue,  sub: total > 0 ? `${Math.round(genderMale/total*100)}% of workforce` : "" },
      { label: "Female Employees",  value: String(genderFemale), accent: C.pink,  sub: total > 0 ? `${Math.round(genderFemale/total*100)}% of workforce` : "" },
      { label: "Not Specified",     value: String(genderNone),   accent: C.mid,   sub: "Update profile to record" },
    ];
    const bw = 3.78, bh = 1.15;
    boxes.forEach((b, i) => metricBox(s, 0.22 + i * (bw + 0.13), 1.2, bw, bh, b.label, b.value, b.accent, b.sub));

    // Proportional visual bar (gender)
    const barY = 2.6, barH = 0.55;
    s.addShape(pptx.ShapeType.rect, { x: 0.22, y: barY, w: W - 0.44, h: barH, fill: { color: C.light } });
    if (total > 0) {
      const mW = ((W - 0.44) * genderMale / total);
      const fW = ((W - 0.44) * genderFemale / total);
      if (mW > 0) { s.addShape(pptx.ShapeType.rect, { x: 0.22, y: barY, w: mW, h: barH, fill: { color: C.blue } }); }
      if (fW > 0) { s.addShape(pptx.ShapeType.rect, { x: 0.22 + mW, y: barY, w: fW, h: barH, fill: { color: C.pink } }); }
      if (mW > 0.5) s.addText(`♂ Male ${Math.round(genderMale/total*100)}%`, { x: 0.3, y: barY + 0.12, w: mW - 0.15, h: 0.3, fontSize: 11, bold: true, color: C.white, fontFace: "Arial" });
      if (fW > 0.5) s.addText(`♀ Female ${Math.round(genderFemale/total*100)}%`, { x: 0.22 + mW + 0.05, y: barY + 0.12, w: fW - 0.15, h: 0.3, fontSize: 11, bold: true, color: C.white, fontFace: "Arial" });
    }

    // Gender by employment type bars (left half)
    s.addText("Gender by Contract Type", { x: 0.22, y: 3.35, w: 6.5, h: 0.3, fontSize: 10, bold: true, color: C.navy, fontFace: "Arial" });
    const permMale   = employees.filter((e:any) => e.employment_type === "permanent" && e.gender === "male").length;
    const permFemale = employees.filter((e:any) => e.employment_type === "permanent" && e.gender === "female").length;
    const tempMale   = employees.filter((e:any) => e.employment_type === "temporary"  && e.gender === "male").length;
    const tempFemale = employees.filter((e:any) => e.employment_type === "temporary"  && e.gender === "female").length;
    const contractRows = [
      { name: "Perm. Male",   value: permMale,   color: C.blue   },
      { name: "Perm. Female", value: permFemale, color: C.pink   },
      { name: "Temp. Male",   value: tempMale,   color: "93C5FD" },
      { name: "Temp. Female", value: tempFemale, color: "F9A8D4" },
    ];
    vBar(s, contractRows, 0.22, 3.7, 6.5, 2.3, C.cyan);

    // Gender pie chart (right half)
    s.addText("Gender Split", { x: 7.5, y: 3.35, w: 5.5, h: 0.3, fontSize: 10, bold: true, color: C.navy, fontFace: "Arial", align: "center" });
    drawPie(s, [
      { label: "Male",          value: genderMale,   color: C.blue },
      { label: "Female",        value: genderFemale, color: C.pink },
      { label: "Not Specified", value: genderNone,   color: C.mid  },
    ], 8.3, 3.75, 2.2, 7.6, 4.2, 4.8);

    interpretation(s, interpret("gender", { male: genderMale, female: genderFemale, none: genderNone }));
  }

  // ── SLIDE 4: Staff by Department ───────────────────────────────────────────
  if (sections.departments.enabled) {
    const s = addSlide("Staff by Department", `Number of filled positions per department · ${periodLabel("departments")}`);
    const rows = staffByDept.map((r, i) => ({ name: r.name, value: r.count, color: BAR_COLORS[i % BAR_COLORS.length] }));
    if (rows.length > 0) {
      hBar(s, rows.map(r => ({ name: r.name, value: r.value })), 0.22, 1.2, W - 0.44, 4.5, C.cyan);
    } else {
      s.addText("No staffed positions found.", { x: 0.22, y: 3.5, w: W - 0.44, h: 0.4, fontSize: 11, color: C.dark, fontFace: "Arial", align: "center" });
    }
    interpretation(s, interpret("staff_by_dept", { rows: staffByDept }));
  }

  // ── SLIDE 5: Position Fill Rate by Department ──────────────────────────────
  if (sections.positions.enabled) {
    const s = addSlide("Position Fill Rate by Department", "Filled vs vacant positions across departments");
    const maxVal = Math.max(...m.deptBar.map(r => r.Filled + r.Vacant), 1);
    const chartX = 0.22, chartY = 1.2, chartW = W - 0.44, chartH = 4.6;
    const barW   = (chartW / Math.max(m.deptBar.length, 1)) * 0.65;
    const gap    = (chartW / Math.max(m.deptBar.length, 1)) * 0.35;

    m.deptBar.forEach((d, i) => {
      const x   = chartX + i * (barW + gap) + gap / 2;
      const total = d.Filled + d.Vacant;
      const fH  = chartH * (d.Filled / maxVal);
      const vH  = chartH * (d.Vacant  / maxVal);
      if (d.Filled > 0) s.addShape(pptx.ShapeType.rect, { x, y: chartY + chartH - fH, w: barW, h: fH, fill: { color: C.green } });
      if (d.Vacant  > 0) s.addShape(pptx.ShapeType.rect, { x, y: chartY + chartH - fH - vH, w: barW, h: vH, fill: { color: C.red } });
      s.addText(String(total), { x, y: chartY + chartH - fH - vH - 0.2, w: barW, h: 0.18, fontSize: 7.5, bold: true, color: C.navy, fontFace: "Arial", align: "center" });
      const lbl = d.name.length > 9 ? d.name.slice(0, 8) + "…" : d.name;
      s.addText(lbl, { x: x - 0.05, y: chartY + chartH + 0.05, w: barW + 0.1, h: 0.28, fontSize: 7, color: C.dark, fontFace: "Arial", align: "center", rotate: 315 });
    });

    // Legend
    s.addShape(pptx.ShapeType.rect, { x: 0.22, y: 6.38, w: 0.18, h: 0.12, fill: { color: C.green } });
    s.addText("Filled", { x: 0.45, y: 6.36, w: 1.2, h: 0.18, fontSize: 8.5, color: C.dark, fontFace: "Arial" });
    s.addShape(pptx.ShapeType.rect, { x: 1.8, y: 6.38, w: 0.18, h: 0.12, fill: { color: C.red } });
    s.addText("Vacant", { x: 2.03, y: 6.36, w: 1.2, h: 0.18, fontSize: 8.5, color: C.dark, fontFace: "Arial" });

    interpretation(s, interpret("vacancy", { fillRate: m.fillRate, vacant: m.vacant, filled: m.filled }));
  }

  // ── SLIDE 6: Employment Contract Split ────────────────────────────────────
  if (sections.employees.enabled) {
    const s = addSlide("Contract Type Distribution", "Permanent vs temporary employment contracts");
    const total = permanent + temporary || 1;

    // Big boxes
    metricBox(s, 0.22, 1.2, 5.5, 1.5, "Permanent Staff", String(permanent), C.green, `${Math.round(permanent/total*100)}% of workforce — entitled to 21 days annual leave`);
    metricBox(s, 6.5,  1.2, 6.5, 1.5, "Temporary Staff", String(temporary), C.amber, `${Math.round(temporary/total*100)}% of workforce — entitled to 18 days annual leave`);

    // Proportion bar
    const bY = 2.95, bH = 0.7;
    s.addShape(pptx.ShapeType.rect, { x: 0.22, y: bY, w: W - 0.44, h: bH, fill: { color: C.light } });
    const pW = (W - 0.44) * (permanent / total);
    if (pW > 0) { s.addShape(pptx.ShapeType.rect, { x: 0.22, y: bY, w: pW, h: bH, fill: { color: C.green } }); }
    if (W - 0.44 - pW > 0) { s.addShape(pptx.ShapeType.rect, { x: 0.22 + pW, y: bY, w: W - 0.44 - pW, h: bH, fill: { color: C.amber } }); }
    if (pW > 1) s.addText(`Permanent ${Math.round(permanent/total*100)}%`, { x: 0.3, y: bY + 0.18, w: pW - 0.15, h: 0.35, fontSize: 13, bold: true, color: C.white, fontFace: "Arial" });
    if (W - 0.44 - pW > 1) s.addText(`Temporary ${Math.round(temporary/total*100)}%`, { x: 0.22 + pW + 0.05, y: bY + 0.18, w: W - 0.44 - pW - 0.1, h: 0.35, fontSize: 13, bold: true, color: C.white, fontFace: "Arial" });

    // Contract summary table
    addTable(s, 0.22, 3.8, W - 0.44,
      ["Contract Type", "Count", "% of Total", "Annual Leave", "Probation"],
      [
        ["Permanent", permanent, `${Math.round(permanent/total*100)}%`, "21 days/year", "3 months"],
        ["Temporary", temporary, `${Math.round(temporary/total*100)}%`, "18 days/year", "N/A"],
      ], 5);

    interpretation(s, interpret("contract_split", { permanent, temporary }));
  }

  // ── SLIDE 7: Leave by Department (only when real dept data exists) ─────────
  if (sections.leave.enabled) {
    // Only include real rows — exclude "Unknown" which means department couldn't be resolved
    const realDeptRows = leaveByDeptRows.filter(r => r.name !== "Unknown" && r.total_days > 0);
    const totalLeaveAllDepts = Object.values(leaveTotals).reduce((a, b) => a + b, 0);

    if (realDeptRows.length > 0) {
      // Have real department data — show horizontal bar chart
      const s = addSlide("Leave Days by Department", "Total leave days taken per department · All leave types combined");
      hBar(s, realDeptRows.map(r => ({ name: r.name, value: r.total_days })), 0.22, 1.2, W - 0.44, 4.5, C.violet);
      interpretation(s, interpret("leave_by_dept", { rows: realDeptRows }));
    } else if (totalLeaveAllDepts > 0) {
      // Have leave data but no dept mapping — show leave by type instead
      const s = addSlide("Leave Utilisation by Type", "No department mapping available — showing leave breakdown by type");
      const leaveTypeRows = [
        { name: "Annual",        value: leaveTotals.annual,        color: C.cyan   },
        { name: "Sick",          value: leaveTotals.sick,          color: C.amber  },
        { name: "Maternity",     value: leaveTotals.maternity,     color: C.pink   },
        { name: "Paternity",     value: leaveTotals.paternity,     color: C.blue   },
        { name: "Compassionate", value: leaveTotals.compassionate, color: C.violet },
      ].filter(r => r.value > 0);
      if (leaveTypeRows.length > 0) {
        vBar(s, leaveTypeRows, 1.5, 2.2, W - 3, 3.5, C.violet);
      }
      interpretation(s, `Total leave days taken: ${totalLeaveAllDepts}. Assign employees to positions to enable department-level leave tracking.`);
    }
    // If no leave data at all — skip slide entirely (no empty/confusing chart)
  }

  // ── SLIDE 8: Leave Types Analysis (only when leave data exists) ────────────
  const totalLeaveForSlide8 = Object.values(leaveTotals).reduce((a, b) => a + b, 0);
  if (sections.leave.enabled && totalLeaveForSlide8 > 0) {
    const s = addSlide("Leave Utilisation Analysis", "Breakdown by leave type · Annual vs sick vs statutory");

    const leaveRows = [
      { name: "Annual Leave",        value: leaveTotals.annual,        color: C.cyan   },
      { name: "Sick Leave",          value: leaveTotals.sick,          color: C.amber  },
      { name: "Maternity Leave",     value: leaveTotals.maternity,     color: C.pink   },
      { name: "Paternity Leave",     value: leaveTotals.paternity,     color: C.blue   },
      { name: "Compassionate Leave", value: leaveTotals.compassionate, color: C.violet },
    ];
    const totalLeave = leaveRows.reduce((s, r) => s + r.value, 0);

    // Metric boxes
    const bw = 2.35;
    leaveRows.forEach((r, i) => {
      metricBox(s, 0.22 + i * (bw + 0.08), 1.2, bw, 1.1,
        r.name.replace(" Leave",""), String(r.value),
        r.color, totalLeave > 0 ? `${Math.round(r.value/totalLeave*100)}% of total` : "0 days");
    });

    // Proportional stacked bar
    const barY = 2.5, barH = 0.65;
    s.addShape(pptx.ShapeType.rect, { x: 0.22, y: barY, w: W - 0.44, h: barH, fill: { color: C.light } });
    let xOff = 0.22;
    leaveRows.filter(r => r.value > 0).forEach(r => {
      const rW = (W - 0.44) * (r.value / Math.max(totalLeave, 1));
      s.addShape(pptx.ShapeType.rect, { x: xOff, y: barY, w: rW, h: barH, fill: { color: r.color } });
      if (rW > 0.6) s.addText(`${Math.round(r.value/totalLeave*100)}%`, {
        x: xOff + 0.05, y: barY + 0.18, w: rW - 0.1, h: 0.3,
        fontSize: 10, bold: true, color: C.white, fontFace: "Arial", align: "center",
      });
      xOff += rW;
    });

    // Leave per employee table (left 60%)
    const leaveTable = (data.leaveSummary?.employees ?? []).slice(0, 10).map((e: any) => {
      const an = e.allocations?.find((a: any) => a.leave_type === "annual");
      return [e.employee_name, e.employment_type ?? "—", String(e.annual_entitlement), String(an?.used_days ?? 0), String(an?.remaining ?? e.annual_entitlement)];
    });
    if (leaveTable.length > 0) {
      addTable(s, 0.22, 3.3, 7.5, ["Employee","Contract","Entitlement","Used","Remaining"], leaveTable, 10);
    }

    // Leave type pie chart (right 35%)
    s.addText("Leave Type Split", { x: 8.0, y: 3.25, w: 5.0, h: 0.3, fontSize: 10, bold: true, color: C.navy, fontFace: "Arial", align: "center" });
    drawPie(s, [
      { label: "Annual",        value: leaveTotals.annual,        color: C.cyan   },
      { label: "Sick",          value: leaveTotals.sick,          color: C.amber  },
      { label: "Maternity",     value: leaveTotals.maternity,     color: C.pink   },
      { label: "Paternity",     value: leaveTotals.paternity,     color: C.blue   },
      { label: "Compassionate", value: leaveTotals.compassionate, color: C.violet },
    ], 8.9, 3.65, 1.8, 7.9, 3.85, 4.8);

    interpretation(s, interpret("leave_types", leaveTotals));
  }

  // ── SLIDE 9: Performance by Department ────────────────────────────────────
  if (sections.performance.enabled) {
    const s = addSlide("Performance Ratings", "Average performance scores by department · Scale: 1 (Unsatisfactory) to 5 (Outstanding)");

    const ratingLabels: Record<number, string> = {
      5: "Outstanding", 4: "Exceeded", 3: "Succeeded", 2: "Meets Some", 1: "Unsatisfactory"
    };
    const ratingColors: Record<number, string> = {
      5: C.green, 4: C.cyan, 3: C.blue, 2: C.amber, 1: C.red,
    };

    // If we have actual perf data
    if (data.performanceSummary?.employees?.length > 0) {
      // Rating distribution
      const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      let totalRated = 0;
      data.performanceSummary.employees.forEach((e: any) => {
        (e.reviews || []).filter((r: any) => !r.is_draft).forEach((r: any) => {
          if (r.rating >= 1 && r.rating <= 5) { dist[r.rating]++; totalRated++; }
        });
      });

      // Rating summary boxes
      const bw = 2.35;
      [5,4,3,2,1].forEach((rating, i) => {
        const count = dist[rating];
        metricBox(s, 0.22 + i * (bw + 0.08), 1.2, bw, 1.1,
          `Rating ${rating} — ${ratingLabels[rating]}`, String(count), ratingColors[rating],
          totalRated > 0 ? `${Math.round(count/totalRated*100)}% of reviews` : "No reviews");
      });

      // Rating distribution bar
      const distRows = [5,4,3,2,1].map(r => ({ name: `${r} — ${ratingLabels[r]}`, value: dist[r], color: ratingColors[r] })).filter(r => r.value > 0);
      hBar(s, distRows.map(r => ({ name: r.name, value: r.value })), 0.22, 2.55, W - 0.44, 3.5, C.cyan);
      interpretation(s, interpret("perf_by_dept", { rows: perfByDept }));
    } else {
      // No performance data — show placeholder with scale guide
      s.addText("No finalised performance reviews found.", {
        x: 0.22, y: 2.0, w: W - 0.44, h: 0.4, fontSize: 14, bold: true, color: C.navy, fontFace: "Arial", align: "center",
      });
      s.addText("To populate this slide, conduct Mid-Year or End-of-Year performance reviews in the Performance module.", {
        x: 0.5, y: 2.6, w: W - 1.0, h: 0.5, fontSize: 11, color: C.dark, fontFace: "Arial", align: "center",
      });
      // Show the rating scale guide
      s.addText("Performance Rating Scale", { x: 0.22, y: 3.4, w: W - 0.44, h: 0.35, fontSize: 12, bold: true, color: C.navy, fontFace: "Arial" });
      addTable(s, 0.22, 3.85, W - 0.44,
        ["Rating", "Label", "Description"],
        [
          ["5", "Outstanding",           "Consistently exceeds all expectations — exemplary performance"],
          ["4", "Exceeded Expectations", "Surpasses most targets and adds extra value to the team"],
          ["3", "Succeeded",             "Meets all set objectives and delivers solid results"],
          ["2", "Meets Some Expectations","Partially achieves targets — needs guidance and improvement"],
          ["1", "Unsatisfactory",        "Falls significantly short of expectations — requires intervention"],
        ], 7);
      interpretation(s, "Performance reviews have not yet been conducted for this period. Use the Performance module to begin mid-year or end-of-year reviews and unlock department-level performance insights.");
    }
  }

  // ── SLIDE 10: Organisational Structure Summary ─────────────────────────────
  if (sections.departments.enabled) {
    const s = addSlide("Organisational Structure", "Departments, hierarchy and position summary");
    addTable(s, 0.22, 1.2, W - 0.44,
      ["Department", "Parent", "Filled", "Vacant", "Total", "Fill Rate"],
      m.deptBar.map(d => [
        d.name,
        departments.find((dep: any) => {
          const found = departments.find((dd: any) => dd.name === d.name);
          return found && dep.id === found.parent_id;
        })?.name ?? "Root",
        d.Filled, d.Vacant, d.Filled + d.Vacant,
        `${Math.round(d.Filled / Math.max(d.Filled + d.Vacant, 1) * 100)}%`,
      ]), 18);
    const topDept = [...m.deptBar].sort((a, b) => (b.Filled + b.Vacant) - (a.Filled + a.Vacant))[0];
    const intText = topDept
      ? `${topDept.name} is the largest department with ${topDept.Filled + topDept.Vacant} positions (${topDept.Filled} filled, ${topDept.Vacant} vacant). Overall organisation fill rate is ${m.fillRate.toFixed(0)}% — ${m.fillRate >= 85 ? "indicating a well-staffed organisation" : "suggesting active recruitment is needed to reach optimal capacity"}.`
      : "No department data available.";
    interpretation(s, intText);
  }

  // ── SLIDE E: Exit Analysis ────────────────────────────────────────────────
  if (sections.exits?.enabled && data.exitSummary) {
    const es = data.exitSummary;
    const exits: any[] = es.exits ?? [];
    if (exits.length > 0) {
      const s = addSlide("Employee Exit Analysis", `Departures by reason, type and department · ${periodLabel("exits")}`);

      // KPI boxes
      const ekpis = [
        { label: "Total Exits",       value: String(es.total ?? 0),                           accent: C.dark  },
        { label: "Resignations",      value: String(es.by_reason?.resignation ?? 0),           accent: C.amber },
        { label: "Terminations",      value: String(es.by_reason?.termination ?? 0),           accent: C.red   },
        { label: "End of Contract",   value: String(es.by_reason?.end_of_contract ?? 0),       accent: C.sky   },
        { label: "Regrettable",       value: String(es.by_type?.regrettable ?? 0),             accent: C.violet},
      ];
      const ekw = 2.4, ekh = 1.0, ekg = 0.1;
      ekpis.forEach((k, i) => metricBox(s, 0.22 + i * (ekw + ekg), 1.2, ekw, ekh, k.label, k.value, k.accent));

      // Exits by department — horizontal bar (left half)
      const byDept = Object.entries(es.by_department ?? {})
        .map(([name, count]) => ({ name: name.slice(0, 20), value: count as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      if (byDept.length > 0) {
        s.addText("Exits by Department", { x: 0.22, y: 2.4, w: 6.5, h: 0.3, fontSize: 10, bold: true, color: C.navy, fontFace: "Arial" });
        hBar(s, byDept, 0.22, 2.75, 6.5, Math.min(byDept.length * 0.45, 3.2), C.red);
      }

      // Exit reason + type pie (right half)
      s.addText("By Reason", { x: 7.2, y: 2.4, w: 2.8, h: 0.3, fontSize: 10, bold: true, color: C.navy, fontFace: "Arial", align: "center" });
      drawPie(s, [
        { label: "Resignation",    value: es.by_reason?.resignation     ?? 0, color: C.amber  },
        { label: "Termination",    value: es.by_reason?.termination     ?? 0, color: C.red    },
        { label: "End of Contract",value: es.by_reason?.end_of_contract ?? 0, color: C.sky    },
      ], 7.6, 2.75, 1.8, 7.1, 2.85, 5.8);

      s.addText("By Type", { x: 10.2, y: 2.4, w: 2.8, h: 0.3, fontSize: 10, bold: true, color: C.navy, fontFace: "Arial", align: "center" });
      drawPie(s, [
        { label: "Regrettable",     value: es.by_type?.regrettable     ?? 0, color: C.red     },
        { label: "Non-Regrettable", value: es.by_type?.non_regrettable ?? 0, color: C.green   },
      ], 10.6, 2.75, 1.8, 10.1, 2.85, 2.2);

      // Exit list table
      const exitRows = exits.slice(0, 8).map((e: any) => [
        e.employee_name ?? "",
        e.department_name ?? "—",
        e.exit_reason_label ?? e.exit_reason ?? "",
        e.exit_type_label   ?? e.exit_type   ?? "",
        e.exit_date ? e.exit_date.slice(0, 10) : "",
      ]);
      if (exitRows.length > 0) {
        addTable(s, 0.22, 5.9, W - 0.44,
          ["Employee", "Department", "Reason", "Type", "Date"],
          exitRows, 8);
      }

      const regPct = (es.total ?? 0) > 0 ? Math.round((es.by_type?.regrettable ?? 0) / es.total * 100) : 0;
      interpretation(s,
        `${es.total} exits recorded. ${
          (es.by_reason?.resignation ?? 0) > (es.by_reason?.termination ?? 0)
            ? "Resignations dominate — review engagement and compensation to reduce voluntary attrition."
            : "Terminations dominate — review performance management and hiring quality."
        } ${regPct}% of exits were regrettable, representing talent the organisation wished to retain.`, 6.6);
    }
  }

  // ── SLIDE T: Turnover & Retention Analysis ─────────────────────────────────
  if (sections.turnover?.enabled && data.turnoverData) {
    const td = data.turnoverData;
    const s  = addSlide("Turnover & Retention Analysis", `Workforce attrition · ${td.year} · Industry avg turnover 10–15%`);

    // ─ Row 1: 5 KPI boxes ─
    const kpis = [
      { label: "Turnover Rate",    value: `${td.turnover_rate}%`,  accent: td.turnover_rate > 15 ? C.red : td.turnover_rate > 8 ? C.amber : C.green,
        sub: td.turnover_rate <= 10 ? "✅ Healthy" : td.turnover_rate <= 20 ? "⚠️ Moderate" : "🔴 High" },
      { label: "Retention Rate",   value: `${td.retention_rate}%`, accent: td.retention_rate >= 90 ? C.green : td.retention_rate >= 80 ? C.amber : C.red,
        sub: `${td.active_now} employees retained` },
      { label: "Voluntary Exits",  value: String(td.voluntary_exits),   accent: C.amber,   sub: `${td.voluntary_rate}% voluntary rate` },
      { label: "Involuntary Exits",value: String(td.involuntary_exits),  accent: C.red,     sub: "Terminations + end of contract" },
      { label: "vs Last Year",     value: td.prev_year_exits === 0 ? "New" : `${td.yoy_change > 0 ? "+" : ""}${td.yoy_change}%`,
        accent: td.yoy_change <= 0 ? C.green : C.red,
        sub: `${td.prev_year_exits} exits in ${td.year - 1}` },
    ];
    const kw = 2.4, kh = 1.1, kg = 0.1;
    kpis.forEach((k, i) => metricBox(s, 0.22 + i * (kw + kg), 1.2, kw, kh, k.label, k.value, k.accent, k.sub));

    // ─ Row 2 left: Retention gauge ring (drawn as concentric proportion) ─
    s.addText("Retention Rate", { x: 0.22, y: 2.55, w: 4.5, h: 0.3, fontSize: 10, bold: true, color: C.navy, fontFace: "Arial", align: "center" });
    // Outer ring background
    s.addShape(pptx.ShapeType.ellipse, { x: 0.62, y: 2.95, w: 3.7, h: 3.7,
      fill: { color: C.light }, line: { color: C.light2, pt: 1 } });
    // Inner circle cutout
    s.addShape(pptx.ShapeType.ellipse, { x: 1.12, y: 3.45, w: 2.7, h: 2.7,
      fill: { color: C.white }, line: { color: C.white, pt: 0 } });
    // Filled arc approximation using proportion rect over the ring area
    const retPct = Math.min(td.retention_rate, 100) / 100;
    const ringColor = td.retention_rate >= 90 ? C.green : td.retention_rate >= 80 ? C.amber : C.red;
    // Draw filled segment on top half as a coloured ellipse clipped by inner circle
    s.addShape(pptx.ShapeType.ellipse, { x: 0.62, y: 2.95, w: 3.7, h: 3.7 * retPct,
      fill: { color: ringColor }, line: { color: ringColor, pt: 0 } });
    s.addShape(pptx.ShapeType.ellipse, { x: 1.12, y: 3.45, w: 2.7, h: 2.7,
      fill: { color: C.white }, line: { color: C.white, pt: 0 } });
    // Centre text
    s.addText(`${td.retention_rate}%`, { x: 1.12, y: 4.5, w: 2.7, h: 0.55,
      fontSize: 28, bold: true, color: ringColor, fontFace: "Arial", align: "center" });
    s.addText("Retained", { x: 1.12, y: 5.05, w: 2.7, h: 0.3,
      fontSize: 10, color: C.dark, fontFace: "Arial", align: "center" });

    // ─ Row 2 centre: Exit composition pie ─
    s.addText("Exit Composition", { x: 4.8, y: 2.55, w: 4.0, h: 0.3, fontSize: 10, bold: true, color: C.navy, fontFace: "Arial", align: "center" });
    drawPie(s, [
      { label: "Voluntary (Resignation)",   value: td.voluntary_exits,   color: C.amber  },
      { label: "Involuntary (Term/EOC)",    value: td.involuntary_exits, color: C.red    },
    ], 5.2, 2.95, 2.0, 4.85, 5.15, 3.8);

    // ─ Row 2 right: Monthly exit mini bar ─
    s.addText("Monthly Exit Trend", { x: 9.1, y: 2.55, w: 4.0, h: 0.3, fontSize: 10, bold: true, color: C.navy, fontFace: "Arial", align: "center" });
    const monthlyWithExits = (td.monthly ?? []).filter((m: any) => m.exits > 0);
    if (monthlyWithExits.length > 0) {
      const maxExits = Math.max(...monthlyWithExits.map((m: any) => m.exits), 1);
      const chartH = 2.8, chartY = 2.95, chartW = 3.8, chartX = 9.2;
      const bw2 = (chartW / monthlyWithExits.length) * 0.65;
      const bg2 = (chartW / monthlyWithExits.length) * 0.35;
      monthlyWithExits.forEach((mo: any, i: number) => {
        const bx  = chartX + i * (bw2 + bg2) + bg2 / 2;
        const bh  = chartH * (mo.exits / maxExits);
        s.addShape(pptx.ShapeType.rect, { x: bx, y: chartY + chartH - bh, w: bw2, h: bh,
          fill: { color: mo.resignations >= mo.terminations ? C.amber : C.red } });
        s.addText(String(mo.exits), { x: bx, y: chartY + chartH - bh - 0.2, w: bw2, h: 0.18,
          fontSize: 7, bold: true, color: C.navy, fontFace: "Arial", align: "center" });
        s.addText(mo.month_label, { x: bx - 0.05, y: chartY + chartH + 0.04, w: bw2 + 0.1, h: 0.25,
          fontSize: 7, color: C.dark, fontFace: "Arial", align: "center" });
      });
    } else {
      s.addText("No exits this year", { x: 9.1, y: 4.5, w: 4.0, h: 0.3,
        fontSize: 10, color: C.dark, fontFace: "Arial", align: "center" });
    }

    // ─ Dept turnover table ─
    if (td.by_department?.length > 0) {
      addTable(s, 0.22, 6.25, 8.0,
        ["Department", "Exits", "Positions", "Turnover Rate"],
        td.by_department.slice(0, 4).map((d: any) => [
          d.department, d.exits, d.positions, `${d.rate}%`
        ]), 4);
    }

    // Interpretation
    const retInsight = td.retention_rate >= 90
      ? `Excellent retention at ${td.retention_rate}% — the workforce is highly stable. Turnover rate of ${td.turnover_rate}% is below industry average.`
      : td.retention_rate >= 80
      ? `Retention rate of ${td.retention_rate}% is acceptable but warrants monitoring. ${td.voluntary_exits} voluntary exits suggest reviewing engagement and compensation strategies.`
      : `High turnover detected: ${td.turnover_rate}% rate with only ${td.retention_rate}% retention. Immediate HR intervention recommended to address compensation, management quality, and career development.`;
    interpretation(s, retInsight + (td.yoy_change > 10 ? ` Year-over-year exits increased by ${td.yoy_change}% — escalating trend requiring urgent action.` : ""), 6.6);
  }

  // ── SLIDE 11: Closing ──────────────────────────────────────────────────────
  if (Object.values(sections).some(s => s.enabled)) {
    const s = pptx.addSlide();
    s.background = { color: C.navy };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.55, h: H, fill: { color: C.cyan } });
    s.addText("Key Takeaways", { x: 0.75, y: 1.3, w: W - 1.3, h: 0.5, fontSize: 28, bold: true, color: C.white, fontFace: "Arial" });

    const takeaways = [
      `📊 ${employees.length} employees across ${departments.length} departments as of ${dateLabel}.`,
      `⚧  Gender: ${genderMale} male (${genderMale+genderFemale > 0 ? Math.round(genderMale/(genderMale+genderFemale)*100) : 0}%) · ${genderFemale} female — ${Math.abs(genderMale - genderFemale) < 5 ? "near-balanced workforce" : "gender gap present — diversity initiatives recommended"}.`,
      `🏢 Fill rate: ${m.fillRate.toFixed(0)}% · ${m.vacant} open vacancies${m.vacant > 0 ? " — targeted recruitment advised" : " — fully staffed"}.`,
      `📅 Total leave days taken: ${Object.values(leaveTotals).reduce((a, b) => a + b, 0)} · Annual leave is the highest category.`,
      `📋 ${permanent} permanent employees (${Math.round(permanent/Math.max(employees.length,1)*100)}%) · ${temporary} temporary employees.`,
      data.performanceSummary ? `⭐ Performance reviews: ${data.performanceSummary.reviewed ?? 0} completed · ${data.performanceSummary.pending ?? 0} pending.` : "⭐ No performance reviews conducted yet — launch review cycle to gather insights.",
    ];

    takeaways.forEach((t, i) => {
      s.addText(t, { x: 0.75, y: 1.95 + i * 0.68, w: W - 1.3, h: 0.55, fontSize: 11, color: i === 0 ? C.cyan : C.mid, fontFace: "Arial" });
    });

    s.addText(`NCBA Rwanda · HR Digital Hub · ${dateLabel} · Confidential`, {
      x: 0.75, y: 7.1, w: W - 1, h: 0.25, fontSize: 8, color: C.dark, fontFace: "Arial",
    });
  }

  // ── Write ──────────────────────────────────────────────────────────────────
  await pptx.writeFile({ fileName: `NCBA_HR_Analytics_${new Date().toISOString().slice(0, 10)}.pptx` });
}


// ── EXCEL EXPORT (unchanged, keep working) ────────────────────────────────────
export async function exportExcel(data: AnalyticsData, sections: SectionConfig) {
  const XLSX = await import("xlsx");
  const wb   = XLSX.utils.book_new();
  const year = new Date().getFullYear();

  function makeSheet(rows: (string|number)[][], headers: string[]): any {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));
    return ws;
  }

  const { metrics: m, departments, positions, employees } = data;

  // Filter employees by the employees section date range
  const empSection = sections.employees;
  const filteredEmps = empSection?.enabled && empSection.from
    ? employees.filter((e: any) => {
        const d = (e.created_at || "").slice(0, 10);
        return d >= empSection.from && d <= empSection.to;
      })
    : employees;

  // Build period label for summary
  const enabledSections = (Object.keys(sections) as (keyof SectionConfig)[])
    .filter(k => sections[k].enabled)
    .map(k => `${k}: ${sections[k].from} → ${sections[k].to}`)
    .join("; ");

  const permanent = employees.filter((e:any) => e.employment_type === "permanent").length;
  const temporary = employees.filter((e:any) => e.employment_type === "temporary").length;
  const genderMale   = employees.filter((e:any) => e.gender === "male").length;
  const genderFemale = employees.filter((e:any) => e.gender === "female").length;

  // 1. Summary
  const wsSummary = XLSX.utils.aoa_to_sheet([
    ["Metric", "Value"],
    ["Report Period", enabledSections || `Full Year ${year}`],
    ["Generated At", new Date().toLocaleString()],
    ["", ""],
    ["Total Departments",   departments.length],
    ["Total Positions",     positions.length],
    ["Filled Positions",    m.filled],
    ["Vacant Positions",    m.vacant],
    ["Fill Rate (%)",       parseFloat(m.fillRate.toFixed(1))],
    ["", ""],
    ["Total Employees",     employees.length],
    ["Active",              m.active],
    ["Inactive",            m.inactive],
    ["Suspended",           m.suspended],
    ["Terminated",          m.terminated],
    ["", ""],
    ["Male Employees",      genderMale],
    ["Female Employees",    genderFemale],
    ["Gender Not Specified",employees.length - genderMale - genderFemale],
    ["", ""],
    ["Permanent Contracts", permanent],
    ["Temporary Contracts", temporary],
  ]);
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // 2. Employees
  if (sections.employees.enabled) {
    XLSX.utils.book_append_sheet(wb, makeSheet(
      filteredEmps.map((e: any) => [
        e.full_name, e.email, e.phone ?? "", e.gender ?? "",
        e.status, e.employment_type ?? "",
        e.date_of_birth ? new Date(e.date_of_birth).toLocaleDateString() : "",
        e.national_id ?? "", e.past_employer ?? "", e.past_position ?? "",
        e.created_at ? new Date(e.created_at).toLocaleDateString() : "",
      ]),
      ["Full Name","Email","Phone","Gender","Status","Contract","Date of Birth","National ID","Past Employer","Past Position","Joined"]
    ), "Employees");
  }

  // 3. Gender breakdown
  if (sections.gender.enabled) {
    XLSX.utils.book_append_sheet(wb, makeSheet(
      [
        ["Male",          genderMale,   `${employees.length > 0 ? Math.round(genderMale/employees.length*100)   : 0}%`],
        ["Female",        genderFemale, `${employees.length > 0 ? Math.round(genderFemale/employees.length*100) : 0}%`],
        ["Not Specified", employees.length - genderMale - genderFemale, ""],
        ["", "", ""],
        ["Permanent Male",   employees.filter((e:any) => e.employment_type==="permanent" && e.gender==="male").length,   ""],
        ["Permanent Female", employees.filter((e:any) => e.employment_type==="permanent" && e.gender==="female").length, ""],
        ["Temporary Male",   employees.filter((e:any) => e.employment_type==="temporary"  && e.gender==="male").length,   ""],
        ["Temporary Female", employees.filter((e:any) => e.employment_type==="temporary"  && e.gender==="female").length, ""],
      ],
      ["Category", "Count", "% of Total"]
    ), "Gender Analysis");
  }

  // 4. Departments
  if (sections.departments.enabled) XLSX.utils.book_append_sheet(wb, makeSheet(
    departments.map((d: any) => [
      d.name, d.description ?? "",
      departments.find((p: any) => p.id === d.parent_id)?.name ?? "Root",
      d.is_active ? "Yes" : "No",
      d.created_at ? new Date(d.created_at).toLocaleDateString() : "",
    ]),
    ["Name","Description","Parent","Active","Created"]
  ), "Departments");

  // 5. Dept Fill Breakdown
  if (sections.positions.enabled) XLSX.utils.book_append_sheet(wb, makeSheet(
    [...m.deptBar.map(r => [
      r.name, r.Filled, r.Vacant, r.Filled + r.Vacant,
      parseFloat(((r.Filled / Math.max(r.Filled + r.Vacant, 1)) * 100).toFixed(1)),
    ]),
    ["TOTAL", m.filled, m.vacant, positions.length, parseFloat(m.fillRate.toFixed(1))]],
    ["Department","Filled","Vacant","Total","Fill Rate (%)"]
  ), "Dept Fill Rate");

  // 6. Positions
  if (sections.positions.enabled) XLSX.utils.book_append_sheet(wb, makeSheet(
    positions.map((p: any) => [
      p.title, p.level ?? "", p.band ?? "",
      departments.find((d: any) => d.id === p.department_id)?.name ?? "",
      p.is_vacant ? "Vacant" : "Filled",
    ]),
    ["Title","Level","Band","Department","Status"]
  ), "Positions");

  // 7. Leave Summary
  if (sections.leave.enabled && data.leaveSummary?.employees?.length) {
    XLSX.utils.book_append_sheet(wb, makeSheet(
      data.leaveSummary.employees.map((e: any) => {
        const g = (a: string) => e.allocations?.find((al: any) => al.leave_type === a);
        return [e.employee_name, e.email, e.employment_type ?? "", e.annual_entitlement,
          g("annual")?.used_days ?? 0, g("annual")?.remaining ?? e.annual_entitlement,
          g("sick")?.used_days ?? 0, g("maternity")?.used_days ?? 0,
          g("paternity")?.used_days ?? 0, g("compassionate")?.used_days ?? 0];
      }),
      ["Employee","Email","Contract","Entitlement","Annual Used","Annual Remaining","Sick Used","Maternity Used","Paternity Used","Compassionate Used"]
    ), "Leave Summary");
  }

  // 8. Position Levels
  if (sections.positions.enabled) {
    const total = m.levelBar.reduce((s, r) => s + r.count, 0);
    XLSX.utils.book_append_sheet(wb, makeSheet(
      m.levelBar.map(r => [r.fullName, r.count, parseFloat(((r.count / Math.max(total, 1)) * 100).toFixed(1))]),
      ["Level","Count","% of Total"]
    ), "Position Levels");
  }

  XLSX.writeFile(wb, `NCBA_HR_Analytics_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

