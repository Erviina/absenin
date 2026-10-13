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
  Newspaper,
  ClipboardList,
  Calendar,
  Check,
  Clock,
  ChevronRight,
  Plus,
  CheckCircle2
} from "lucide-react";
import { sanitizeText, truncateText } from "@/lib/sanitize";
import { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/Badge";
import { getAgendaCategoryColor } from "@/app/agenda/page";

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
  const [tasks, setTasks] = useState<any[]>([]);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [isTasksAgendasLoading, setIsTasksAgendasLoading] = useState(true);
  const [resumeTab, setResumeTab] = useState<"all" | "tasks" | "agendas">("all");
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

        const [authRes, newsRes, attendRes, notifRes, tasksRes, agendasRes] = await Promise.all([
          fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/me", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/news", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/attendances/today", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/notifications/unread-count", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/tasks", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/agendas", { headers })
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

            // Cek jika pengguna baru saja di-ACC oleh admin dan belum melihat layar "Berhasil Bergabung!"
            try {
              const joinReqRes = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests/me", {
                headers: { Authorization: `Bearer ${token}` }
              });
              const joinReqData = await joinReqRes.json();
              if (joinReqData.success && joinReqData.data && joinReqData.data.status === 'approved') {
                const seen = localStorage.getItem(`join_accepted_seen_${joinReqData.data.id}`);
                if (!seen) {
                  router.push("/gabung-perusahaan");
                  return;
                }
              }
            } catch (e) {
              // Abaikan jika error
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

        try {
          if (tasksRes.ok) {
            const tasksData = await tasksRes.json();
            if (Array.isArray(tasksData)) {
              setTasks(tasksData);
            }
          }
        } catch (e) {
          console.error("Failed to parse tasks data", e);
        }

        try {
          if (agendasRes.ok) {
            const agendasData = await agendasRes.json();
            if (agendasData.success && Array.isArray(agendasData.data)) {
              setAgendas(agendasData.data);
            }
          }
        } catch (e) {
          console.error("Failed to parse agendas data", e);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setAttendanceError(true);
      } finally {
        setIsLoading(false);
        setIsAttendanceLoading(false);
        setIsTasksAgendasLoading(false);
      }
    };
    fetchData();
  }, [router, activeCompanyId, isCompanyLoading]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.date) return true;
      return t.date.startsWith(todayStr);
    });
  }, [tasks, todayStr]);

  const todayAgendas = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return agendas.filter((a) => {
      if (!a.start_time || !a.end_time) return false;
      const s = new Date(a.start_time);
      const e = new Date(a.end_time);
      return s <= endOfToday && e >= startOfToday;
    });
  }, [agendas]);

  const uncompletedTasksCount = useMemo(() => {
    return todayTasks.filter((t) => !t.completed).length;
  }, [todayTasks]);

  const handleToggleTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const nextCompleted = !target.completed;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: nextCompleted } : t)));

    try {
      const token = localStorage.getItem("accessToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks/${taskId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ completed: nextCompleted }),
      });
    } catch (err) {
      console.error("Failed to toggle task", err);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: target.completed } : t)));
    }
  };

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
                className="w-[46px] h-[46px] rounded-full shrink-0 object-cover border-2 border-[#1E4738]/20 ring-2 ring-[#1E4738]/10 group-hover:ring-[#1E4738]/30 transition-all shadow-xs"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-[46px] h-[46px] bg-[#d3e5d9] rounded-full flex items-center justify-center text-[#1E4738] font-bold text-[16px] border-2 border-[#1E4738]/20 ring-2 ring-[#1E4738]/10 shadow-xs">
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
            <div className="w-10 h-10 rounded-[14px] bg-[#1E4738] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform overflow-hidden border-2 border-[#1E4738]/20 ring-1 ring-[#1E4738]/10">
              {activeCompany?.avatar_company_url ? (
                <img src={activeCompany.avatar_company_url} alt={activeCompany.name} className="w-full h-full object-cover" />
              ) : (() => {
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

          {/* CTA Check In / Out Floating Full Rounded Pill at Bottom Right */}
          <div className="absolute bottom-3.5 right-3.5 z-20">
            <button 
              onClick={() => router.push('/checkin')}
              disabled={isBtnDisabled}
              title={btnHelperText || (attendanceStatus === "CHECKED_IN" ? "Rekam Check-out" : "Rekam Kehadiran")}
              className={`${btnColorClass} rounded-full px-4 py-2.5 flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.18)] border-[3px] border-white transition-all`}
            >
              <MapPin className="w-4 h-4 text-white shrink-0" strokeWidth={2.5} />
              <span className="font-bold text-[13.5px] leading-none">
                {btnLabel}
              </span>
              <ArrowRight className="w-4 h-4 text-white shrink-0" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Aktivitas Hari Ini (Resume Tugas & Agenda) */}
        <div className="flex flex-col gap-3">
          {/* Header Row: Title & Badge on Left, Tabs on Right (Replacing "Lihat Semua") */}
          <div className="flex justify-between items-center gap-2">
            <h2 className="text-[17.5px] font-bold text-[#1E4738] shrink-0 whitespace-nowrap">Aktivitas Hari Ini</h2>

            {/* Clean Pill Switcher */}
            <div className="flex items-center gap-1 p-0.5 bg-[#EEF5F0] rounded-full shrink-0">
              <button
                onClick={() => setResumeTab("all")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  resumeTab === "all" ? "bg-white text-[#1E4738] shadow-xs" : "text-[#5C786C] hover:text-[#1E4738]"
                }`}
              >
                Semua {todayTasks.length + todayAgendas.length > 0 && `(${todayTasks.length + todayAgendas.length})`}
              </button>
              <button
                onClick={() => setResumeTab("tasks")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  resumeTab === "tasks" ? "bg-white text-[#1E4738] shadow-xs" : "text-[#5C786C] hover:text-[#1E4738]"
                }`}
              >
                Tugas {todayTasks.length > 0 && `(${todayTasks.length})`}
              </button>
              <button
                onClick={() => setResumeTab("agendas")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  resumeTab === "agendas" ? "bg-white text-[#1E4738] shadow-xs" : "text-[#5C786C] hover:text-[#1E4738]"
                }`}
              >
                Agenda {todayAgendas.length > 0 && `(${todayAgendas.length})`}
              </button>
            </div>
          </div>

          {/* Clean Activity Cards Stack */}
          <div className="flex flex-col gap-3">
            {isTasksAgendasLoading ? (
              <div className="text-center text-[#7d998c] text-[13px] font-medium py-4 animate-pulse">
                Memuat aktivitas hari ini...
              </div>
            ) : (() => {
              const showTasks = resumeTab === "all" || resumeTab === "tasks";
              const showAgendas = resumeTab === "all" || resumeTab === "agendas";

              const itemsToRender: React.ReactNode[] = [];

              if (showTasks) {
                todayTasks.forEach((task) => {
                  itemsToRender.push(
                    <div
                      key={`task-${task.id}`}
                      onClick={() => router.push(`/tugas/${task.id}`)}
                      className="bg-white rounded-[20px] p-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3.5 hover:border-[#356E3B]/30 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <button
                          onClick={(e) => handleToggleTask(task.id, e)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            task.completed
                              ? "bg-[#2D5A3F] border-[#2D5A3F]"
                              : "bg-white border-[#D1E0D6] hover:border-[#356E3B]"
                          }`}
                          title={task.completed ? "Tandai belum selesai" : "Tandai selesai"}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </button>
                        <div className="flex flex-col min-w-0 flex-1">
                          <h3
                            className={`text-[13.5px] font-bold leading-tight truncate ${
                              task.completed ? "text-[#6B7280]" : "text-[#111827]"
                            }`}
                          >
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#5C786C]">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-[#356E3B]" />
                              {task.time ? `Pukul ${task.time}` : "Hari Ini"}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#356E3B]">
                              {task.type === "group" ? "Tugas Grup" : "Personal"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1E4738] shrink-0 transition-colors" />
                    </div>
                  );
                });
              }

              if (showAgendas) {
                todayAgendas.forEach((agenda) => {
                  const catColor = getAgendaCategoryColor(agenda.category?.name || agenda.type);
                  itemsToRender.push(
                    <div
                      key={`agenda-${agenda.id}`}
                      onClick={() => router.push(`/agenda/${agenda.id}`)}
                      className={`bg-white rounded-[20px] p-4 pl-4.5 border border-[#eef5f0] ${catColor.hoverBorder} shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all active:scale-[0.99] cursor-pointer relative overflow-hidden group flex items-center justify-between gap-3`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[20px] ${catColor.stripeBg}`} />
                      <div className="flex flex-col min-w-0 flex-1 pl-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <Badge variant={catColor.variant} size="xs" uppercase>
                            {agenda.category?.name || agenda.type || "Kegiatan"}
                          </Badge>
                          <Badge
                            variant={agenda.scope === "company" || agenda.type === "COMPANY" ? "company" : "personal"}
                            size="xs"
                            uppercase
                          >
                            {agenda.scope === "company" || agenda.type === "COMPANY" ? "PERUSAHAAN" : "PRIBADI"}
                          </Badge>
                        </div>
                        <h3 className="text-[13.5px] font-bold text-[#111827] leading-tight truncate">
                          {agenda.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#5C786C]">
                          <span className="flex items-center gap-1 font-medium shrink-0">
                            <Clock className="w-3 h-3 text-[#356E3B]" />
                            {agenda.time_range || "Hari ini"}
                          </span>
                          {agenda.link_or_location && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="truncate max-w-[160px] font-medium">{agenda.link_or_location}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1E4738] shrink-0 transition-colors" />
                    </div>
                  );
                });
              }

              if (itemsToRender.length === 0) {
                return (
                  <div className="bg-white rounded-[20px] p-6 text-center border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center">
                    <p className="text-[#7d998c] text-[13px] font-medium">
                      {resumeTab === "tasks"
                        ? "Belum ada tugas untuk hari ini."
                        : resumeTab === "agendas"
                        ? "Belum ada agenda untuk hari ini."
                        : "Belum ada tugas atau agenda untuk hari ini."}
                    </p>
                  </div>
                );
              }

              return itemsToRender.slice(0, 4);
            })()}
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
