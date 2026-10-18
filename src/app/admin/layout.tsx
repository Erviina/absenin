"use client";

import { useCompany } from "@/context/CompanyContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";

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
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc]">
        <TopBar title="Manajemen" onBack={() => router.push("/dashboard")} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
          <Loader2 className="w-8 h-8 text-[#356E3B] animate-spin" />
          <p className="text-[#5C786C] text-[13px] font-medium">
            {isVerifying ? "Memverifikasi hak akses manajemen..." : "Memuat data manajemen..."}
          </p>
        </div>
      </div>
    );
  }

  // Prevent rendering admin children if unauthorized or not associated with an active company
  if (!activeCompanyId || memberships.length === 0 || (activeRole && !["owner", "admin", "manager"].includes(activeRole))) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc]">
        <TopBar title="Manajemen" onBack={() => router.push("/dashboard")} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3 text-center">
          <Loader2 className="w-8 h-8 text-[#356E3B] animate-spin" />
          <p className="text-[#5C786C] text-[13px] font-medium">
            Mengarahkan ke halaman yang sesuai...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
