"use client";

import { useCompany } from "@/context/CompanyContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { AdminDashboardSkeleton } from "@/components/CardSkeleton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeRole, activeCompanyId, memberships, isLoading, refreshMemberships, isManagement } = useCompany();
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);

  // Jika sedang berada di rute /admin/no-authorized, izinkan tampil tanpa proteksi redirect
  const isNoAuthorizedPage = pathname === "/admin/no-authorized";

  // Verifikasi role awal jika belum jelas
  useEffect(() => {
    if (isNoAuthorizedPage) return;
    let isMounted = true;

    const verifyAccess = async () => {
      if (!isLoading && !hasVerified) {
        const hasManagementAccess = Boolean(activeCompanyId && isManagement);
        if (!hasManagementAccess) {
          setIsVerifying(true);
          try {
            await refreshMemberships(true);
          } catch (e) {
            console.error("Failed to refresh memberships in AdminLayout:", e);
          } finally {
            if (isMounted) {
              setIsVerifying(false);
              setHasVerified(true);
            }
          }
        } else {
          setHasVerified(true);
        }
      }
    };

    verifyAccess();
    return () => {
      isMounted = false;
    };
  }, [activeRole, activeCompanyId, isManagement, isLoading, hasVerified, refreshMemberships, isNoAuthorizedPage]);

  // LIVE MONITORING:
  // 1. Silent interval polling setiap 3 detik untuk mendeteksi pencabutan role secara instan
  // 2. Cek saat tab browser kembali aktif (visibilitychange & focus)
  // 3. Listener event unauthorizedAccess (saat ada API yang merespons 403 Forbidden)
  useEffect(() => {
    if (isNoAuthorizedPage) return;

    const interval = setInterval(() => {
      refreshMemberships(true);
    }, 3000);

    const handleFocus = () => {
      refreshMemberships(true);
    };

    const handleUnauthorizedEvent = () => {
      refreshMemberships(true);
      router.replace("/unauthorized");
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("unauthorizedAccess", handleUnauthorizedEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("unauthorizedAccess", handleUnauthorizedEvent);
    };
  }, [isNoAuthorizedPage, refreshMemberships, router]);

  // Redirection guard ketika verifikasi selesai atau role berubah
  useEffect(() => {
    if (isNoAuthorizedPage) return;

    if (!isLoading && !isVerifying && hasVerified) {
      // 1. Jika tidak terafiliasi dengan perusahaan apapun, arahkan ke /cek-perusahaan
      if (!activeCompanyId || memberships.length === 0) {
        router.replace("/cek-perusahaan");
        return;
      }

      // 2. Jika hak akses manajemen dicabut (kembali jadi karyawan), langsung arahkan ke /unauthorized
      if (!isManagement) {
        router.replace("/unauthorized");
        return;
      }
    }
  }, [activeCompanyId, memberships.length, isManagement, isLoading, isVerifying, hasVerified, router, isNoAuthorizedPage]);

  // Jika rute adalah /admin/no-authorized, langsung render tanpa pemblokiran
  if (isNoAuthorizedPage) {
    return <>{children}</>;
  }

  // Tampilan pemuatan awal HANYA jika belum pernah terverifikasi
  // Saat reload data di latar belakang, biarkan children tetap tampil tanpa mengganggu interaksi
  if (!hasVerified && (isLoading || isVerifying)) {
    return <AdminDashboardSkeleton />;
  }

  // JIKA TIDAK MEMILIKI HAK AKSES MANAJEMEN:
  // Buat tampilan seketika menjadi BLANK (tidak me-render children / data admin sama sekali)
  // untuk mencegah kebocoran informasi manajemen saat akses dicabut
  if (!isManagement || !activeCompanyId || memberships.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-[#FAFCF9] flex items-center justify-center">
        {/* Blank state saat proses redirect ke /unauthorized sedang berlangsung */}
      </div>
    );
  }

  return <>{children}</>;
}
