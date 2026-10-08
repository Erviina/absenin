"use client";

import { Bell, MapPin, ArrowRight, ChevronDown, ChevronUp, User, Building2, Check, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

export default function DashboardPage() {
  const router = useRouter();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<"NOT_CHECKED_IN" | "CHECKED_IN" | "CHECKED_OUT" | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }

        const [authRes, newsRes, attendRes, notifRes] = await Promise.all([
          fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/news", { headers: { Authorization: `Bearer ${token}` } }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/attendances/today", { headers: { Authorization: `Bearer ${token}` } }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/notifications/unread-count", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        try {
          const authData = await authRes.json();
          if (authData.success) {
            setUser(authData.data.user);
          }
        } catch (e) {
          console.error("Failed to parse auth data", e);
        }

        try {
          const newsData = await newsRes.json();
          if (newsData.success) {
            setNews(newsData.data.slice(0, 2));
          }
        } catch (e) {
          console.error("Failed to parse news data", e);
        }

        try {
          const notifData = await notifRes.json();
          if (notifData.success) {
            setUnreadCount(notifData.data.count);
          }
        } catch (e) {
          console.error("Failed to parse notif data", e);
        }

        try {
          const attendData = await attendRes.json();
          console.log("=== DEBUG ATTENDANCE ===");
          console.log("attendRes.status:", attendRes.status);
          console.log("attendData:", attendData);
          console.log("attendData?.data?.status:", attendData?.data?.status);
          
          if (attendData.success && attendData.data) {
            console.log("Setting attendanceStatus to:", attendData.data.status);
            setAttendanceStatus(attendData.data.status);
            setAttendanceError(false);
          } else {
            console.log("Setting attendanceError to true because success is false or data is missing");
            setAttendanceError(true);
          }
        } catch (e) {
          console.error("Failed to parse attendance data", e);
          setAttendanceError(true);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setAttendanceError(true);
      } finally {
        setIsLoading(false);
        setIsAttendanceLoading(false);
      }
    };
    fetchData();
  }, [router]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-6 pb-4 bg-[#fbfdfc] sticky top-0 z-20">
        <div className="flex items-center gap-3 relative">
          
          {/* Avatar (Click to Profile) */}
          <div 
            onClick={() => router.push("/profil")}
            className="cursor-pointer shrink-0"
          >
            {user?.avatarUrl && !avatarError ? (
            <img
              src={user.avatarUrl}
              alt="Avatar"
              className="w-[46px] h-[46px] rounded-full shrink-0 object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-[46px] h-[46px] bg-[#d3e5d9] rounded-full"></div>
          )}
          </div>

          {/* Name & Dropdown Toggle */}
          <div 
            className="flex flex-col cursor-pointer select-none"
            onClick={() => {
              const isManagement =
                user?.roles?.includes("Admin") ||
                user?.roles?.includes("Manager");

              if (isManagement) {
                setIsProfileDropdownOpen(!isProfileDropdownOpen);
              } else {
                router.push("/profil");
              }
            }}
          >
            <span className="text-[#5C786C] text-[12px] font-medium leading-tight">
              Selamat datang,
            </span>

            <span className="text-[#1E4738] text-[17px] font-bold leading-tight flex items-center gap-1">
              {isLoading ? "Memuat..." : (user?.fullName || "Pengguna")}

              {(user?.roles?.includes("Admin") ||
                user?.roles?.includes("Manager")) &&
                (isProfileDropdownOpen ? (
                  <ChevronUp
                    className="w-4 h-4 text-[#1E4738]"
                    strokeWidth={2.5}
                  />
                ) : (
                  <ChevronDown
                    className="w-4 h-4 text-[#1E4738]"
                    strokeWidth={2.5}
                  />
                ))}
            </span>
          </div>

          {/* Dropdown Profile */}
          {(user?.roles?.includes("Admin") || user?.roles?.includes("Manager")) && isProfileDropdownOpen && (
            <div className="absolute top-[calc(100%+8px)] left-0 w-[270px] bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E7EB] p-2 z-50 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="px-3 pt-2 pb-1.5">
                <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.05em] uppercase">Pilih Mode Akun</span>
              </div>
              
              <div className="flex flex-col gap-1">
                {/* Personal Mode (Active) */}
                <div 
                  className="flex items-center justify-between p-2 bg-[#F0FDF4] rounded-[16px] cursor-pointer hover:bg-[#E8F3EB] transition-colors"
                  onClick={() => router.push("/profil")}
                >
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
        <button 
          className="relative active:scale-95 transition-transform"
          onClick={() => router.push("/notifikasi")}
        >
          <Bell className="w-6 h-6 text-[#1E4738]" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <div className="absolute top-[2px] right-[2px] w-2.5 h-2.5 bg-[#00a859] border-[2px] border-[#fbfdfc] rounded-full"></div>
          )}
        </button>
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
              disabled={isAttendanceLoading || attendanceError}
              className="bg-[#1E4738] hover:bg-[#153428] text-white rounded-l-full pl-5 pr-4 py-3 flex items-center gap-2 shadow-sm border-[4px] border-r-0 border-white transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <MapPin className="w-[18px] h-[18px]" strokeWidth={2.5} />
              <span className="font-bold text-[14px]">
                {isAttendanceLoading 
                  ? "Memuat..." 
                  : attendanceError 
                    ? "Gagal Memuat" 
                    : (attendanceStatus === "CHECKED_IN" ? "Check Out" : "Check In")}
              </span>
              <ArrowRight className="w-5 h-5 ml-1" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Berita Terbaru */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[18px] font-bold text-[#1E4738]">Berita Terbaru</h2>
            <button 
              onClick={() => router.push("/berita")}
              className="text-[#356E3B] text-[13px] font-medium flex items-center gap-1 hover:underline active:scale-95 transition-transform"
            >
              Lihat Semua
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {isLoading ? (
              <div className="text-center text-[#7d998c] text-[13px] font-medium py-4 animate-pulse">Memuat berita...</div>
            ) : news.length === 0 ? (
              <div className="bg-white rounded-[20px] p-6 text-center border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <p className="text-[#7d998c] text-[13px] font-medium">Belum ada berita terbaru saat ini.</p>
              </div>
            ) : (
              news.map((item, idx) => (
                <div key={item.id || idx} className="bg-white rounded-[20px] p-4 flex gap-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  {item.cover_image_url ? (
                    <img src={item.cover_image_url} alt={item.title} className="w-[72px] h-[72px] rounded-2xl shrink-0 object-cover" />
                  ) : (
                    <div className="w-[72px] h-[72px] bg-[#d9e8df] rounded-2xl shrink-0"></div>
                  )}
                  <div className="flex flex-col justify-center">
                    <span className="bg-[#eef5f0] text-[#1E4738] text-[10px] font-bold px-2.5 py-1 rounded-full w-fit mb-1.5">
                      {item.category?.name || "Pengumuman"}
                    </span>
                    <h3 className="text-[#1E4738] text-[13px] font-bold leading-snug mb-1 line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-[#7d998c] text-[11px] line-clamp-1">
                      {item.content}
                    </p>
                  </div>
                </div>
              ))
            )}

          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="beranda" />

    </div>
  );
}
