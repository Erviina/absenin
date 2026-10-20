"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Clock,
  CheckSquare,
  Calendar,
  FileText,
  Newspaper,
  Bell,
  Building2,
  Users,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  Briefcase,
  Layers,
} from "lucide-react";
import { fetchPlatformApi } from "@/lib/platformAdminApi";
import { DateRangeFilter, PeriodType } from "@/components/platform-admin/DateRangeFilter";

interface FeatureAnalyticsData {
  period: string;
  attendance: {
    total: number;
    wfoCount: number;
    wfhCount: number;
    uniqueUsers: number;
    uniqueCompanies: number;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
    uniqueCreators: number;
  };
  agendas: {
    total: number;
    companyAgendas: number;
    personalAgendas: number;
    uniqueCreators: number;
  };
  leaves: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    uniqueRequesters: number;
  };
  news: {
    totalArticles: number;
  };
  notifications: {
    totalSent: number;
    unreadCount: number;
  };
}

export default function PlatformAdminFeatureAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodType>("30d");
  const [data, setData] = useState<FeatureAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchPlatformApi<FeatureAnalyticsData>(
        `analytics/features?period=${period}`
      );
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error("Gagal memuat data analitik fitur:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  // Aggregate totals
  const totalFeatureEvents = data
    ? data.attendance.total +
      data.tasks.total +
      data.agendas.total +
      data.leaves.total +
      data.news.totalArticles +
      data.notifications.totalSent
    : 0;

  const wfoPercent =
    data && data.attendance.total > 0
      ? Math.round((data.attendance.wfoCount / data.attendance.total) * 100)
      : 0;

  const wfhPercent =
    data && data.attendance.total > 0
      ? Math.round((data.attendance.wfhCount / data.attendance.total) * 100)
      : 0;

  const leaveApprovalRate =
    data && data.leaves.total > 0
      ? Math.round((data.leaves.approved / data.leaves.total) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6 select-none animate-in fade-in duration-300">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#356E3B]" />
          <h2 className="text-[20px] sm:text-[22px] font-black text-[#111827] tracking-tight">
            Analitik Adopsi Fitur
          </h2>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <DateRangeFilter
            selectedPeriod={period}
            onChange={(p) => setPeriod(p)}
            isLoading={isLoading}
          />
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-[16px] bg-white border border-[#DCE9DF] text-[#1E3F2B] hover:bg-[#EEF5F0] transition-colors shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
            title="Muat Ulang"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Top Banner KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
              Total Aktivitas Fitur
            </span>
            <span className="text-[26px] font-black text-[#1E3F2B] mt-1">
              {isLoading ? "..." : totalFeatureEvents.toLocaleString()}
            </span>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              Akumulasi aksi di seluruh modul
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
              Modul Terpopuler
            </span>
            <span className="text-[22px] font-black text-[#356E3B] mt-1">
              {isLoading ? "..." : "Manajemen Tugas"}
            </span>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              {data ? `${data.tasks.total} interaksi tugas aktif` : "-"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32]">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
              Penyelesaian Tugas
            </span>
            <span className="text-[26px] font-black text-[#1E3F2B] mt-1">
              {isLoading ? "..." : `${data?.tasks.completionRate || 0}%`}
            </span>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              {data ? `${data.tasks.completed} dari ${data.tasks.total} selesai` : "-"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Feature Deep Dive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Presensi & Kehadiran */}
        <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
                  <Clock className="w-5 h-5 text-[#356E3B]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[16px] text-gray-900 leading-tight">
                    Presensi & Kehadiran
                  </h3>
                  <span className="text-[12px] text-gray-400">
                    Modul absensi GPS & WFO / WFH
                  </span>
                </div>
              </div>
              <span className="text-[20px] font-black text-[#1E3F2B]">
                {isLoading ? "..." : data?.attendance.total || 0}
              </span>
            </div>

            {/* WFO vs WFH Progress Bar */}
            <div className="mt-2 mb-4">
              <div className="flex items-center justify-between text-[12px] font-bold text-gray-600 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1E3F2B]" />
                  WFO: {data?.attendance.wfoCount || 0} ({wfoPercent}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#86EFAC]" />
                  WFH: {data?.attendance.wfhCount || 0} ({wfhPercent}%)
                </span>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-[#1E3F2B] h-full transition-all duration-500"
                  style={{ width: `${wfoPercent}%` }}
                />
                <div
                  className="bg-[#86EFAC] h-full transition-all duration-500"
                  style={{ width: `${wfhPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 text-[12.5px]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Pengguna Unik:</span>
              <span className="font-bold text-gray-900">
                {isLoading ? "..." : data?.attendance.uniqueUsers || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Tenant Aktif:</span>
              <span className="font-bold text-gray-900">
                {isLoading ? "..." : data?.attendance.uniqueCompanies || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Manajemen Tugas */}
        <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
                  <CheckSquare className="w-5 h-5 text-[#356E3B]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[16px] text-gray-900 leading-tight">
                    Manajemen Tugas Tim
                  </h3>
                  <span className="text-[12px] text-gray-400">
                    Distribusi tugas & tingkat penyelesaian
                  </span>
                </div>
              </div>
              <span className="text-[20px] font-black text-[#1E3F2B]">
                {isLoading ? "..." : data?.tasks.total || 0}
              </span>
            </div>

            {/* Task Completion Bar */}
            <div className="mt-2 mb-4">
              <div className="flex items-center justify-between text-[12px] font-bold text-gray-600 mb-1.5">
                <span className="text-[#356E3B] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Selesai: {data?.tasks.completed || 0}
                </span>
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Tertunda: {data?.tasks.pending || 0}
                </span>
              </div>
              <div className="h-3 w-full bg-amber-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-[#356E3B] h-full transition-all duration-500"
                  style={{ width: `${data?.tasks.completionRate || 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 text-[12.5px]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Tingkat Sukses:</span>
              <span className="font-bold text-[#356E3B]">
                {isLoading ? "..." : `${data?.tasks.completionRate || 0}%`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Pembuat Tugas:</span>
              <span className="font-bold text-gray-900">
                {isLoading ? "..." : data?.tasks.uniqueCreators || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Kalender & Agenda */}
        <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
                  <Calendar className="w-5 h-5 text-[#356E3B]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[16px] text-gray-900 leading-tight">
                    Kalender & Jadwal Agenda
                  </h3>
                  <span className="text-[12px] text-gray-400">
                    Agenda tim perusahaan vs catatan pribadi
                  </span>
                </div>
              </div>
              <span className="text-[20px] font-black text-[#1E3F2B]">
                {isLoading ? "..." : data?.agendas.total || 0}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-2">
              <div className="p-3 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Agenda Perusahaan
                </span>
                <span className="text-[18px] font-extrabold text-[#1E3F2B] mt-1">
                  {isLoading ? "..." : data?.agendas.companyAgendas || 0}
                </span>
                <span className="text-[11px] text-gray-400 mt-0.5">
                  Dipublikasikan ke tim
                </span>
              </div>

              <div className="p-3 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Agenda Pribadi
                </span>
                <span className="text-[18px] font-extrabold text-gray-700 mt-1">
                  {isLoading ? "..." : data?.agendas.personalAgendas || 0}
                </span>
                <span className="text-[11px] text-gray-400 mt-0.5">
                  Catatan jadwal personal
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[12.5px]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Karyawan Membuat Jadwal:</span>
              <span className="font-bold text-gray-900">
                {isLoading ? "..." : data?.agendas.uniqueCreators || 0}
              </span>
            </div>
            <span className="text-[11.5px] text-[#356E3B] font-medium">
              Aktivitas Agenda
            </span>
          </div>
        </div>

        {/* Card 4: Pengajuan Izin & Cuti */}
        <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
                  <FileText className="w-5 h-5 text-[#356E3B]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[16px] text-gray-900 leading-tight">
                    Pengajuan Izin & Cuti
                  </h3>
                  <span className="text-[12px] text-gray-400">
                    Sistem permohonan dispensasi kehadiran
                  </span>
                </div>
              </div>
              <span className="text-[20px] font-black text-[#1E3F2B]">
                {isLoading ? "..." : data?.leaves.total || 0}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 my-2 text-center">
              <div className="p-2.5 rounded-[16px] bg-[#EEF5F0] border border-[#DCE9DF]">
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#1E3F2B]">
                  <CheckCircle2 className="w-3 h-3 text-[#356E3B]" />
                  <span>Disetujui</span>
                </div>
                <div className="text-[16px] font-black text-[#1E3F2B] mt-1">
                  {isLoading ? "..." : data?.leaves.approved || 0}
                </div>
              </div>

              <div className="p-2.5 rounded-[16px] bg-red-50 border border-red-100">
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-red-700">
                  <XCircle className="w-3 h-3 text-red-600" />
                  <span>Ditolak</span>
                </div>
                <div className="text-[16px] font-black text-red-700 mt-1">
                  {isLoading ? "..." : data?.leaves.rejected || 0}
                </div>
              </div>

              <div className="p-2.5 rounded-[16px] bg-amber-50 border border-amber-100">
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-700">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>Menunggu</span>
                </div>
                <div className="text-[16px] font-black text-amber-700 mt-1">
                  {isLoading ? "..." : data?.leaves.pending || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[12.5px]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Pemohon Unik:</span>
              <span className="font-bold text-gray-900">
                {isLoading ? "..." : data?.leaves.uniqueRequesters || 0}
              </span>
            </div>
            <span className="text-[11.5px] font-semibold text-[#356E3B]">
              Tingkat Persetujuan: {leaveApprovalRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Auxiliary Modules: News & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[16px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
              <Newspaper className="w-5 h-5 text-[#356E3B]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-gray-900">
                Berita Perusahaan Terbit
              </span>
              <span className="text-[12px] text-gray-400">
                Artikel internal pengumuman organisasi
              </span>
            </div>
          </div>
          <span className="text-[22px] font-black text-[#1E3F2B]">
            {isLoading ? "..." : data?.news.totalArticles || 0}
          </span>
        </div>

        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[16px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
              <Bell className="w-5 h-5 text-[#356E3B]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-gray-900">
                Notifikasi Terdistribusi
              </span>
              <span className="text-[12px] text-gray-400">
                {isLoading
                  ? "..."
                  : `${data?.notifications.unreadCount || 0} notifikasi belum dibaca pengguna`}
              </span>
            </div>
          </div>
          <span className="text-[22px] font-black text-[#1E3F2B]">
            {isLoading ? "..." : data?.notifications.totalSent || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
