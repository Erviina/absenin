"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Building2,
  Users,
  Activity,
  Calendar,
  RotateCw,
  ArrowUpRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { fetchPlatformApi } from "@/lib/platformAdminApi";
import { DateRangeFilter, PeriodType } from "@/components/platform-admin/DateRangeFilter";
import { GrowthChart, TrendItem } from "@/components/platform-admin/GrowthChart";
import { ActivationFunnel, FunnelStep } from "@/components/platform-admin/ActivationFunnel";

interface GrowthData {
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
  };
  trends: TrendItem[];
  funnel: FunnelStep[];
}

export default function PlatformAdminGrowthAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodType>("30d");
  const [data, setData] = useState<GrowthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadGrowth = async () => {
    setIsLoading(true);
    try {
      const res = await fetchPlatformApi<GrowthData>(
        `analytics/overview?period=${period}`
      );
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error("Gagal memuat analitik pertumbuhan:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGrowth();
  }, [period]);

  const dailyVelocity =
    data && data.trends.length > 0
      ? (
          data.trends.reduce((acc, curr) => acc + curr.users, 0) /
          data.trends.length
        ).toFixed(1)
      : "0";

  return (
    <div className="flex flex-col gap-6 select-none animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#356E3B]" />
            <h2 className="text-[20px] sm:text-[22px] font-black text-[#111827] tracking-tight">
              Analitik Pertumbuhan Platform
            </h2>
          </div>
          <span className="text-[12.5px] text-[#6B7280]">
            Tren akuisisi tenant baru, pertumbuhan basis pengguna, dan kecepatan adopsi presensi
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DateRangeFilter
            selectedPeriod={period}
            onChange={(p) => setPeriod(p)}
            isLoading={isLoading}
          />
          <button
            onClick={loadGrowth}
            disabled={isLoading}
            className="p-2.5 rounded-[16px] bg-white border border-[#DCE9DF] text-[#1E3F2B] hover:bg-[#EEF5F0] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Muat Ulang"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Growth Velocity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
              Pertumbuhan Pengguna Baru
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[26px] font-black text-[#1E3F2B]">
                +{data?.kpi?.newUsers || 0}
              </span>
              <span className="text-[12px] font-bold text-[#356E3B] bg-[#EEF5F0] px-2 py-0.5 rounded-full">
                Periode ini
              </span>
            </div>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              Rata-rata {dailyVelocity} pengguna / hari
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
              Pertumbuhan Organisasi Baru
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[26px] font-black text-[#356E3B]">
                +{data?.kpi?.newCompanies || 0}
              </span>
              <span className="text-[12px] font-bold text-[#356E3B] bg-[#EEF5F0] px-2 py-0.5 rounded-full">
                Tenant
              </span>
            </div>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              Total {data?.kpi?.totalCompanies || 0} tenant aktif terdaftar
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#EEF5F0] flex items-center justify-center text-[#356E3B]">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
              Aktivitas Presensi Terkini
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[26px] font-black text-[#1E3F2B]">
                {data?.kpi?.periodAttendances || 0}
              </span>
              <span className="text-[12px] font-bold text-[#1E3F2B] bg-[#EEF5F0] px-2 py-0.5 rounded-full">
                Presensi
              </span>
            </div>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              Dari {data?.kpi?.totalAttendances || 0} rekaman historis
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32]">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Growth Trajectory Chart */}
      <div className="w-full">
        <GrowthChart
          data={data?.trends || []}
          isLoading={isLoading}
        />
      </div>

      {/* Funnel Section */}
      <div className="w-full">
        <ActivationFunnel
          data={data?.funnel || []}
        />
      </div>
    </div>
  );
}
