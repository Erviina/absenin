"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  SearchX, 
  ArrowLeft, 
  Home, 
  MapPin, 
  Calendar, 
  User, 
  ChevronRight,
  Compass
} from "lucide-react";
import { TopBar } from "@/components/TopBar";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    document.title = "404 - Halaman Tidak Ditemukan | AbsenIn";
  }, []);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  const quickLinks = [
    {
      title: "Dashboard Karyawan",
      desc: "Kembali ke beranda utama dan aktivitas harian",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "Presensi Real-time",
      desc: "Check-in atau Check-out absensi dengan verifikasi GPS",
      href: "/checkin",
      icon: MapPin,
    },
    {
      title: "Agenda & Kegiatan",
      desc: "Jadwal dan agenda perusahaan mendatang",
      href: "/agenda",
      icon: Calendar,
    },
    {
      title: "Profil Pengguna",
      desc: "Informasi akun dan pengaturan profil Anda",
      href: "/profil",
      icon: User,
    },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFCF9] text-[#1F2937]">
      {/* TopBar */}
      <TopBar 
        title="Halaman Tidak Ditemukan" 
        onBack={handleBack}
        bgColor="bg-[#356E3B]"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
          
          {/* 404 Glowing Number & Graphic */}
          <div className="relative mb-3 flex flex-col items-center justify-center">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-[#7FAF8B]/20 blur-3xl rounded-full scale-125 pointer-events-none" />
            
            {/* Giant 404 Typography */}
            <span className="text-[80px] sm:text-[92px] font-black tracking-tight leading-none bg-gradient-to-br from-[#356E3B] via-[#527A5B] to-[#7FAF8B] bg-clip-text text-transparent select-none drop-shadow-sm">
              404
            </span>

            {/* Layered Icon Badge */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-[#E8F3EB] border border-[#D1E5D5] flex items-center justify-center text-[#356E3B] shadow-[0_8px_24px_rgba(53,110,59,0.12)] -mt-4 mb-2 relative z-10">
              <Compass className="w-9 h-9 sm:w-10 sm:h-10 text-[#356E3B] animate-[spin_12s_linear_infinite]" strokeWidth={1.7} />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#356E3B] text-white flex items-center justify-center shadow-sm border-2 border-white">
                <SearchX className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Status Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3ED] border border-[#D1E5D5] text-[#2D5A3F] text-[11.5px] font-bold tracking-wider uppercase mb-2">
            <span>RUTE TIDAK DITEMUKAN</span>
          </div>

          {/* Headline */}
          <h1 className="text-[21px] sm:text-[23px] font-extrabold text-[#111827] tracking-tight leading-snug">
            Oops! Halaman Tidak Ada
          </h1>

          {/* Description */}
          <p className="text-[13.5px] sm:text-[14px] text-[#5C786C] font-normal mt-2 leading-relaxed max-w-xs">
            Halaman atau tautan yang Anda cari belum dibuat, telah dipindahkan, atau alamat URL yang dimasukkan salah.
          </p>

          {/* Quick Links Suggestions Card */}
          <div className="w-full bg-white rounded-2xl border border-[#E5E7EB] p-3 sm:p-3.5 mt-6 text-left shadow-sm">
            <span className="text-[11px] font-bold text-[#8C9AA8] uppercase tracking-wider block mb-2 px-1">
              Menu Cepat Tersedia
            </span>
            <div className="flex flex-col gap-1.5">
              {quickLinks.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F4F9F6] border border-transparent hover:border-[#D1E5D5] transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#EAF3ED] group-hover:bg-[#356E3B] text-[#356E3B] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                        <IconComponent className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-bold text-[#111827] group-hover:text-[#356E3B] transition-colors truncate">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-[#6B7280] truncate">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#356E3B] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="w-full flex flex-col gap-2.5 mt-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full h-12 bg-[#356E3B] hover:bg-[#2A582F] text-white font-bold text-[14px] rounded-full flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(53,110,59,0.2)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Home className="w-4 h-4 stroke-[2.2]" />
              <span>Ke Dashboard Utama</span>
            </button>

            <button
              onClick={handleBack}
              className="w-full h-11 bg-white hover:bg-gray-50 text-[#374151] border border-[#E5E7EB] font-bold text-[13px] rounded-full flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
              <span>Kembali ke Halaman Sebelumnya</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
