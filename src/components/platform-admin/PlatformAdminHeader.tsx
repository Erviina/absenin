"use client";

import { Menu, ShieldCheck } from "lucide-react";
import { PlatformOwnerProfile } from "@/lib/platformAdminApi";

interface PlatformAdminHeaderProps {
  profile: PlatformOwnerProfile | null;
  onOpenMobileSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export function PlatformAdminHeader({
  profile,
  onOpenMobileSidebar,
  title = "Ringkasan Platform",
  subtitle = "Pusat Kendali & Analitik Pertumbuhan AbsenIn",
}: PlatformAdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E8F0EA] px-4 sm:px-6 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            title="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex flex-col min-w-0">
            <h1 className="text-[17px] sm:text-[19px] font-extrabold text-[#111827] truncate leading-tight tracking-tight">
              {title}
            </h1>
            <p className="text-[11.5px] text-[#6B7280] font-medium truncate hidden sm:block">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
