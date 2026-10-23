"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Building2,
  ArrowLeft,
  Copy,
  Check,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  Phone,
  ShieldCheck,
  BarChart3,
  Layers,
  Briefcase,
  FileText,
  Activity,
  ChevronRight,
  TrendingUp,
  UserCheck,
  UserX,
  Search,
  Filter,
  ExternalLink,
  Loader2,
  RotateCw,
  X,
  AlertCircle,
  Mail,
  User,
  Coffee,
  CheckCircle,
  XCircle,
  Hourglass,
  Compass,
} from "lucide-react";
import { fetchPlatformApi } from "@/lib/platformAdminApi";
import { PlatformAdminErrorView } from "@/components/platform-admin/PlatformAdminErrorView";
import { useDialog } from "@/context/DialogContext";
import { PlatformAdminCompanyDetailSkeleton } from "@/components/platform-admin/PlatformAdminSkeleton";

// Dynamically import MapLocation to avoid SSR issues
const MapLocation = dynamic(() => import("@/components/MapLocation"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#F4F6F5] text-gray-400 gap-2">
      <Loader2 className="w-6 h-6 animate-spin text-[#356E3B]" />
      <span className="text-[12px] font-medium text-gray-500">Menyiapkan peta...</span>
    </div>
  ),
});

interface CompanyDetailData {
  id: string;
  name: string;
  address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  phone: string | null;
  join_code: string | null;
  avatar_company_url: string | null;
  work_days: string[] | null;
  work_start_time: string | null;
  work_end_time: string | null;
  created_at: string;
  updated_at: string | null;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_avatar: string | null;
  stats: {
    active_members: number;
    admin_count: number;
    owner_count: number;
    total_attendances: number;
    total_tasks: number;
    completed_tasks: number;
    total_agendas: number;
    total_leaves: number;
    approved_leaves: number;
    pending_leaves: number;
    rejected_leaves: number;
    total_news: number;
    last_attendance_activity: string | null;
    task_completion_rate: number;
    leave_approval_rate: number;
  };
}

interface CompanyAnalyticsData {
  attendance: {
    total: number;
    on_time: number;
    late: number;
    wfo_count: number;
    wfh_count: number;
    active_attendees: number;
    on_time_rate: number;
    trend: Array<{
      date: string;
      display_date: string;
      total: number;
      on_time: number;
      late: number;
    }>;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    personal_tasks: number;
    company_tasks: number;
    completion_rate: number;
  };
  agendas: {
    total: number;
    upcoming: number;
    past: number;
    company_type: number;
    personal_type: number;
  };
  leaves: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    approval_rate: number;
    categories: Array<{
      category_name: string;
      count: number;
    }>;
  };
  news: {
    total: number;
  };
}

interface CompanyMemberItem {
  membership_id: string;
  profile_id: string;
  role: string;
  status: string;
  joined_at: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  is_developer: boolean;
  total_attendances: number;
  on_time_attendances: number;
  late_attendances: number;
  on_time_rate: number;
  last_attendance: string | null;
  total_tasks: number;
  completed_tasks: number;
  task_completion_rate: number;
  total_leaves: number;
}

interface MemberPerformanceDetail {
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    is_developer: boolean;
    role: string;
    status: string;
    joined_at: string;
  };
  attendance: {
    total: number;
    on_time: number;
    late: number;
    on_time_rate: number;
    wfo_count: number;
    wfh_count: number;
    last_attendance: string | null;
    recent: Array<{
      id: string;
      check_in_time: string;
      check_out_time: string | null;
      work_mode: string;
      check_in_address: string | null;
      status: "on_time" | "late";
    }>;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completion_rate: number;
    recent: Array<{
      id: string;
      title: string;
      deadline: string | null;
      is_completed: boolean;
      created_at: string;
      type: string;
    }>;
  };
  leaves: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    recent: Array<{
      id: string;
      start_date: string;
      end_date: string;
      description: string | null;
      status: string;
      created_at: string;
      category_name: string;
    }>;
  };
}

interface ActivityItem {
  type: "ATTENDANCE" | "TASK" | "LEAVE";
  id: string;
  user_name: string | null;
  user_email: string;
  user_avatar: string | null;
  description: string;
  timestamp: string;
}

type TabType = "analytics" | "members" | "office" | "activities";

