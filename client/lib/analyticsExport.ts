"use client";

/**
 * analyticsExport.ts
 * Client-side Excel (SheetJS) and PowerPoint (pptxgenjs) export
 * for the HR Analytics Dashboard.
 */

// ── types passed in from AnalyticsDashboard ────────────────────────────────
export interface AnalyticsData {
  departments:  any[];
  positions:    any[];
  employees:    any[];
  leaveSummary: any;   // from GET /leave/summary
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

// ── colour palette ─────────────────────────────────────────────────────────
const C = {
  navy:   "1E293B",
  cyan:   "06B6D4",
  green:  "10B981",
  red:    "F43F5E",
  amber:  "F59E0B",
  violet: "8B5CF6",
  sky:    "0EA5E9",
  white:  "FFFFFF",
  light:  "F1F5F9",
  mid:    "CBD5E1",
  dark:   "475569",
};

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function exportExcel(data: AnalyticsData) {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  /* ── helper: styled header row ── */
  function makeSheet(rows: (string | number)[][], headers: string[]): any {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Column widths
    ws["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));
    return ws;
  }

  /* ── 1. Summary ── */
  const { metrics: m, departments, positions, employees } = data;
  const summaryRows: (string|number)[][] = [
    ["Metric",                   "Value"],
    ["Total Departments",        departments.length],
    ["Total Positions",          positions.length],
    ["Filled Positions",         m.filled],
    ["Vacant Positions",         m.vacant],
    ["Fill Rate (%)",            parseFloat(m.fillRate.toFixed(1))],
    ["Total Employees",          employees.length],
    ["Active Employees",         m.active],
    ["Inactive Employees",       m.inactive],
    ["Suspended Employees",      m.suspended],
    ["Terminated Employees",     m.terminated],
    ["Report Generated",         new Date().toLocaleString()],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 28 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  /* ── 2. Employees ── */
  const empHeaders = [
    "Full Name","Email","Phone","Status","Employment Type",
    "Department","Position","Band","Date of Birth","National ID",
    "Past Employer","Past Position","Joined",
  ];
  const empRows = employees.map((e: any) => [
    e.full_name, e.email, e.phone ?? "",
    e.status, e.employment_type ?? "",
    "",   // dept — not in employee obj directly
    "",   // position
    "",
    e.date_of_birth ? new Date(e.date_of_birth).toLocaleDateString() : "",
    e.national_id ?? "",
    e.past_employer ?? "", e.past_position ?? "",
    e.created_at ? new Date(e.created_at).toLocaleDateString() : "",
  ]);
  XLSX.utils.book_append_sheet(wb, makeSheet(empRows, empHeaders), "Employees");

  /* ── 3. Departments ── */
  const deptHeaders = ["Name","Description","Function","Parent Dept","Active","Created"];
  const deptRows = departments.map((d: any) => [
    d.name, d.description ?? "",
    "",   // function name — not in obj
    departments.find((p: any) => p.id === d.parent_id)?.name ?? "Root",
    d.is_active ? "Yes" : "No",
    d.created_at ? new Date(d.created_at).toLocaleDateString() : "",
  ]);
  XLSX.utils.book_append_sheet(wb, makeSheet(deptRows, deptHeaders), "Departments");

  /* ── 4. Positions ── */
  const posHeaders = ["Title","Level","Band","Department","Status","Created"];
  const posRows = positions.map((p: any) => [
    p.title, p.level ?? "", p.band ?? "",
    departments.find((d: any) => d.id === p.department_id)?.name ?? "",
    p.is_vacant ? "Vacant" : "Filled",
    p.created_at ? new Date(p.created_at).toLocaleDateString() : "",
  ]);
  XLSX.utils.book_append_sheet(wb, makeSheet(posRows, posHeaders), "Positions");

  /* ── 5. Positions by Department ── */
  const deptBarHeaders = ["Department","Filled","Vacant","Total","Fill Rate (%)"];
  const deptBarRows = m.deptBar.map(r => [
    r.name, r.Filled, r.Vacant, r.Filled + r.Vacant,
    parseFloat(((r.Filled / Math.max(r.Filled + r.Vacant, 1)) * 100).toFixed(1)),
  ]);
  // totals row
  const totalFilled = m.deptBar.reduce((s, r) => s + r.Filled, 0);
  const totalVacant = m.deptBar.reduce((s, r) => s + r.Vacant, 0);
  deptBarRows.push([
    "TOTAL", totalFilled, totalVacant, totalFilled + totalVacant,
    parseFloat(((totalFilled / Math.max(totalFilled + totalVacant, 1)) * 100).toFixed(1)),
  ]);
  XLSX.utils.book_append_sheet(wb, makeSheet(deptBarRows, deptBarHeaders), "Dept Breakdown");

  /* ── 6. Position Levels ── */
  const levelHeaders = ["Level","Count","% of Total"];
  const total = m.levelBar.reduce((s, r) => s + r.count, 0);
  const levelRows = m.levelBar.map(r => [
    r.fullName, r.count,
    parseFloat(((r.count / Math.max(total, 1)) * 100).toFixed(1)),
  ]);
  XLSX.utils.book_append_sheet(wb, makeSheet(levelRows, levelHeaders), "Position Levels");

  /* ── 7. Leave Summary ── */
  if (data.leaveSummary?.employees?.length) {
    const leaveHeaders = [
      "Employee","Email","Contract","Annual Entitlement",
      "Annual Used","Annual Remaining",
      "Sick Used","Maternity Used","Paternity Used","Compassionate Used",
    ];
    const leaveRows = data.leaveSummary.employees.map((e: any) => {
      const alloc = (allType: string) =>
        e.allocations?.find((a: any) => a.leave_type === allType);
      const an = alloc("annual");
      const si = alloc("sick");
      const ma = alloc("maternity");
      const pa = alloc("paternity");
      const co = alloc("compassionate");
      return [
        e.employee_name, e.email, e.employment_type ?? "",
        e.annual_entitlement,
        an?.used_days ?? 0, an?.remaining ?? e.annual_entitlement,
        si?.used_days ?? 0,
        ma?.used_days ?? 0,
        pa?.used_days ?? 0,
        co?.used_days ?? 0,
      ];
    });
    XLSX.utils.book_append_sheet(wb, makeSheet(leaveRows, leaveHeaders), "Leave Summary");
  }

  /* ── Write & download ── */
  const year = new Date().getFullYear();
  XLSX.writeFile(wb, `NCBA_HR_Analytics_${year}.xlsx`);
}


// ─────────────────────────────────────────────────────────────────────────────
// POWERPOINT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function exportPowerPoint(data: AnalyticsData) {
  const pptxgen = (await import("pptxgenjs")).default;
  const pptx = new pptxgen();

  pptx.layout   = "LAYOUT_WIDE"; // 13.33" × 7.5"
  pptx.title    = "NCBA Rwanda — HR Analytics Report";
  pptx.subject  = "Human Resources Analytics";
  pptx.author   = "NCBA HR Digital Hub";

  const W = 13.33, H = 7.5;
  const year = new Date().getFullYear();
  const { metrics: m, departments, positions, employees } = data;

  /* ── helper: navy header slide ── */
  function addSlide(title: string, subtitle?: string) {
    const s = pptx.addSlide();
    // Background
    s.background = { color: C.white };

    // Left accent bar
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.08, h: H, fill: { color: C.navy },
    });
    // Header band
    s.addShape(pptx.ShapeType.rect, {
      x: 0.08, y: 0, w: W - 0.08, h: 1.1, fill: { color: C.navy },
    });
    // Title text
    s.addText(title, {
      x: 0.25, y: 0.15, w: W - 1, h: 0.55,
      fontSize: 22, bold: true, color: C.white, fontFace: "Arial",
    });
    if (subtitle) {
      s.addText(subtitle, {
        x: 0.25, y: 0.68, w: W - 1, h: 0.35,
        fontSize: 11, color: C.mid, fontFace: "Arial",
      });
    }
    // Footer
    s.addText(`NCBA Rwanda · HR Digital Hub · ${year}`, {
      x: 0.25, y: H - 0.28, w: W - 0.5, h: 0.22,
      fontSize: 8, color: C.dark, fontFace: "Arial", align: "right",
    });
    return s;
  }

