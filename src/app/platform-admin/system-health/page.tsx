"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Database,
  Server,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Clock,
  Layers,
  HardDrive,
  Radio,
  FileCheck,
} from "lucide-react";
import { fetchPlatformApi } from "@/lib/platformAdminApi";

interface SystemHealthData {
  status: string;
  uptimeSeconds: number;
  serverTime: string;
  database: {
    status: string;
    provider: string;
    engine: string;
    latencyMs: number;
    tables: {
      companies: number;
      profiles: number;
      attendances: number;
      tasks: number;
      agendas: number;
      leaves: number;
      notifications: number;
    };
  };
  server: {
    status: string;
    nodeVersion: string;
    platform: string;
    environment: string;
    memoryUsage: {
      heapUsedMB: number;
      heapTotalMB: number;
      rssMB: number;
    };
  };
  services: {
    name: string;
    status: string;
    latencyMs?: number;
    provider?: string;
    version?: string;
    mode?: string;
  }[];
}

export default function PlatformAdminSystemHealthPage() {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>("");

  const loadHealth = async () => {
    setIsLoading(true);
    try {
      const res = await fetchPlatformApi<SystemHealthData>("system-health");
      if (res.success && res.data) {
        setData(res.data);
        setLastChecked(new Date().toLocaleTimeString("id-ID"));
      }
    } catch (e) {
      console.error("Gagal memeriksa kesehatan sistem:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}h`);
    if (hours > 0) parts.push(`${hours}j`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}d`);
    return parts.join(" ");
  };

  const getLatencyBadge = (latency: number) => {
    if (latency < 300) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#2E7D32]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse" />
          {latency} ms (Optimal)
        </span>
      );
    }
    if (latency < 1000) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {latency} ms (Sedang)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        {latency} ms (Tinggi)
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#356E3B]" />
          <h2 className="text-[20px] sm:text-[22px] font-black text-[#111827] tracking-tight">
            Kesehatan Sistem
          </h2>
        </div>

        {/* Status Pill & Refresh Button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#EEF5F0] border border-[#DCE9DF] rounded-[16px] text-[#1E3F2B] text-[12px] font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] animate-pulse" />
            <span>Sistem Normal</span>
          </div>

          <button
            onClick={loadHealth}
            disabled={isLoading}
            className="p-2.5 rounded-[16px] bg-white border border-[#DCE9DF] text-[#1E3F2B] hover:bg-[#EEF5F0] transition-colors shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
            title="Muat Ulang Status"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Top Diagnostic KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database Status */}
        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">
              Database Supabase
            </span>
            <div className="w-8 h-8 rounded-[12px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
              <Database className="w-4 h-4 text-[#356E3B]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-black text-gray-900">
                {data?.database.status === "connected" ? "Terhubung" : "Bermasalah"}
              </span>
            </div>
            <div className="mt-1.5">
              {data?.database ? getLatencyBadge(data.database.latencyMs) : "-"}
            </div>
          </div>
        </div>

        {/* Server Runtime */}
        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">
              Runtime Server
            </span>
            <div className="w-8 h-8 rounded-[12px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
              <Server className="w-4 h-4 text-[#356E3B]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-black text-gray-900">
                {data?.server.nodeVersion || "Node.js"}
              </span>
            </div>
            <span className="text-[11.5px] text-gray-500 mt-1 block">
              Waktu Aktif: {data ? formatUptime(data.uptimeSeconds) : "-"}
            </span>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">
              Penggunaan Memori
            </span>
            <div className="w-8 h-8 rounded-[12px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
              <Cpu className="w-4 h-4 text-[#356E3B]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-black text-[#1E3F2B]">
                {data?.server.memoryUsage.heapUsedMB || 0} MB
              </span>
              <span className="text-[11px] text-gray-400">
                / {data?.server.memoryUsage.heapTotalMB || 0} MB
              </span>
            </div>
            <span className="text-[11.5px] text-gray-500 mt-1 block">
              RSS: {data?.server.memoryUsage.rssMB || 0} MB
            </span>
          </div>
        </div>

        {/* Security / Isolation */}
        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">
              Keamanan Platform
            </span>
            <div className="w-8 h-8 rounded-[12px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
              <ShieldCheck className="w-4 h-4 text-[#356E3B]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-black text-[#356E3B]">
                Daftar Izin Ketat
              </span>
            </div>
            <span className="text-[11.5px] text-gray-500 mt-1 block">
              4 Akun Pemilik Terproteksi
            </span>
          </div>
        </div>
      </div>

      {/* Services Operational Checklist */}
      <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#356E3B]" />
            <h3 className="font-extrabold text-[16px] text-gray-900">
              Daftar Status Layanan Utama
            </h3>
          </div>
          <span className="text-[11.5px] text-gray-400">
            Terakhir diperbarui: {lastChecked || "Sekarang"}
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {data?.services?.map((svc, idx) => (
            <div
              key={idx}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-[13.5px] text-gray-900 leading-tight">
                    {svc.name === "PostgreSQL Database"
                      ? "Database PostgreSQL"
                      : svc.name === "Google OAuth Verification"
                      ? "Verifikasi Google OAuth"
                      : svc.name === "Express REST Engine"
                      ? "Mesin REST Express"
                      : svc.name === "Tenant Isolation Security"
                      ? "Keamanan Isolasi Organisasi"
                      : svc.name}
                  </h4>
                  <span className="text-[11.5px] text-gray-400">
                    {svc.mode === "Allowlist Strict Guard"
                      ? "Proteksi Ketat Daftar Izin"
                      : svc.provider || svc.version || svc.mode || "Modul Internal"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {svc.latencyMs !== undefined && (
                  <span className="text-[12px] font-semibold text-gray-500">
                    {svc.latencyMs} ms
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#2E7D32]">
                  {svc.status === "enforced" ? "Aktif" : "Beroperasi Normal"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Database Table Volume Statistics */}
      <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-[#356E3B]" />
            <h3 className="font-extrabold text-[16px] text-gray-900">
              Volume Data Tabel PostgreSQL
            </h3>
          </div>
          <span className="text-[12px] text-[#356E3B] font-semibold bg-[#EEF5F0] px-2.5 py-1 rounded-full">
            Koneksi Cloud Supabase
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-4 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Perusahaan
            </span>
            <span className="text-[20px] font-black text-[#1E3F2B] mt-1">
              {data?.database?.tables?.companies || 0}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5">Organisasi</span>
          </div>

          <div className="p-4 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Profil Pengguna
            </span>
            <span className="text-[20px] font-black text-[#1E3F2B] mt-1">
              {data?.database?.tables?.profiles || 0}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5">Akun terdaftar</span>
          </div>

          <div className="p-4 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Presensi
            </span>
            <span className="text-[20px] font-black text-[#356E3B] mt-1">
              {data?.database?.tables?.attendances || 0}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5">Rekaman GPS</span>
          </div>

          <div className="p-4 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Tugas
            </span>
            <span className="text-[20px] font-black text-gray-800 mt-1">
              {data?.database?.tables?.tasks || 0}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5">Tugas kerja</span>
          </div>

          <div className="p-4 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Agenda
            </span>
            <span className="text-[20px] font-black text-gray-800 mt-1">
              {data?.database?.tables?.agendas || 0}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5">Jadwal tim</span>
          </div>

          <div className="p-4 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Izin / Cuti
            </span>
            <span className="text-[20px] font-black text-gray-800 mt-1">
              {data?.database?.tables?.leaves || 0}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5">Permohonan</span>
          </div>

          <div className="p-4 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Notifikasi
            </span>
            <span className="text-[20px] font-black text-gray-800 mt-1">
              {data?.database?.tables?.notifications || 0}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5">Terkirim</span>
          </div>
        </div>
      </div>
    </div>
  );
}
