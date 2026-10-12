"use client";

import { useCompany } from "@/context/CompanyContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { activeRole, isLoading, refreshMemberships } = useCompany();
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const verifyAccess = async () => {
      // If activeRole is not management, attempt to refresh memberships once before redirecting
      // in case role was recently updated in backend
      if (!isLoading && !hasVerified && activeRole && !["owner", "admin", "manager"].includes(activeRole)) {
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
    };

    verifyAccess();
    return () => {
      isMounted = false;
    };
  }, [activeRole, isLoading, hasVerified, refreshMemberships]);

  useEffect(() => {
    // Only redirect if verification attempt is done or role is definitely not management
    if (!isLoading && !isVerifying && (hasVerified || (activeRole && ["owner", "admin", "manager"].includes(activeRole)))) {
      if (activeRole && !["owner", "admin", "manager"].includes(activeRole)) {
        router.replace("/dashboard");
      }
    }
  }, [activeRole, isLoading, isVerifying, hasVerified, router]);

  if (isLoading || isVerifying) {
    return null;
  }

  return <>{children}</>;
}
