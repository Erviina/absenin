"use client";

import React, { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { isTokenValid } from "@/lib/personalMode";
import { UnauthorizedView } from "@/components/UnauthorizedView";
import { 
  isPublicPath, 
  isPlatformAdminPath, 
  isInvalidRoute 
} from "@/lib/routeUtils";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [is403Revoked, setIs403Revoked] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Klasifikasi tipe rute
  const isPublic = useMemo(() => {
    if (!pathname) return true;
    if (pathname === "/syarat-ketentuan" || pathname.startsWith("/syarat-ketentuan/")) return true;
    return isPublicPath(pathname);
  }, [pathname]);
  const isPlatformAdmin = useMemo(() => isPlatformAdminPath(pathname), [pathname]);
  const isInvalid = useMemo(() => {
    if (pathname === "/syarat-ketentuan" || pathname?.startsWith("/syarat-ketentuan/")) return false;
    return isInvalidRoute(pathname);
  }, [pathname]);

  // Periksa token lokal setelah hydration client
  useEffect(() => {
    setMounted(true);

    // Cek apakah ada proses logout yang sedang berlangsung
    const loggingOutFlag = typeof window !== "undefined" && sessionStorage.getItem("isLoggingOut") === "true";
    if (loggingOutFlag) {
      setIsLoggingOut(true);
      // Jika sudah berada di halaman login atau publik, bersihkan flag
      if (isPublic) {
        sessionStorage.removeItem("isLoggingOut");
        setIsLoggingOut(false);
      }
    } else {
      setIsLoggingOut(false);
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const valid = Boolean(token && isTokenValid(token));
    setHasToken(valid);
    setIs403Revoked(false);
  }, [pathname, isPublic]);

  // Listener untuk event sesi & pencabutan hak akses real-time
  useEffect(() => {
    const handleLoggingOut = () => {
      setIsLoggingOut(true);
      setHasToken(false);
    };
    const handleSessionCleared = () => {
      setHasToken(false);
    };
    const handleSessionUpdated = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      setHasToken(Boolean(token && isTokenValid(token)));
      setIs403Revoked(false);
      setIsLoggingOut(false);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("isLoggingOut");
      }
    };
    const handleUnauthorizedAccess = () => {
      // Seketika tampilkan 403 saat server merespons 403 Forbidden (hak akses dicabut)
      setIs403Revoked(true);
    };

    window.addEventListener("authLoggingOut", handleLoggingOut);
    window.addEventListener("authSessionCleared", handleSessionCleared);
    window.addEventListener("authSessionUpdated", handleSessionUpdated);
    window.addEventListener("unauthorizedAccess", handleUnauthorizedAccess);

    return () => {
      window.removeEventListener("authLoggingOut", handleLoggingOut);
      window.removeEventListener("authSessionCleared", handleSessionCleared);
      window.removeEventListener("authSessionUpdated", handleSessionUpdated);
      window.removeEventListener("unauthorizedAccess", handleUnauthorizedAccess);
    };
  }, []);

  // 1. Delegasikan Platform Admin ke layout & guard miliknya sendiri
  if (isPlatformAdmin) {
    return <>{children}</>;
  }

  // 2. Rute Publik: langsung render tanpa proteksi
  if (isPublic) {
    return <>{children}</>;
  }

  // 3. Rute Tidak Valid (404): biarkan Next.js App Router merender not-found.tsx
  // JANGAN diblokir sebagai 401 Unauthorized agar URL invalid menampilkan 404 asli!
  if (isInvalid) {
    return <>{children}</>;
  }

  // 4. Jika sedang dalam alur logout: tampilkan transisi netral, HINDARI flash 401
  if (isLoggingOut) {
    return (
      <div 
        className="min-h-[100dvh] w-full bg-[#FAFCF9] flex items-center justify-center" 
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
      </div>
    );
  }

  // 5. Sebelum mount di client (SSR phase) atau sebelum validasi token selesai:
  // TAMPILKAN TRANSISI NETRAL untuk mencegah flash layout terproteksi (leakage) sebelum terverifikasi
  if (!mounted || hasToken === null) {
    return (
      <div 
        className="min-h-[100dvh] w-full bg-[#FAFCF9] flex items-center justify-center" 
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
      </div>
    );
  }

  // 6. Jika hak akses dicabut seketika (403 Forbidden)
  if (is403Revoked) {
    return <UnauthorizedView type="403" />;
  }

  // 7. Jika user belum login / sesi kedaluwarsa pada rute terproteksi:
  // Arahkan segera ke /login tanpa membocorkan konten privat dan tanpa flash error
  if (!hasToken) {
    if (typeof window !== "undefined") {
      const target = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
      window.location.replace(target);
    }
    return (
      <div 
        className="min-h-[100dvh] w-full bg-[#FAFCF9] flex items-center justify-center" 
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
      </div>
    );
  }

  // 8. Pengguna terautentikasi dan memiliki wewenang: render halaman
  return <>{children}</>;
}
