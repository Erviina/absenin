"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

interface UnauthorizedViewProps {
  type?: "401" | "403";
}

export function UnauthorizedView({ type = "403" }: UnauthorizedViewProps) {
  const router = useRouter();
  const is401 = type === "401";

  useEffect(() => {
    document.title = is401
      ? "401 - Login Diperlukan | AbsenIn"
      : "403 - Akses Ditolak | AbsenIn";
  }, [is401]);

  const heading = is401 ? "Login Diperlukan" : "Akses Ditolak";
  const description = is401
    ? "Silakan login terlebih dahulu untuk melanjutkan."
    : "Anda tidak memiliki izin untuk membuka halaman ini.";
  const buttonLabel = is401 ? "Login Sekarang" : "Kembali ke Halaman Utama";
  const buttonAction = is401 ? "/login" : "/dashboard";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFCF9] items-center justify-center px-8">
      <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-xs">

        {/* Error Code */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Ambient glow — same as 404 */}
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
            {type}
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-[20px] font-extrabold text-[#111827] tracking-tight leading-snug mb-2">
          {heading}
        </h1>

        {/* Description */}
        <p className="text-[13px] text-[#6B7280] leading-relaxed mb-8 max-w-[220px]">
          {description}
        </p>

        {/* CTA Button — same style as 404 */}
        <button
          onClick={() => router.push(buttonAction)}
          className="w-full h-12 bg-[#356E3B] hover:bg-[#2A582F] text-white font-bold text-[14px] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(53,110,59,0.22)] active:scale-[0.97] transition-all cursor-pointer"
        >
          {buttonLabel}
        </button>

      </div>
    </div>
  );
}
