"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, 
  RotateCw, 
  ArrowLeft, 
  LayoutDashboard, 
  Activity, 
  HelpCircle,
  FileQuestion,
  ServerCrash
} from "lucide-react";

export interface PlatformAdminErrorViewProps {
  type: "401" | "403" | "404" | "500";
  title?: string;
  description?: string;
  error?: Error & { digest?: string };
  reset?: () => void;
  showBackToMainApp?: boolean;
}

export function PlatformAdminErrorView({
  type,
  title: customTitle,
  description: customDescription,
  error,
  reset,
  showBackToMainApp = true,
}: PlatformAdminErrorViewProps) {
  const router = useRouter();

  useEffect(() => {
    const titles = {
      "401": "401 - Login Platform Diperlukan | AbsenIn",
      "404": "404 - Halaman Platform Tidak Ditemukan | AbsenIn",
      "403": "403 - Akses Platform Ditolak | AbsenIn",
      "500": "500 - Kesalahan Sistem Platform | AbsenIn",
    };
    document.title = titles[type] || "Error - Platform Admin | AbsenIn";
  }, [type]);

  const config = {
    "401": {
      badge: "Platform Admin • Error 401",
      icon: ShieldAlert,
      badgeColor: "bg-emerald-50 text-[#1E3F2B] border-emerald-200/80",
      gradient: "from-[#1E3F2B] via-[#2A5A3C] to-[#356E3B]",
      defaultTitle: "Sesi Login Platform Diperlukan",
      defaultDesc: "Silakan masuk dengan akun Google yang terdaftar sebagai Pemilik Platform untuk membuka dashboard administratif.",
      primaryAction: {
        label: "Login ke AbsenIn",
        href: "/login",
        icon: ArrowLeft,
      },
    },
    "404": {
      badge: "Platform Admin • Error 404",
      icon: FileQuestion,
      badgeColor: "bg-emerald-50 text-[#1E3F2B] border-emerald-200/80",
      gradient: "from-[#1E3F2B] via-[#2A5A3C] to-[#356E3B]",
      defaultTitle: "Halaman Platform Tidak Ditemukan",
      defaultDesc: "Tautan direktori atau modul Platform Admin yang Anda tuju tidak tersedia, telah dipindahkan, atau alamat URL salah.",
      primaryAction: {
        label: "Kembali ke Dashboard Platform",
        href: "/platform-admin/overview",
        icon: LayoutDashboard,
      },
    },
    "403": {
      badge: "Platform Admin • Error 403",
      icon: ShieldAlert,
      badgeColor: "bg-amber-50 text-amber-900 border-amber-200/80",
      gradient: "from-[#854D0E] via-[#B45309] to-[#D97706]",
      defaultTitle: "Akses Terbatas: Khusus Pemilik Platform",
      defaultDesc: "Akun Anda tidak terdaftar dalam allowlist administratif Platform Owner. Akses ke modul kontrol server ini dibatasi secara ketat.",
      primaryAction: {
        label: "Kembali ke Beranda Utama",
        href: "/dashboard",
        icon: ArrowLeft,
      },
    },
    "500": {
      badge: "Platform Admin • Error 500",
      icon: ServerCrash,
      badgeColor: "bg-rose-50 text-rose-900 border-rose-200/80",
      gradient: "from-[#991B1B] via-[#DC2626] to-[#EF4444]",
      defaultTitle: "Terjadi Kendala pada Modul Platform",
      defaultDesc: "Sistem mendeteksi kendala saat memproses permintaan administratif. Log diagnostik telah dicatat untuk peninjauan teknis.",
      primaryAction: {
        label: "Coba Muat Ulang",
        onClick: reset || (() => window.location.reload()),
        icon: RotateCw,
      },
    },
  }[type];

  const title = customTitle || config.defaultTitle;
  const description = customDescription || config.defaultDesc;
  const IconComponent = config.icon;

  return (
    <div 
      id="platform-admin-root" 
      className="fixed inset-0 z-[150] w-full min-h-screen bg-[#F8FAF9] text-[#111827] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 overflow-y-auto selection:bg-[#86EFAC] selection:text-[#1E3F2B]"
    >
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#86EFAC]/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#356E3B]/10 blur-3xl rounded-full pointer-events-none" />

        {/* Big Stylized Error Code */}
        <div className="relative mb-4 select-none">
          <span
            className={`text-[80px] sm:text-[104px] font-black tracking-tight leading-none bg-gradient-to-br ${config.gradient} bg-clip-text text-transparent`}
          >
            {type}
          </span>
        </div>

        {/* Heading & Description */}
        <h1 className="text-[22px] sm:text-[26px] font-extrabold text-[#111827] tracking-tight leading-snug mb-3">
          {title}
        </h1>
        <p className="text-[13.5px] sm:text-[14.5px] text-[#4B5563] leading-relaxed max-w-lg mb-8">
          {description}
        </p>

        {/* Technical Error Digest (if type 500) */}
        {error?.digest && (
          <div className="w-full max-w-md bg-gray-50 border border-gray-200/60 rounded-xl p-3 mb-6 text-left">
            <div className="text-[11px] font-mono text-gray-500 truncate">
              <span className="font-semibold text-gray-700">Error Digest:</span> {error.digest}
            </div>
            {error.message && (
              <div className="text-[11px] font-mono text-rose-600 truncate mt-1">
                {error.message}
              </div>
            )}
          </div>
        )}

        {/* Action Button Row */}
        <div className="w-full max-w-md flex flex-col sm:flex-row items-center justify-center gap-3">
          {config.primaryAction.href ? (
            <Link
              href={config.primaryAction.href}
              className="w-full sm:w-auto flex-1 h-12 px-6 bg-[#1E3F2B] hover:bg-[#163021] text-white font-bold text-[13.5px] rounded-[16px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <config.primaryAction.icon className="w-4 h-4 text-[#86EFAC]" />
              <span>{config.primaryAction.label}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={config.primaryAction.onClick}
              className="w-full sm:w-auto flex-1 h-12 px-6 bg-[#1E3F2B] hover:bg-[#163021] text-white font-bold text-[13.5px] rounded-[16px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <config.primaryAction.icon className="w-4 h-4 text-[#86EFAC]" />
              <span>{config.primaryAction.label}</span>
            </button>
          )}

          {type === "500" && (
            <Link
              href="/platform-admin/system-health"
              className="w-full sm:w-auto h-12 px-5 border border-gray-200/80 hover:bg-gray-50 text-gray-700 font-semibold text-[13px] rounded-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Activity className="w-4 h-4 text-[#356E3B]" />
              <span>Cek Status Sistem</span>
            </Link>
          )}

          {type !== "500" && (
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full sm:w-auto h-12 px-5 border border-gray-200/80 hover:bg-gray-50 text-gray-700 font-semibold text-[13px] rounded-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Halaman Sebelumnya</span>
            </button>
          )}
        </div>

      
    </div>
  );
}
