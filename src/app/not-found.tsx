"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PlatformAdminErrorView } from "@/components/platform-admin/PlatformAdminErrorView";
import { isPlatformAdminPath } from "@/lib/routeUtils";

export default function RootNotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const [hasToken, setHasToken] = useState<boolean>(false);
  const isPlatformAdmin = isPlatformAdminPath(pathname);

  useEffect(() => {
    document.title = "404 - Halaman Tidak Ditemukan | AbsenIn";
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      setHasToken(Boolean(token));
    }
  }, []);

  // Jika URL yang tidak valid berada di bawah /platform-admin, tampilkan Error Desktop Platform Admin
  if (isPlatformAdmin) {
    return <PlatformAdminErrorView type="404" />;
  }

  const handleAction = () => {
    if (hasToken) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFCF9] items-center justify-center px-8 selection:bg-[#356E3B]/20">
      <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-xs">

        {/* 404 Number */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Ambient glow */}
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
            404
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-[20px] font-extrabold text-[#111827] tracking-tight leading-snug mb-2">
          Ups! Halaman Tidak Ditemukan
        </h1>

        {/* Subtle description */}
        <p className="text-[13px] text-[#6B7280] leading-relaxed mb-8 max-w-[240px]">
          Halaman yang kamu cari tidak ada, telah dipindahkan, atau alamat URL salah.
        </p>

        {/* CTA Button */}
        <button
          type="button"
          onClick={handleAction}
          className="w-full h-12 bg-[#356E3B] hover:bg-[#2A582F] text-white font-bold text-[14px] rounded-full flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(53,110,59,0.22)] active:scale-[0.97] transition-all cursor-pointer"
        >
          {hasToken ? "Kembali ke Dashboard" : "Kembali ke Halaman Login"}
        </button>

      </div>
    </div>
  );
}
