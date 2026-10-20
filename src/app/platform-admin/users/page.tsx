"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Mail,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { fetchPlatformApi } from "@/lib/platformAdminApi";

interface UserItem {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  company_id: string | null;
  company_name: string | null;
  role: string | null;
  total_attendances: number;
  last_attendance: string | null;
}

interface UsersResponse {
  items: UserItem[];
  summary: {
    totalUsers: number;
    affiliatedUsers: number;
    activeUsers: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function PlatformAdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [summary, setSummary] = useState({
    totalUsers: 0,
    affiliatedUsers: 0,
    activeUsers: 0,
  });
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

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetchPlatformApi<UsersResponse>(
        `users?page=${page}&limit=10&search=${encodeURIComponent(debouncedSearch)}`
      );
      if (res.success && res.data) {
        setUsers(res.data.items);
        setSummary(res.data.summary);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (e) {
      console.error("Gagal memuat direktori pengguna:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
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

  const formatLastActivity = (dateStr: string | null) => {
    if (!dateStr) return "Belum pernah";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">
          Anggota
        </span>
      );
    }

    const r = role.toLowerCase();
    if (r.includes("owner") || r.includes("pemilik")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF5F0] text-[#1E3F2B] border border-[#DCE9DF]">
          Owner
        </span>
      );
    }
    if (r.includes("manager") || r.includes("admin")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Manager
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 capitalize">
        {role}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#356E3B]" />
            <h2 className="text-[20px] sm:text-[22px] font-black text-[#111827] tracking-tight">
              Direktori Pengguna Global
            </h2>
          </div>
          <span className="text-[12.5px] text-[#6B7280]">
            Manajemen dan pemantauan akun pengguna di seluruh tenant platform Absenin
          </span>
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#DCE9DF] rounded-[16px] text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#356E3B]/20 focus:border-[#356E3B] shadow-2xs"
            />
          </div>

          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2.5 rounded-[16px] bg-white border border-[#DCE9DF] text-[#1E3F2B] hover:bg-[#EEF5F0] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Muat Ulang"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
              Total Pengguna
            </span>
            <span className="text-[26px] font-black text-[#1E3F2B] mt-1">
              {summary.totalUsers}
            </span>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              Akun terdaftar di database
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
              Terafiliasi Perusahaan
            </span>
            <span className="text-[26px] font-black text-[#356E3B] mt-1">
              {summary.affiliatedUsers}
            </span>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              {summary.totalUsers > 0
                ? `${Math.round((summary.affiliatedUsers / summary.totalUsers) * 100)}% dari seluruh akun`
                : "0%"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#EEF5F0] flex items-center justify-center text-[#356E3B]">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
              Pengguna Aktif Presensi
            </span>
            <span className="text-[26px] font-black text-[#1E3F2B] mt-1">
              {summary.activeUsers}
            </span>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              Memiliki riwayat check-in
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32]">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Users Table Container */}
      <div className="bg-white border border-[#E8F0EA] rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F9FBFA] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3.5 pl-6">Pengguna</th>
                <th className="py-3.5 px-4">Perusahaan</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4 text-center">Presensi</th>
                <th className="py-3.5 px-4">Aktivitas Terakhir</th>
                <th className="py-3.5 pr-6 text-right">Terdaftar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-[13px]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="flex flex-col gap-1.5">
                          <div className="w-32 h-3.5 bg-gray-200 rounded" />
                          <div className="w-24 h-2.5 bg-gray-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-28 h-3.5 bg-gray-200 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-16 h-5 bg-gray-100 rounded-full" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="w-12 h-3.5 bg-gray-200 rounded mx-auto" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-24 h-3 bg-gray-200 rounded" />
                    </td>
                    <td className="py-4 pr-6 text-right">
                      <div className="w-16 h-3 bg-gray-200 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <UserX className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-[13px] font-medium">Tidak ada data pengguna ditemukan.</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-[#F9FBFA]/80 transition-colors group"
                  >
                    {/* User Identity */}
                    <td className="py-3.5 pl-6">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#1E3F2B] text-white flex items-center justify-center font-bold text-[13px] shadow-2xs">
                            {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 group-hover:text-[#1E3F2B] transition-colors leading-tight">
                            {user.full_name || "Tanpa Nama"}
                          </span>
                          <span className="text-[11.5px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="py-3.5 px-4">
                      {user.company_name ? (
                        <div className="flex items-center gap-1.5 text-gray-800 font-medium text-[12.5px]">
                          <Building2 className="w-3.5 h-3.5 text-[#356E3B]" />
                          <span>{user.company_name}</span>
                        </div>
                      ) : (
                        <span className="text-[11.5px] text-gray-400 italic">
                          Belum terhubung
                        </span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      {getRoleBadge(user.role)}
                    </td>

                    {/* Attendance Record */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold bg-[#EEF5F0] text-[#1E3F2B]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#356E3B]" />
                        {user.total_attendances}
                      </span>
                    </td>

                    {/* Last Activity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-[12px] text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatLastActivity(user.last_attendance)}</span>
                      </div>
                    </td>

                    {/* Registration Date */}
                    <td className="py-3.5 pr-6 text-right text-[12px] text-gray-400">
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white text-[12.5px] text-gray-500">
          <div>
            Menampilkan <span className="font-semibold text-gray-900">{users.length}</span> dari{" "}
            <span className="font-semibold text-gray-900">{total}</span> pengguna
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="px-3 py-1.5 rounded-[12px] border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>
            <span className="px-2 text-gray-700 font-medium">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="px-3 py-1.5 rounded-[12px] border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-colors"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
