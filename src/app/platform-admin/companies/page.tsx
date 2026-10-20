"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  Users,
  Calendar,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  ExternalLink,
} from "lucide-react";
import { fetchPlatformApi } from "@/lib/platformAdminApi";

interface CompanyItem {
  id: string;
  name: string;
  address: string | null;
  join_code: string | null;
  avatar_company_url: string | null;
  created_at: string;
  work_start_time: string | null;
  work_end_time: string | null;
  member_count: number;
  attendance_count: number;
  last_activity: string | null;
}

interface CompaniesResponse {
  items: CompanyItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function PlatformAdminCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const res = await fetchPlatformApi<CompaniesResponse>(
        `companies?page=${page}&limit=10&search=${encodeURIComponent(debouncedSearch)}`
      );
      if (res.success && res.data) {
        setCompanies(res.data.items);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (e) {
      console.error("Gagal memuat daftar perusahaan:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [page, debouncedSearch]);

  const formatDate = (dateStr: string | null) => {
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

  return (
    <div className="flex flex-col gap-6 select-none animate-in fade-in duration-300">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#356E3B]" />
          <h2 className="text-[20px] sm:text-[22px] font-black text-[#111827] tracking-tight">
            Direktori Perusahaan
          </h2>
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama perusahaan..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#DCE9DF] rounded-[16px] text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#356E3B]/20 focus:border-[#356E3B] shadow-2xs"
            />
          </div>

          <button
            onClick={loadCompanies}
            disabled={isLoading}
            className="p-2.5 rounded-[16px] bg-white border border-[#DCE9DF] text-[#1E3F2B] hover:bg-[#EEF5F0] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Muat Ulang"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-[#E8F0EA] rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F9FBFA] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3.5 pl-6">Perusahaan</th>
                <th className="py-3.5 px-4">Kode Gabung</th>
                <th className="py-3.5 px-4 text-center">Anggota</th>
                <th className="py-3.5 px-4 text-center">Total Presensi</th>
                <th className="py-3.5 px-4">Jam Kerja</th>
                <th className="py-3.5 pr-6 text-right">Terdaftar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-[13px]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Memuat data perusahaan...
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Tidak ditemukan perusahaan yang cocok dengan pencarian
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors group">
                    {/* Perusahaan Info */}
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[14px] bg-[#EEF5F0] text-[#1E4738] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-[#DCE9DF]">
                          {c.avatar_company_url ? (
                            <img
                              src={c.avatar_company_url}
                              alt={c.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            c.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-gray-900 group-hover:text-[#1E3F2B] transition-colors truncate max-w-xs">
                            {c.name}
                          </span>
                          <span className="text-[11px] text-gray-400 truncate max-w-xs">
                            {c.address || "Alamat belum diatur"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Join Code */}
                    <td className="py-4 px-4 font-mono text-[12px] font-bold text-[#356E3B]">
                      {c.join_code ? (
                        <span className="bg-[#EEF5F0] px-2.5 py-0.5 rounded-md border border-[#DCE9DF]">
                          {c.join_code}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* Anggota Count */}
                    <td className="py-4 px-4 text-center">
                      <Link
                        href={`/platform-admin/users?company_id=${c.id}`}
                        className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-[#EEF5F0] hover:text-[#1E3F2B] text-gray-800 px-3 py-1 rounded-full text-[12px] font-bold transition-all cursor-pointer group/link border border-transparent hover:border-[#DCE9DF]"
                        title="Klik untuk melihat seluruh pengguna di organisasi ini"
                      >
                        <Users className="w-3.5 h-3.5 text-gray-500 group-hover/link:text-[#356E3B]" />
                        <span>{c.member_count}</span>
                      </Link>
                    </td>

                    {/* Presensi Count */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 rounded-full text-[12px] font-bold">
                        <span>{c.attendance_count}</span>
                      </span>
                    </td>

                    {/* Jam Kerja */}
                    <td className="py-4 px-4 text-gray-600 text-[12px] font-medium">
                      {c.work_start_time ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {c.work_start_time.substring(0, 5)} - {c.work_end_time ? c.work_end_time.substring(0, 5) : "17:00"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Standar</span>
                      )}
                    </td>

                    {/* Tanggal Terdaftar */}
                    <td className="py-4 pr-6 text-right text-gray-500 text-[12px] font-medium">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-[12.5px] bg-[#F9FBFA]">
            <span className="text-gray-500 font-medium">
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