  /* ── metric box helper ── */
  function addMetricBox(
    s: any, x: number, y: number, w: number, h: number,
    label: string, value: string, accent: string, sub?: string,
  ) {
    // Card shadow effect
    s.addShape(pptx.ShapeType.rect, {
      x: x + 0.03, y: y + 0.03, w, h,
      fill: { color: C.mid }, line: { color: C.mid },
    });
    // Card bg
    s.addShape(pptx.ShapeType.rect, {
      x, y, w, h, fill: { color: C.white },
      line: { color: C.mid, pt: 0.5 }, shadow: { type: "outer", blur: 3, offset: 2 },
    });
    // Top accent stripe
    s.addShape(pptx.ShapeType.rect, {
      x, y, w, h: 0.06, fill: { color: accent },
    });
    s.addText(label.toUpperCase(), {
      x: x + 0.1, y: y + 0.1, w: w - 0.2, h: 0.25,
      fontSize: 7.5, bold: true, color: C.dark,
      fontFace: "Arial", charSpacing: 1.5,
    });
    s.addText(value, {
      x: x + 0.1, y: y + 0.35, w: w - 0.2, h: 0.55,
      fontSize: 28, bold: true, color: C.navy, fontFace: "Arial",
    });
    if (sub) {
      s.addText(sub, {
        x: x + 0.1, y: y + 0.88, w: w - 0.2, h: 0.22,
        fontSize: 8, color: C.dark, fontFace: "Arial",
      });
    }
  }

