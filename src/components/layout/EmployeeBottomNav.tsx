"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, CheckSquare, FileText } from "lucide-react";

export function EmployeeBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/karyawan/dashboard", icon: Home, label: "Beranda" },
    { href: "/karyawan/check-in", icon: Camera, label: "Presensi" },
    { href: "/karyawan/todo", icon: CheckSquare, label: "Workspace" },
    { href: "/karyawan/izin", icon: FileText, label: "Perizinan" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-border pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
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
