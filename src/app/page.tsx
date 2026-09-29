"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Berpindah ke halaman onboarding setelah 2 detik
    const timer = setTimeout(() => {
      router.push("/login/onboard");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#edf3ef] relative overflow-hidden">
      {/* Efek glow halus di latar belakang */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#7FAF8B]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#7FAF8B]/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Logo di tengah layar */}
      <img 
        src="/img/assets/Logo.png" 
        alt="AbsenIn Logo" 
        className="w-56 h-auto object-contain z-10 animate-in fade-in zoom-in-95 duration-1000" 
      />
    </div>
  );
}
