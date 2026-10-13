"use client";

import { 
  Bell, 
  MapPin, 
  ArrowRight, 
  ChevronDown, 
  Briefcase,
  Users,
  Building2,
  User,
  Newspaper
} from "lucide-react";
import { sanitizeText, truncateText } from "@/lib/sanitize";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { useCompany } from "@/context/CompanyContext";
import { AccountContextDrawer } from "@/components/AccountContextDrawer";
import { getPersonalModePreference } from "@/lib/personalMode";
import { 
  evaluateSchedule, 
  getNextCheckInSchedule, 
  calculateServerOffsetMs, 
  CompanyScheduleData 
} from "@/lib/schedule";

export default function DashboardPage() {
  const router = useRouter();
  const { 
    activeCompanyId, 
    activeCompany, 
    activeRole, 
    memberships, 
    switchCompany,
    isLoading: isCompanyLoading,
  } = useCompany();

  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<"NOT_CHECKED_IN" | "CHECKED_IN" | "CHECKED_OUT" | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [companySchedule, setCompanySchedule] = useState<CompanyScheduleData | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());

  // Timer berkala untuk pembaruan waktu lokal & evaluasi jendela absensi otomatis tanpa refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Close drawer whenever active company or active role changes
  useEffect(() => {
    setIsContextDrawerOpen(false);
  }, [activeCompanyId, activeRole]);

  useEffect(() => {
    // Tunggu hingga CompanyContext selesai memverifikasi membership dari backend.
    // Ini mencegah cache lama (activeCompanyId dari localStorage) memblokir redirect
    // ke /cek-perusahaan yang seharusnya terjadi.
    if (isCompanyLoading) return;

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }

        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        // Setelah isCompanyLoading selesai, activeCompanyId sudah terverifikasi dari backend
        if (activeCompanyId) {
          headers["x-company-id"] = activeCompanyId;
        }

        const [authRes, newsRes, attendRes, notifRes] = await Promise.all([
          fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/me", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/news", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/attendances/today", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/notifications/unread-count", { headers })
        ]);

        try {
          const authData = await authRes.json();
          if (authData.success) {
            setUser(authData.data.user);
            const skipCompanyPrompt = getPersonalModePreference(authData.data.user?.id);
            // activeCompanyId di sini sudah diverifikasi backend (isCompanyLoading sudah false),
            // jadi aman digunakan sebagai penentu apakah pengguna punya perusahaan aktif.
            if (!authData.data.user?.company && !activeCompanyId && !skipCompanyPrompt) {
              router.push("/cek-perusahaan");
              return;
            }
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
          if (attendData.success && attendData.data) {
            setAttendanceStatus(attendData.data.status);
            setAttendanceError(false);
            if (attendData.data.company) {
              setCompanySchedule(attendData.data.company);
              const offset = calculateServerOffsetMs(attendData.data.company.server_time);
              setServerOffsetMs(offset);
            }
          } else {
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
  }, [router, activeCompanyId, isCompanyLoading]);

  const isManagement = activeRole 
    ? ["owner", "admin", "manager"].includes(activeRole) 
    : Boolean(user?.isManagement || (user?.roles?.includes("Admin") || user?.roles?.includes("Manager")));

  const getCategoryIcon = (categoryCode?: string | null) => {
    switch (categoryCode) {
      case "business":
        return Briefcase;
      case "community":
        return Users;
      case "organization":
      default:
        return Building2;
    }
  };

  const getRoleBadgeStyle = (role?: string | null) => {
    switch (role?.toLowerCase()) {
      case "owner":
        return "bg-[#FFF7ED] text-[#C2410C] border-[#FDBA74] font-bold";
      case "admin":
        return "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0] font-bold";
      case "manager":
        return "bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD] font-bold";
      case "member":
      default:
        return "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] font-semibold";
    }
  };

  const scheduleEval = evaluateSchedule(
    companySchedule,
    serverOffsetMs,
    new Date(currentTimeMs + serverOffsetMs)
  );

  const nextSchedule = getNextCheckInSchedule(
    companySchedule,
    serverOffsetMs,
    {
      afterCheckout: attendanceStatus === "CHECKED_OUT",
      referenceDate: new Date(currentTimeMs + serverOffsetMs)
    }
  );

  // Evaluasi status dan gaya tombol absensi
  let isBtnDisabled = false;
  let btnLabel = "Masuk";
  let btnHelperText: string | null = null;
  let btnColorClass = "bg-[#1E4738] hover:bg-[#153428] text-white active:scale-95 cursor-pointer";

  if (isAttendanceLoading) {
    isBtnDisabled = true;
    btnLabel = "Memuat...";
    btnColorClass = "bg-[#1E4738] text-white opacity-70 cursor-not-allowed";
  } else if (attendanceError) {
    isBtnDisabled = true;
    btnLabel = "Gagal Memuat";
    btnColorClass = "bg-gray-400 text-white cursor-not-allowed";
    btnHelperText = "Gagal memuat status kehadiran";
  } else if (attendanceStatus === "CHECKED_IN") {
    // Sedang dalam status check-in -> tombol bertindak untuk check-out
    isBtnDisabled = false;
    btnLabel = "Keluar";
    btnColorClass = "bg-[#1E4738] hover:bg-[#153428] text-white active:scale-95 cursor-pointer";
  } else if (attendanceStatus === "CHECKED_OUT") {
    // Selesai check-out hari ini -> tombol disabled abu-abu hingga jadwal berikutnya
    isBtnDisabled = true;
    btnLabel = "Selesai";
    btnColorClass = "bg-gray-400 text-white cursor-not-allowed";
    btnHelperText = `Jadwal berikutnya: ${nextSchedule.isTomorrow ? `Besok (${nextSchedule.dayName})` : nextSchedule.dayName}, ${nextSchedule.openTimeFormatted} WIB`;
  } else {
    // Status NOT_CHECKED_IN / belum absen hari ini
    if (!scheduleEval.isWorkDay) {
      isBtnDisabled = true;
      btnLabel = "Libur";
      btnColorClass = "bg-gray-400 text-white cursor-not-allowed";
      btnHelperText = `Hari ini (${scheduleEval.currentDayName}) bukan hari kerja. Buka ${nextSchedule.isTomorrow ? `Besok (${nextSchedule.dayName})` : nextSchedule.dayName} ${nextSchedule.openTimeFormatted} WIB`;
    } else if (!scheduleEval.isCheckInOpen) {
      isBtnDisabled = true;
      btnLabel = `Buka ${scheduleEval.openTimeFormatted}`;
      btnColorClass = "bg-gray-400 text-white cursor-not-allowed";
      btnHelperText = `Check-in dibuka pukul ${scheduleEval.openTimeFormatted} WIB (15 menit sebelum masuk ${scheduleEval.startTimeFormatted} WIB)`;
    } else {
      isBtnDisabled = false;
      btnLabel = "Masuk";
      btnColorClass = "bg-[#1E4738] hover:bg-[#153428] text-white active:scale-95 cursor-pointer";
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      
      {/* Top Header: Profil & Notifikasi */}
      <div className="flex justify-between items-center px-6 pt-9 sm:pt-10 pb-3.5 bg-[#fbfdfc]">
        {/* Avatar & Greeting */}
        <div className="flex items-center gap-3 min-w-0">
          <div 
            onClick={() => router.push("/profil")}
            className="cursor-pointer shrink-0 relative group"
            title="Lihat Profil"
          >
            {user?.avatarUrl && !avatarError ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="w-[46px] h-[46px] rounded-full shrink-0 object-cover ring-2 ring-[#1E4738]/10 group-hover:ring-[#1E4738]/30 transition-all shadow-xs"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-[46px] h-[46px] bg-[#d3e5d9] rounded-full flex items-center justify-center text-[#1E4738] font-bold text-[16px] shadow-xs">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a859] border-2 border-white rounded-full"></div>
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-[#5C786C] text-[12px] font-medium leading-none mb-1">
              Selamat datang,
            </span>
            <h1 className="text-[#1E4738] text-[17px] font-bold leading-tight truncate">
              {isLoading ? "Memuat..." : (user?.fullName || "Pengguna")}
            </h1>
          </div>
        </div>

        {/* Notifikasi Button */}
        <button 
          className="w-10 h-10 rounded-full bg-white border border-[#E5E7EB] shadow-xs flex items-center justify-center relative hover:bg-[#F9FAFB] active:scale-95 transition-transform shrink-0 cursor-pointer"
          onClick={() => router.push("/notifikasi")}
          title="Notifikasi"
        >
          <Bell className="w-5 h-5 text-[#1E4738]" strokeWidth={1.8} />
          {unreadCount > 0 && (
            <div className="absolute top-[8px] right-[8px] w-2.5 h-2.5 bg-[#00a859] border-2 border-white rounded-full"></div>
          )}
        </button>
      </div>

      {/* Workspace Context Bar (Tenant & Mode Akses Minimalis) */}
      <div className="px-6 pt-1.5 pb-4">
        <div 
          onClick={() => setIsContextDrawerOpen(true)}
          className="w-full bg-white hover:bg-[#F9FCFA] border border-[#DEEAE0] rounded-[22px] py-3.5 px-4 flex items-center justify-between shadow-[0_4px_16px_rgba(30,71,56,0.04)] cursor-pointer transition-all active:scale-[0.99] group"
          title="Kelola Perusahaan & Peran Akun"
        >
          {/* Active Company & Category */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-[14px] bg-[#1E4738] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              {(() => {
                const CatIcon = activeCompany ? getCategoryIcon(activeCompany?.category?.code) : User;
                return <CatIcon className="w-5 h-5" />;
              })()}
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[14px] font-bold text-[#111827] truncate group-hover:text-[#1E4738] transition-colors">
                  {activeCompany?.name || "Mode Personal"}
                </span>
                {activeCompany && (
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border capitalize shrink-0 font-bold ${getRoleBadgeStyle(activeRole)}`}>
                    {activeRole || "Member"}
                  </span>
                )}
              </div>
              <span className="text-[11.5px] text-[#5C786C] font-medium leading-none mt-1 truncate">
                {activeCompany?.category?.name || "Belum terhubung organisasi"}
              </span>
            </div>
          </div>

          {/* Trigger Icon */}
          <div className="flex items-center pl-3 border-l border-gray-100 shrink-0 text-gray-400 group-hover:text-[#1E4738] transition-colors">
            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Drawer Bottom Sheet: Peralihan Akun & Perusahaan */}
      <AccountContextDrawer 
        isOpen={isContextDrawerOpen}
        onClose={() => setIsContextDrawerOpen(false)}
        currentMode="personal"
      />

      {/* Main Content */}
      <div className="flex-1 px-6 pt-0 flex flex-col gap-6">
        
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
            {btnHelperText && (
              <div className="mt-2 flex items-center gap-1.5 bg-white/85 backdrop-blur-xs px-2.5 py-1 rounded-full w-fit shadow-2xs border border-white/60">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E4738]/60 shrink-0" />
                <span className="text-[10.5px] font-semibold text-[#1E4738] truncate max-w-[190px]" title={btnHelperText}>
                  {btnHelperText}
                </span>
              </div>
            )}
          </div>

          {/* CTA Check In Overlapping at Bottom Right (Half Pill) */}
          <div className="absolute bottom-0 right-0 z-20 flex items-end">
            <button 
              onClick={() => router.push('/checkin')}
              disabled={isBtnDisabled}
              title={btnHelperText || (attendanceStatus === "CHECKED_IN" ? "Rekam Check-out" : "Rekam Kehadiran")}
              className={`${btnColorClass} rounded-l-full pl-5 pr-4 py-3 flex items-center gap-2 shadow-sm border-[4px] border-r-0 border-white transition-all`}
            >
              <MapPin className="w-[18px] h-[18px]" strokeWidth={2.5} />
              <span className="font-bold text-[14px]">
                {btnLabel}
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
                <div 
                  key={item.id || idx} 
                  onClick={() => router.push(`/berita/${item.id}`)}
                  className="bg-white rounded-[20px] p-4 flex gap-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:border-[#dce9df] hover:shadow-md transition-all active:scale-[0.99] group overflow-hidden"
                >
                  {item.cover_image_url ? (
                    <img src={item.cover_image_url} alt={sanitizeText(item.title)} className="w-[72px] h-[72px] rounded-2xl shrink-0 object-cover" />
                  ) : (
                    <div className="w-[72px] h-[72px] bg-[#d9e8df] rounded-2xl shrink-0 flex items-center justify-center text-[#1E4738]/60">
                      <Newspaper className="w-7 h-7" />
                    </div>
                  )}
                  <div className="flex flex-col justify-center flex-1 min-w-0 overflow-hidden">
                    <span className="bg-[#eef5f0] text-[#1E4738] text-[10px] font-bold px-2.5 py-1 rounded-full w-fit mb-1.5">
                      {item.category?.name || "Pengumuman"}
                    </span>
                    <h3 className="text-[#1E4738] group-hover:text-[#356E3B] transition-colors text-[13px] font-bold leading-snug mb-1 line-clamp-1 break-words [overflow-wrap:anywhere]">
                      {sanitizeText(item.title)}
                    </h3>
                    <p className="text-[#7d998c] text-[11px] line-clamp-1 break-words [overflow-wrap:anywhere]">
                      {truncateText(item.content, 90)}
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
