"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  Building2, 
  MapPin, 
  Users, 
  CalendarCheck, 
  FileText, 
  Calendar, 
  FileCheck, 
  Users as Users2, 
  Megaphone, 
  ClipboardList, 
  User, 
  ChevronRight, 
  Check, 
  Bell,
  AlertCircle,
  RefreshCw,
  Loader2
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { ViewAllButton } from "@/components/ViewAllButton";
import { useRouter } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";
import { handleNotificationNavigation } from "@/lib/notificationNavigation";
import { parseMembershipNotification, cleanNotificationMessage } from "@/lib/membershipNotificationUtils";
import { getActiveCompanyId, getApiUrl } from "@/lib/api";
import { CardListSkeleton } from "@/components/CardSkeleton";
import { buildCacheKey, getCachedData, setCachedData } from "@/lib/clientCache";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { activeCompanyId, activeCompany, activeRole, memberships, switchCompany, isLoading: isCompanyLoading } = useCompany();
  
  const [company, setCompany] = useState<{ id?: string; name: string; address: string; memberCount: number; avatar_company_url?: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const compId = getActiveCompanyId();
    return getCachedData<any>(buildCacheKey("admin_dashboard_comp", compId))?.data || null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const compId = getActiveCompanyId();
    return !getCachedData(buildCacheKey("admin_dashboard_comp", compId))?.data;
  });
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Ref untuk melacak perusahaan yang sedang di-fetch guna mencegah race condition
  const activeFetchCompanyIdRef = useRef<string | null>(null);

  // Listener event pergantian perusahaan untuk mereset dashboard admin seketika
  useEffect(() => {
    const handleCompanyChanged = () => {
      setCompany(null);
      setAttendanceStats(null);
      setLeaveStats(null);
      setActivities([]);
      setIsLoading(true);
      setIsStatsLoading(true);
      setIsLeaveStatsLoading(true);
      setIsActivitiesLoading(true);
      setDashboardError(null);
      setStatsError(null);
      setActivitiesError(null);
    };
    window.addEventListener("companyChanged", handleCompanyChanged);
    return () => window.removeEventListener("companyChanged", handleCompanyChanged);
  }, []);

  // Listener event pembersihan atau pembaruan sesi autentikasi untuk mereset dashboard admin seketika
  useEffect(() => {
    const handleAuthChange = () => {
      setCompany(null);
      setAttendanceStats(null);
      setLeaveStats(null);
      setActivities([]);
      setIsLoading(true);
      setIsStatsLoading(true);
      setIsLeaveStatsLoading(true);
      setIsActivitiesLoading(true);
      setDashboardError(null);
      setStatsError(null);
      setActivitiesError(null);
    };
    window.addEventListener("authSessionCleared", handleAuthChange);
    window.addEventListener("authSessionUpdated", handleAuthChange);
    return () => {
      window.removeEventListener("authSessionCleared", handleAuthChange);
      window.removeEventListener("authSessionUpdated", handleAuthChange);
    };
  }, []);
  
  const [attendanceStats, setAttendanceStats] = useState<{
    hadir: number;
    terlambat: number;
    izin: number;
    belum: number;
    total: number;
    monthly?: {
      month: number;
      year: number;
      month_name: string;
      working_days: number;
      on_time: number;
      hadir: number;
      terlambat: number;
      izin: number;
    };
  } | null>(() => {
    if (typeof window === "undefined") return null;
    const compId = getActiveCompanyId();
    const now = new Date();
    return getCachedData<any>(buildCacheKey("admin_dashboard_stats", compId, { month: now.getMonth() + 1, year: now.getFullYear() }))?.data || null;
  });
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const compId = getActiveCompanyId();
    const now = new Date();
    return !getCachedData(buildCacheKey("admin_dashboard_stats", compId, { month: now.getMonth() + 1, year: now.getFullYear() }))?.data;
  });
  const [statsError, setStatsError] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const currentMonthName = monthNames[selectedDate.getMonth()];
  const currentYear = selectedDate.getFullYear();

  const [leaveStats, setLeaveStats] = useState<{ total: number; sakit: number; cuti: number; izin: number } | null>(() => {
    if (typeof window === "undefined") return null;
    const compId = getActiveCompanyId();
    return getCachedData<any>(buildCacheKey("admin_dashboard_leave", compId))?.data || null;
  });
  const [activities, setActivities] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    const compId = getActiveCompanyId();
    return getCachedData<any[]>(buildCacheKey("admin_dashboard_act", compId))?.data || [];
  });
  const [isLeaveStatsLoading, setIsLeaveStatsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const compId = getActiveCompanyId();
    return !getCachedData(buildCacheKey("admin_dashboard_leave", compId))?.data;
  });
  const [isActivitiesLoading, setIsActivitiesLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const compId = getActiveCompanyId();
    return !getCachedData(buildCacheKey("admin_dashboard_act", compId))?.data;
  });
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [pendingLeavesCount, setPendingLeavesCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const compId = getActiveCompanyId();
    return getCachedData<any>(buildCacheKey("admin_dashboard_badge", compId))?.data?.pendingLeaves || 0;
  });
  const [karyawanBadgeCount, setKaryawanBadgeCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const compId = getActiveCompanyId();
    return getCachedData<any>(buildCacheKey("admin_dashboard_badge", compId))?.data?.karyawanBadge || 0;
  });

  // Guard: If activeRole is member, redirect to /unauthorized immediately
  useEffect(() => {
    if (!isCompanyLoading && activeRole && !["owner", "admin", "manager"].includes(activeRole)) {
      router.replace("/unauthorized");
    }
  }, [activeRole, isCompanyLoading, router]);

  if (!isCompanyLoading && activeRole && !["owner", "admin", "manager"].includes(activeRole)) {
    return null;
  }

  const formatRelativeTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return `Baru saja`;
    if (minutes < 60) return `${minutes} menit yang lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari yang lalu`;
  };

  const fetchAttendanceStatsForDate = async (targetDate: Date) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const compId = activeCompanyId || getActiveCompanyId();
      if (compId) headers["x-company-id"] = compId;

      const m = targetDate.getMonth() + 1;
      const y = targetDate.getFullYear();
      const statsCacheKey = buildCacheKey("admin_dashboard_stats", compId, { month: m, year: y });

      const cached = getCachedData<any>(statsCacheKey);
      if (cached?.data) {
        setAttendanceStats(cached.data);
        setIsStatsLoading(false);
      } else {
        setIsStatsLoading(true);
      }
      setStatsError(null);

      const resStats = await fetch(getApiUrl(`/dashboard/attendance-stats?month=${m}&year=${y}`), {
        headers
      });
      if (!resStats.ok) throw new Error(`HTTP ${resStats.status}`);
      const dataStats = await resStats.json();
      if (dataStats.success && dataStats.data) {
        setAttendanceStats(dataStats.data);
        setCachedData(statsCacheKey, dataStats.data);
        setStatsError(null);
      } else {
        setStatsError("Gagal memuat data statistik kehadiran");
      }
    } catch (e) {
      console.error("Failed to fetch attendance stats:", e);
      setStatsError("Gagal memuat data statistik kehadiran");
    } finally {
      setIsStatsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const prev = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
    setSelectedDate(prev);
    fetchAttendanceStatsForDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
    setSelectedDate(next);
    fetchAttendanceStatsForDate(next);
  };

  const fetchDashboardData = async () => {
    const compId = activeCompanyId || getActiveCompanyId();
    activeFetchCompanyIdRef.current = compId;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (compId) {
        headers["x-company-id"] = compId;
      }

      const m = selectedDate.getMonth() + 1;
      const y = selectedDate.getFullYear();

      const compCacheKey = buildCacheKey("admin_dashboard_comp", compId);
      const statsCacheKey = buildCacheKey("admin_dashboard_stats", compId, { month: m, year: y });
      const leaveCacheKey = buildCacheKey("admin_dashboard_leave", compId);
      const actCacheKey = buildCacheKey("admin_dashboard_act", compId);
      const badgeCacheKey = buildCacheKey("admin_dashboard_badge", compId);

      const cachedComp = getCachedData<any>(compCacheKey);
      if (cachedComp?.data && activeFetchCompanyIdRef.current === compId) {
        setCompany(cachedComp.data);
      }

      const cachedStats = getCachedData<any>(statsCacheKey);
      if (cachedStats?.data && activeFetchCompanyIdRef.current === compId) {
        setAttendanceStats(cachedStats.data);
        setIsStatsLoading(false);
      }

      const cachedLeave = getCachedData<any>(leaveCacheKey);
      if (cachedLeave?.data && activeFetchCompanyIdRef.current === compId) {
        setLeaveStats(cachedLeave.data);
        setIsLeaveStatsLoading(false);
      }

      const cachedAct = getCachedData<any[]>(actCacheKey);
      if (cachedAct?.data && activeFetchCompanyIdRef.current === compId) {
        setActivities(cachedAct.data);
        setIsActivitiesLoading(false);
      }

      const cachedBadge = getCachedData<any>(badgeCacheKey);
      if (cachedBadge?.data && activeFetchCompanyIdRef.current === compId) {
        setPendingLeavesCount(cachedBadge.data.pendingLeaves || 0);
        setKaryawanBadgeCount(cachedBadge.data.karyawanBadge || 0);
      }

      if (!cachedComp?.data && !cachedStats?.data) {
        setIsLoading(true);
      }
      setDashboardError(null);

      // Parallel fetching using Promise.allSettled so that one endpoint failure doesn't block the rest
      const [resCompanySettled, resStatsSettled, resLeaveSettled, resActSettled, resBadgeSettled] = await Promise.allSettled([
        fetch(getApiUrl("/companies/me"), { headers }).then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }),
        fetch(getApiUrl(`/dashboard/attendance-stats?month=${m}&year=${y}`), { headers }).then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }),
        fetch(getApiUrl("/dashboard/leave-stats"), { headers }).then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }),
        fetch(getApiUrl("/notifications"), { headers }).then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }),
        fetch(getApiUrl("/dashboard/badge-counts"), { headers }).then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        }),
      ]);

      // Race condition guard: jika perusahaan telah berganti di tengah jalan, drop respons
      if (activeFetchCompanyIdRef.current !== compId) {
        return;
      }

      let hadSuccess = false;

      // 1. Company Data
      if (resCompanySettled.status === "fulfilled" && resCompanySettled.value?.success && resCompanySettled.value.data) {
        const cData = {
          id: compId || undefined,
          name: resCompanySettled.value.data.name || "",
          address: resCompanySettled.value.data.address || "",
          memberCount: resCompanySettled.value.data.memberCount || 0,
          avatar_company_url: resCompanySettled.value.data.avatar_company_url,
        };
        setCompany(cData);
        setCachedData(compCacheKey, cData);
        hadSuccess = true;
      }

      // 2. Attendance Stats
      if (resStatsSettled.status === "fulfilled" && resStatsSettled.value?.success && resStatsSettled.value.data) {
        setAttendanceStats(resStatsSettled.value.data);
        setCachedData(statsCacheKey, resStatsSettled.value.data);
        setStatsError(null);
        hadSuccess = true;
      } else {
        setStatsError("Gagal memuat data kehadiran");
      }
      setIsStatsLoading(false);

      // 3. Leave Stats
      if (resLeaveSettled.status === "fulfilled" && resLeaveSettled.value?.success && resLeaveSettled.value.data) {
        setLeaveStats(resLeaveSettled.value.data);
        setCachedData(leaveCacheKey, resLeaveSettled.value.data);
        hadSuccess = true;
      }
      setIsLeaveStatsLoading(false);

      // 4. Notifications / Activities
      if (resActSettled.status === "fulfilled" && resActSettled.value?.success && Array.isArray(resActSettled.value.data)) {
        setActivities(resActSettled.value.data);
        setCachedData(actCacheKey, resActSettled.value.data);
        setActivitiesError(null);
        hadSuccess = true;
      } else {
        setActivitiesError("Gagal memuat aktivitas terbaru");
      }
      setIsActivitiesLoading(false);

      // 5. Badges
      if (resBadgeSettled.status === "fulfilled" && resBadgeSettled.value?.success && resBadgeSettled.value.data) {
        setPendingLeavesCount(resBadgeSettled.value.data.pendingLeaves || 0);
        setKaryawanBadgeCount(resBadgeSettled.value.data.karyawanBadge || 0);
        setCachedData(badgeCacheKey, resBadgeSettled.value.data);
      } else {
        // Fallback to direct endpoints if badge-counts is not available
        try {
          const [resLeavesAdmin, resJoin, resExit] = await Promise.allSettled([
            fetch(getApiUrl("/leaves/admin"), { headers }).then(r => r.json()),
            fetch(getApiUrl("/company/join-requests"), { headers }).then(r => r.json()),
            fetch(getApiUrl("/company/exit-requests"), { headers }).then(r => r.json()),
          ]);

          if (activeFetchCompanyIdRef.current === compId) {
            if (resLeavesAdmin.status === "fulfilled" && resLeavesAdmin.value?.success && Array.isArray(resLeavesAdmin.value.data)) {
              const pendingLeaves = resLeavesAdmin.value.data.filter((l: any) => l.status === "Menunggu").length;
              setPendingLeavesCount(pendingLeaves);
            }

            let joinCount = 0;
            let exitCount = 0;
            if (resJoin.status === "fulfilled" && resJoin.value?.success && Array.isArray(resJoin.value.data)) {
              joinCount = resJoin.value.data.length;
            }
            if (resExit.status === "fulfilled" && resExit.value?.success && Array.isArray(resExit.value.data)) {
              exitCount = resExit.value.data.length;
            }
            setKaryawanBadgeCount(joinCount + exitCount);
          }
        } catch {}
      }

      if (!hadSuccess && !activeCompany) {
        setDashboardError("Koneksi gagal atau server tidak merespons. Silakan periksa jaringan Anda.");
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
      if (activeFetchCompanyIdRef.current === compId) {
        setDashboardError("Terjadi kesalahan saat memuat data dashboard.");
        setIsStatsLoading(false);
        setIsLeaveStatsLoading(false);
        setIsActivitiesLoading(false);
      }
    } finally {
      if (activeFetchCompanyIdRef.current === compId) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isCompanyLoading) return;
    setCompany(null);
    setAttendanceStats(null);
    setLeaveStats(null);
    setActivities([]);
    setIsLoading(true);
    setIsStatsLoading(true);
    setIsLeaveStatsLoading(true);
    setIsActivitiesLoading(true);
    fetchDashboardData();
  }, [router, activeCompanyId, isCompanyLoading]);

  // Fallback company if /companies/me is loading or failed but activeCompany is available.
  // Pastikan company id cocok dengan activeCompanyId agar tidak menampilkan nama perusahaan lama
  const displayCompany = (company && (!company.id || company.id === activeCompanyId) ? company : null) || (activeCompany ? {
    id: activeCompany.id,
    name: activeCompany.name,
    address: "",
    memberCount: 0,
    avatar_company_url: activeCompany.avatar_company_url || undefined,
  } : null);

  const totalEmployees = attendanceStats?.total || displayCompany?.memberCount || 1;
  const onTimeCount = attendanceStats?.hadir || 0;
  const lateCount = attendanceStats?.terlambat || 0;
  const leaveCount = attendanceStats?.izin || 0;
  const belumCount = attendanceStats?.belum ?? Math.max(0, totalEmployees - onTimeCount - lateCount - leaveCount);

  // 100% setara dengan total karyawan (contoh: 4)
  const totalSlots = Math.max(totalEmployees, 1);
  const onTimePercent = Math.min(100, Math.round((onTimeCount / totalSlots) * 100));
  const latePercent = Math.min(100 - onTimePercent, Math.round((lateCount / totalSlots) * 100));
  const leavePercent = Math.min(100 - onTimePercent - latePercent, Math.round((leaveCount / totalSlots) * 100));

  const safeActivities = Array.isArray(activities) ? activities : [];
  const unreadNotifCount = safeActivities.filter(a => a && !a.is_read).length;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      
      {/* Header */}
      <TopBar 
        title="Manajemen" 
        onBack={() => router.push("/dashboard")} 
        rightAction={
          <button
            onClick={() => router.push("/notifikasi")}
            className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition-all relative cursor-pointer"
            title="Notifikasi"
            aria-label="Notifikasi"
          >
            <Bell className="w-6 h-6 text-white" />
            {unreadNotifCount > 0 && (
              <div className="absolute top-[8px] right-[8px] w-2.5 h-2.5 bg-[#EF4444] border-2 border-[#356E3B] rounded-full"></div>
            )}
          </button>
        }
      />

      {/* Main Content */}
      <div className="flex-1 px-5 py-5 flex flex-col gap-4 z-10 relative">
        
        {/* Company Card */}
        <div 
          onClick={() => {
            if (activeRole === "owner" || activeRole === "admin") {
              router.push("/admin/perusahaan");
            } else {
              router.push("/perusahaan");
            }
          }}
          className="bg-white rounded-[20px] p-4 flex gap-4 items-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="w-[52px] h-[52px] bg-[#F3F4F6] rounded-full flex items-center justify-center shrink-0 border-[2.5px] border-[#356E3B]/20 ring-2 ring-[#356E3B]/10 shadow-sm overflow-hidden">
            {(displayCompany?.avatar_company_url || activeCompany?.avatar_company_url) ? (
              <img 
                src={displayCompany?.avatar_company_url || activeCompany?.avatar_company_url || ""} 
                alt={displayCompany?.name || activeCompany?.name || "Company"} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <Building2 className="w-6 h-6 text-[#6B7280]" strokeWidth={2} />
            )}
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            {isLoading && !displayCompany ? (
              <div className="animate-pulse flex flex-col gap-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : displayCompany ? (
              <>
                <h2 className="text-[#1E4738] text-[15px] font-bold truncate">{displayCompany.name}</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  {displayCompany.address ? (
                    <div className="flex items-center gap-1.5 text-[#5C786C] text-[12px] font-medium min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                      <span className="truncate max-w-[120px]">{displayCompany.address}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[#5C786C] text-[12px] font-medium min-w-0">
                      <Building2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                      <span className="truncate">Kelola Perusahaan</span>
                    </div>
                  )}
                  {displayCompany.memberCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[#5C786C] text-[12px] font-medium whitespace-nowrap">
                      <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                      <span>{displayCompany.memberCount} anggota</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <h2 className="text-[#1E4738] text-[15px] font-bold">Data Perusahaan</h2>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
        </div>

        {/* Global Dashboard Error Banner if critical load failed */}
        {dashboardError && !displayCompany && (
          <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-red-100 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-[#1E4738] text-[14px] font-bold">Gagal Memuat Data Dashboard</h3>
              <p className="text-[#5C786C] text-[12px]">{dashboardError}</p>
            </div>
            <button
              type="button"
              onClick={fetchDashboardData}
              className="mt-1 px-4 py-1.5 bg-[#356E3B] text-white text-[12px] font-bold rounded-full hover:bg-[#2A582F] transition-colors active:scale-95"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Kehadiran Karyawan Hari Ini (100% = total karyawan) */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col gap-4">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#356E3B]" />
              <h2 className="text-[15px] font-bold text-[#1E4738] tracking-tight">
                Kehadiran Karyawan Hari Ini
              </h2>
            </div>
            {statsError && !isStatsLoading && (
              <button
                type="button"
                onClick={() => fetchAttendanceStatsForDate(selectedDate)}
                className="text-[11px] font-bold text-[#356E3B] hover:underline cursor-pointer"
              >
                Muat Ulang
              </button>
            )}
          </div>

          {/* Multi-Color Progress Bar */}
          <div className="h-3 w-full bg-[#E5E7EB] rounded-full flex overflow-hidden">
            {isStatsLoading ? (
              <div className="h-full w-full bg-gray-200 animate-pulse rounded-full" />
            ) : statsError ? (
              <div className="h-full w-full bg-amber-100 rounded-full" title="Gagal memuat data statistik" />
            ) : (
              <>
                <div 
                  className="h-full bg-[#22C55E] transition-all duration-300"
                  style={{ width: `${onTimePercent}%` }}
                  title={`Hadir Tepat Waktu: ${onTimeCount}`}
                />
                <div 
                  className="h-full bg-[#EF4444] transition-all duration-300"
                  style={{ width: `${latePercent}%` }}
                  title={`Terlambat: ${lateCount}`}
                />
                <div 
                  className="h-full bg-[#EAB308] transition-all duration-300"
                  style={{ width: `${leavePercent}%` }}
                  title={`Izin: ${leaveCount}`}
                />
              </>
            )}
          </div>

          {/* Legend Row */}
          <div className="flex justify-between items-center text-[11.5px] font-medium pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] shrink-0" />
              <span className="text-[#64748b]">
                Hadir: <strong className="text-[#1E4738] font-bold">{onTimeCount}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0" />
              <span className="text-[#64748b]">
                Terlambat: <strong className="text-[#1E4738] font-bold">{lateCount}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] shrink-0" />
              <span className="text-[#64748b]">
                Izin: <strong className="text-[#1E4738] font-bold">{leaveCount}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 shrink-0" />
              <span className="text-[#64748b]">
                Belum: <strong className="text-gray-600 font-bold">{belumCount}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex justify-between items-start mt-1">
          {[
            { icon: Calendar, label: "Agenda", path: "/admin/agenda" },
            { icon: FileCheck, label: "Perizinan", path: "/admin/izin", badge: pendingLeavesCount },
            { icon: Users2, label: "Karyawan", path: "/admin/karyawan", badge: karyawanBadgeCount },
            { icon: FileText, label: "Laporan", path: "/admin/laporan-kehadiran" },
            { icon: Megaphone, label: "Berita", path: "/admin/berita" }
          ].map((item, i) => (
            <button 
              key={i} 
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-2 text-center w-[55px] active:scale-95 transition-transform group"
            >
              <div className="relative w-[48px] h-[48px] bg-[#f4f9f6] border border-[#eef5f0] rounded-[16px] flex items-center justify-center group-hover:bg-[#e6f0ea] transition-colors">
                <item.icon className="w-[20px] h-[20px] text-[#356E3B]" strokeWidth={1.5} />
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_2px_5px_rgba(239,68,68,0.35)] leading-none z-10 animate-in fade-in zoom-in-75 duration-200">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-[#1E4738] leading-[1.2]">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Aktivitas Terbaru */}
        <div className="flex flex-col gap-4 mt-3">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#356E3B]" />
              <h2 className="text-[15px] font-bold text-[#1E4738] tracking-tight">Aktivitas Terbaru</h2>
            </div>
            <ViewAllButton onClick={() => router.push("/notifikasi")} />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
            {["Semua", "Perizinan", "Karyawan", "Pengumuman"].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-4 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-colors ${
                  activeFilter === tab 
                    ? "font-semibold bg-[#e6f0ea] text-[#356E3B]" 
                    : "font-medium bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Activity List */}
          <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col overflow-hidden min-h-[120px]">
            
            {(() => {
              const filteredActivities = safeActivities.filter(act => {
                if (!act) return false;
                if (activeFilter === "Semua") return true;
                const type = (act.type || "").toUpperCase();
                if (activeFilter === "Perizinan") return type.startsWith("LEAVE");
                if (activeFilter === "Karyawan") return type.startsWith("JOIN_REQUEST") || type.startsWith("EXIT_REQUEST");
                if (activeFilter === "Pengumuman") return type === "NEW_ANNOUNCEMENT";
                return true;
              }).slice(0, 5);

              if (isActivitiesLoading && safeActivities.length === 0) {
                return (
                  <div className="p-4 flex flex-col gap-3">
                    <CardListSkeleton count={3} type="notification" />
                  </div>
                );
              }
              if (activitiesError) {
                return (
                  <div className="p-8 text-center text-amber-700 text-[13px] font-medium flex flex-col items-center justify-center gap-2 h-full">
                    <span>Gagal memuat aktivitas terbaru</span>
                    <button
                      type="button"
                      onClick={fetchDashboardData}
                      className="text-[12px] font-bold text-[#356E3B] underline hover:opacity-80 cursor-pointer"
                    >
                      Coba Lagi
                    </button>
                  </div>
                );
              }
              if (filteredActivities.length === 0) {
                return <div className="p-8 text-center text-[#7d998c] text-[13px] font-medium flex items-center justify-center h-full">Belum ada aktivitas terbaru.</div>;
              }

              return filteredActivities.map((act, idx) => {
                let icon = <ClipboardList className="w-[22px] h-[22px] text-[#D97706]" strokeWidth={1.5} />;
                let bgIcon = "bg-[#fdf5e6]";
                let title = act.title || "Pemberitahuan";
                let desc = cleanNotificationMessage(act.message || "");

                const normType = (act.type || "").toUpperCase();
                if (normType.startsWith('LEAVE')) {
                  icon = <ClipboardList className="w-[22px] h-[22px] text-[#D97706]" strokeWidth={1.5} />;
                  bgIcon = "bg-[#fdf5e6]";
                } else if (normType.startsWith('JOIN_REQUEST') || normType.startsWith('EXIT_REQUEST')) {
                  icon = <User className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />;
                  bgIcon = "bg-[#e6f0ea]";
                } else if (normType === 'NEW_ANNOUNCEMENT') {
                  icon = <Megaphone className="w-[22px] h-[22px] text-[#9333EA]" strokeWidth={1.5} />;
                  bgIcon = "bg-[#f3e8ff]";
                }
                const membershipInfo = parseMembershipNotification(act.message || "", act.type || "");

                return (
                  <div 
                    key={act.id} 
                    onClick={() => handleNotificationNavigation(act, { activeCompanyId, activeRole, memberships, switchCompany }, router, (id) => setActivities(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a)))}
                    className={`p-4 flex gap-3.5 items-center cursor-pointer active:bg-gray-50 transition-colors ${idx !== filteredActivities.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className={`w-[42px] h-[42px] rounded-xl ${bgIcon} flex items-center justify-center shrink-0`}>
                      {icon}
                    </div>
                    <div className="flex flex-col flex-1 gap-1">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {!act.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#EF4444] shrink-0" />
                          )}
                          <h3 className="text-[#1E4738] text-[14px] font-bold leading-tight truncate">{title}</h3>
                        </div>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5 shrink-0">{formatRelativeTime(act.created_at || new Date().toISOString())}</span>
                      </div>
                      <p className="text-[#7d998c] text-[12px] leading-[1.35] pr-2 line-clamp-2">{desc}</p>
                      {membershipInfo?.approverName && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-semibold bg-[#eef5f0] text-[#356E3B] px-2 py-0.5 rounded-full border border-[#356E3B]/15 inline-flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 text-[#356E3B]" strokeWidth={2.5} />
                            Disetujui oleh: {membershipInfo.approverName}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                );
              });
            })()}

          </div>
        </div>
      </div>

    </div>
  );
}
