"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AbsenInLogo } from "@/components/AbsenInLogo";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Pengguna yang sudah memiliki token sesi diarahkan ke /login untuk verifikasi backend terpusat.
    // Pengguna baru tanpa sesi diarahkan ke /login/onboard.
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken")?.trim() : null;
    const target = token ? "/login" : "/login/onboard";

    const timer = setTimeout(() => {
      router.push(target);
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#edf3ef] relative overflow-hidden">
      {/* Efek glow halus di latar belakang */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#7FAF8B]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#7FAF8B]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo di tengah layar (HD Vector) */}
      <AbsenInLogo size="lg" className="z-10 animate-in fade-in zoom-in-95 duration-1000" />
    </div>
  );
}
