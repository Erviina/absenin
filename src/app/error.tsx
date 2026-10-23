"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { RotateCw, Home, ServerCrash } from "lucide-react";
import { PlatformAdminErrorView } from "@/components/platform-admin/PlatformAdminErrorView";
import { isPlatformAdminPath } from "@/lib/routeUtils";

export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isPlatformAdmin = isPlatformAdminPath(pathname);

  useEffect(() => {
    console.error("[AbsenIn Root Error Boundary]:", error);
    document.title = "500 - Kesalahan Sistem | AbsenIn";
  }, [error]);

  // Jika error terjadi di Platform Admin, tampilkan error view desktop Platform Admin
  if (isPlatformAdmin) {
    return (
      <PlatformAdminErrorView
        type="500"
        error={error}
        reset={reset}
      />
    );
  }

  const handleGoHome = () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        router.push("/dashboard");
        return;
      }
    }
    router.push("/login");
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFCF9] items-center justify-center px-8">
      <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-xs">

        {/* 500 Number */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#7FAF8B]/25 blur-3xl rounded-full scale-150 pointer-events-none" />
          <span
            className="relative text-[96px] sm:text-[108px] font-black tracking-tight leading-none select-none"
            style={{
              background: "linear-gradient(135deg, #2D5A3F 0%, #356E3B 40%, #7FAF8B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            500
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-[20px] font-extrabold text-[#111827] tracking-tight leading-snug mb-2">
          Terjadi Kendala Sistem
        </h1>

        {/* Subtle description */}
        <p className="text-[13px] text-[#6B7280] leading-relaxed mb-6 max-w-[240px]">
          Aplikasi mengalami kendala teknis saat memproses halaman ini. Silakan coba muat ulang.
        </p>

        {/* Buttons */}
        <div className="w-full space-y-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full h-12 bg-[#356E3B] hover:bg-[#2A582F] text-white font-bold text-[14px] rounded-full flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(53,110,59,0.22)] active:scale-[0.97] transition-all cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>Coba Muat Ulang</span>
          </button>

          <button
            type="button"
            onClick={handleGoHome}
            className="w-full h-11 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-[13px] rounded-full flex items-center justify-center gap-2 active:scale-[0.97] transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-gray-500" />
            <span>Ke Halaman Utama</span>
          </button>
        </div>

      </div>
    </div>
  );
}
