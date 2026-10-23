"use client";

import React, { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { isTokenValid } from "@/lib/personalMode";
import { UnauthorizedView } from "@/components/UnauthorizedView";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/login/onboard",
  "/unauthorized",
  "/admin/no-authorized",
  "/kebijakan-privasi",
  "/syarat-ketentuan",
  "/platform-admin/login",
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [is403Revoked, setIs403Revoked] = useState(false);

  const isPublicRoute = useMemo(() => {
    if (!pathname) return true;
    if (PUBLIC_PATHS.includes(pathname)) return true;
    if (pathname.startsWith("/login/")) return true;
    if (pathname.startsWith("/kebijakan-privasi/")) return true;
    if (pathname.startsWith("/syarat-ketentuan/")) return true;
    return false;
  }, [pathname]);

  // Periksa token lokal setelah hydration client
  useEffect(() => {
    setMounted(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const valid = Boolean(token && isTokenValid(token));
    setHasToken(valid);
    setIs403Revoked(false);
  }, [pathname]);

  // Listener untuk event sesi & pencabutan hak akses real-time
  useEffect(() => {
    const handleSessionCleared = () => {
      setHasToken(false);
    };
    const handleSessionUpdated = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      setHasToken(Boolean(token && isTokenValid(token)));
      setIs403Revoked(false);
    };
    const handleUnauthorizedAccess = () => {
      // Seketika tampilkan 403 saat server merespons 403 Forbidden (hak akses dicabut)
      setIs403Revoked(true);
    };

    window.addEventListener("authSessionCleared", handleSessionCleared);
    window.addEventListener("authSessionUpdated", handleSessionUpdated);
    window.addEventListener("unauthorizedAccess", handleUnauthorizedAccess);

    return () => {
      window.removeEventListener("authSessionCleared", handleSessionCleared);
      window.removeEventListener("authSessionUpdated", handleSessionUpdated);
      window.removeEventListener("unauthorizedAccess", handleUnauthorizedAccess);
    };
  }, []);

  // 1. Rute publik: langsung tampilkan tanpa proteksi
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // 2. Sebelum mount di client (SSR phase): biarkan render children agar SSR / SSG Next.js tidak error
  if (!mounted || hasToken === null) {
    return <>{children}</>;
  }

  // 3. Jika user belum login menembak URL halaman yang ada dalam auth: KELUARKAN PAGE 401
  if (!hasToken) {
    return (
      <UnauthorizedView 
        type="401" 
        redirect={pathname}
      />
    );
  }

  // 4. Jika hak akses dicabut seketika (403 Forbidden): KELUARKAN PAGE 403
  if (is403Revoked) {
    return (
      <UnauthorizedView 
        type="403" 
      />
    );
  }

  return <>{children}</>;
}
