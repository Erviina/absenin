"use client";

import { Bell, MapPin, ArrowRight, ChevronDown, ChevronUp, User, Building2, Check, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

export default function DashboardPage() {
  const router = useRouter();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-6 pb-4 bg-[#fbfdfc] sticky top-0 z-20">
        <div 
          className="flex items-center gap-3 cursor-pointer relative"
          ref={profileDropdownRef}
          onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
        >
          <div className="w-[46px] h-[46px] bg-[#d3e5d9] rounded-full shrink-0"></div>
          <div className="flex flex-col">
            <span className="text-[#5C786C] text-[12px] font-medium leading-tight">Selamat datang,</span>
            <span className="text-[#1E4738] text-[17px] font-bold leading-tight flex items-center gap-1">
              Shakila Aulia
              {isProfileDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-[#1E4738]" strokeWidth={2.5} />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#1E4738]" strokeWidth={2.5} />
              )}
            </span>
          </div>

          {/* Dropdown Profile */}
          {isProfileDropdownOpen && (
            <div className="absolute top-[calc(100%+8px)] left-0 w-[270px] bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E7EB] p-2 z-50 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="px-3 pt-2 pb-1.5">
                <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.05em] uppercase">Pilih Mode Akun</span>
              </div>
              
              <div className="flex flex-col gap-1">
                {/* Personal Mode (Active) */}
                <div className="flex items-center justify-between p-2 bg-[#F0FDF4] rounded-[16px] cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="w-[42px] h-[42px] rounded-[14px] bg-[#2D5A3F] flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#111827] text-[14px] font-bold leading-tight">Mode Personal</span>
                      <span className="text-[#356E3B] text-[12px] font-medium mt-0.5">Aktif saat ini</span>
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-[#356E3B] mr-2" strokeWidth={3} />
                </div>

                {/* Management Mode */}
                <div 
                  className="flex items-center justify-between p-2 hover:bg-[#F3F4F6] rounded-[16px] cursor-pointer transition-colors"
                  onClick={() => router.push("/admin/dashboard")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-[42px] h-[42px] rounded-[14px] bg-[#F3F4F6] flex items-center justify-center shrink-0 border border-[#E5E7EB]">
                      <Building2 className="w-5 h-5 text-[#4B5563]" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#111827] text-[14px] font-bold leading-tight">Mode Manajemen</span>
                      <span className="text-[#9CA3AF] text-[12px] font-medium mt-0.5">Beralih peran</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#9CA3AF] mr-2" strokeWidth={2.5} />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="relative">
          <Bell className="w-6 h-6 text-[#1E4738]" strokeWidth={1.5} />
          <div className="absolute top-[2px] right-[2px] w-2.5 h-2.5 bg-[#00a859] border-[2px] border-[#fbfdfc] rounded-full"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pt-4 flex flex-col gap-8">
        
        {/* Hero Section */}
        <div className="relative w-full rounded-[24px] mb-2 bg-[#dce9df] overflow-hidden min-h-[164px]">
          {/* Background Illustration */}
          <img 
            src="/img/assets/imagehero.png" 
            alt="Hero Background" 
            className="absolute inset-0 w-full h-full object-cover" 
          />
          
          {/* Text Content */}
          <div className="relative z-10 w-[60%] p-5 pt-6 flex flex-col justify-center h-full">
            <h1 className="text-[#1E4738] text-[17px] font-bold leading-[1.35] tracking-tight">
              Kerja lebih produktif,<br/>
              mulai dari hadir tepat<br/>
              waktu!
            </h1>
          </div>

          {/* CTA Check In Overlapping at Bottom Right (Half Pill) */}
          <div className="absolute bottom-0 right-0 z-20 flex items-end">
            <button 
              onClick={() => window.location.href = '/checkin'}
              className="bg-[#1E4738] hover:bg-[#153428] text-white rounded-l-full pl-5 pr-4 py-3 flex items-center gap-2 shadow-sm border-[4px] border-r-0 border-white transition-all active:scale-95"
            >
              <MapPin className="w-[18px] h-[18px]" strokeWidth={2.5} />
              <span className="font-bold text-[14px]">Check In</span>
              <ArrowRight className="w-5 h-5 ml-1" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Berita Terbaru */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[18px] font-bold text-[#1E4738]">Berita Terbaru</h2>
            <button className="text-[#356E3B] text-[13px] font-medium flex items-center gap-1 hover:underline">
              Lihat Semua
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Card 1 */}
            <div className="bg-white rounded-[20px] p-4 flex gap-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="w-[72px] h-[72px] bg-[#d9e8df] rounded-2xl shrink-0"></div>
              <div className="flex flex-col justify-center">
                <span className="bg-[#eef5f0] text-[#1E4738] text-[10px] font-bold px-2.5 py-1 rounded-full w-fit mb-1.5">
                  Pengumuman
                </span>
                <h3 className="text-[#1E4738] text-[13px] font-bold leading-snug mb-1 line-clamp-1">
                  Jadwal Kerja dan Absensi Bulan
                </h3>
                <p className="text-[#7d998c] text-[11px] line-clamp-1">
                  Mohon untuk memperhatikan...
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-[20px] p-4 flex gap-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="w-[72px] h-[72px] bg-[#d9e8df] rounded-2xl shrink-0"></div>
              <div className="flex flex-col justify-center">
                <span className="bg-[#eef5f0] text-[#1E4738] text-[10px] font-bold px-2.5 py-1 rounded-full w-fit mb-1.5">
                  Tips & Info
                </span>
                <h3 className="text-[#1E4738] text-[13px] font-bold leading-snug mb-1 line-clamp-1">
                  Tips Meningkatkan Produktivitas
                </h3>
                <p className="text-[#7d998c] text-[11px] line-clamp-1">
                  Simak beberapa tips sederhana...
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-[20px] p-4 flex gap-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="w-[72px] h-[72px] bg-[#d9e8df] rounded-2xl shrink-0"></div>
              <div className="flex flex-col justify-center">
                <span className="bg-[#eef5f0] text-[#1E4738] text-[10px] font-bold px-2.5 py-1 rounded-full w-fit mb-1.5">
                  Tips & Info
                </span>
                <h3 className="text-[#1E4738] text-[13px] font-bold leading-snug mb-1 line-clamp-1">
                  Tips Meningkatkan Produktivitas
                </h3>
                <p className="text-[#7d998c] text-[11px] line-clamp-1">
                  Simak beberapa tips sederhana...
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="beranda" />

    </div>
  );
}
