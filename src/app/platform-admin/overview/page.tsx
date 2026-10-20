"use client";

import { useEffect, useState } from "react";
import { usePlatformAdmin } from "../layout";
import {
  Building2,
  Users,
  CalendarDays,
  Activity,
  Shield,
  Loader2,
  RotateCw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { fetchPlatformApi } from "@/lib/platformAdminApi";
import { KpiCard } from "@/components/platform-admin/KpiCard";
import { DateRangeFilter, PeriodType } from "@/components/platform-admin/DateRangeFilter";
import { GrowthChart, TrendItem } from "@/components/platform-admin/GrowthChart";
import { ActivationFunnel, FunnelStep } from "@/components/platform-admin/ActivationFunnel";
import { RecentCompaniesTable, CompanySummaryItem } from "@/components/platform-admin/RecentCompaniesTable";
import { RecentActivityList, ActivityItem } from "@/components/platform-admin/RecentActivityList";

interface OverviewData {
  period: PeriodType;
  kpi: {
    totalCompanies: number;
    newCompanies: number;
    totalUsers: number;
    newUsers: number;
    activeCompanies: number;
    activeUsers: number;
    periodAttendances: number;
    totalAttendances: number;
    wfoCount: number;
    wfhCount: number;
  };
  trends: TrendItem[];
  funnel: FunnelStep[];
  recentCompanies: CompanySummaryItem[];
  recentActivity: ActivityItem[];
}

export default function PlatformAdminOverviewPage() {
  const { profile } = usePlatformAdmin();
  const [period, setPeriod] = useState<PeriodType>("30d");
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOverview = async (selectedPeriod: PeriodType, showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetchPlatformApi<OverviewData>(
        `analytics/overview?period=${selectedPeriod}`
      );
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat analitik overview:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview(period);
  }, [period]);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
  };

  const handleManualRefresh = () => {
    fetchOverview(period, true);
  };

  const periodLabelMap: Record<PeriodType, string> = {
    "7d": "7 hari terakhir",
    "30d": "30 hari terakhir",
    "90d": "90 hari terakhir",
    all: "sepanjang waktu",
  };

  const wfoRatio =
    data?.kpi?.periodAttendances && data.kpi.periodAttendances > 0
      ? Math.round((data.kpi.wfoCount / data.kpi.periodAttendances) * 100)
      : 100;

  return (
    <div className="flex flex-col gap-6 select-none animate-in fade-in duration-300">
      {/* Top Controls: Welcome & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-[#356E3B]" />
          <h2 className="text-[20px] sm:text-[22px] font-black text-[#111827] tracking-tight">
            Ringkasan Eksekutif
          </h2>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <DateRangeFilter
            selectedPeriod={period}
            onChange={handlePeriodChange}
            isLoading={isLoading || isRefreshing}
          />

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading || isRefreshing}
            className="p-2.5 rounded-[16px] bg-white border border-[#DCE9DF] text-[#1E3F2B] hover:bg-[#EEF5F0] transition-colors shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
            title="Perbarui Data Terkini"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-gray-100 rounded-[24px] p-6 h-[140px] animate-pulse flex flex-col justify-between"
            >
              <div className="w-24 h-4 bg-gray-200 rounded-full" />
              <div className="w-16 h-8 bg-gray-200 rounded-xl" />
              <div className="w-32 h-4 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Companies */}
          <KpiCard
            title="Total Perusahaan"
            value={data?.kpi?.totalCompanies || 0}
            badge={`+${data?.kpi?.newCompanies || 0} ${periodLabelMap[period]}`}
            badgeColor="emerald"
            icon={Building2}
            iconBgColor="bg-[#EEF5F0]"
            iconColor="text-[#1E4738]"
          />

          {/* Total Users */}
          <KpiCard
            title="Total Pengguna Terdaftar"
            value={data?.kpi?.totalUsers || 0}
            badge={`+${data?.kpi?.newUsers || 0} akun baru`}
            badgeColor="blue"
            icon={Users}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-700"
          />

          {/* Active Companies */}
          <KpiCard
            title="Perusahaan Aktif"
            value={data?.kpi?.activeCompanies || 0}
            subValue={`dari ${data?.kpi?.totalCompanies || 0} total organisasi`}
            badge="Tercatat Aktif"
            badgeColor="purple"
            icon={Activity}
            iconBgColor="bg-purple-50"
            iconColor="text-purple-700"
          />

          {/* Total Attendances */}
          <KpiCard
            title="Aktivitas Presensi"
            value={data?.kpi?.periodAttendances || 0}
            subValue={`Rasio: ${wfoRatio}% WFO, ${100 - wfoRatio}% WFH`}
            badge={`${data?.kpi?.activeUsers || 0} Karyawan Aktif`}
            badgeColor="amber"
            icon={CalendarDays}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-700"
          />
        </div>
      )}

      {/* Row 1: Growth Chart (2/3) + Activation Funnel (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <GrowthChart data={data?.trends || []} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-1">
          <ActivationFunnel data={data?.funnel || []} />
        </div>
      </div>

      {/* Row 2: Recent Companies (1/2) + Recent Live Activity (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <RecentCompaniesTable companies={data?.recentCompanies || []} />
        <RecentActivityList activities={data?.recentActivity || []} />
      </div>
    </div>
  );
}
