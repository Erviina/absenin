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
  CheckCircle2,
  AlertCircle,
  Loader2 
} from "lucide-react";
import { sanitizeText, truncateText } from "@/lib/sanitize";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { AccountContextDrawer } from "@/components/AccountContextDrawer";
import { getPersonalModePreference } from "@/lib/personalMode";
import { getActiveCompanyId } from "@/lib/api";
import { 
  evaluateSchedule, 
  getNextCheckInSchedule, 
  calculateServerOffsetMs, 
  CompanyScheduleData 
} from "@/lib/schedule";
import { Badge } from "@/components/Badge";
import { ViewAllButton } from "@/components/ViewAllButton";
import { getAgendaCategoryColor } from "@/app/agenda/page";
import { CardListSkeleton } from "@/components/CardSkeleton";
import { buildCacheKey, getCachedData, setCachedData, invalidateCache } from "@/lib/clientCache";

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useDialog();
  const [showScheduleNotice, setShowScheduleNotice] = useState(false);
  const scheduleNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (scheduleNoticeTimeoutRef.current) {
        clearTimeout(scheduleNoticeTimeoutRef.current);
      }
    };
  }, []);

  const { 
    activeCompanyId, 
    activeCompany, 
    activeRole, 
    memberships, 
    switchCompany,
    isLoading: isCompanyLoading,
    companyError,
    refreshMemberships,
    currentUser,
    setCurrentUser,
  } = useCompany();

  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;

    if (currentUser) {
      setUser(currentUser);
    } else {
      try {
        const u = localStorage.getItem("user");
        if (u) {
          setUser(JSON.parse(u));
        }
      } catch {}
    }
  }, [currentUser]);
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

  // Ref untuk melacak ID perusahaan yang sedang di-fetch guna mencegah race condition
  const activeFetchCompanyIdRef = useRef<string | null>(null);

  // Close drawer whenever active company or active role changes
  useEffect(() => {
    setIsContextDrawerOpen(false);
  }, [activeCompanyId, activeRole]);

  // Listener event pergantian perusahaan untuk mereset data lama seketika tanpa jeda
  useEffect(() => {
    const handleCompanyChanged = () => {
      setNews([]);
      setTasks([]);
      setAgendas([]);
      setAttendanceStatus(null);
      setCompanySchedule(null);
      setAttendanceError(false);
      setIsLoading(true);
      setIsAttendanceLoading(true);
      setIsTasksAgendasLoading(true);
    };
    window.addEventListener("companyChanged", handleCompanyChanged);
    return () => window.removeEventListener("companyChanged", handleCompanyChanged);
  }, []);

  useEffect(() => {
    // Tunggu hingga CompanyContext selesai memverifikasi membership dari backend.
    if (isCompanyLoading) return;

    let isSubscribed = true;
    const compId = activeCompanyId || getActiveCompanyId();
    activeFetchCompanyIdRef.current = compId;

    // Reset data kartu saat perusahaan berganti agar tidak menampilkan kartu milik perusahaan lama
    setNews([]);
    setTasks([]);
    setAgendas([]);
    setAttendanceStatus(null);
    setCompanySchedule(null);
    setAttendanceError(false);

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }

        const requestToken = token;
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        if (compId) {
          headers["x-company-id"] = compId;
        }

        const newsCacheKey = buildCacheKey("dashboard_news", compId);
        const tasksCacheKey = buildCacheKey("dashboard_tasks", compId);
        const agendasCacheKey = buildCacheKey("dashboard_agendas", compId);

        const cachedNews = getCachedData<any[]>(newsCacheKey);
        if (cachedNews?.data && activeFetchCompanyIdRef.current === compId) {
          setNews(cachedNews.data);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }

        const cachedTasks = getCachedData<any[]>(tasksCacheKey);
        if (cachedTasks?.data && activeFetchCompanyIdRef.current === compId) {
          setTasks(cachedTasks.data);
          setIsTasksAgendasLoading(false);
        }

        const cachedAgendas = getCachedData<any[]>(agendasCacheKey);
        if (cachedAgendas?.data && activeFetchCompanyIdRef.current === compId) {
          setAgendas(cachedAgendas.data);
          setIsTasksAgendasLoading(false);
        }

        const [authRes, newsRes, attendRes, notifRes, tasksRes, agendasRes] = await Promise.all([
          fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/me", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/news?limit=2", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/attendances/today", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/notifications/unread-count", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/tasks", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/agendas", { headers })
        ]);

        // Proteksi Race Condition: Jika unmount, token berganti, atau perusahaan aktif sudah berbeda dari compId saat request dikirim, DROP respons!
        if (!isSubscribed || localStorage.getItem("accessToken") !== requestToken || activeFetchCompanyIdRef.current !== compId) {
          return;
        }

        try {
          const authData = await authRes.json();
          if (authData.success && activeFetchCompanyIdRef.current === compId) {
            setUser(authData.data.user);
            setCurrentUser(authData.data.user);
            const skipCompanyPrompt = getPersonalModePreference(authData.data.user?.id);
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
          if (newsData.success && activeFetchCompanyIdRef.current === compId) {
            const sliceNews = newsData.data.slice(0, 2);
            setNews(sliceNews);
            setCachedData(newsCacheKey, sliceNews);
          }
        } catch (e) {
          console.error("Failed to parse news data", e);
        }

        try {
          const notifData = await notifRes.json();
          if (notifData.success && activeFetchCompanyIdRef.current === compId) {
            setUnreadCount(notifData.data.count);
          }
        } catch (e) {
          console.error("Failed to parse notif data", e);
        }

        try {
          if (!activeCompanyId) {
            if (activeFetchCompanyIdRef.current === compId) {
              setAttendanceError(false);
              setAttendanceStatus("NOT_CHECKED_IN");
            }
          } else {
            const attendData = await attendRes.json();
            if (activeFetchCompanyIdRef.current === compId) {
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
            }
          }
        } catch (e) {
          console.error("Failed to parse attendance data", e);
          if (activeCompanyId && activeFetchCompanyIdRef.current === compId) setAttendanceError(true);
        }

        try {
          if (tasksRes.ok && activeFetchCompanyIdRef.current === compId) {
            const tasksData = await tasksRes.json();
            if (Array.isArray(tasksData)) {
              setTasks(tasksData);
              setCachedData(tasksCacheKey, tasksData);
            }
          }
        } catch (e) {
          console.error("Failed to parse tasks data", e);
        }

        try {
          if (agendasRes.ok && activeFetchCompanyIdRef.current === compId) {
            const agendasData = await agendasRes.json();
            if (agendasData.success && Array.isArray(agendasData.data)) {
              setAgendas(agendasData.data);
              setCachedData(agendasCacheKey, agendasData.data);
            }
          }
        } catch (e) {
          console.error("Failed to parse agendas data", e);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        if (activeFetchCompanyIdRef.current === compId) setAttendanceError(true);
      } finally {
        if (isSubscribed && activeFetchCompanyIdRef.current === compId) {
          setIsLoading(false);
          setIsAttendanceLoading(false);
          setIsTasksAgendasLoading(false);
        }
      }
    };
    fetchData();

    return () => {
      isSubscribed = false;
    };
  }, [router, activeCompanyId, isCompanyLoading]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Hanya tampilkan tugas yang belum dikerjakan
      if (t.completed) return false;
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

  const [togglingTaskIds, setTogglingTaskIds] = useState<string[]>([]);

  const handleToggleTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (togglingTaskIds.includes(taskId)) return;
    if (!activeCompanyId) {
      showToast("Silakan bergabung atau pilih perusahaan terlebih dahulu.", "warning");
      setIsContextDrawerOpen(true);
      return;
    }
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    setTogglingTaskIds((prev) => [...prev, taskId]);
    const nextCompleted = !target.completed;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: nextCompleted } : t)));

    try {
      const token = localStorage.getItem("accessToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      };
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks/${taskId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ completed: nextCompleted }),
      });
      invalidateCache("dashboard_tasks");
      invalidateCache("tasks");
    } catch (err) {
      console.error("Failed to toggle task", err);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: target.completed } : t)));
    } finally {
      setTogglingTaskIds((prev) => prev.filter((id) => id !== taskId));
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
        return "bg-[#FFF7ED] text-[#C2410C] font-bold";
      case "admin":
        return "bg-[#ECFDF5] text-[#065F46] font-bold";
      case "manager":
        return "bg-[#F0F9FF] text-[#0369A1] font-bold";
      case "member":
      default:
        return "bg-[#F8FAFC] text-[#475569] font-semibold";
    }
  };

  const formatRoleLabel = (role?: string | null) => {
    if (!role) return "Karyawan";
    const r = role.toLowerCase();
    if (r === "member") return "Karyawan";
    if (r === "owner") return "Owner";
    if (r === "admin") return "Admin";
    if (r === "manager") return "Manajer";
    return role;
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

  // Cek apakah hari ini adalah hari libur (bukan hari kerja dan tidak sedang check in)
  const isDayOff = Boolean(activeCompanyId && !scheduleEval.isWorkDay && attendanceStatus !== "CHECKED_IN");

  // Evaluasi status dan gaya tombol absensi
  let isBtnDisabled = false;
  let btnLabel = "Masuk";
  let btnHelperText: string | null = null;
  let btnColorClass = "bg-[#1E4738] hover:bg-[#153428] text-white active:scale-95 cursor-pointer";

  if (!activeCompanyId) {
    isBtnDisabled = false;
    btnLabel = "Pilih Perusahaan";
    btnColorClass = "bg-[#356E3B] hover:bg-[#1E4738] text-white active:scale-95 cursor-pointer";
    btnHelperText = "Pilih atau gabung perusahaan untuk melakukan presensi";
  } else if (isAttendanceLoading) {
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
      btnHelperText = `Presensi masuk dibuka pukul ${scheduleEval.openTimeFormatted} WIB (15 menit sebelum masuk ${scheduleEval.startTimeFormatted} WIB)`;
    } else {
      isBtnDisabled = false;
      btnLabel = "Masuk";
      btnColorClass = "bg-[#1E4738] hover:bg-[#153428] text-white active:scale-95 cursor-pointer";
    }
  }

  const handleCtaClick = () => {
    if (!activeCompanyId) {
      showToast("Silakan bergabung atau pilih perusahaan terlebih dahulu sebelum melakukan presensi.", "warning");
      setIsContextDrawerOpen(true);
      return;
    }
    if (isBtnDisabled) {
      if (btnHelperText) {
        showToast(btnHelperText, "info");
        setShowScheduleNotice(true);
        if (scheduleNoticeTimeoutRef.current) {
          clearTimeout(scheduleNoticeTimeoutRef.current);
        }
        scheduleNoticeTimeoutRef.current = setTimeout(() => {
          setShowScheduleNotice(false);
        }, 4000);
      } else {
        showToast("Presensi belum dapat diakses saat ini", "info");
      }
      return;
    }
    router.push('/checkin');
  };

  if (isCompanyLoading && !currentUser && memberships.length === 0) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] items-center justify-center p-6 gap-3">
        <Loader2 className="w-8 h-8 text-[#1E4738] animate-spin" />
        <p className="text-[#5C786C] text-[13px] font-medium">Memuat data perusahaan...</p>
      </div>
    );
  }

  if (companyError && memberships.length === 0 && !activeCompanyId) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] items-center justify-center p-6 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-1">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-[#111827] text-[16px] font-bold">Gagal Memvalidasi Perusahaan</h2>
        <p className="text-[#6B7280] text-[13px] max-w-xs">{companyError}</p>
        <button
          onClick={() => refreshMemberships()}
          className="mt-2 px-5 py-2.5 bg-[#1E4738] text-white rounded-full font-bold text-[13px] hover:bg-[#153428] transition-colors cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-32">
      
      {/* Top Header: Profil & Notifikasi */}
      <div className="h-[72px] px-6 flex justify-between items-center bg-[#fbfdfc] shrink-0 sticky top-0 z-30">
        {/* Avatar & Greeting */}
        <div className="flex items-center gap-3 min-w-0">
          <Link 
            href="/profil"
            prefetch={true}
            className="cursor-pointer shrink-0 relative group"
            title="Lihat Profil"
          >
            {mounted && user?.avatarUrl && !avatarError ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="w-10 h-10 rounded-full shrink-0 object-cover border-2 border-[#1E4738]/20 ring-2 ring-[#1E4738]/10 group-hover:ring-[#1E4738]/30 transition-all shadow-xs"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-10 h-10 bg-[#d3e5d9] rounded-full flex items-center justify-center text-[#1E4738] font-bold text-[15px] border-2 border-[#1E4738]/20 ring-2 ring-[#1E4738]/10 shadow-xs">
                {mounted && user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a859] border-2 border-white rounded-full"></div>
          </Link>

          <div className="flex flex-col min-w-0">
            <span className="text-[#5C786C] text-[11.5px] font-medium leading-none mb-1">
              Selamat datang,
            </span>
            <h1 className="text-[#1E4738] text-[16px] font-bold leading-tight truncate">
              {mounted && user?.fullName ? user.fullName : (isLoading ? "Memuat..." : "Pengguna")}
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
            <div className="absolute top-[8px] right-[8px] w-2.5 h-2.5 bg-[#EF4444] border-2 border-white rounded-full"></div>
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
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full capitalize shrink-0 font-bold ${getRoleBadgeStyle(activeRole)}`}>
                    {formatRoleLabel(activeRole)}
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
        <div className="relative isolate w-full rounded-[24px] mb-2 bg-[#dce9df] overflow-hidden min-h-[164px]">
          {/* Background Illustration */}
          <img 
            src="/img/assets/imagehero.png" 
            alt="Hero Background" 
            className="absolute inset-0 w-full h-full object-cover" 
          />
          
          {/* Text Content */}
          <div className="relative z-10 w-[68%] p-5 pt-6 flex flex-col justify-center h-full">
            {attendanceStatus === "CHECKED_OUT" ? (
              <div className="flex flex-col gap-1">
                <h1 className="text-[#1E4738] text-[17px] font-bold leading-[1.3] tracking-tight">
                  Terima kasih atas<br/>
                  kontribusinya hari ini!
                </h1>
                <p className="text-[#2D5A3F] text-[12.5px] font-medium leading-tight">
                  Presensi selesai dicatat.
                </p>
              </div>
            ) : isDayOff ? (
              <div className="flex flex-col gap-1">
                <h1 className="text-[#1E4738] text-[17px] font-bold leading-[1.3] tracking-tight">
                  Selamat beristirahat,<br/>
                  nikmati hari liburmu!
                </h1>
                <p className="text-[#2D5A3F] text-[12.5px] font-medium leading-tight">
                  Hari ini bukan hari kerja.
                </p>
              </div>
            ) : (
              <h1 className="text-[#1E4738] text-[17px] font-bold leading-[1.35] tracking-tight">
                Kerja lebih produktif,<br/>
                mulai dari hadir tepat<br/>
                waktu!
              </h1>
            )}
          </div>

          {/* CTA Check In / Out Floating Full Rounded Pill at Bottom Right (Hanya muncul jika belum selesai presensi hari ini dan bukan hari libur) */}
          {attendanceStatus !== "CHECKED_OUT" && !isDayOff && (
            <div className="absolute bottom-3.5 right-3.5 z-10 flex flex-col items-end">
              {showScheduleNotice && btnHelperText && (
                <div className="mb-2 bg-[#1E4738] text-white text-[11px] font-medium px-3.5 py-2 rounded-[14px] shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200 max-w-[260px] text-left relative border border-white/20">
                  <Clock className="w-3.5 h-3.5 text-white/90 shrink-0" strokeWidth={2} />
                  <span className="leading-tight">{btnHelperText}</span>
                  <div className="absolute -bottom-1 right-8 w-2.5 h-2.5 bg-[#1E4738] rotate-45 transform" />
                </div>
              )}
              <button 
                type="button"
                onClick={handleCtaClick}
                title={btnHelperText || (attendanceStatus === "CHECKED_IN" ? "Rekam Keluar" : "Rekam Kehadiran")}
                className={`${btnColorClass} rounded-full px-4 py-2.5 flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.18)] border-[3px] border-white transition-all`}
              >
                <MapPin className="w-4 h-4 text-white shrink-0" strokeWidth={2.5} />
                <span className="font-bold text-[13.5px] leading-none">
                  {btnLabel}
                </span>
                <ArrowRight className="w-4 h-4 text-white shrink-0" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        {/* Aktivitas Hari Ini (Resume Tugas & Agenda) */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <h2 className="text-[17.5px] font-bold text-[#1E4738] shrink-0">Aktivitas Hari Ini</h2>

            {/* Tab Filter Switcher */}
            <div className="flex items-center gap-1 p-0.5 bg-[#EEF5F0] rounded-full shrink-0">
              <button
                type="button"
                onClick={() => setResumeTab("all")}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  resumeTab === "all" ? "bg-white text-[#1E4738] shadow-xs" : "text-[#5C786C] hover:text-[#1E4738]"
                }`}
              >
                Semua {todayTasks.length + todayAgendas.length > 0 && `(${todayTasks.length + todayAgendas.length})`}
              </button>
              <button
                type="button"
                onClick={() => setResumeTab("tasks")}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  resumeTab === "tasks" ? "bg-white text-[#1E4738] shadow-xs" : "text-[#5C786C] hover:text-[#1E4738]"
                }`}
              >
                Tugas {todayTasks.length > 0 && `(${todayTasks.length})`}
              </button>
              <button
                type="button"
                onClick={() => setResumeTab("agendas")}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  resumeTab === "agendas" ? "bg-white text-[#1E4738] shadow-xs" : "text-[#5C786C] hover:text-[#1E4738]"
                }`}
              >
                Agenda {todayAgendas.length > 0 && `(${todayAgendas.length})`}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {isTasksAgendasLoading && todayTasks.length === 0 && todayAgendas.length === 0 ? (
              <CardListSkeleton count={2} type={resumeTab === "agendas" ? "agenda" : "task"} />
            ) : resumeTab === "all" ? (
              todayTasks.length === 0 && todayAgendas.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Belum ada tugas atau agenda untuk hari ini.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Subheading Tugas */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex justify-between items-center px-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-bold text-[#1E4738]">Tugas</span>
                        {todayTasks.length > 0 && (
                          <span className="bg-[#EEF5F0] text-[#1E4738] text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                            {todayTasks.length} belum selesai
                          </span>
                        )}
                      </div>
                      <ViewAllButton onClick={() => router.push("/tugas")} />
                    </div>

                    {todayTasks.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-3">
                        Semua tugas hari ini telah selesai!
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {todayTasks.slice(0, 3).map((task) => (
                          <div
                            key={`task-${task.id}`}
                            onClick={() => router.push(`/tugas/${task.id}`)}
                            className="w-full bg-white rounded-[20px] p-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3.5 hover:border-[#356E3B]/30 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer group"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <button
                                type="button"
                                onTouchStart={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                                onClick={(e) => handleToggleTask(task.id, e)}
                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                  task.completed
                                    ? "bg-[#2D5A3F] border-[#2D5A3F]"
                                    : "bg-white border-[#D1E0D6] hover:border-[#356E3B]"
                                }`}
                                title={task.completed ? "Tandai belum selesai" : "Tandai selesai"}
                              >
                                {togglingTaskIds.includes(task.id) ? (
                                  <Loader2 className="w-3.5 h-3.5 text-[#356E3B] animate-spin" />
                                ) : task.completed ? (
                                  <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                                ) : null}
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
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Subheading Agenda */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex justify-between items-center px-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-bold text-[#1E4738]">Agenda</span>
                        {todayAgendas.length > 0 && (
                          <span className="bg-[#EEF5F0] text-[#1E4738] text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                            {todayAgendas.length}
                          </span>
                        )}
                      </div>
                      <ViewAllButton onClick={() => router.push("/agenda")} />
                    </div>

                    {todayAgendas.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-3">
                        Belum ada agenda untuk hari ini.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {todayAgendas.slice(0, 3).map((agenda) => {
                          const catColor = getAgendaCategoryColor(agenda.category?.name || agenda.type);
                          return (
                            <div
                              key={`agenda-${agenda.id}`}
                              onClick={() => router.push(`/agenda/${agenda.id}`)}
                              className={`w-full bg-white rounded-[20px] p-4 pl-5 border border-[#eef5f0] ${catColor.hoverBorder} shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all active:scale-[0.99] cursor-pointer relative overflow-hidden group flex items-center justify-between gap-3.5`}
                            >
                              <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[20px] ${catColor.stripeBg}`} />
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
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
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : resumeTab === "tasks" ? (
              todayTasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Semua tugas hari ini telah selesai dikerjakan!
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {todayTasks.slice(0, 6).map((task) => (
                    <div
                      key={`task-${task.id}`}
                      onClick={() => router.push(`/tugas/${task.id}`)}
                      className="w-full bg-white rounded-[20px] p-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3.5 hover:border-[#356E3B]/30 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchEnd={(e) => e.stopPropagation()}
                          onClick={(e) => handleToggleTask(task.id, e)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            task.completed
                              ? "bg-[#2D5A3F] border-[#2D5A3F]"
                              : "bg-white border-[#D1E0D6] hover:border-[#356E3B]"
                          }`}
                          title={task.completed ? "Tandai belum selesai" : "Tandai selesai"}
                        >
                          {togglingTaskIds.includes(task.id) ? (
                            <Loader2 className="w-3.5 h-3.5 text-[#356E3B] animate-spin" />
                          ) : task.completed ? (
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          ) : null}
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
                  ))}
                  <button
                    type="button"
                    onClick={() => router.push("/tugas")}
                    className="w-full py-2.5 mt-1 text-center text-[#356E3B] text-[12px] font-bold bg-[#EEF5F0] hover:bg-[#E2EFE5] rounded-[14px] transition-colors cursor-pointer"
                  >
                    Buka Halaman Tugas
                  </button>
                </div>
              )
            ) : (
              todayAgendas.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Belum ada agenda kegiatan untuk hari ini.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {todayAgendas.slice(0, 6).map((agenda) => {
                    const catColor = getAgendaCategoryColor(agenda.category?.name || agenda.type);
                    return (
                      <div
                        key={`agenda-${agenda.id}`}
                        onClick={() => router.push(`/agenda/${agenda.id}`)}
                        className={`w-full bg-white rounded-[20px] p-4 pl-5 border border-[#eef5f0] ${catColor.hoverBorder} shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all active:scale-[0.99] cursor-pointer relative overflow-hidden group flex items-center justify-between gap-3.5`}
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[20px] ${catColor.stripeBg}`} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
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
                  })}
                  <button
                    type="button"
                    onClick={() => router.push("/agenda")}
                    className="w-full py-2.5 mt-1 text-center text-[#356E3B] text-[12px] font-bold bg-[#EEF5F0] hover:bg-[#E2EFE5] rounded-[14px] transition-colors cursor-pointer"
                  >
                    Buka Halaman Agenda
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Berita Terbaru */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="text-[17.5px] font-bold text-[#1E4738]">Berita Terbaru</h2>
            <ViewAllButton onClick={() => router.push("/berita")} />
          </div>

          <div className="flex flex-col gap-3">
            {isLoading && news.length === 0 ? (
              <CardListSkeleton count={2} type="news" />
            ) : news.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Belum ada berita terbaru saat ini.
              </p>
            ) : (
              news.map((item, idx) => (
                <div 
                  key={item.id ? `news-${item.id}` : `news-idx-${idx}`} 
                  onClick={() => router.push(`/berita/${item.id}?from=/dashboard`)}
                  className="w-full bg-white rounded-[20px] p-4 flex items-center gap-3.5 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:border-[#356E3B]/30 hover:shadow-md transition-all active:scale-[0.99] group overflow-hidden"
                >
                  {item.cover_image_url ? (
                    <img 
                      src={item.cover_image_url} 
                      alt={sanitizeText(item.title)} 
                      loading="lazy"
                      decoding="async"
                      className="w-[72px] h-[72px] rounded-2xl shrink-0 object-cover" 
                    />
                  ) : (
                    <div className="w-[72px] h-[72px] bg-[#d9e8df] rounded-2xl shrink-0 flex items-center justify-center text-[#1E4738]/60">
                      <Newspaper className="w-7 h-7" />
                    </div>
                  )}
                  <div className="flex flex-col justify-center flex-1 min-w-0 overflow-hidden">
                    <span className="bg-[#eef5f0] text-[#1E4738] text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit mb-1.5">
                      {item.category?.name || "Pengumuman"}
                    </span>
                    <h3 className="text-[#1E4738] group-hover:text-[#356E3B] transition-colors text-[13.5px] font-bold leading-snug mb-1 line-clamp-1 break-words [overflow-wrap:anywhere]">
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