  /* ── table helper ── */
  function addTable(
    s: any, x: number, y: number, w: number,
    headers: string[], rows: (string|number)[][],
    maxRows = 15,
  ) {
    const headerRow = headers.map(h => ({
      text: h,
      options: {
        bold: true, color: C.white, fill: C.navy,
        fontSize: 9, fontFace: "Arial", align: "center" as const,
        border: [{ pt: 0.5, color: C.navy }],
      },
    }));

    const dataRows = rows.slice(0, maxRows).map((row, ri) => row.map(cell => ({
      text: String(cell ?? ""),
      options: {
        fontSize: 8.5, fontFace: "Arial",
        fill: ri % 2 === 0 ? C.white : C.light,
        color: C.navy,
        border: [{ pt: 0.3, color: C.mid }],
      },
    })));

    s.addTable([headerRow, ...dataRows], {
      x, y, w,
      rowH: 0.22,
      colW: headers.map(() => w / headers.length),
    });
  }

  // ── Slide 1: Cover ───────────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.navy };

    // Decorative shapes
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.5, h: H, fill: { color: C.cyan },
    });
    s.addShape(pptx.ShapeType.rect, {
      x: W - 4.5, y: 0, w: 4.5, h: H, fill: { color: "162032" },
    });

    s.addText("NCBA RWANDA", {
      x: 0.7, y: 1.5, w: 8, h: 0.5,
      fontSize: 14, bold: true, color: C.cyan,
      fontFace: "Arial", charSpacing: 6,
    });
    s.addText("HR Analytics\nReport", {
      x: 0.7, y: 2.0, w: 8, h: 1.8,
      fontSize: 44, bold: true, color: C.white,
      fontFace: "Arial",
    });
    s.addText(`Annual Overview · ${year}`, {
      x: 0.7, y: 3.85, w: 8, h: 0.4,
      fontSize: 14, color: C.mid, fontFace: "Arial",
    });
    s.addText(`Generated: ${new Date().toLocaleDateString("en-GB", { day:"numeric",month:"long",year:"numeric" })}`, {
      x: 0.7, y: 6.8, w: 8, h: 0.3,
      fontSize: 10, color: C.dark, fontFace: "Arial",
    });
    // Right panel stats
    const stats = [
      ["Departments", departments.length],
      ["Positions",   positions.length],
      ["Employees",   employees.length],
    ];
    stats.forEach(([label, val], i) => {
      const sy = 1.5 + i * 1.6;
      s.addText(String(val), {
        x: W - 3.8, y: sy, w: 3.5, h: 1.0,
        fontSize: 52, bold: true, color: C.cyan, fontFace: "Arial", align: "center",
      });
      s.addText(String(label), {
        x: W - 3.8, y: sy + 0.95, w: 3.5, h: 0.3,
        fontSize: 12, color: C.mid, fontFace: "Arial", align: "center",
      });
    });
  }

  // ── Slide 2: Key Metrics ─────────────────────────────────────────────────
  {
    const s = addSlide("Key Metrics", `Snapshot as of ${new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})}`);
    const cols = 3, rows = 2;
    const bw = 3.8, bh = 1.25, xPad = 0.25, yStart = 1.3, gap = 0.18;

    const boxes = [
      { label: "Total Departments", value: String(departments.length), accent: C.sky,    sub: "Organizational units" },
      { label: "Total Positions",   value: String(positions.length),   accent: C.violet, sub: `${m.filled} filled · ${m.vacant} vacant` },
      { label: "Fill Rate",         value: `${m.fillRate.toFixed(0)}%`, accent: C.amber, sub: "Position occupancy" },
      { label: "Active Employees",  value: String(m.active),           accent: C.green,  sub: `of ${employees.length} total` },
      { label: "Vacancies",         value: String(m.vacant),           accent: C.red,    sub: "Open positions" },
      { label: "Staff Status",      value: `${m.suspended + m.inactive}`, accent: C.dark, sub: "Inactive / suspended" },
    ];

    boxes.forEach((b, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      addMetricBox(
        s,
        xPad + col * (bw + gap),
        yStart + row * (bh + gap),
        bw, bh,
        b.label, b.value, b.accent, b.sub,
      );
    });
  }

  // ── Slide 3: Departments ─────────────────────────────────────────────────
  {
    const s = addSlide("Departments", "Complete list of organizational departments");
    const rows = departments.map(d => [
      d.name,
      departments.find((p: any) => p.id === d.parent_id)?.name ?? "Root",
      d.is_active ? "Active" : "Inactive",
    ]);
    addTable(s, 0.25, 1.25, W - 0.5,
      ["Department Name", "Parent Department", "Status"],
      rows, 20,
    );
  }

  // ── Slide 4: Positions by Department ─────────────────────────────────────
  {
    const s = addSlide("Positions by Department", "Filled vs vacant across departments");
    // Bar chart via colored rectangles
    const maxVal  = Math.max(...m.deptBar.map(r => r.Filled + r.Vacant), 1);
    const chartX  = 0.25, chartY = 1.3, chartW = W - 0.5, chartH = 4.5;
    const barW    = (chartW / m.deptBar.length) * 0.72;
    const gap     = (chartW / m.deptBar.length) * 0.28;

    m.deptBar.forEach((d, i) => {
      const x     = chartX + i * (barW + gap) + gap / 2;
      const total = d.Filled + d.Vacant;
      const fH    = chartH * (d.Filled / maxVal);
      const vH    = chartH * (d.Vacant  / maxVal);

      // Filled (bottom)
      if (d.Filled > 0) {
        s.addShape(pptx.ShapeType.rect, {
          x, y: chartY + chartH - fH, w: barW, h: fH,
          fill: { color: C.green },
        });
      }
      // Vacant (on top)
      if (d.Vacant > 0) {
        s.addShape(pptx.ShapeType.rect, {
          x, y: chartY + chartH - fH - vH, w: barW, h: vH,
          fill: { color: C.red },
        });
      }
      // Label
      s.addText(d.name.length > 10 ? d.name.slice(0, 9) + "…" : d.name, {
        x: x - 0.1, y: chartY + chartH + 0.05, w: barW + 0.2, h: 0.3,
        fontSize: 7, color: C.dark, fontFace: "Arial", align: "center",
        rotate: 315,
      });
      // Total count on top
      s.addText(String(total), {
        x, y: chartY + chartH - fH - vH - 0.22, w: barW, h: 0.2,
        fontSize: 7.5, bold: true, color: C.navy, fontFace: "Arial", align: "center",
      });
    });

    // Legend
    s.addShape(pptx.ShapeType.rect, { x: 0.25, y: 6.9, w: 0.2, h: 0.12, fill: { color: C.green } });
    s.addText("Filled", { x: 0.5, y: 6.87, w: 1.2, h: 0.18, fontSize: 8.5, color: C.dark, fontFace: "Arial" });
    s.addShape(pptx.ShapeType.rect, { x: 1.8, y: 6.9, w: 0.2, h: 0.12, fill: { color: C.red } });
    s.addText("Vacant", { x: 2.05, y: 6.87, w: 1.2, h: 0.18, fontSize: 8.5, color: C.dark, fontFace: "Arial" });
  }

  // ── Slide 5: Employee Directory (first 20) ───────────────────────────────
  {
    const s = addSlide("Employee Directory", "Staff listing — top 20 records");
    const rows = employees.slice(0, 20).map((e: any) => [
      e.full_name, e.email,
      e.status, e.employment_type ?? "—",
      e.created_at ? new Date(e.created_at).toLocaleDateString() : "—",
    ]);
    addTable(s, 0.25, 1.25, W - 0.5,
      ["Name", "Email", "Status", "Contract", "Joined"],
      rows, 20,
    );
    if (employees.length > 20) {
      s.addText(`… and ${employees.length - 20} more employees. See Excel report for full list.`, {
        x: 0.25, y: 6.65, w: W - 0.5, h: 0.25,
        fontSize: 8.5, color: C.dark, italic: true, fontFace: "Arial",
      });
    }
  }

  // ── Slide 6: Position Levels ─────────────────────────────────────────────
  {
    const s = addSlide("Position Levels", "Distribution across corporate title tiers");
    const total = m.levelBar.reduce((sum, r) => sum + r.count, 0) || 1;
    const maxCount = Math.max(...m.levelBar.map(r => r.count), 1);
    const barH = 0.26, startY = 1.3, barStartX = 4.2, maxBarW = W - 4.7;

    m.levelBar.forEach((lvl, i) => {
      const y   = startY + i * (barH + 0.1);
      const bw  = maxBarW * (lvl.count / maxCount);
      const pct = ((lvl.count / total) * 100).toFixed(0);

      s.addText(lvl.fullName, {
        x: 0.25, y, w: 3.8, h: barH,
        fontSize: 9, color: C.navy, fontFace: "Arial", align: "right",
      });
      s.addShape(pptx.ShapeType.rect, {
        x: barStartX, y: y + 0.02, w: Math.max(bw, 0.05), h: barH - 0.04,
        fill: { color: C.cyan },
      });
      s.addText(`${lvl.count}  (${pct}%)`, {
        x: barStartX + Math.max(bw, 0.05) + 0.06, y, w: 2, h: barH,
        fontSize: 9, bold: true, color: C.navy, fontFace: "Arial",
      });
    });
  }

  // ── Slide 7: Leave Summary ───────────────────────────────────────────────
  if (data.leaveSummary?.employees?.length) {
    const s = addSlide("Leave Summary", `Annual leave balances · ${data.leaveSummary.year ?? year}`);
    const rows = data.leaveSummary.employees.slice(0, 18).map((e: any) => {
      const an = e.allocations?.find((a: any) => a.leave_type === "annual");
      return [
        e.employee_name,
        e.employment_type ?? "—",
        String(e.annual_entitlement),
        String(an?.used_days ?? 0),
        String(an?.remaining ?? e.annual_entitlement),
      ];
    });
    addTable(s, 0.25, 1.25, W - 0.5,
      ["Employee", "Contract", "Entitlement", "Used", "Remaining"],
      rows, 18,
    );
  }

  // ── Slide 8: Employee Status ─────────────────────────────────────────────
  {
    const s = addSlide("Employee Status Breakdown", "Distribution of staff by employment status");
    const total = employees.length || 1;
    const statuses = [
      { label: "Active",     count: m.active,     color: C.green  },
      { label: "Inactive",   count: m.inactive,   color: C.amber  },
      { label: "Suspended",  count: m.suspended,  color: C.red    },
      { label: "Terminated", count: m.terminated, color: C.dark   },
    ].filter(s => s.count > 0);

    const bw   = 2.5, startX = (W - statuses.length * (bw + 0.4)) / 2 + 0.2;
    statuses.forEach((st, i) => {
      const x    = startX + i * (bw + 0.4);
      const frac = st.count / total;
      addMetricBox(s, x, 1.6, bw, 1.4,
        st.label, String(st.count), st.color,
        `${(frac * 100).toFixed(0)}% of workforce`,
      );
    });

    // Policy note
    s.addText("Leave Policy Summary", {
      x: 0.25, y: 3.5, w: W - 0.5, h: 0.35,
      fontSize: 11, bold: true, color: C.navy, fontFace: "Arial",
    });
    const policy = [
      "• Annual Leave — Managing Director: 28 days · Permanent: 21 days · Temporary: 18 days · Intern: 0 days",
      "• Maternity Leave: 90 days (3 months) · Paternity Leave: 14 days (2 weeks)",
      "• Sick Leave & Compassionate Leave: allocated by HR Admin on a case-by-case basis",
    ];
    policy.forEach((line, i) => {
      s.addText(line, {
        x: 0.4, y: 3.95 + i * 0.4, w: W - 0.8, h: 0.35,
        fontSize: 10, color: C.dark, fontFace: "Arial",
      });
    });
  }

  // ── Slide 9: Thank you ───────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: C.navy };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.5, h: H, fill: { color: C.cyan } });
    s.addText("Thank You", {
      x: 0.8, y: 2.5, w: W - 1.5, h: 1.2,
      fontSize: 48, bold: true, color: C.white, fontFace: "Arial",
    });
    s.addText("NCBA Rwanda · HR Digital Hub", {
      x: 0.8, y: 3.8, w: W - 1.5, h: 0.5,
      fontSize: 14, color: C.mid, fontFace: "Arial",
    });
    s.addText(`Report generated: ${new Date().toLocaleString()}`, {
      x: 0.8, y: 6.8, w: W - 1.5, h: 0.3,
      fontSize: 9, color: C.dark, fontFace: "Arial",
    });
  }

  // ── Write ────────────────────────────────────────────────────────────────
  await pptx.writeFile({ fileName: `NCBA_HR_Analytics_${year}.pptx` });
}
