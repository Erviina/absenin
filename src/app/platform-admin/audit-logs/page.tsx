"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  RotateCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Activity,
  Terminal,
  Shield,
} from "lucide-react";
import { fetchPlatformApi } from "@/lib/platformAdminApi";
import { InfiniteScrollFooter } from "@/components/InfiniteScrollFooter";

interface AuditLogItem {
  id: string;
  actor_email: string;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  details: any;
  created_at: string;
}

interface AuditLogsResponse {
  items: AuditLogItem[];
  summary: {
    totalLogs: number;
    uniqueActors: number;
    successRate: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ACTION_FILTERS = [
  { label: "Semua Aksi", value: "ALL" },
  { label: "Autentikasi (AUTH)", value: "AUTH" },
  { label: "Analitik (VIEW)", value: "VIEW" },
  { label: "Direktori", value: "COMPANIES" },
  { label: "Sistem", value: "SYSTEM" },
];

export default function PlatformAdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [summary, setSummary] = useState({
    totalLogs: 0,
    uniqueActors: 0,
    successRate: 100,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const isFetchingMoreRef = useRef(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const loadInitialLogs = useCallback(async () => {
    setIsLoading(true);
    setLoadMoreError(null);
    try {
      const res = await fetchPlatformApi<AuditLogsResponse>(
        `audit-logs?page=1&limit=12&search=${encodeURIComponent(
          debouncedSearch
        )}&action=${selectedAction}`
      );
      if (res.success && res.data) {
        setLogs(res.data.items || []);
        setSummary(res.data.summary);
        setPage(1);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (e) {
      console.error("Gagal memuat log audit:", e);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedAction]);

  const loadMoreLogs = useCallback(async () => {
    if (isLoading || isLoadingMore || isFetchingMoreRef.current || page >= totalPages) {
      return;
    }
    try {
      isFetchingMoreRef.current = true;
      setIsLoadingMore(true);
      setLoadMoreError(null);

      const nextPage = page + 1;
      const res = await fetchPlatformApi<AuditLogsResponse>(
        `audit-logs?page=${nextPage}&limit=12&search=${encodeURIComponent(
          debouncedSearch
        )}&action=${selectedAction}`
      );
      if (res.success && res.data) {
        const newItems = res.data.items || [];
        setLogs((prev) => {
          const existingIds = new Set(prev.map((l) => l.id));
          const uniqueNew = newItems.filter((l) => !existingIds.has(l.id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setSummary(res.data.summary);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (e: any) {
      console.error("Gagal memuat lebih banyak log audit:", e);
      setLoadMoreError(e?.message || "Gagal memuat lebih banyak log audit");
    } finally {
      setIsLoadingMore(false);
      isFetchingMoreRef.current = false;
    }
  }, [isLoading, isLoadingMore, page, totalPages, debouncedSearch, selectedAction]);

  useEffect(() => {
    loadInitialLogs();
  }, [loadInitialLogs]);

  const loadLogs = () => {
    loadInitialLogs();
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("LOGIN") || act.includes("AUTH")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          {action}
        </span>
      );
    }
    if (act.includes("COMPANIES") || act.includes("DIRECTORY")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EEF5F0] text-[#1E3F2B] border border-[#DCE9DF]">
          {action}
        </span>
      );
    }
    if (act.includes("VIEW") || act.includes("ANALYTICS")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
        {action}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#356E3B]" />
          <h2 className="text-[20px] sm:text-[22px] font-black text-[#111827] tracking-tight">
            Log Audit Administratif
          </h2>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari email atau aksi..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#DCE9DF] rounded-[16px] text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#356E3B]/20 focus:border-[#356E3B] shadow-2xs"
            />
          </div>

          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="p-2.5 rounded-[16px] bg-white border border-[#DCE9DF] text-[#1E3F2B] hover:bg-[#EEF5F0] transition-colors shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
            title="Muat Ulang"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">
              Total Log Tercatat
            </span>
            <span className="text-[26px] font-black text-[#1E3F2B] mt-1">
              {summary.totalLogs}
            </span>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              Riwayat peristiwa administratif
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
            <Terminal className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">
              Aktor Administratif
            </span>
            <span className="text-[26px] font-black text-[#356E3B] mt-1">
              {summary.uniqueActors}
            </span>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              Akun Pemilik Platform aktif
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#EEF5F0] flex items-center justify-center text-[#356E3B]">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">
              Tingkat Keberhasilan
            </span>
            <span className="text-[26px] font-black text-[#1E3F2B] mt-1">
              {summary.successRate}%
            </span>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              Operasi berhasil diselesaikan
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#EEF5F0] border border-[#DCE9DF] rounded-[16px] shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1 pl-2 pr-1 text-[#356E3B] hidden sm:flex">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold">Kategori:</span>
        </div>
        {ACTION_FILTERS.map((f) => {
          const isActive = selectedAction === f.value;
          return (
            <button
              key={f.value}
              onClick={() => {
                setSelectedAction(f.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-[12px] text-[11.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-white text-[#1E4738] shadow-xs"
                  : "text-[#5C786C] hover:text-[#1E4738] hover:bg-white/50"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Table Container */}
      <div className="bg-white border border-[#E8F0EA] rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F9FBFA] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3.5 pl-6">Waktu Kejadian</th>
                <th className="py-3.5 px-4">Aktor</th>
                <th className="py-3.5 px-4">Aksi</th>
                <th className="py-3.5 px-4">Entitas</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 pr-6">Rincian Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-[13px]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 pl-6">
                      <div className="w-32 h-3 bg-gray-200 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-36 h-3 bg-gray-200 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-20 h-5 bg-gray-100 rounded-full" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-16 h-3 bg-gray-200 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-16 h-5 bg-gray-100 rounded-full" />
                    </td>
                    <td className="py-4 pr-6">
                      <div className="w-48 h-3 bg-gray-200 rounded" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-[13px] font-medium">Tidak ada log audit ditemukan untuk filter ini.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F9FBFA]/80 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 pl-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[12px] text-gray-600 font-medium">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatDate(log.created_at)}</span>
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#1E3F2B] text-white flex items-center justify-center font-bold text-[11px]">
                          {log.actor_name?.charAt(0)?.toUpperCase() || "A"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 text-[12.5px] leading-tight">
                            {log.actor_name || log.actor_email.split("@")[0]}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {log.actor_email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Entity */}
                    <td className="py-3.5 px-4 text-[12px] text-gray-600 font-mono">
                      {log.entity_type || "PLATFORM"}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.status === "SUCCESS" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#2E7D32]">
                          <CheckCircle2 className="w-3 h-3" />
                          Sukses
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700">
                          <XCircle className="w-3 h-3" />
                          Gagal
                        </span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3.5 pr-6 text-[12px] text-gray-500 font-mono">
                      {log.details ? (
                        <span className="inline-block max-w-xs truncate bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          {JSON.stringify(log.details)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Infinite Scroll Footer */}
        <div className="border-t border-gray-100 bg-[#F9FBFA]">
          <div className="px-6 py-2.5 text-[12px] text-gray-500 border-b border-gray-100 flex items-center justify-between">
            <div>
              Menampilkan <span className="font-semibold text-gray-900">{logs.length}</span> dari{" "}
              <span className="font-semibold text-gray-900">{total}</span> catatan
            </div>
          </div>
          <InfiniteScrollFooter
            isLoadingMore={isLoadingMore}
            hasMore={logs.length > 0 && page < totalPages}
            onLoadMore={loadMoreLogs}
            error={loadMoreError}
            onRetry={loadMoreLogs}
            endMessage="Semua catatan audit log telah ditampilkan"
            className="py-4 bg-[#F9FBFA]"
          />
        </div>
      </div>
    </div>
  );
}
