"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  User, 
  Shield, 
  CalendarCheck, 
  ListTodo, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Check, 
  Camera, 
  ExternalLink, 
  Briefcase,
  UserMinus,
  Sparkles,
  RefreshCw,
  FileText,
  Loader2,
  Maximize2,
  ImageOff,
  CalendarDays,
  Info,
  MoreVertical
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Badge } from "@/components/Badge";
import ImagePreviewModal from "@/components/ImagePreviewModal";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { formatDate, formatDateWithDay, formatTime } from "@/lib/dateUtils";
import { getAgendaCategoryColor, isAgendaUrl, formatAgendaUrl, sortAgendaCategories } from "@/app/agenda/page";
import { AgendaCardSchedule, AgendaDetailSchedule } from "@/components/AgendaScheduleDisplay";
import { getApiUrl } from "@/lib/api";

interface EmployeeProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  status?: string;
  joined_at?: string | null;
}

interface AttendanceItem {
  id: string;
  work_mode: "WFO" | "WFH";
  check_in_time: string;
  check_in_latitude: string | null;
  check_in_longitude: string | null;
  check_in_address: string | null;
  check_in_photo_url: string | null;
  check_out_time: string | null;
  check_out_latitude: string | null;
  check_out_longitude: string | null;
  check_out_address: string | null;
  check_out_photo_url: string | null;
  is_terlambat: boolean;
  is_pulang_cepat?: boolean;
}

interface PreviewPhotoData {
  url: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  coords?: string;
}

interface AttendanceSummary {
  hadir: number;
  izin: number;
  terlambat: number;
  total: number;
}

interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  date: string | null;
  time: string;
  deadline?: string;
  completed: boolean;
  status: "completed" | "overdue" | "in_progress" | "pending";
  is_overdue: boolean;
  type: string;
  assignees?: any[];
}

interface AgendaItem {
  id: string;
  title: string;
  notes?: string;
  start_time: string;
  end_time: string;
  time_range: string;
  is_all_day: boolean;
  category?: { id: string; name: string } | null;
  link_or_location?: string | null;
  type?: string; // 'COMPANY' | 'PERSONAL'
  scope?: string;
  status: "upcoming" | "ongoing" | "past";
}

function getTaskDateInJakarta(task: TaskItem): string | null {
  if (task.deadline) {
    try {
      const d = new Date(task.deadline);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Jakarta",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d);
      }
    } catch {}
  }
  if (task.date) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(task.date)) {
      return task.date;
    }
    try {
      const d = new Date(task.date);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Jakarta",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d);
      }
    } catch {}
  }
  return null;
}


export default function DetailKaryawanMonitoringPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;

  const { activeCompanyId, activeCompany, activeRole, isLoading: isCompanyLoading } = useCompany();
  const { showToast } = useDialog();

  const [activeTab, setActiveTab] = useState<"kehadiran" | "tugas" | "agenda">("kehadiran");

  // Employee Profile & Attendance State
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({ hadir: 0, izin: 0, terlambat: 0, total: 0 });
  const [attendancePeriod, setAttendancePeriod] = useState<"today" | "week" | "month" | "all">("month");
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [attendanceError, setAttendanceError] = useState("");

  // Tasks State
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskFilter, setTaskFilter] = useState<"all" | "today" | "completed">("all");
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState("");

  // Agendas State
  const [agendas, setAgendas] = useState<AgendaItem[]>([]);
  const [agendaCategories, setAgendaCategories] = useState<{ id: string; name: string }[]>([]);
  const [agendaFilter, setAgendaFilter] = useState<string>("Semua");
  const [selectedAgendaDetail, setSelectedAgendaDetail] = useState<AgendaItem | null>(null);
  const [isLoadingAgendas, setIsLoadingAgendas] = useState(false);
  const [agendasError, setAgendasError] = useState("");

  // Photo Preview Modal State
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhotoData | null>(null);

  // Role Management Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"Admin" | "Manager" | "Employee">("Employee");
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleError, setRoleError] = useState("");

  // Soft Delete Member Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Current logged in user ID for self-action protection
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // More Action Menu (Titik Tiga)
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setIsActionMenuOpen(false);
    if (isActionMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isActionMenuOpen]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setCurrentUserId(payload.sub || payload.id || null);
    } catch {}
  }, []);

  // Access Control: Only Owner, Admin, or Manager allowed
  useEffect(() => {
    if (isCompanyLoading) return;
    if (activeRole && !["owner", "admin", "manager"].includes(activeRole)) {
      router.replace("/unauthorized");
    }
  }, [activeRole, isCompanyLoading, router]);

  if (!isCompanyLoading && activeRole && !["owner", "admin", "manager"].includes(activeRole)) {
    return null;
  }

  const getHeaders = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token || ""}`,
      "Content-Type": "application/json",
    };
    if (activeCompanyId) {
      headers["x-company-id"] = activeCompanyId;
    }
    return headers;
  }, [activeCompanyId]);

  // Fetch Attendance & Profile
  const fetchAttendanceData = useCallback(async () => {
    if (!employeeId) return;
    setIsLoadingAttendance(true);
    setAttendanceError("");

    try {
      const now = new Date();
      let query = "";

      if (attendancePeriod === "today") {
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        query = `?date=${todayStr}`;
      } else if (attendancePeriod === "week") {
        const firstDay = new Date(now);
        const day = now.getDay() || 7; // Get Monday
        firstDay.setDate(now.getDate() - day + 1);
        const startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}-${String(firstDay.getDate()).padStart(2, "0")}`;
        const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        query = `?startDate=${startDate}&endDate=${endDate}`;
      } else if (attendancePeriod === "month") {
        query = `?month=${now.getMonth() + 1}&year=${now.getFullYear()}`;
      } else {
        // "all" - default fallback to current year
        query = `?year=${now.getFullYear()}`;
      }

      const res = await fetch(getApiUrl(`/attendances/management/employees/${employeeId}${query}`), {
        headers: getHeaders(),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setEmployee(json.data.employee);
        setAttendances(json.data.attendances || []);
        setSummary(json.data.summary || { hadir: 0, izin: 0, terlambat: 0, total: 0 });

        // Pre-select role for modal
        const r = (json.data.employee?.role || "").toLowerCase();
        if (r === "admin") setSelectedRole("Admin");
        else if (r === "manager") setSelectedRole("Manager");
        else setSelectedRole("Employee");
      } else {
        setAttendanceError(json.message || "Gagal memuat riwayat presensi karyawan.");
      }
    } catch (err: any) {
      setAttendanceError("Terjadi kesalahan jaringan saat memuat data kehadiran.");
    } finally {
      setIsLoadingAttendance(false);
    }
  }, [employeeId, attendancePeriod, getHeaders]);

  // Fetch Tasks
  const fetchTasksData = useCallback(async () => {
    if (!employeeId) return;
    setIsLoadingTasks(true);
    setTasksError("");

    try {
      const res = await fetch(getApiUrl(`/tasks/management/employees/${employeeId}`), {
        headers: getHeaders(),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTasks(json.data || []);
      } else {
        setTasksError(json.message || "Gagal memuat tugas karyawan.");
      }
    } catch (err: any) {
      setTasksError("Terjadi kesalahan jaringan saat memuat daftar tugas.");
    } finally {
      setIsLoadingTasks(false);
    }
  }, [employeeId, getHeaders]);

  // Fetch Agendas
  const fetchAgendasData = useCallback(async () => {
    if (!employeeId) return;
    setIsLoadingAgendas(true);
    setAgendasError("");

    try {
      // Fetch all active COMPANY agendas for this employee's company (no month filter)
      // so past, current, and upcoming company agendas are all visible to management
      const res = await fetch(getApiUrl(`/agendas/management/employees/${employeeId}`), {
        headers: getHeaders(),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setAgendas(json.data || []);
      } else {
        setAgendasError(json.message || "Gagal memuat agenda.");
      }
    } catch (err: any) {
      setAgendasError("Terjadi kesalahan jaringan saat memuat agenda.");
    } finally {
      setIsLoadingAgendas(false);
    }
  }, [employeeId, getHeaders]);

  // Fetch Agenda Categories
  const fetchAgendaCategories = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/agendas/categories"), {
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAgendaCategories(sortAgendaCategories(json.data));
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  useEffect(() => {
    if (activeTab === "tugas") {
      fetchTasksData();
    } else if (activeTab === "agenda") {
      fetchAgendasData();
      fetchAgendaCategories();
    }
  }, [activeTab, fetchTasksData, fetchAgendasData, fetchAgendaCategories]);

  // Role permissions helpers
  const canModifyRole = useMemo(() => {
    if (!employee) return false;
    const targetRole = (employee.role || "").toLowerCase();
    if (targetRole === "owner") return false; // Owner role cannot be changed
    if (employee.id === currentUserId) return false; // Cannot modify self role here
    if (activeRole === "owner") return true;
    if (activeRole === "admin") return targetRole !== "owner" && targetRole !== "admin";
    return false;
  }, [employee, currentUserId, activeRole]);

  const canRemoveMember = useMemo(() => {
    if (!employee) return false;
    const targetRole = (employee.role || "").toLowerCase();
    if (targetRole === "owner" || employee.id === currentUserId) return false;
    if (activeRole === "owner") return true;
    if (activeRole === "admin") return targetRole !== "owner" && targetRole !== "admin";
    if (activeRole === "manager") return targetRole === "member" || targetRole === "employee";
    return false;
  }, [employee, currentUserId, activeRole]);

  // Handle Save Role
  const handleSaveRole = async () => {
    if (!employeeId || !canModifyRole || isSavingRole) return;
    setIsSavingRole(true);
    setRoleError("");

    try {
      const rolesPayload = ["Employee"];
      if (selectedRole === "Admin") rolesPayload.push("Admin");
      else if (selectedRole === "Manager") rolesPayload.push("Manager");

      const res = await fetch(getApiUrl(`/companies/employees/${employeeId}/roles`), {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ roles: rolesPayload }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setIsRoleModalOpen(false);
        fetchAttendanceData();
      } else {
        setRoleError(json.message || "Gagal memperbarui hak akses.");
      }
    } catch (err: any) {
      setRoleError("Terjadi kesalahan jaringan saat menyimpan role.");
    } finally {
      setIsSavingRole(false);
    }
  };

  // Handle Soft Delete / Remove Member
  const handleRemoveEmployee = async () => {
    if (!employeeId || !canRemoveMember || isDeletingMember) return;
    setIsDeletingMember(true);
    setDeleteError("");

    try {
      const res = await fetch(getApiUrl(`/companies/employees/${employeeId}`), {
        method: "DELETE",
        headers: getHeaders(),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        router.replace("/admin/karyawan");
      } else {
        setDeleteError(json.message || "Gagal mengeluarkan karyawan.");
      }
    } catch (err: any) {
      setDeleteError("Terjadi kesalahan jaringan saat menghapus anggota.");
    } finally {
      setIsDeletingMember(false);
    }
  };

  // Filtered Tasks (Semua, Hari Ini [Asia/Jakarta], Sudah Selesai)
  const filteredTasks = useMemo(() => {
    if (taskFilter === "all") return tasks;
    if (taskFilter === "today") {
      const todayJakarta = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      return tasks.filter((t) => {
        const taskDate = getTaskDateInJakarta(t);
        return taskDate === todayJakarta;
      });
    }
    if (taskFilter === "completed") {
      return tasks.filter((t) => t.completed || t.status === "completed");
    }
    return tasks;
  }, [tasks, taskFilter]);

  // Available Agenda Categories (API categories merged with unique categories in agendas)
  const availableAgendaCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    agendaCategories.forEach((c) => {
      map.set(c.name.toLowerCase(), c);
    });
    agendas.forEach((a) => {
      const name = a.category?.name;
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), { id: a.category?.id || name, name });
      }
    });
    return sortAgendaCategories(Array.from(map.values()));
  }, [agendaCategories, agendas]);

  // Filtered Agendas
  const filteredAgendas = useMemo(() => {
    if (agendaFilter === "Semua") return agendas;
    return agendas.filter((a) => {
      const catName = a.category?.name || "Acara";
      return catName.toLowerCase() === agendaFilter.toLowerCase();
    });
  }, [agendas, agendaFilter]);

  // Determine Badge Styling for Roles
  const getRoleBadge = (roleName?: string) => {
    const r = (roleName || "employee").toLowerCase();
    if (r === "owner") {
      return { text: "Owner", cls: "bg-[#1E4738] text-white" };
    }
    if (r === "admin") {
      return { text: "Admin", cls: "bg-[#eef5f0] text-[#356E3B] border border-[#dce9df]" };
    }
    if (r === "manager") {
      return { text: "Manajemen", cls: "bg-[#eef5f0] text-[#1E4738] border border-[#dce9df]" };
    }
    return { text: "Karyawan", cls: "bg-gray-100 text-gray-600 border border-gray-200" };
  };

  return (
    <div className="flex flex-col min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#fbfdfc] pb-24 relative font-sans">
      {/* TopBar with back button to Kelola Karyawan */}
      <TopBar 
        title="Profil Karyawan" 
        onBack={() => {
          if (previewPhoto) {
            setPreviewPhoto(null);
          } else if (isRoleModalOpen) {
            setIsRoleModalOpen(false);
          } else if (isDeleteModalOpen) {
            setIsDeleteModalOpen(false);
          } else if (selectedAgendaDetail) {
            setSelectedAgendaDetail(null);
          } else {
            router.push("/admin/karyawan");
          }
        }}
      />

      <div className="flex-1 px-5 py-4 flex flex-col gap-4 z-10 relative">
        
        {/* EMPLOYEE HEADER CARD */}
        <div className="bg-white rounded-[24px] p-5 border border-[#eef5f0] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-4 relative">
          <div className="flex items-start justify-between gap-3.5">
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              {/* Avatar Photo */}
              <div className="w-14 h-14 rounded-full border-2 border-[#eef5f0] bg-[#f4f9f6] text-[#356E3B] flex items-center justify-center shrink-0 overflow-hidden relative shadow-sm">
                {employee?.avatar_url ? (
                  <img 
                    src={employee.avatar_url} 
                    alt={employee.full_name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <User className={`w-6 h-6 ${employee?.avatar_url ? "hidden" : ""}`} strokeWidth={2.2} />
              </div>

              {/* Profile Info */}
              <div className="flex flex-col flex-1 overflow-hidden pr-8">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-[#111827] text-[16px] font-bold truncate">
                    {employee?.full_name || (isLoadingAttendance ? "Memuat..." : "Karyawan")}
                  </h2>
                  {employee?.id === currentUserId && (
                    <span className="text-[10px] font-bold text-[#356E3B] bg-[#eef5f0] px-1.5 py-0.5 rounded-full shrink-0">
                      (Anda)
                    </span>
                  )}
                </div>
                <span className="text-gray-400 text-[12px] truncate">{employee?.email || "—"}</span>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {/* Role badge */}
                  {(() => {
                    const b = getRoleBadge(employee?.role);
                    return (
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${b.cls}`}>
                        {b.text}
                      </span>
                    );
                  })()}

                  {employee?.joined_at && (
                    <span className="text-[10px] text-gray-400">
                      Bergabung {formatDate(employee.joined_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* More Action Menu Button on Card - Selalu di Ujung Kanan Atas */}
            {(canModifyRole || canRemoveMember) && (
              <div className="absolute top-4 right-4 z-30" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setIsActionMenuOpen((prev) => !prev)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 active:scale-95 text-gray-500 hover:text-[#1E4738] flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Menu Opsi Karyawan"
                  title="Opsi Karyawan"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isActionMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsActionMenuOpen(false)} 
                    />
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 w-48 bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.18),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      {canModifyRole && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsActionMenuOpen(false);
                            setRoleError("");
                            setIsRoleModalOpen(true);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:bg-[#F4F9F6] hover:text-[#356E3B] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Shield className="w-4 h-4 text-[#356E3B]" />
                          <span>Kelola Hak Akses</span>
                        </button>
                      )}

                      {canModifyRole && canRemoveMember && (
                        <div className="h-[1px] bg-gray-100 mx-3 my-0.5" />
                      )}

                      {canRemoveMember && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsActionMenuOpen(false);
                            setDeleteError("");
                            setIsDeleteModalOpen(true);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <UserMinus className="w-4 h-4 text-red-500" />
                          <span>Keluarkan Karyawan</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-[#f4f9f6]/80 p-1 rounded-full border border-[#eef5f0] w-full">
          <button
            type="button"
            onClick={() => setActiveTab("kehadiran")}
            className={`py-2 px-1.5 sm:px-3 rounded-full text-[12px] sm:text-[13px] font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === "kehadiran"
                ? "bg-[#356E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-[#111827] hover:bg-white/60"
            }`}
          >
            <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">Kehadiran</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tugas")}
            className={`py-2 px-1.5 sm:px-3 rounded-full text-[12px] sm:text-[13px] font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === "tugas"
                ? "bg-[#356E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-[#111827] hover:bg-white/60"
            }`}
          >
            <ListTodo className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">Tugas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("agenda")}
            className={`py-2 px-1.5 sm:px-3 rounded-full text-[12px] sm:text-[13px] font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === "agenda"
                ? "bg-[#356E3B] text-white shadow-sm"
                : "text-gray-600 hover:text-[#111827] hover:bg-white/60"
            }`}
          >
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">Agenda</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: KEHADIRAN */}
        {/* ======================================================== */}
        {activeTab === "kehadiran" && (
          <div className="flex flex-col gap-3.5 w-full">
            {/* Filter Periode Kehadiran */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x -mx-1 px-1 touch-pan-x w-full">
              {[
                { id: "today", label: "Hari Ini" },
                { id: "week", label: "Minggu Ini" },
                { id: "month", label: "Bulan Ini" },
                { id: "all", label: "Tahun Ini" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setAttendancePeriod(p.id as any)}
                  className={`px-3.5 sm:px-4 py-2 shrink-0 snap-start rounded-full whitespace-nowrap text-[12.5px] sm:text-[13px] font-bold transition-all border ${
                    attendancePeriod === p.id
                      ? "bg-[#356E3B] text-white border-[#356E3B] shadow-md"
                      : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-gray-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Attendance Summary Stat Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-white rounded-[18px] p-3 border border-emerald-100/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col items-center text-center">
                <span className="text-[#1E4738] text-[20px] font-extrabold leading-tight">
                  {summary.hadir}
                </span>
                <span className="text-gray-400 text-[10px] font-semibold">Total Hadir</span>
              </div>
              <div className="bg-white rounded-[18px] p-3 border border-amber-100/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col items-center text-center">
                <span className="text-amber-600 text-[20px] font-extrabold leading-tight">
                  {summary.terlambat}
                </span>
                <span className="text-gray-400 text-[10px] font-semibold">Terlambat</span>
              </div>
              <div className="bg-white rounded-[18px] p-3 border border-blue-100/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col items-center text-center">
                <span className="text-blue-600 text-[20px] font-extrabold leading-tight">
                  {summary.izin}
                </span>
                <span className="text-gray-400 text-[10px] font-semibold">Izin/Cuti</span>
              </div>
            </div>

            {/* Attendance History List */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[#111827] text-[13px] font-bold">
                  Riwayat Presensi ({attendances.length})
                </span>
                {isLoadingAttendance && (
                  <span className="text-gray-400 text-[11px] flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Memperbarui...
                  </span>
                )}
              </div>

              {isLoadingAttendance ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2.5">
                  <div className="w-7 h-7 border-2 border-[#356E3B] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[13px] font-medium text-[#7d998c]">Memuat riwayat kehadiran...</span>
                </div>
              ) : attendanceError ? (
                <div className="p-4 text-center text-red-500 text-[13px]">{attendanceError}</div>
              ) : attendances.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  Belum ada riwayat kehadiran.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {attendances.map((att) => {
                    const hasCheckInCoords = 
                      att.check_in_latitude !== null && 
                      att.check_in_latitude !== undefined && 
                      att.check_in_longitude !== null && 
                      att.check_in_longitude !== undefined &&
                      att.check_in_latitude !== "" &&
                      att.check_in_longitude !== "";

                    const hasCheckOutCoords = 
                      att.check_out_latitude !== null && 
                      att.check_out_latitude !== undefined && 
                      att.check_out_longitude !== null && 
                      att.check_out_longitude !== undefined &&
                      att.check_out_latitude !== "" &&
                      att.check_out_longitude !== "";

                    return (
                      <div 
                        key={att.id} 
                        className="bg-white rounded-[24px] p-5 border border-[#eef5f0] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-4 transition-colors hover:border-[#dce9df]"
                      >
                        {/* Header: Tanggal & Badge Mode Kerja / Status */}
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#f4f9f6] flex items-center justify-center text-[#356E3B] shrink-0">
                              <CalendarDays className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[#111827] text-[14px] font-bold block leading-tight">
                                {formatDateWithDay(att.check_in_time)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Mode Kerja */}
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              att.work_mode === "WFH"
                                ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                                : "bg-[#eef5f0] text-[#1E4738] border border-[#dce9df]"
                            }`}>
                              {att.work_mode === "WFH" ? "Work From Home" : "Work From Office"}
                            </span>
                          </div>
                        </div>

                        {/* Konten Terpisah: Masuk vs Keluar */}
                        <div className="flex flex-col gap-3.5">
                          
                          {/* 1. DETAIL MASUK (CHECK-IN) */}
                          <div className="bg-[#fbfdfc] border border-[#eef5f0] rounded-[18px] p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                                <span className="text-[#1E4738] text-[12px] font-bold uppercase tracking-wider">
                                  Detail Masuk 
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                  att.is_terlambat
                                    ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                }`}>
                                  {att.is_terlambat ? "Terlambat" : "Disiplin"}
                                </span>
                                <div className="flex items-baseline gap-1 bg-white px-2.5 py-1 rounded-full border border-gray-100 shadow-2xs">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-[#111827] font-bold text-[13px]">
                                    {formatTime(att.check_in_time)}
                                  </span>
                                  <span className="text-[#6B7280] text-[10px] font-medium">WIB</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3.5 items-start justify-between">
                              {/* Lokasi Masuk */}
                              <div className="flex-1 flex flex-col gap-1 min-w-0">
                                <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                                  Lokasi Masuk
                                </span>
                                <div className="flex items-start gap-1.5 text-gray-700 text-[13px] leading-snug">
                                  <MapPin className="w-4 h-4 text-[#356E3B] shrink-0 mt-0.5" />
                                  <span className="font-medium break-words">
                                    {att.check_in_address || "Alamat tidak tersedia"}
                                  </span>
                                </div>

                                {/* Koordinat */}
                                {hasCheckInCoords ? (
                                  <div className="flex items-center gap-2 pl-5.5 mt-0.5 flex-wrap">
                                    <span className="text-[11px] text-gray-500 font-mono">
                                      Lat: {parseFloat(att.check_in_latitude!).toFixed(5)} • Long: {parseFloat(att.check_in_longitude!).toFixed(5)}
                                    </span>
                                    <a 
                                      href={`https://www.google.com/maps?q=${att.check_in_latitude},${att.check_in_longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] text-[#356E3B] hover:underline font-bold inline-flex items-center gap-0.5"
                                      title="Buka titik lokasi masuk di Google Maps"
                                    >
                                      <span>Buka Peta</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-gray-400 pl-5.5 italic">
                                    Koordinat tidak tersedia
                                  </span>
                                )}
                              </div>

                              {/* Foto Bukti Masuk */}
                              <div className="shrink-0 flex flex-col gap-1 w-full sm:w-auto">
                                <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                                  Foto Bukti Masuk
                                </span>
                                {att.check_in_photo_url ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPhoto({
                                      url: att.check_in_photo_url!,
                                      title: `Foto Bukti Masuk`,
                                      date: formatDateWithDay(att.check_in_time),
                                      time: `${formatTime(att.check_in_time)} WIB`,
                                      location: att.check_in_address || undefined,
                                      coords: hasCheckInCoords ? `${att.check_in_latitude}, ${att.check_in_longitude}` : undefined
                                    })}
                                    className="group relative w-full sm:w-24 h-24 rounded-[14px] overflow-hidden border border-gray-200 shadow-xs active:scale-95 transition-transform bg-gray-50 cursor-pointer"
                                    title="Klik untuk memperbesar foto bukti masuk"
                                  >
                                    <img 
                                      src={att.check_in_photo_url} 
                                      alt="Foto Masuk" 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                        (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                    <div className="hidden absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-gray-100 text-gray-400 text-[10px]">
                                      <ImageOff className="w-5 h-5 mb-1" />
                                      <span>Gagal memuat foto</span>
                                    </div>
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Maximize2 className="w-5 h-5 text-white drop-shadow" />
                                    </div>
                                  </button>
                                ) : (
                                  <div className="w-full sm:w-24 h-24 rounded-[14px] border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center p-2 text-gray-400">
                                    <Camera className="w-5 h-5 text-gray-300 mb-1" />
                                    <span className="text-[10px] font-medium leading-tight">Foto tidak tersedia</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 2. DETAIL KELUAR (CHECK-OUT) */}
                          <div className={`border rounded-[18px] p-4 flex flex-col gap-3 ${
                            att.check_out_time ? "bg-[#fffdfb] border-[#fde8d7]" : "bg-gray-50/60 border-dashed border-gray-200"
                          }`}>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  att.check_out_time ? "bg-orange-500" : "bg-gray-300"
                                }`}></span>
                                <span className={`text-[12px] font-bold uppercase tracking-wider ${
                                  att.check_out_time ? "text-orange-800" : "text-gray-400"
                                }`}>
                                  Detail Keluar
                                </span>
                              </div>
                              {att.check_out_time ? (
                                <div className="flex items-center gap-2">
                                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                    att.is_pulang_cepat
                                      ? "bg-orange-50 text-orange-700 border border-orange-200/60"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                  }`}>
                                    {att.is_pulang_cepat ? "Pulang Cepat" : "Disiplin"}
                                  </span>
                                  <div className="flex items-baseline gap-1 bg-white px-2.5 py-1 rounded-full border border-gray-100 shadow-2xs">
                                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                                    <span className="text-[#111827] font-bold text-[13px]">
                                      {formatTime(att.check_out_time)}
                                    </span>
                                    <span className="text-[#6B7280] text-[10px] font-medium">WIB</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                  Belum Check-Out
                                </span>
                              )}
                            </div>

                            {att.check_out_time ? (
                              <div className="flex flex-col sm:flex-row gap-3.5 items-start justify-between">
                                {/* Lokasi Keluar */}
                                <div className="flex-1 flex flex-col gap-1 min-w-0">
                                  <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                                    Lokasi Keluar
                                  </span>
                                  <div className="flex items-start gap-1.5 text-gray-700 text-[13px] leading-snug">
                                    <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                                    <span className="font-medium break-words">
                                      {att.check_out_address || "Alamat tidak tersedia"}
                                    </span>
                                  </div>

                                  {/* Koordinat */}
                                  {hasCheckOutCoords ? (
                                    <div className="flex items-center gap-2 pl-5.5 mt-0.5 flex-wrap">
                                      <span className="text-[11px] text-gray-500 font-mono">
                                        Lat: {parseFloat(att.check_out_latitude!).toFixed(5)} • Long: {parseFloat(att.check_out_longitude!).toFixed(5)}
                                      </span>
                                      <a 
                                        href={`https://www.google.com/maps?q=${att.check_out_latitude},${att.check_out_longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-orange-600 hover:underline font-bold inline-flex items-center gap-0.5"
                                        title="Buka titik lokasi keluar di Google Maps"
                                      >
                                        <span>Buka Peta</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-gray-400 pl-5.5 italic">
                                      Koordinat tidak tersedia
                                    </span>
                                  )}
                                </div>

                                {/* Foto Bukti Keluar */}
                                <div className="shrink-0 flex flex-col gap-1 w-full sm:w-auto">
                                  <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                                    Foto Bukti Keluar
                                  </span>
                                  {att.check_out_photo_url ? (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewPhoto({
                                        url: att.check_out_photo_url!,
                                        title: `Foto Bukti Keluar`,
                                        date: formatDateWithDay(att.check_out_time),
                                        time: `${formatTime(att.check_out_time)} WIB`,
                                        location: att.check_out_address || undefined,
                                        coords: hasCheckOutCoords ? `${att.check_out_latitude}, ${att.check_out_longitude}` : undefined
                                      })}
                                      className="group relative w-full sm:w-24 h-24 rounded-[14px] overflow-hidden border border-gray-200 shadow-xs active:scale-95 transition-transform bg-gray-50 cursor-pointer"
                                      title="Klik untuk memperbesar foto bukti keluar"
                                    >
                                      <img 
                                        src={att.check_out_photo_url} 
                                        alt="Foto Keluar" 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                          (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                      <div className="hidden absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-gray-100 text-gray-400 text-[10px]">
                                        <ImageOff className="w-5 h-5 mb-1" />
                                        <span>Gagal memuat foto</span>
                                      </div>
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Maximize2 className="w-5 h-5 text-white drop-shadow" />
                                      </div>
                                    </button>
                                  ) : (
                                    <div className="w-full sm:w-24 h-24 rounded-[14px] border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center p-2 text-gray-400">
                                      <Camera className="w-5 h-5 text-gray-300 mb-1" />
                                      <span className="text-[10px] font-medium leading-tight">Foto tidak tersedia</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="py-2 text-gray-400 text-[12px] italic flex items-center gap-1.5">
                                <Info className="w-4 h-4 text-gray-400 shrink-0" />
                                <span>Karyawan belum melakukan presensi keluar untuk hari ini.</span>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TUGAS */}
        {/* ======================================================== */}
        {activeTab === "tugas" && (
          <div className="flex flex-col gap-3.5 w-full">
            {/* Task Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x -mx-1 px-1 touch-pan-x w-full">
              {[
                { id: "all", label: "Semua" },
                { id: "today", label: "Hari Ini" },
                { id: "completed", label: "Selesai" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTaskFilter(f.id as any)}
                  className={`px-3.5 sm:px-4 py-2 shrink-0 snap-start rounded-full whitespace-nowrap text-[12.5px] sm:text-[13px] font-bold transition-all border ${
                    taskFilter === f.id
                      ? "bg-[#356E3B] text-white border-[#356E3B] shadow-md"
                      : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-gray-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Task List */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[#111827] text-[13px] font-bold">
                  Daftar Tugas ({filteredTasks.length})
                </span>
                {isLoadingTasks && (
                  <span className="text-gray-400 text-[11px] flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Memuat...
                  </span>
                )}
              </div>

              {isLoadingTasks ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2.5">
                  <div className="w-7 h-7 border-2 border-[#356E3B] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[13px] font-medium text-[#7d998c]">Memuat daftar tugas...</span>
                </div>
              ) : tasksError ? (
                <div className="p-4 text-center text-red-500 text-[13px]">{tasksError}</div>
              ) : filteredTasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  {taskFilter === "today" 
                    ? "Tidak ada tugas dengan tenggat hari ini."
                    : taskFilter === "completed"
                    ? "Belum ada tugas yang selesai."
                    : "Belum ada tugas yang ditugaskan."}
                </p>
              ) : (
                filteredTasks.map((task) => {
                  const todayJakarta = new Intl.DateTimeFormat("en-CA", {
                    timeZone: "Asia/Jakarta",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date());

                  const taskDeadlineDate = getTaskDateInJakarta(task);
                  const isDueToday = taskDeadlineDate === todayJakarta;

                  let statusBadge = { text: "Berlangsung", cls: "bg-amber-50 text-amber-700 border-amber-200/60" };
                  if (task.completed || task.status === "completed") {
                    statusBadge = { text: "Selesai", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/60" };
                  } else if (task.is_overdue || task.status === "overdue") {
                    statusBadge = { text: "Terlambat", cls: "bg-red-50 text-red-700 border-red-200/60" };
                  } else if (isDueToday) {
                    statusBadge = { text: "Hari Ini", cls: "bg-amber-50 text-amber-700 border-amber-200/60" };
                  } else if (taskDeadlineDate && taskDeadlineDate > todayJakarta) {
                    statusBadge = { text: "Mendatang", cls: "bg-blue-50 text-blue-700 border-blue-200/60" };
                  }

                  return (
                    <div 
                      key={task.id}
                      className="bg-white rounded-[20px] p-4 border border-[#eef5f0] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-2.5 transition-colors hover:border-[#dce9df]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-0.5 flex-1">
                          <h4 className="text-[#111827] text-[14px] font-bold leading-snug">
                            {task.title}
                          </h4>
                          {task.notes && (
                            <p className="text-gray-500 text-[12px] leading-relaxed line-clamp-2 mt-0.5">
                              {task.notes}
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusBadge.cls}`}>
                          {statusBadge.text}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            Tenggat: {task.date ? `${formatDate(task.date)} pukul ${task.time} WIB` : "Tidak ada tenggat"}
                          </span>
                        </div>

                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          task.type === "group" 
                            ? "bg-purple-50 text-purple-700 border border-purple-200/60" 
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {task.type === "group" ? "Kelompok" : "Personal"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: AGENDA */}
        {/* ======================================================== */}
        {activeTab === "agenda" && (
          <div className="flex flex-col gap-3.5">
            {/* Header matching employee agenda style */}
            <div className="flex justify-between items-center px-1">
              <h2 className="text-[16px] font-bold text-[#111827]">
                Agenda Karyawan
              </h2>
              <div className="flex items-center gap-2">
                {isLoadingAgendas && (
                  <span className="text-gray-400 text-[11px] flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Memuat...
                  </span>
                )}
                <div className="bg-[#E8F3EB] px-3 py-1.5 rounded-full border border-[#D1E5D5]">
                  <span className="text-[#356E3B] text-[11px] font-bold">{filteredAgendas.length} Agenda</span>
                </div>
              </div>
            </div>

            {/* Filter Tabs matching Employee Agenda role */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x -mx-1 px-1 touch-pan-x w-full">
              <button 
                type="button"
                onClick={() => setAgendaFilter("Semua")}
                className={`px-3.5 sm:px-4 py-2 shrink-0 snap-start rounded-full whitespace-nowrap text-[12.5px] sm:text-[13px] font-bold transition-all border ${
                  agendaFilter === "Semua" 
                    ? "bg-[#356E3B] text-white border-[#356E3B] shadow-md" 
                    : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-gray-50"
                }`}
              >
                Semua
              </button>
              {availableAgendaCategories.map((kat) => (
                <button 
                  key={kat.id}
                  type="button"
                  onClick={() => setAgendaFilter(kat.name)}
                  className={`px-3.5 sm:px-4 py-2 shrink-0 snap-start rounded-full whitespace-nowrap text-[12.5px] sm:text-[13px] font-bold transition-all border ${
                    agendaFilter.toLowerCase() === kat.name.toLowerCase()
                      ? "bg-[#356E3B] text-white border-[#356E3B] shadow-md" 
                      : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-gray-50"
                  }`}
                >
                  {kat.name}
                </button>
              ))}
            </div>

            {/* Agenda List */}
            {isLoadingAgendas ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2.5">
                <div className="w-7 h-7 border-2 border-[#356E3B] border-t-transparent rounded-full animate-spin" />
                <span className="text-[13px] font-medium text-[#7d998c]">Memuat agenda...</span>
              </div>
            ) : agendasError ? (
              <div className="p-4 text-center text-red-500 text-[13px]">{agendasError}</div>
            ) : filteredAgendas.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                {agendaFilter === "Semua"
                  ? "Belum ada agenda."
                  : `Tidak ada agenda dengan kategori "${agendaFilter}".`}
              </p>
            ) : (
              filteredAgendas.map((agenda) => {
                const categoryName = agenda.category?.name || "Acara";
                const catColor = getAgendaCategoryColor(categoryName);
                const isCompanyScope = (agenda.scope || "").toLowerCase() === "company" || (agenda.type || "").toUpperCase() === "COMPANY";

                return (
                  <div
                    key={agenda.id}
                    onClick={() => setSelectedAgendaDetail(agenda)}
                    className={`bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] p-5 flex flex-col gap-3 ${catColor.hoverBorder} transition-colors group relative overflow-hidden cursor-pointer`}
                  >
                    {/* Left Colored Stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${catColor.stripeBg}`} />

                    {/* Badges and Title */}
                    <div className="flex justify-between items-start pl-2 pr-2">
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant={catColor.variant}
                            size="xs"
                            uppercase
                          >
                            {categoryName}
                          </Badge>
                          <Badge
                            variant={isCompanyScope ? "company" : "personal"}
                            size="xs"
                            uppercase
                          >
                            {isCompanyScope ? "PERUSAHAAN" : "PRIBADI"}
                          </Badge>
                        </div>
                        <h3 className="text-[#111827] text-[16px] font-bold leading-tight mt-1">
                          {agenda.title}
                        </h3>
                      </div>
                    </div>

                    {/* Details: Time, Location / Link / Notes */}
                    <div className="flex flex-col gap-2 pl-2">
                      <AgendaCardSchedule
                        startTime={agenda.start_time}
                        endTime={agenda.end_time}
                        isAllDay={agenda.is_all_day}
                        fallbackTime={agenda.time_range}
                      />
                      {agenda.link_or_location ? (
                        isAgendaUrl(agenda.link_or_location) ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <ExternalLink className="w-[14px] h-[14px] text-[#2563EB] shrink-0" strokeWidth={2.5} />
                            <a
                              href={formatAgendaUrl(agenda.link_or_location)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline text-[12px] font-medium truncate max-w-[260px]"
                              title={agenda.link_or_location}
                            >
                              {agenda.link_or_location}
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="w-[14px] h-[14px] text-[#6B7280] shrink-0" strokeWidth={2.5} />
                            <span className="text-[#4B5563] text-[12px] font-medium truncate" title={agenda.link_or_location}>
                              {agenda.link_or_location}
                            </span>
                          </div>
                        )
                      ) : agenda.notes ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-[14px] h-[14px] text-[#6B7280] shrink-0" strokeWidth={2.5} />
                          <span className="text-[#4B5563] text-[12px] font-medium truncate" title={agenda.notes}>
                            {agenda.notes}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* PHOTO PREVIEW MODAL */}
      <ImagePreviewModal
        photo={previewPhoto}
        onClose={() => setPreviewPhoto(null)}
      />

      {/* ======================================================== */}
      {/* ROLE MANAGEMENT MODAL (KELOLA HAK AKSES) */}
      {/* ======================================================== */}
      {isRoleModalOpen && employee && canModifyRole && (
        <div 
          className="fixed inset-0 z-[100] flex justify-end flex-col sm:justify-center sm:items-center bg-black/60 p-0 sm:p-5 animate-in fade-in duration-200"
          onClick={() => {
            if (!isSavingRole) setIsRoleModalOpen(false);
          }}
        >
          <div 
            className="w-full sm:max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#356E3B]" />
                <h3 className="text-[16px] font-bold text-[#111827]">Kelola Hak Akses</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 active:scale-95 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Employee Info */}
            <div className="flex items-center gap-3 p-3 bg-[#fbfdfc] border border-gray-100 rounded-[16px]">
              <div className="w-11 h-11 border border-[#eef5f0] bg-[#f4f9f6] rounded-full flex items-center justify-center text-[#356E3B] shrink-0 overflow-hidden relative">
                {employee.avatar_url && (
                  <img 
                    src={employee.avatar_url} 
                    alt={employee.full_name} 
                    className="w-full h-full object-cover" 
                  />
                )}
                <User className={`w-5 h-5 ${employee.avatar_url ? "hidden" : ""}`} />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[#111827] text-[13px] font-bold truncate">{employee.full_name}</span>
                <span className="text-gray-400 text-[11px] truncate">{employee.email}</span>
              </div>
            </div>

            {/* Role Options */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[12px] font-bold text-[#111827]">Tingkat Wewenang</span>

              {/* Employee */}
              <div 
                onClick={() => canModifyRole && setSelectedRole("Employee")}
                className={`flex items-center justify-between p-3.5 border rounded-[16px] transition-all cursor-pointer ${
                  selectedRole === "Employee"
                    ? "border-[#356E3B] bg-[#f4f9f6]"
                    : "border-gray-100 hover:border-gray-300 bg-white"
                } ${!canModifyRole ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[#111827] text-[13px] font-bold">Karyawan</span>
                  <span className="text-gray-500 text-[11px] leading-relaxed max-w-[240px]">
                    Melakukan presensi, mengajukan izin, membuat tugas sert agenda dan melihat berita.
                  </span>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                  selectedRole === "Employee" ? "bg-[#356E3B] border-[#356E3B]" : "bg-white border-gray-300"
                }`}>
                  {selectedRole === "Employee" && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
              </div>

              {/* Manager */}
              <div 
                onClick={() => canModifyRole && setSelectedRole("Manager")}
                className={`flex items-center justify-between p-3.5 border rounded-[16px] transition-all cursor-pointer ${
                  selectedRole === "Manager"
                    ? "border-[#356E3B] bg-[#f4f9f6]"
                    : "border-gray-100 hover:border-gray-300 bg-white"
                } ${!canModifyRole ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[#111827] text-[13px] font-bold">Manajemen / Manager</span>
                  <span className="text-gray-500 text-[11px] leading-relaxed max-w-[240px]">
                    Memantau kehadiran & tugas bawahan, menyetujui izin, serta publikasi agenda dan berita.
                  </span>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                  selectedRole === "Manager" ? "bg-[#356E3B] border-[#356E3B]" : "bg-white border-gray-300"
                }`}>
                  {selectedRole === "Manager" && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
              </div>

              {/* Admin */}
              <div 
                onClick={() => canModifyRole && setSelectedRole("Admin")}
                className={`flex items-center justify-between p-3.5 border rounded-[16px] transition-all cursor-pointer ${
                  selectedRole === "Admin"
                    ? "border-[#356E3B] bg-[#f4f9f6]"
                    : "border-gray-100 hover:border-gray-300 bg-white"
                } ${!canModifyRole ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[#111827] text-[13px] font-bold">Administrator</span>
                  <span className="text-gray-500 text-[11px] leading-relaxed max-w-[240px]">
                    Akses penuh pengaturan perusahaan, role karyawan, dan kelola organisasi.
                  </span>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                  selectedRole === "Admin" ? "bg-[#356E3B] border-[#356E3B]" : "bg-white border-gray-300"
                }`}>
                  {selectedRole === "Admin" && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
              </div>
            </div>

            {roleError && (
              <div className="text-red-600 text-[12px] bg-red-50 p-2.5 rounded-[12px] border border-red-200 text-center font-medium">
                {roleError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-2">
              <button 
                type="button"
                onClick={handleSaveRole}
                disabled={isSavingRole || !canModifyRole}
                className={`w-full py-3.5 text-white rounded-full font-bold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                  isSavingRole
                    ? "bg-gray-400 cursor-wait pointer-events-none shadow-none"
                    : !canModifyRole
                    ? "bg-gray-300 opacity-50 cursor-not-allowed"
                    : "bg-[#356E3B] hover:bg-[#2A582F] shadow-md shadow-[#356E3B]/20"
                }`}
              >
                {isSavingRole ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : (
                  "Simpan Perubahan Role"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SOFT DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {isDeleteModalOpen && employee && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-5 animate-in fade-in duration-200"
          onClick={() => !isDeletingMember && setIsDeleteModalOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-[24px] p-6 flex flex-col items-center text-center gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="text-[17px] font-bold text-[#111827]">Keluarkan Karyawan?</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed px-2">
                Apakah Anda yakin ingin mengeluarkan <span className="font-semibold text-gray-800">{employee.full_name}</span> dari <span className="font-semibold text-gray-800">{activeCompany?.name || "perusahaan"}</span>? Akses karyawan ini akan dinonaktifkan.
              </p>
            </div>

            {deleteError && (
              <div className="w-full text-red-600 text-[12px] bg-red-50 p-2.5 rounded-[12px] border border-red-200 text-center font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3 w-full mt-2">
              <button 
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingMember}
                className="flex-1 py-3 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-[13px] transition-colors"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleRemoveEmployee}
                disabled={isDeletingMember}
                className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-[13px] active:scale-95 transition-all shadow-md shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingMember ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Mengeluarkan...</span>
                  </>
                ) : (
                  "Ya, Keluarkan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DETAIL AGENDA (SAME AS EMPLOYEE AGENDA DETAIL) */}
      {/* ======================================================== */}
      {selectedAgendaDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" 
            onClick={() => setSelectedAgendaDetail(null)} 
          />
          <div className="relative w-full max-w-sm bg-white rounded-[24px] shadow-xl z-10 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant={getAgendaCategoryColor(selectedAgendaDetail.category?.name || "Acara").variant}
                  size="sm"
                  uppercase
                >
                  {selectedAgendaDetail.category?.name || "Acara"}
                </Badge>
                <Badge
                  variant={(selectedAgendaDetail.scope || "").toLowerCase() === "company" || (selectedAgendaDetail.type || "").toUpperCase() === "COMPANY" ? "company" : "personal"}
                  size="sm"
                  uppercase
                >
                  {(selectedAgendaDetail.scope || "").toLowerCase() === "company" || (selectedAgendaDetail.type || "").toUpperCase() === "COMPANY" ? "PERUSAHAAN" : "PRIBADI"}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgendaDetail(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <h2 className="text-[20px] font-bold text-[#111827] mb-4 leading-tight">
              {selectedAgendaDetail.title}
            </h2>
            
            <div className="flex flex-col gap-3">
              <AgendaDetailSchedule
                startTime={selectedAgendaDetail.start_time}
                endTime={selectedAgendaDetail.end_time}
                isAllDay={selectedAgendaDetail.is_all_day}
                fallbackTime={selectedAgendaDetail.time_range}
              />
              
              {selectedAgendaDetail.link_or_location && (
                <div className="flex items-center gap-3 bg-[#F9FAFB] p-3 rounded-[14px]">
                  {isAgendaUrl(selectedAgendaDetail.link_or_location) ? (
                    <>
                      <ExternalLink className="w-5 h-5 text-[#356E3B] shrink-0" strokeWidth={2} />
                      <a
                        href={formatAgendaUrl(selectedAgendaDetail.link_or_location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2563EB] hover:underline text-[14px] font-medium truncate flex-1"
                        title={selectedAgendaDetail.link_or_location}
                      >
                        {selectedAgendaDetail.link_or_location}
                      </a>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-5 h-5 text-[#356E3B] shrink-0" strokeWidth={2} />
                      <span className="text-[#374151] text-[14px] font-medium truncate flex-1">
                        {selectedAgendaDetail.link_or_location}
                      </span>
                    </>
                  )}
                </div>
              )}

              {selectedAgendaDetail.notes && (
                <div className="bg-[#F9FAFB] p-3 rounded-[14px]">
                  <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider block mb-1">Catatan</span>
                  <p className="text-[#374151] text-[13px] whitespace-pre-wrap leading-relaxed">
                    {selectedAgendaDetail.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedAgendaDetail(null)}
                className="w-full py-2.5 px-4 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-bold active:scale-95 transition-all text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
