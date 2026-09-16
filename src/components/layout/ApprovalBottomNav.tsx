"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanFace, Users, ClipboardCheck, Settings } from "lucide-react";

export function ApprovalBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/approval/dashboard", icon: Home, label: "Beranda" },
    { href: "/approval/laporan", icon: ScanFace, label: "Laporan" },
    { href: "/approval/team", icon: Users, label: "Tim & Grup" },
    { href: "/approval/izin", icon: ClipboardCheck, label: "Approval" },
    { href: "/approval/settings", icon: Settings, label: "Kelola" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-border pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          // Since we might not have all 5 pages implemented yet, just highlight based on active tab
          const isActive = pathname === item.href || (pathname === "/approval/dashboard" && item.label === "Beranda") || (pathname === "/approval/settings" && item.label === "Kelola");
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-primary" : ""} />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
