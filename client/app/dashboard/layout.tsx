import React from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="admin">
      <DashboardShell>{children}</DashboardShell>
    </ProtectedRoute>
  );
}