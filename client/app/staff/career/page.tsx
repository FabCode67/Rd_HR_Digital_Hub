"use client";

import { useAuth } from "@/contexts/AuthContext";
import CareerTimeline from "@/components/employees/CareerTimeline";

export default function StaffCareerPage() {
  const { user, token } = useAuth();

  if (!user?.id) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <CareerTimeline
        employeeId={user.id}
        employeeName={user.full_name || user.email}
        profileImageUrl={user.profile_image_url}
        isAdmin={false}
        isSelf={true}
        token={token}
      />
    </div>
  );
}