export default function PlatformCompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.id as string;
  const { showAlert } = useDialog();

  const [activeTab, setActiveTab] = useState<TabType>("analytics");
  const [copiedCode, setCopiedCode] = useState(false);

  // Data states
  const [company, setCompany] = useState<CompanyDetailData | null>(null);
  const [analytics, setAnalytics] = useState<CompanyAnalyticsData | null>(null);
  const [members, setMembers] = useState<CompanyMemberItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Loading states
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Members filters
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("all");

  // Selected member for modal performance
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberPerformance, setMemberPerformance] = useState<MemberPerformanceDetail | null>(null);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);

  // 1. Fetch Company Profile
  const loadCompanyDetail = useCallback(async () => {
    if (!companyId) return;
    setIsLoadingCompany(true);
    try {
      const res = await fetchPlatformApi<CompanyDetailData>(`companies/${companyId}`);
      if (res.success && res.data) {
        setCompany(res.data);
      } else {
        setCompany(null);
      }
    } catch (e) {
      console.error("Gagal memuat detail perusahaan:", e);
      setCompany(null);
    } finally {
      setIsLoadingCompany(false);
    }
  }, [companyId]);

  // 2. Fetch Feature Performance Analytics
  const loadAnalytics = useCallback(async () => {
    if (!companyId) return;
    setIsLoadingAnalytics(true);
    try {
      const res = await fetchPlatformApi<CompanyAnalyticsData>(`companies/${companyId}/analytics`);
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (e) {
      console.error("Gagal memuat analitik perusahaan:", e);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [companyId]);

  // 3. Fetch Members List
  const loadMembers = useCallback(async () => {
    if (!companyId) return;
    setIsLoadingMembers(true);
    try {
      const q = new URLSearchParams();
      if (memberSearch) q.append("search", memberSearch);
      if (memberRoleFilter && memberRoleFilter !== "all") q.append("role", memberRoleFilter);

      const res = await fetchPlatformApi<CompanyMemberItem[]>(`companies/${companyId}/members?${q.toString()}`);
      if (res.success && res.data) {
        setMembers(res.data);
      }
    } catch (e) {
      console.error("Gagal memuat daftar karyawan:", e);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [companyId, memberSearch, memberRoleFilter]);

  // 4. Fetch Activities Feed
  const loadActivities = useCallback(async () => {
    if (!companyId) return;
    setIsLoadingActivities(true);
    try {
      const res = await fetchPlatformApi<ActivityItem[]>(`companies/${companyId}/activities`);
      if (res.success && res.data) {
        setActivities(res.data);
      }
    } catch (e) {
      console.error("Gagal memuat aktivitas perusahaan:", e);
    } finally {
      setIsLoadingActivities(false);
    }
  }, [companyId]);

  // Initial load
  useEffect(() => {
    loadCompanyDetail();
  }, [loadCompanyDetail]);

  // Tab switch fetcher
  useEffect(() => {
    if (activeTab === "analytics" && !analytics) {
      loadAnalytics();
    } else if (activeTab === "members") {
      loadMembers();
    } else if (activeTab === "activities" && activities.length === 0) {
      loadActivities();
    }
  }, [activeTab, analytics, activities.length, loadAnalytics, loadMembers, loadActivities]);

  // Debounced member search
  useEffect(() => {
    if (activeTab === "members") {
      const handler = setTimeout(() => {
        loadMembers();
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [memberSearch, memberRoleFilter, activeTab, loadMembers]);

  // 5. Fetch Single Member Performance
  const handleOpenMemberPerformance = async (memberId: string) => {
    setSelectedMemberId(memberId);
    setMemberPerformance(null);
    setIsLoadingPerformance(true);
    try {
      const res = await fetchPlatformApi<MemberPerformanceDetail>(
        `companies/${companyId}/members/${memberId}/performance`
      );
      if (res.success && res.data) {
        setMemberPerformance(res.data);
      } else {
        await showAlert({
  title: "Error",
  message: res.message || "Gagal memuat analitik karyawan",
  type: "error",
  icon: "alert",
});
        setSelectedMemberId(null);
      }
    } catch (e) {
      console.error("Gagal memuat analitik karyawan:", e);
      setSelectedMemberId(null);
    } finally {
      setIsLoadingPerformance(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getRoleBadge = (role: string) => {
    const r = role?.toLowerCase();
    if (r === "owner") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          <ShieldCheck className="w-3 h-3 text-amber-600" />
          Owner
        </span>
      );
    }
    if (r === "admin") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          <UserCheck className="w-3 h-3 text-emerald-600" />
          Admin
        </span>
      );
    }
    if (r === "manager") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
          <Briefcase className="w-3 h-3 text-blue-600" />
          Manager
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
        <User className="w-3 h-3 text-gray-500" />
        Member
      </span>
    );
  };

  if (isLoadingCompany && !company) {
    return <PlatformAdminCompanyDetailSkeleton />;
  }

  if (!company) {
    return (
      <PlatformAdminErrorView
        type="404"
        title="Perusahaan Tidak Ditemukan"
        description="Data perusahaan dengan ID tersebut tidak terdaftar di direktori platform AbsenIn atau telah dihapus."
        showBackToMainApp={false}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 select-none animate-in fade-in duration-300 pb-16">
      {/* Top Back Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/platform-admin/companies"
          className="inline-flex items-center gap-2 text-[13px] font-bold text-gray-600 hover:text-[#1E3F2B] transition-colors group cursor-pointer"
        >
          <div className="p-1.5 rounded-lg bg-white border border-[#DCE9DF] group-hover:border-[#356E3B] transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600 group-hover:text-[#1E3F2B]" />
          </div>
          <span>Kembali ke Direktori Perusahaan</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadCompanyDetail();
              if (activeTab === "analytics") loadAnalytics();
              if (activeTab === "members") loadMembers();
              if (activeTab === "activities") loadActivities();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] bg-white border border-[#DCE9DF] text-[12px] font-bold text-[#1E3F2B] hover:bg-[#EEF5F0] transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* 1. Header Informasi Umum Perusahaan */}
      <div className="bg-white border border-[#E8F0EA] rounded-[28px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col gap-6 relative overflow-hidden">
        {/* Subtle background gradient flare */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-[#EEF5F0] via-transparent to-transparent opacity-70 pointer-events-none -mr-16 -mt-16" />

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
          {/* Company Brand & Essential Details */}
          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[22px] bg-[#EEF5F0] text-[#1E4738] flex items-center justify-center font-black text-2xl sm:text-3xl shrink-0 overflow-hidden border border-[#DCE9DF] shadow-sm">
              {company.avatar_company_url ? (
                <img
                  src={company.avatar_company_url}
                  alt={company.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                company.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="flex flex-col min-w-0 gap-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[22px] sm:text-[26px] font-black text-[#111827] tracking-tight leading-tight">
                  {company.name}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Terdaftar
                </span>
              </div>

              {/* Company Code & Address */}
              <div className="flex items-center gap-2 flex-wrap text-[13px] text-gray-500">
                {company.join_code && (
                  <div className="inline-flex items-center gap-1.5 bg-[#EEF5F0] border border-[#DCE9DF] px-2.5 py-0.5 rounded-lg font-mono text-[12px] font-bold text-[#1E3F2B]">
                    <span>KODE: {company.join_code}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(company.join_code!)}
                      className="text-gray-400 hover:text-[#1E3F2B] transition-colors cursor-pointer"
                      title="Salin Kode Gabung"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {company.phone && (
                  <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {company.phone}
                  </span>
                )}

                <span className="inline-flex items-center gap-1 text-gray-600 font-medium truncate max-w-sm">
                  <MapPin className="w-3.5 h-3.5 text-[#356E3B] shrink-0" />
                  {company.address || "Alamat kantor belum diatur"}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[12px] text-gray-400 font-medium mt-1">
                <span>Dibuat: {formatDate(company.created_at)}</span>
                <span>•</span>
                <span>
                  Jam Kerja: {company.work_start_time?.substring(0, 5) || "08:00"} - {company.work_end_time?.substring(0, 5) || "17:00"} WIB
                </span>
              </div>
            </div>
          </div>

          {/* Founder / Owner Info Card */}
          <div className="bg-[#F9FBFA] border border-[#E8F0EA] rounded-[20px] p-4 flex items-center gap-3.5 shrink-0 sm:min-w-[280px]">
            <div className="w-11 h-11 rounded-full bg-[#1E3F2B] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-2xs">
              {company.owner_avatar ? (
                <img
                  src={company.owner_avatar}
                  alt={company.owner_name || "Owner"}
                  className="w-full h-full object-cover"
                />
              ) : (
                company.owner_name?.charAt(0)?.toUpperCase() || "O"
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Founder / Owner
              </span>
              <span className="font-bold text-[13.5px] text-gray-900 truncate">
                {company.owner_name || "Belum ada nama"}
              </span>
              <span className="text-[11.5px] text-gray-500 truncate">
                {company.owner_email || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* High-Level KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-gray-100">
          {/* 1. Karyawan */}
          <div className="bg-[#F9FBFA] border border-[#E8F0EA] rounded-[18px] p-3.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold">
              <Users className="w-3.5 h-3.5 text-[#356E3B]" />
              <span>Anggota Aktif</span>
            </div>
            <span className="text-[20px] font-black text-gray-900">
              {company.stats.active_members}
            </span>
            <span className="text-[10.5px] text-gray-400">
              {company.stats.admin_count} Admin • {company.stats.owner_count} Owner
            </span>
          </div>

          {/* 2. Presensi */}
          <div className="bg-[#F9FBFA] border border-[#E8F0EA] rounded-[18px] p-3.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Presensi Total</span>
            </div>
            <span className="text-[20px] font-black text-gray-900">
              {company.stats.total_attendances}
            </span>
            <span className="text-[10.5px] text-emerald-700 font-semibold">
              {company.stats.last_attendance_activity ? "Ada Aktivitas" : "Belum Absen"}
            </span>
          </div>

          {/* 3. Tugas */}
          <div className="bg-[#F9FBFA] border border-[#E8F0EA] rounded-[18px] p-3.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>Tugas Selesai</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-black text-gray-900">
                {company.stats.completed_tasks}
              </span>
              <span className="text-[12px] text-gray-400">/ {company.stats.total_tasks}</span>
            </div>
            <span className="text-[10.5px] text-blue-700 font-semibold">
              {company.stats.task_completion_rate}% Selesai
            </span>
          </div>

          {/* 4. Agenda */}
          <div className="bg-[#F9FBFA] border border-[#E8F0EA] rounded-[18px] p-3.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span>Agenda Kantor</span>
            </div>
            <span className="text-[20px] font-black text-gray-900">
              {company.stats.total_agendas}
            </span>
            <span className="text-[10.5px] text-gray-400">Jadwal Acara & Meeting</span>
          </div>

          {/* 5. Izin */}
          <div className="bg-[#F9FBFA] border border-[#E8F0EA] rounded-[18px] p-3.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>Pengajuan Izin</span>
            </div>
            <span className="text-[20px] font-black text-gray-900">
              {company.stats.total_leaves}
            </span>
            <span className="text-[10.5px] text-amber-700 font-semibold">
              {company.stats.approved_leaves} Disetujui ({company.stats.leave_approval_rate}%)
            </span>
          </div>

          {/* 6. Berita */}
          <div className="bg-[#F9FBFA] border border-[#E8F0EA] rounded-[18px] p-3.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kabar / Berita</span>
            </div>
            <span className="text-[20px] font-black text-gray-900">
              {company.stats.total_news}
            </span>
            <span className="text-[10.5px] text-gray-400">Pengumuman Internal</span>
          </div>
        </div>
      </div>

      {/* 2. Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-[#E8F0EA] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "analytics"
              ? "bg-[#1E3F2B] text-white shadow-sm"
              : "bg-white text-gray-600 hover:bg-[#EEF5F0] hover:text-[#1E3F2B] border border-[#DCE9DF]"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analitik Performa Fitur</span>
        </button>

        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "members"
              ? "bg-[#1E3F2B] text-white shadow-sm"
              : "bg-white text-gray-600 hover:bg-[#EEF5F0] hover:text-[#1E3F2B] border border-[#DCE9DF]"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Karyawan & Performa</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${
            activeTab === "members" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
          }`}>
            {company.stats.active_members}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("office")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "office"
              ? "bg-[#1E3F2B] text-white shadow-sm"
              : "bg-white text-gray-600 hover:bg-[#EEF5F0] hover:text-[#1E3F2B] border border-[#DCE9DF]"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Informasi Kantor & Jam Kerja</span>
        </button>

        <button
          onClick={() => setActiveTab("activities")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "activities"
              ? "bg-[#1E3F2B] text-white shadow-sm"
              : "bg-white text-gray-600 hover:bg-[#EEF5F0] hover:text-[#1E3F2B] border border-[#DCE9DF]"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Log Aktivitas Terkini</span>
        </button>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: ANALITIK PERFORMA FITUR */}
      {activeTab === "analytics" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {isLoadingAnalytics && !analytics ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3 bg-white rounded-[24px] border border-[#E8F0EA]">
              <Loader2 className="w-7 h-7 animate-spin text-[#356E3B]" />
              <span className="text-[13px] font-semibold text-gray-500">Mengkalkulasi analitik fitur perusahaan...</span>
            </div>
          ) : !analytics ? (
            <div className="p-8 text-center bg-white rounded-[24px] border border-[#E8F0EA] text-gray-500">
              Data analitik belum tersedia.
            </div>
          ) : (
            <>
              {/* Presensi Breakdown & Trend Card */}
              <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-2xs flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[17px] text-gray-900 leading-tight">
                        Performa Fitur Presensi
                      </h3>
                      <p className="text-[12px] text-gray-400">
                        Tingkat ketepatan waktu dan distribusi mode kerja karyawan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                      Target Jam Masuk: <span className="text-gray-900 font-mono">{company.work_start_time?.substring(0, 5) || "08:00"} WIB</span>
                    </span>
                  </div>
                </div>

                {/* Metrics 4-Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-[18px] bg-emerald-50/50 border border-emerald-100/80 flex flex-col gap-1">
                    <span className="text-[11.5px] font-bold text-emerald-700">Tepat Waktu (On-Time)</span>
                    <span className="text-[24px] font-black text-emerald-950">{analytics.attendance.on_time}</span>
                    <span className="text-[11px] text-emerald-700 font-semibold">{analytics.attendance.on_time_rate}% dari total kehadiran</span>
                  </div>

                  <div className="p-4 rounded-[18px] bg-rose-50/50 border border-rose-100/80 flex flex-col gap-1">
                    <span className="text-[11.5px] font-bold text-rose-700">Terlambat (Late)</span>
                    <span className="text-[24px] font-black text-rose-950">{analytics.attendance.late}</span>
                    <span className="text-[11px] text-rose-700 font-semibold">
                      {analytics.attendance.total > 0
                        ? Math.round((analytics.attendance.late / analytics.attendance.total) * 100)
                        : 0}% keterlambatan
                    </span>
                  </div>

                  <div className="p-4 rounded-[18px] bg-blue-50/50 border border-blue-100/80 flex flex-col gap-1">
                    <span className="text-[11.5px] font-bold text-blue-700">WFO (Di Kantor)</span>
                    <span className="text-[24px] font-black text-blue-950">{analytics.attendance.wfo_count}</span>
                    <span className="text-[11px] text-blue-700 font-semibold">Presensi fisik di lokasi</span>
                  </div>

                  <div className="p-4 rounded-[18px] bg-purple-50/50 border border-purple-100/80 flex flex-col gap-1">
                    <span className="text-[11.5px] font-bold text-purple-700">WFH (Remote)</span>
                    <span className="text-[24px] font-black text-purple-950">{analytics.attendance.wfh_count}</span>
                    <span className="text-[11px] text-purple-700 font-semibold">Presensi jarak jauh</span>
                  </div>
                </div>

                {/* 14-Day Attendance Trend Visualizer */}
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between text-[12px] font-bold text-gray-700">
                    <span>Tren Kehadiran Harian (14 Hari Terakhir)</span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        Tepat Waktu
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                        Terlambat
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 pt-3">
                    {analytics.attendance.trend.map((t, idx) => {
                      const totalDay = t.total;
                      const onTimeH = totalDay > 0 ? (t.on_time / totalDay) * 100 : 0;
                      const lateH = totalDay > 0 ? (t.late / totalDay) * 100 : 0;

                      return (
                        <div key={idx} className="flex flex-col items-center gap-1.5 group relative">
                          <div className="w-full h-24 bg-gray-50 rounded-xl flex flex-col justify-end p-1 overflow-hidden border border-gray-100 group-hover:border-[#356E3B] transition-all">
                            {totalDay === 0 ? (
                              <div className="w-full h-1 bg-gray-200 rounded-full my-auto" />
                            ) : (
                              <div className="w-full flex flex-col gap-0.5" style={{ height: `${Math.min(100, Math.max(25, totalDay * 15))}%` }}>
                                <div
                                  className="w-full bg-emerald-500 rounded-t-sm"
                                  style={{ height: `${onTimeH}%` }}
                                  title={`Tepat Waktu: ${t.on_time}`}
                                />
                                {t.late > 0 && (
                                  <div
                                    className="w-full bg-rose-400 rounded-b-sm"
                                    style={{ height: `${lateH}%` }}
                                    title={`Terlambat: ${t.late}`}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 truncate max-w-full">
                            {t.display_date?.split(" ")[1] || t.date.slice(8)}
                          </span>

                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col bg-gray-900 text-white text-[10.5px] p-2 rounded-lg shadow-lg z-20 pointer-events-none whitespace-nowrap">
                            <span className="font-bold">{t.display_date || t.date}</span>
                            <span>Total Hadir: {t.total}</span>
                            <span className="text-emerald-400">Tepat Waktu: {t.on_time}</span>
                            <span className="text-rose-300">Terlambat: {t.late}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2-Columns Grid: Tasks & Leaves */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tasks Performance Card */}
                <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-2xs flex flex-col gap-4">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[16px] text-gray-900">Performa Manajemen Tugas</h4>
                      <p className="text-[11.5px] text-gray-400">Tingkat penyelesaian dan beban tugas</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[12px] font-bold">
                      <span className="text-gray-600">Tingkat Penyelesaian</span>
                      <span className="text-blue-700">{analytics.tasks.completion_rate}% Selesai</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${analytics.tasks.completion_rate}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
                      <span className="text-[11px] font-bold text-gray-400">Selesai</span>
                      <span className="text-[18px] font-black text-emerald-700">{analytics.tasks.completed}</span>
                    </div>
                    <div className="p-3 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
                      <span className="text-[11px] font-bold text-gray-400">Sedang Proses</span>
                      <span className="text-[18px] font-black text-amber-700">{analytics.tasks.pending}</span>
                    </div>
                    <div className="p-3 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
                      <span className="text-[11px] font-bold text-gray-400">Overdue (Lewat)</span>
                      <span className="text-[18px] font-black text-rose-700">{analytics.tasks.overdue}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-gray-500 pt-2 border-t border-gray-50">
                    <span>Tugas Perusahaan: <b className="text-gray-900">{analytics.tasks.company_tasks}</b></span>
                    <span>Tugas Pribadi: <b className="text-gray-900">{analytics.tasks.personal_tasks}</b></span>
                  </div>
                </div>

                {/* Leaves & Agendas Card */}
                <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-2xs flex flex-col gap-4">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[16px] text-gray-900">Performa Izin & Cuti</h4>
                      <p className="text-[11.5px] text-gray-400">Tingkat persetujuan dan kategori pengajuan</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-[16px] bg-emerald-50/60 border border-emerald-100 flex flex-col">
                      <span className="text-[11px] font-bold text-emerald-800">Disetujui</span>
                      <span className="text-[18px] font-black text-emerald-950">{analytics.leaves.approved}</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">{analytics.leaves.approval_rate}% Approval</span>
                    </div>
                    <div className="p-3 rounded-[16px] bg-amber-50/60 border border-amber-100 flex flex-col">
                      <span className="text-[11px] font-bold text-amber-800">Menunggu</span>
                      <span className="text-[18px] font-black text-amber-950">{analytics.leaves.pending}</span>
                      <span className="text-[10px] text-amber-700">Perlu Review</span>
                    </div>
                    <div className="p-3 rounded-[16px] bg-rose-50/60 border border-rose-100 flex flex-col">
                      <span className="text-[11px] font-bold text-rose-800">Ditolak</span>
                      <span className="text-[18px] font-black text-rose-950">{analytics.leaves.rejected}</span>
                      <span className="text-[10px] text-rose-700">Dibatalkan</span>
                    </div>
                  </div>

                  {/* Leave Categories Chips */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[11.5px] font-bold text-gray-500">Distribusi Kategori Izin:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {analytics.leaves.categories?.length > 0 ? (
                        analytics.leaves.categories.map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-[11px] font-bold text-gray-700"
                          >
                            <span>{c.category_name}</span>
                            <span className="w-4 h-4 rounded-full bg-white text-gray-900 flex items-center justify-center text-[10px] shadow-2xs">
                              {c.count}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[12px] text-gray-400 italic">Belum ada pengajuan izin</span>
                      )}
                    </div>
                  </div>

                  {/* Agenda Snapshot */}
                  <div className="flex items-center justify-between text-[12px] text-gray-500 pt-3 border-t border-gray-100">
                    <span className="flex items-center gap-1 font-semibold text-purple-800">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      Agenda Mendatang: {analytics.agendas.upcoming}
                    </span>
                    <span>Total Selesai: {analytics.agendas.past}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: DAFTAR KARYAWAN & PERFORMA */}
      {activeTab === "members" && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Search & Filter Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#356E3B]" />
              <h3 className="font-extrabold text-[18px] text-gray-900">
                Karyawan Perusahaan ({members.length})
              </h3>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Cari nama / email..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#DCE9DF] rounded-xl text-[12.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#356E3B]/20 focus:border-[#356E3B] shadow-2xs"
                />
              </div>

              {/* Role Filter */}
              <select
                value={memberRoleFilter}
                onChange={(e) => setMemberRoleFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-[#DCE9DF] rounded-xl text-[12.5px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#356E3B]/20 shadow-2xs cursor-pointer"
              >
                <option value="all">Semua Peran</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Member</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-[#E8F0EA] rounded-[24px] shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-[#F9FBFA] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="py-3.5 pl-6">Karyawan</th>
                    <th className="py-3.5 px-4">Peran</th>
                    <th className="py-3.5 px-4 text-center">Presensi Hadir</th>
                    <th className="py-3.5 px-4 text-center">Ketepatan Waktu</th>
                    <th className="py-3.5 px-4 text-center">Tugas Selesai</th>
                    <th className="py-3.5 px-4 text-center">Total Izin</th>
                    <th className="py-3.5 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-[13px]">
                  {isLoadingMembers ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        Memuat daftar karyawan dan performa...
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        Tidak ditemukan karyawan yang sesuai dengan kriteria
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr
                        key={m.membership_id}
                        className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                        onClick={() => handleOpenMemberPerformance(m.profile_id)}
                      >
                        {/* Member Identity */}
                        <td className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#1E3F2B] text-white flex items-center justify-center font-bold text-[13px] shrink-0 overflow-hidden shadow-2xs">
                              {m.avatar_url ? (
                                <img
                                  src={m.avatar_url}
                                  alt={m.full_name || "Karyawan"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                m.full_name?.charAt(0)?.toUpperCase() || "K"
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-900 group-hover:text-[#1E3F2B] transition-colors truncate max-w-xs">
                                  {m.full_name || "Tanpa Nama"}
                                </span>
                                {m.is_developer && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    Dev
                                  </span>
                                )}
                              </div>
                              <span className="text-[11.5px] text-gray-400 truncate max-w-xs">
                                {m.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-4 px-4">{getRoleBadge(m.role)}</td>

                        {/* Total Attendance */}
                        <td className="py-4 px-4 text-center font-bold text-gray-800">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] bg-emerald-50 text-emerald-800 border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {m.total_attendances}
                          </span>
                        </td>

                        {/* On-Time Rate */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold ${
                            m.on_time_rate >= 80
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : m.on_time_rate >= 50
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}>
                            {m.on_time_rate}% Tepat
                          </span>
                        </td>

                        {/* Tasks Completed */}
                        <td className="py-4 px-4 text-center">
                          <span className="text-[12.5px] font-bold text-gray-800">
                            {m.completed_tasks} / {m.total_tasks}
                          </span>
                        </td>

                        {/* Leaves */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-600">
                            {m.total_leaves} kali
                          </span>
                        </td>

                        {/* Action Button */}
                        <td className="py-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenMemberPerformance(m.profile_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-white border border-[#DCE9DF] hover:bg-[#EEF5F0] text-[#1E3F2B] text-[12px] font-bold transition-all shadow-2xs hover:shadow-sm cursor-pointer"
                          >
                            <BarChart3 className="w-3.5 h-3.5 text-[#356E3B]" />
                            <span>Performa</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INFORMASI KANTOR & JAM KERJA */}
      {activeTab === "office" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
          {/* Office Details Card */}
          <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-2xs flex flex-col gap-5">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF5F0] text-[#1E4738] flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-[17px] text-gray-900 leading-tight">
                  Jam Kerja & Hari Operasional
                </h3>
                <p className="text-[12px] text-gray-400">Aturan jam kerja resmi perusahaan</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3.5 bg-[#F9FBFA] border border-gray-100 rounded-[18px]">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#356E3B]" />
                  <span className="text-[13px] font-bold text-gray-700">Jam Masuk & Pulang:</span>
                </div>
                <span className="text-[13.5px] font-mono font-bold text-[#1E3F2B] bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-2xs">
                  {company.work_start_time?.substring(0, 5) || "08:00"} - {company.work_end_time?.substring(0, 5) || "17:00"} WIB
                </span>
              </div>

              <div className="flex flex-col gap-2 p-3.5 bg-[#F9FBFA] border border-gray-100 rounded-[18px]">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#356E3B]" />
                  <span className="text-[13px] font-bold text-gray-700">Hari Kerja Operasional:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {company.work_days && company.work_days.length > 0 ? (
                    company.work_days.map((day, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-white border border-[#DCE9DF] text-[11.5px] font-bold text-[#1E3F2B]"
                      >
                        {day}
                      </span>
                    ))
                  ) : (
                    <span className="text-[12px] text-gray-400 italic">Senin s/d Jumat (Standar)</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 p-3.5 bg-[#F9FBFA] border border-gray-100 rounded-[18px]">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#356E3B]" />
                  <span className="text-[13px] font-bold text-gray-700">Alamat Lengkap Kantor:</span>
                </div>
                <p className="text-[13px] text-gray-800 leading-relaxed font-medium">
                  {company.address || "Belum ada alamat kantor yang disimpan."}
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#F9FBFA] border border-gray-100 rounded-[18px]">
                <span className="text-[12.5px] font-bold text-gray-600">Koordinat Titik Presensi:</span>
                <span className="font-mono text-[12.5px] text-gray-800 font-semibold">
                  {company.latitude || "-"}, {company.longitude || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Map Preview Card */}
          <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-[#356E3B]" />
                <h3 className="font-extrabold text-[17px] text-gray-900 leading-tight">
                  Lokasi Presensi GPS
                </h3>
              </div>

              {company.latitude && company.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${company.latitude},${company.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-[11.5px] font-bold border border-gray-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                  <span>Buka Google Maps</span>
                </a>
              )}
            </div>

            <div className="w-full h-[280px] rounded-[20px] overflow-hidden border border-gray-200 relative shadow-inner">
              {company.latitude && company.longitude ? (
                <MapLocation
                  center={[parseFloat(String(company.latitude)), parseFloat(String(company.longitude))]}
                  label={company.name}
                  showControls={true}
                  showRadius={true}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#F9FBFA] text-gray-400 gap-2">
                  <MapPin className="w-8 h-8 text-gray-300" />
                  <span className="text-[12.5px] font-medium">Titik koordinat GPS kantor belum ditentukan</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LOG AKTIVITAS TERKINI */}
      {activeTab === "activities" && (
        <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-2xs flex flex-col gap-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#1E3F2B] flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#356E3B]" />
              </div>
              <div>
                <h3 className="font-extrabold text-[17px] text-gray-900">Log Aktivitas Terbaru di Perusahaan</h3>
                <p className="text-[12px] text-gray-400">Linimasa interaksi anggota, kehadiran, tugas, dan izin</p>
              </div>
            </div>

            <button
              onClick={loadActivities}
              disabled={isLoadingActivities}
              className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors"
              title="Segarkan Linimasa"
            >
              <RotateCw className={`w-4 h-4 ${isLoadingActivities ? "animate-spin" : ""}`} />
            </button>
          </div>

          {isLoadingActivities && activities.length === 0 ? (
            <div className="py-12 text-center text-gray-400">Memuat log aktivitas...</div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-gray-400">Belum ada aktivitas tercatat di perusahaan ini.</div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {activities.map((act) => {
                const isAtt = act.type === "ATTENDANCE";
                const isTask = act.type === "TASK";
                const isLeave = act.type === "LEAVE";

                return (
                  <div key={act.id + act.timestamp} className="py-3.5 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs mt-0.5">
                      {act.user_avatar ? (
                        <img src={act.user_avatar} alt={act.user_name || "User"} className="w-full h-full object-cover" />
                      ) : (
                        act.user_name?.charAt(0)?.toUpperCase() || "U"
                      )}
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[13px] text-gray-900">{act.user_name || act.user_email}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isAtt
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : isTask
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}>
                          {act.type}
                        </span>
                      </div>
                      <span className="text-[12.5px] text-gray-700 mt-0.5">{act.description}</span>
                    </div>

                    <span className="text-[11.5px] text-gray-400 font-medium shrink-0 pt-0.5">
                      {formatDateTime(act.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. MODAL PERFORMA KARYAWAN SPESIFIK */}
      {selectedMemberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] border border-[#E8F0EA] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#F9FBFA]">
              {isLoadingPerformance || !memberPerformance ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex flex-col gap-1.5">
                    <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="w-24 h-3 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-[#1E3F2B] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0 overflow-hidden">
                    {memberPerformance.profile.avatar_url ? (
                      <img
                        src={memberPerformance.profile.avatar_url}
                        alt={memberPerformance.profile.full_name || "Karyawan"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      memberPerformance.profile.full_name?.charAt(0)?.toUpperCase() || "K"
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-[17px] text-gray-900 leading-tight">
                        {memberPerformance.profile.full_name || "Tanpa Nama"}
                      </h3>
                      {getRoleBadge(memberPerformance.profile.role)}
                    </div>
                    <span className="text-[12px] text-gray-400">
                      {memberPerformance.profile.email} • Bergabung: {formatDate(memberPerformance.profile.joined_at)}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedMemberId(null);
                  setMemberPerformance(null);
                }}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {isLoadingPerformance || !memberPerformance ? (
                <div className="flex flex-col items-center justify-center p-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#356E3B]" />
                  <span className="text-[13px] font-semibold text-gray-500">Mengkalkulasi metrik performa karyawan...</span>
                </div>
              ) : (
                <>
                  {/* KPI Performa Ringkasan Karyawan */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-[18px] bg-emerald-50/70 border border-emerald-100 flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-emerald-800">Ketepatan Hadir</span>
                      <span className="text-[20px] font-black text-emerald-950">
                        {memberPerformance.attendance.on_time_rate}%
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        {memberPerformance.attendance.on_time} tepat • {memberPerformance.attendance.late} telat
                      </span>
                    </div>

                    <div className="p-3.5 rounded-[18px] bg-blue-50/70 border border-blue-100 flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-blue-800">Penyelesaian Tugas</span>
                      <span className="text-[20px] font-black text-blue-950">
                        {memberPerformance.tasks.completion_rate}%
                      </span>
                      <span className="text-[10px] text-blue-700 font-semibold">
                        {memberPerformance.tasks.completed} dari {memberPerformance.tasks.total} tugas
                      </span>
                    </div>

                    <div className="p-3.5 rounded-[18px] bg-amber-50/70 border border-amber-100 flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-amber-800">Total Izin</span>
                      <span className="text-[20px] font-black text-amber-950">
                        {memberPerformance.leaves.total}
                      </span>
                      <span className="text-[10px] text-amber-700 font-semibold">
                        {memberPerformance.leaves.approved} disetujui
                      </span>
                    </div>

                    <div className="p-3.5 rounded-[18px] bg-purple-50/70 border border-purple-100 flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-purple-800">Mode Kerja</span>
                      <span className="text-[20px] font-black text-purple-950">
                        {memberPerformance.attendance.wfo_count} / {memberPerformance.attendance.wfh_count}
                      </span>
                      <span className="text-[10px] text-purple-700 font-semibold">WFO / WFH</span>
                    </div>
                  </div>

                  {/* Section A: Riwayat Presensi Terakhir */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-bold text-gray-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#356E3B]" />
                        Riwayat Presensi Terbaru
                      </span>
                      <span className="text-[11px] text-gray-400">10 sesi terakhir</span>
                    </div>

                    <div className="bg-[#F9FBFA] border border-gray-100 rounded-[20px] overflow-hidden divide-y divide-gray-100">
                      {memberPerformance.attendance.recent.length === 0 ? (
                        <div className="p-6 text-center text-[12px] text-gray-400">Belum ada riwayat presensi</div>
                      ) : (
                        memberPerformance.attendance.recent.map((att) => (
                          <div key={att.id} className="p-3.5 flex items-center justify-between gap-3 text-[12.5px]">
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-gray-800">
                                {formatDateTime(att.check_in_time)}
                              </span>
                              <span className="text-[11px] text-gray-400 truncate max-w-sm">
                                {att.check_in_address || "Lokasi GPS tercatat"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10.5px] font-bold">
                                {att.work_mode}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                                att.status === "on_time"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}>
                                {att.status === "on_time" ? "Tepat Waktu" : "Terlambat"}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Section B: Tugas Terkait */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-bold text-gray-900 flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        Tugas yang Diberikan ({memberPerformance.tasks.total})
                      </span>
                    </div>

                    <div className="bg-[#F9FBFA] border border-gray-100 rounded-[20px] overflow-hidden divide-y divide-gray-100">
                      {memberPerformance.tasks.recent.length === 0 ? (
                        <div className="p-6 text-center text-[12px] text-gray-400">Tidak ada tugas aktif</div>
                      ) : (
                        memberPerformance.tasks.recent.map((tsk) => (
                          <div key={tsk.id} className="p-3.5 flex items-center justify-between gap-3 text-[12.5px]">
                            <div className="flex flex-col min-w-0">
                              <span className={`font-bold ${tsk.is_completed ? "text-gray-500 line-through" : "text-gray-900"}`}>
                                {tsk.title}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                Deadline: {formatDate(tsk.deadline)}
                              </span>
                            </div>

                            <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shrink-0 ${
                              tsk.is_completed
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}>
                              {tsk.is_completed ? "Selesai" : "Pending"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Section C: Riwayat Izin */}
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[12.5px] font-bold text-gray-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-600" />
                      Riwayat Pengajuan Izin
                    </span>

                    <div className="bg-[#F9FBFA] border border-gray-100 rounded-[20px] overflow-hidden divide-y divide-gray-100">
                      {memberPerformance.leaves.recent.length === 0 ? (
                        <div className="p-6 text-center text-[12px] text-gray-400">Belum pernah mengajukan izin</div>
                      ) : (
                        memberPerformance.leaves.recent.map((lv) => (
                          <div key={lv.id} className="p-3.5 flex items-center justify-between gap-3 text-[12.5px]">
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-gray-900">{lv.category_name}</span>
                              <span className="text-[11px] text-gray-400">
                                {formatDate(lv.start_date)} s/d {formatDate(lv.end_date)} {lv.description ? `• "${lv.description}"` : ""}
                              </span>
                            </div>

                            <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shrink-0 ${
                              lv.status === "Disetujui" || lv.status === "approved"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : lv.status === "Ditolak" || lv.status === "rejected"
                                ? "bg-rose-50 text-rose-800 border border-rose-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}>
                              {lv.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
