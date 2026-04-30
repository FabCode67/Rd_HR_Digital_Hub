import React from "react";
import DashboardShell from "@/components/layout/DashboardShell";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}