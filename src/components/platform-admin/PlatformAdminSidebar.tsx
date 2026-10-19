"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Building2,
  Users,
  BarChart3,
  Activity,
  ShieldCheck,
  Settings,
  LogOut,
  Shield,
  X,
  ExternalLink,
} from "lucide-react";
import { PlatformOwnerProfile, logoutPlatformAdmin } from "@/lib/platformAdminApi";

interface PlatformAdminSidebarProps {
  profile: PlatformOwnerProfile | null;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS = [
  {
    title: "Overview",
    href: "/platform-admin/overview",
    icon: LayoutDashboard,
  },
  {
    title: "Growth Analytics",
    href: "/platform-admin/analytics/growth",
    icon: TrendingUp,
  },
  {
    title: "Companies",
    href: "/platform-admin/companies",
    icon: Building2,
  },
  {
    title: "Users",
    href: "/platform-admin/users",
    icon: Users,
  },
  {
    title: "Feature Analytics",
    href: "/platform-admin/analytics/features",
    icon: BarChart3,
  },
  {
    title: "System Health",
    href: "/platform-admin/system-health",
    icon: Activity,
  },
  {
    title: "Audit Logs",
    href: "/platform-admin/audit-logs",
    icon: ShieldCheck,
  },
  {
    title: "Settings",
    href: "/platform-admin/settings",
    icon: Settings,
  },
];

export function PlatformAdminSidebar({
  profile,
  isOpenMobile,
  onCloseMobile,
}: PlatformAdminSidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    if (confirm("Apakah Anda yakin ingin keluar dari Platform Admin?")) {
      logoutPlatformAdmin();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#1E3F2B] text-white select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xs">
            <Shield className="w-5 h-5 text-[#86EFAC]" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[17px] tracking-tight text-white leading-none">
                AbsenIn
              </span>
              <span className="bg-[#86EFAC] text-[#1E3F2B] text-[9.5px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase">
                Platform
              </span>
            </div>
            <span className="text-[11px] text-white/60 font-medium mt-1">
              Owner Administration
            </span>
          </div>
        </div>

        {/* Close button on mobile */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Tutup menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-white/40 uppercase">
          Menu Utama
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/platform-admin/overview" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] text-[13px] font-semibold transition-all ${
                isActive
                  ? "bg-white text-[#1E3F2B] shadow-sm font-bold"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${isActive ? "text-[#1E3F2B]" : "text-white/70"}`}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}

        {/* Separator to main app */}
        <div className="pt-4 mt-4 border-t border-white/10">
          <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-white/40 uppercase">
            Akses Aplikasi
          </div>
          <Link
            href="/dashboard"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2 rounded-[14px] text-[12.5px] text-white/70 hover:bg-white/10 hover:text-white transition-all font-medium"
            title="Buka Aplikasi Absenin Utama"
          >
            <span className="truncate">Ke Aplikasi Utama</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/50" />
          </Link>
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="p-3.5 border-t border-white/10 bg-black/15">
        <div className="flex items-center justify-between gap-2 p-2 rounded-[14px] bg-white/5 border border-white/10">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white/20"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#356E3B] text-white flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-white/20">
                {profile?.fullName?.charAt(0) || "P"}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[12.5px] font-bold text-white truncate leading-tight">
                {profile?.fullName || "Platform Owner"}
              </span>
              <span className="text-[10.5px] text-white/60 truncate" title={profile?.email}>
                {profile?.email}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-white/60 hover:text-red-300 hover:bg-red-500/20 transition-all shrink-0 cursor-pointer"
            title="Keluar dari Platform Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-40 shadow-xl border-r border-[#1E3F2B]/20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-50 animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
