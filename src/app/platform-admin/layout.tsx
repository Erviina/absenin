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

  const isLoginPage = pathname === "/platform-admin/login";

  const checkAuthorization = async () => {
    // Jika di halaman login, lewati pemeriksaan sesi proteksi
    if (isLoginPage) {
      setIsLoading(false);
      return;
    }

    const token = getPlatformAuthToken();
    if (!token) {
      router.replace("/platform-admin/login");
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
          res.message || "Akun Anda tidak memiliki hak akses sebagai Platform Owner."
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

  // 1. Rute Login: Render tanpa sidebar dan tanpa wrapper
  if (isLoginPage) {
    return (
      <div id="platform-admin-root" className="w-full min-h-screen">
        {children}
      </div>
    );
  }

  // 2. Loading State: Menunggu verifikasi server-side allowlist
  if (isLoading) {
    return (
      <div
        id="platform-admin-root"
        className="w-full min-h-screen bg-[#F4F9F6] flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="w-16 h-16 rounded-[22px] bg-[#1E3F2B] text-white flex items-center justify-center shadow-lg mb-4 animate-in zoom-in-90 duration-300">
          <Loader2 className="w-8 h-8 animate-spin text-[#86EFAC]" />
        </div>
        <h2 className="text-[17px] font-bold text-[#1E3F2B] mb-1">
          Memverifikasi Otorisasi Platform Admin...
        </h2>
        <p className="text-[12.5px] text-[#5C786C] max-w-sm">
          Memeriksa izin akun dan enkripsi allowlist server untuk Platform Owner.
        </p>
      </div>
    );
  }

  // 3. Access Denied State: Pengguna login tetapi email tidak ada di allowlist
  if (accessDeniedMessage) {
    return (
      <div
        id="platform-admin-root"
        className="w-full min-h-screen bg-[#FFFBFB] flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="w-full max-w-md bg-white border border-red-200/80 rounded-[28px] p-7 shadow-xl shadow-red-500/5 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-black tracking-widest text-red-600 bg-red-50 border border-red-200/60 px-3 py-1 rounded-full uppercase mb-3">
            Akses Ditolak
          </span>

          <h1 className="text-[20px] font-extrabold text-gray-900 mb-2 tracking-tight">
            Tidak Memiliki Wewenang
          </h1>

          <p className="text-[13px] text-gray-600 mb-6 leading-relaxed">
            {accessDeniedMessage}
          </p>

          <div className="w-full space-y-2.5">
            <button
              onClick={logoutPlatformAdmin}
              className="w-full py-3 px-4 rounded-[16px] bg-[#1E3F2B] text-white font-bold text-[13.5px] hover:bg-[#163021] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Ganti Akun Google</span>
            </button>

            <button
              onClick={() => router.replace("/dashboard")}
              className="w-full py-3 px-4 rounded-[16px] border border-gray-200 text-gray-700 font-semibold text-[13px] hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Aplikasi Utama</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

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
