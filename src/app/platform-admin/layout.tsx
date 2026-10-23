"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert, LogOut, ArrowLeft } from "lucide-react";
import {
  PlatformOwnerProfile,
  verifyPlatformAdmin,
  logoutPlatformAdmin,
  getPlatformAuthToken,
} from "@/lib/platformAdminApi";
import { PlatformAdminSidebar } from "@/components/platform-admin/PlatformAdminSidebar";
import { PlatformAdminHeader } from "@/components/platform-admin/PlatformAdminHeader";
import { PlatformAdminErrorView } from "@/components/platform-admin/PlatformAdminErrorView";

interface PlatformAdminContextType {
  profile: PlatformOwnerProfile | null;
  refreshProfile: () => Promise<void>;
}

const PlatformAdminContext = createContext<PlatformAdminContextType>({
  profile: null,
  refreshProfile: async () => {},
});

export const usePlatformAdmin = () => useContext(PlatformAdminContext);

export default function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<PlatformOwnerProfile | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const checkAuthorization = async () => {
    const token = getPlatformAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setIsLoading(true);
    setAccessDeniedMessage(null);

    try {
      const res = await verifyPlatformAdmin();

      if (res.success && res.data) {
        setProfile(res.data);
      } else {
        // Akses ditolak oleh server (tidak masuk allowlist atau token kedaluwarsa)
        setAccessDeniedMessage(
          res.message || "Akun Anda tidak memiliki hak akses sebagai Pemilik Platform."
        );
      }
    } catch (err: any) {
      setAccessDeniedMessage(
        err.message || "Gagal memverifikasi hak akses administratif ke server."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthorization();
  }, [pathname]);

  // Ensure document and body switch to full-width desktop mode for platform admin
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("platform-admin-mode");
      document.body.classList.add("platform-admin-mode");
    }
    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("platform-admin-mode");
        document.body.classList.remove("platform-admin-mode");
      }
    };
  }, []);



  // 2. Loading State: Menunggu verifikasi server-side allowlist
  if (isLoading) {
    return (
      <div
        id="platform-admin-root"
        className="w-full min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="w-14 h-14 rounded-[20px] bg-[#1E3F2B] text-white flex items-center justify-center shadow-lg mb-4 animate-in zoom-in-95 duration-200">
          <Loader2 className="w-7 h-7 animate-spin text-[#86EFAC]" />
        </div>
        <h2 className="text-[16px] font-bold text-[#1E3F2B] mb-1">
          Memverifikasi Otorisasi Platform Admin...
        </h2>
        <p className="text-[12.5px] text-[#5C786C] max-w-sm">
          Memeriksa hak akses administratif Pemilik Platform.
        </p>
      </div>
    );
  }

  // 3. Access Denied State (403): Pengguna login tetapi email tidak ada di allowlist
  if (accessDeniedMessage) {
    return (
      <PlatformAdminErrorView
        type="403"
        description={accessDeniedMessage}
      />
    );
  }

  const getHeaderInfo = (path: string) => {
    if (path.startsWith("/platform-admin/analytics/growth")) {
      return {
        title: "Analitik Pertumbuhan",
        subtitle: "Tren akuisisi tenant baru, pertumbuhan basis pengguna, dan kecepatan adopsi presensi",
      };
    }
    if (path.startsWith("/platform-admin/companies")) {
      return {
        title: "Direktori Perusahaan",
        subtitle: "Manajemen organisasi dan tenant terdaftar di platform AbsenIn",
      };
    }
    if (path.startsWith("/platform-admin/users")) {
      return {
        title: "Direktori Pengguna",
        subtitle: "Manajemen dan pemantauan akun pengguna di seluruh organisasi",
      };
    }
    if (path.startsWith("/platform-admin/analytics/features")) {
      return {
        title: "Analitik Fitur",
        subtitle: "Pemanfaatan modul presensi, tugas kerja, agenda, dan perizinan",
      };
    }
    if (path.startsWith("/platform-admin/system-health")) {
      return {
        title: "Kesehatan Sistem",
        subtitle: "Diagnostik server, koneksi database Supabase, dan status layanan",
      };
    }
    if (path.startsWith("/platform-admin/audit-logs")) {
      return {
        title: "Log Audit",
        subtitle: "Pencatatan akuntabilitas autentikasi dan riwayat aktivitas administratif",
      };
    }
    if (path.startsWith("/platform-admin/settings")) {
      return {
        title: "Pengaturan Platform",
        subtitle: "Preferensi pemantauan, notifikasi operasional, dan parameter akun",
      };
    }
    return {
      title: "Ringkasan Platform",
      subtitle: "Pusat Kendali & Analitik Pertumbuhan AbsenIn",
    };
  };

  const headerInfo = getHeaderInfo(pathname);

  // 4. Authorized State: Tampilkan Platform Admin Layout lengkap
  return (
    <PlatformAdminContext.Provider
      value={{
        profile,
        refreshProfile: checkAuthorization,
      }}
    >
      <div id="platform-admin-root" className="w-full min-h-screen bg-[#F8FAF9] text-[#111827] flex">
        {/* Sidebar Navigasi Khusus Platform Owner */}
        <PlatformAdminSidebar
          profile={profile}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Content Area */}
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen w-full">
          <PlatformAdminHeader
            profile={profile}
            title={headerInfo.title}
            subtitle={headerInfo.subtitle}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </PlatformAdminContext.Provider>
  );
}
