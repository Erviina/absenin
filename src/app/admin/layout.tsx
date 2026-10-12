"use client";

import { useCompany } from "@/context/CompanyContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { activeRole, activeCompanyId, memberships, isLoading, refreshMemberships } = useCompany();
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const verifyAccess = async () => {
      // If access is unclear (no active company or role is not management), verify once before redirecting
      if (!isLoading && !hasVerified) {
        const isManagement = activeCompanyId && activeRole && ["owner", "admin", "manager"].includes(activeRole);
        if (!isManagement) {
          setIsVerifying(true);
          try {
            await refreshMemberships();
          } catch (e) {
            console.error("Failed to refresh memberships in AdminLayout:", e);
          } finally {
            if (isMounted) {
              setIsVerifying(false);
              setHasVerified(true);
            }
          }
        }
      }
    };

    verifyAccess();
    return () => {
      isMounted = false;
    };
  }, [activeRole, activeCompanyId, isLoading, hasVerified, refreshMemberships]);

  useEffect(() => {
    if (!isLoading && !isVerifying) {
      // 1. If user has no active company or memberships at all, redirect to /cek-perusahaan
      if (!activeCompanyId || memberships.length === 0) {
        if (hasVerified) {
          router.replace("/cek-perusahaan");
        }
        return;
      }

      // 2. If user is in a company but not in a management role (e.g. member/karyawan), redirect to /dashboard
      if (activeRole && !["owner", "admin", "manager"].includes(activeRole)) {
        if (hasVerified) {
          router.replace("/dashboard");
        }
        return;
      }
    }
  }, [activeCompanyId, memberships.length, activeRole, isLoading, isVerifying, hasVerified, router]);

  if (isLoading || isVerifying) {
    return null;
  }

  // Prevent rendering admin children if unauthorized or not associated with an active company
  if (!activeCompanyId || memberships.length === 0 || (activeRole && !["owner", "admin", "manager"].includes(activeRole))) {
    return null;
  }

  return <>{children}</>;
}
