"use client";

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
  Bell
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { handleNotificationNavigation } from "@/lib/notificationNavigation";
import { parseMembershipNotification } from "@/lib/membershipNotificationUtils";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { activeCompanyId, activeCompany, activeRole, memberships, switchCompany, isLoading: isCompanyLoading } = useCompany();
  
  const [company, setCompany] = useState<{ name: string; address: string; memberCount: number; avatar_company_url?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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
  } | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const currentMonthName = monthNames[selectedDate.getMonth()];
  const currentYear = selectedDate.getFullYear();

  const [leaveStats, setLeaveStats] = useState<{ total: number; sakit: number; cuti: number; izin: number } | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLeaveStatsLoading, setIsLeaveStatsLoading] = useState(true);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [pendingLeavesCount, setPendingLeavesCount] = useState<number>(0);
  const [karyawanBadgeCount, setKaryawanBadgeCount] = useState<number>(0);

  // Guard: If activeRole is member, redirect back to dashboard immediately
  useEffect(() => {
    if (!isCompanyLoading && activeRole && !["owner", "admin", "manager"].includes(activeRole)) {
      router.replace("/dashboard");
    }
  }, [activeRole, isCompanyLoading, router]);

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
      setIsStatsLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const m = targetDate.getMonth() + 1;
      const y = targetDate.getFullYear();
      const resStats = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/attendance-stats?month=${m}&year=${y}`, {
        headers
      });
      const dataStats = await resStats.json();
      if (dataStats.success) {
        setAttendanceStats(dataStats.data);
      }
    } catch (e) {
      console.error("Failed to fetch attendance stats:", e);
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }

        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        if (activeCompanyId) {
          headers["x-company-id"] = activeCompanyId;
        }

        const resCompany = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/me", {
          headers
        });
        const dataCompany = await resCompany.json();
        if (dataCompany.success) {
          setCompany({
            name: dataCompany.data.name,
            address: dataCompany.data.address,
            memberCount: dataCompany.data.memberCount,
            avatar_company_url: dataCompany.data.avatar_company_url,
          });
        }
        setIsLoading(false);

        const m = selectedDate.getMonth() + 1;
        const y = selectedDate.getFullYear();
        const resStats = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/attendance-stats?month=${m}&year=${y}`, {
          headers
        });
        const dataStats = await resStats.json();
        if (dataStats.success) {
          setAttendanceStats(dataStats.data);
        }
        setIsStatsLoading(false);

        const resLeave = await fetch(process.env.NEXT_PUBLIC_API_URL + "/dashboard/leave-stats", {
          headers
        });
        const dataLeave = await resLeave.json();
        if (dataLeave.success) {
          setLeaveStats(dataLeave.data);
        }
        setIsLeaveStatsLoading(false);

        const resAct = await fetch(process.env.NEXT_PUBLIC_API_URL + "/notifications", {
          headers
        });
        const dataAct = await resAct.json();
        if (dataAct.success) {
          setActivities(dataAct.data);
        }
        setIsActivitiesLoading(false);

        // Fetch badge counts (Perizinan pending and Karyawan join/exit requests)
        try {
          const resBadge = await fetch(process.env.NEXT_PUBLIC_API_URL + "/dashboard/badge-counts", { headers });
          const dataBadge = await resBadge.json();
          if (dataBadge.success && dataBadge.data) {
            setPendingLeavesCount(dataBadge.data.pendingLeaves || 0);
            setKaryawanBadgeCount(dataBadge.data.karyawanBadge || 0);
          } else {
            throw new Error("Fallback to direct endpoints");
          }
        } catch {
          // Fallback if /dashboard/badge-counts is not available
          const [resLeavesAdmin, resJoin, resExit] = await Promise.allSettled([
            fetch(process.env.NEXT_PUBLIC_API_URL + "/leaves/admin", { headers }).then(r => r.json()),
            fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests", { headers }).then(r => r.json()),
            fetch(process.env.NEXT_PUBLIC_API_URL + "/company/exit-requests", { headers }).then(r => r.json()),
          ]);

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

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        setIsStatsLoading(false);
        setIsLeaveStatsLoading(false);
        setIsActivitiesLoading(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [router, activeCompanyId]);

  // Dynamic calculation for working days in month
  const calcWorkingDays = (y: number, m: number) => {
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(y, m, day).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    }
    return count;
  };

  const totalEmployees = attendanceStats?.total || company?.memberCount || 1;
  const onTimeCount = attendanceStats?.hadir || 0;
  const lateCount = attendanceStats?.terlambat || 0;
  const leaveCount = attendanceStats?.izin || 0;
  const belumCount = attendanceStats?.belum ?? Math.max(0, totalEmployees - onTimeCount - lateCount - leaveCount);

  // 100% setara dengan total karyawan (contoh: 4)
  const totalSlots = Math.max(totalEmployees, 1);
  const onTimePercent = Math.min(100, Math.round((onTimeCount / totalSlots) * 100));
  const latePercent = Math.min(100 - onTimePercent, Math.round((lateCount / totalSlots) * 100));
  const leavePercent = Math.min(100 - onTimePercent - latePercent, Math.round((leaveCount / totalSlots) * 100));

  const unreadNotifCount = activities.filter(a => !a.is_read).length;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      
      {/* Header */}
      <TopBar 
        title="Manajemen" 
        onBack={() => router.push("/dashboard")} 
        rightAction={
          <button
            onClick={() => router.push("/notifikasi")}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center relative text-white cursor-pointer"
            title="Notifikasi"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5 text-white" />
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
          onClick={() => router.push("/admin/perusahaan")}
          className="bg-white rounded-[20px] p-4 flex gap-4 items-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="w-[52px] h-[52px] bg-[#F3F4F6] rounded-full flex items-center justify-center shrink-0 border-[2.5px] border-[#356E3B]/20 ring-2 ring-[#356E3B]/10 shadow-sm overflow-hidden">
            {(company?.avatar_company_url || activeCompany?.avatar_company_url) ? (
              <img 
                src={company?.avatar_company_url || activeCompany?.avatar_company_url || ""} 
                alt={company?.name || activeCompany?.name || "Company"} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <Building2 className="w-6 h-6 text-[#6B7280]" strokeWidth={2} />
            )}
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            {isLoading ? (
              <div className="animate-pulse flex flex-col gap-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : company ? (
              <>
                <h2 className="text-[#1E4738] text-[15px] font-bold truncate">{company.name}</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1.5 text-[#5C786C] text-[12px] font-medium min-w-0">
                    <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                    <span className="truncate max-w-[90px]">{company.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#5C786C] text-[12px] font-medium whitespace-nowrap">
                    <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                    <span>{company.memberCount} anggota</span>
                  </div>
                </div>
              </>
            ) : (
              <h2 className="text-[#1E4738] text-[15px] font-bold">Belum ada data</h2>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
        </div>

        {/* Kehadiran Karyawan Hari Ini (100% = total karyawan) */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col gap-4">
          {/* Header Row */}
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#356E3B]" />
            <h2 className="text-[15px] font-bold text-[#1E4738] tracking-tight">
              Kehadiran Karyawan Hari Ini
            </h2>
          </div>

          {/* Multi-Color Progress Bar */}
          <div className="h-3 w-full bg-[#E5E7EB] rounded-full flex overflow-hidden">
            {isStatsLoading ? (
              <div className="h-full w-full bg-gray-200 animate-pulse rounded-full" />
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
            { icon: Calendar, label: "Jadwal", path: "/admin/agenda" },
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
            <h2 className="text-[16px] font-bold text-[#1E4738]">Aktivitas Terbaru</h2>
            <button 
              onClick={() => router.push("/notifikasi")}
              className="text-[#356E3B] text-[12px] font-semibold flex items-center gap-0.5 hover:underline active:opacity-70"
            >
              Lihat Semua
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
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
              const filteredActivities = activities.filter(act => {
                if (activeFilter === "Semua") return true;
                if (activeFilter === "Perizinan") return act.type.startsWith("LEAVE");
                if (activeFilter === "Karyawan") return act.type.startsWith("JOIN_REQUEST");
                if (activeFilter === "Pengumuman") return act.type === "NEW_ANNOUNCEMENT";
                return true;
              }).slice(0, 5);

              if (isActivitiesLoading) {
                return <div className="p-8 text-center text-[#7d998c] text-[13px] font-medium animate-pulse flex items-center justify-center h-full">Memuat aktivitas...</div>;
              }
              if (filteredActivities.length === 0) {
                return <div className="p-8 text-center text-[#7d998c] text-[13px] font-medium flex items-center justify-center h-full">Belum ada aktivitas terbaru.</div>;
              }

              return filteredActivities.map((act, idx) => {
                let icon = <ClipboardList className="w-[22px] h-[22px] text-[#D97706]" strokeWidth={1.5} />;
                let bgIcon = "bg-[#fdf5e6]";
                let title = act.title;
                let desc = act.message;

                if (act.type.startsWith('LEAVE')) {
                  icon = <ClipboardList className="w-[22px] h-[22px] text-[#D97706]" strokeWidth={1.5} />;
                  bgIcon = "bg-[#fdf5e6]";
                } else if (act.type.startsWith('JOIN_REQUEST')) {
                  icon = <User className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />;
                  bgIcon = "bg-[#e6f0ea]";
                } else if (act.type === 'NEW_ANNOUNCEMENT') {
                  icon = <Megaphone className="w-[22px] h-[22px] text-[#9333EA]" strokeWidth={1.5} />;
                  bgIcon = "bg-[#f3e8ff]";
                }
                const membershipInfo = parseMembershipNotification(act.message, act.type);

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
                        <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5 shrink-0">{formatRelativeTime(act.created_at)}</span>
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
