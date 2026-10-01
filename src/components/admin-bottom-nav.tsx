"use client";

import { Home, FileText, ClipboardEdit } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminBottomNavProps {
  activeTab?: "beranda" | "absensi" | "izin" | "tugas";
}

export function AdminBottomNav({ activeTab = "beranda" }: AdminBottomNavProps) {
  const router = useRouter();

  const handleNav = (tab: string, path: string) => {
    if (activeTab !== tab) {
      router.push(path);
    }
  };

  const navItems = [
    {
      id: "beranda",
      label: "Beranda",
      path: "/admin/dashboard",
      icon: (active: boolean) => (
        <Home className="w-6 h-6" fill={active ? "currentColor" : "none"} strokeWidth={active ? 1.5 : 2} />
      ),
    },
    {
      id: "absensi",
      label: "Absensi",
      path: "/admin/absensi", // adjust path as needed later
      icon: (active: boolean) => (
        <div className="relative">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V5a2 2 0 0 1 2-2h2"></path>
            <path d="M16 3h2a2 2 0 0 1 2 2v2"></path>
            <path d="M20 17v2a2 2 0 0 1-2 2h-2"></path>
            <path d="M8 21H6a2 2 0 0 1-2-2v-2"></path>
            <circle cx="12" cy="12" r="3" fill={active ? "currentColor" : "none"}></circle>
            <path d="M12 9v3l1.5 1.5"></path>
          </svg>
        </div>
      ),
    },
    {
      id: "izin",
      label: "Izin & Cuti",
      path: "/admin/izin", // adjust path as needed later
      icon: (active: boolean) => (
        <FileText className="w-6 h-6" strokeWidth={active ? 2.2 : 2} />
      ),
    },
    {
      id: "tugas",
      label: "Daftar Tugas",
      path: "/admin/tugas", // adjust path as needed later
      icon: (active: boolean) => (
        <ClipboardEdit className="w-6 h-6" strokeWidth={active ? 2.2 : 2} />
      ),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white flex justify-between px-6 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] h-[72px] border-x border-border/40">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleNav(item.id, item.path)}
            className={`flex flex-col items-center justify-center gap-1 min-w-[56px] relative h-full transition-colors ${
              isActive ? "text-[#1E4738]" : "text-[#7d998c] hover:text-[#5C786C]"
            }`}
          >
            <div className="mb-1">
              {item.icon(isActive)}
            </div>
            <span className={`text-[10px] leading-none ${isActive ? "font-bold" : "font-medium"}`}>
              {item.label}
            </span>
            {isActive && (
              <div className="absolute bottom-0 w-10 h-[4px] bg-[#1E4738] rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
