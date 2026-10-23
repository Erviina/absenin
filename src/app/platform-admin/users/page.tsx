"use client";
import { useDialog } from "@/context/DialogContext";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Users,
  Search,
  Building2,
  CheckCircle2,
  UserCheck,
  UserX,
  ChevronDown,
  RotateCw,
  Mail,
  Clock,
  Layers,
  X,
  Filter,
  ShieldCheck,
} from "lucide-react";
import { fetchPlatformApi } from "@/lib/platformAdminApi";
import { InfiniteScrollFooter } from "@/components/InfiniteScrollFooter";

export interface UserMembershipItem {
  company_id: string;
  company_name: string;
  role: string;
  status: string;
  joined_at?: string | null;
  is_active?: boolean;
}

export interface UserItem {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  company_id: string | null;
  company_name: string | null;
  role: string | null;
  memberships?: UserMembershipItem[];
  companies_count?: number;
  total_attendances: number;
  last_attendance: string | null;
  is_developer?: boolean;
}

export interface CompanyLookupItem {
  id: string;
  name: string;
  avatar_company_url?: string | null;
}

interface UsersResponse {
  items: UserItem[];
  summary: {
    totalUsers: number;
    affiliatedUsers: number;
    multiCompanyUsers?: number;
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
  const { showConfirm, showAlert } = useDialog();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [summary, setSummary] = useState({
    totalUsers: 0,
    affiliatedUsers: 0,
    multiCompanyUsers: 0,
    activeUsers: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [filterMultiOnly, setFilterMultiOnly] = useState(false);
  const [companiesList, setCompaniesList] = useState<CompanyLookupItem[]>([]);
  const [selectedUserForModal, setSelectedUserForModal] = useState<UserItem | null>(null);
  const [openDropdownUserId, setOpenDropdownUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const isFetchingMoreRef = useRef(false);
  const [isTogglingDev, setIsTogglingDev] = useState<string | null>(null);

  const handleToggleDeveloper = async (targetUser: UserItem) => {
    const nextVal = !targetUser.is_developer;
    const confirmMsg = nextVal
      ? `Berikan hak akses Developer kepada "${targetUser.full_name || targetUser.email}"?\n\nPengguna ini akan dapat mengakses Platform Admin.`
      : `Cabut hak akses Developer dari "${targetUser.full_name || targetUser.email}"?\n\nPengguna tidak akan dapat mengakses Platform Admin lagi.`;

    const confirmed = await showConfirm({
      title: "Konfirmasi",
      message: confirmMsg,
      confirmText: "Ya",
      cancelText: "Tidak",
      type: "danger",
      icon: "trash",
    });
    if (!confirmed) return;

    setIsTogglingDev(targetUser.id);
    try {
      const res = await fetchPlatformApi(`/users/${targetUser.id}/developer`, {
        method: "PATCH",
        body: JSON.stringify({ isDeveloper: nextVal }),
      });

      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, is_developer: nextVal } : u))
        );
        if (selectedUserForModal?.id === targetUser.id) {
          setSelectedUserForModal((prev) =>
            prev ? { ...prev, is_developer: nextVal } : null
          );
        }
      } else {
        await showAlert({
        title: "Error",
        message: res.message || "Gagal memperbarui status developer",
        type: "error",
        icon: "alert",
      });
      }
    } catch (err: any) {
      await showAlert({
        title: "Error",
        message: err.message || "Terjadi kesalahan jaringan",
        type: "error",
        icon: "alert",
      });
    } finally {
      setIsTogglingDev(null);
    }
  };

  // Baca query parameter dari URL saat pertama kali dimuat
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cid = params.get("company_id");
      if (cid) {
        setSelectedCompanyId(cid);
      }
      if (params.get("multi_only") === "true") {
        setFilterMultiOnly(true);
      }
    }
  }, []);

  // Muat daftar perusahaan untuk dropdown filter multi-tenant
  useEffect(() => {
    const loadCompaniesLookup = async () => {
      try {
        const res = await fetchPlatformApi<CompanyLookupItem[]>("companies/lookup");
        if (res.success && Array.isArray(res.data)) {
          setCompaniesList(res.data);
        } else {
          // Fallback ke endpoint companies
          const fallbackRes = await fetchPlatformApi<{ items: CompanyLookupItem[] }>("companies?limit=100");
          if (fallbackRes.success && fallbackRes.data?.items) {
            setCompaniesList(fallbackRes.data.items);
          }
        }
      } catch (err) {
        console.error("Gagal memuat opsi perusahaan:", err);
      }
    };
    loadCompaniesLookup();
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const loadInitialUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadMoreError(null);
    try {
      const queryParams = new URLSearchParams({
        page: "1",
        limit: "10",
        search: debouncedSearch,
      });

      if (selectedCompanyId) {
        queryParams.append("company_id", selectedCompanyId);
      }

      if (filterMultiOnly) {
        queryParams.append("multi_only", "true");
      }

      const res = await fetchPlatformApi<UsersResponse>(`users?${queryParams.toString()}`);
      if (res.success && res.data) {
        setUsers(res.data.items || []);
        setPage(1);
        setSummary({
          totalUsers: res.data.summary.totalUsers || 0,
          affiliatedUsers: res.data.summary.affiliatedUsers || 0,
          multiCompanyUsers: res.data.summary.multiCompanyUsers || 0,
          activeUsers: res.data.summary.activeUsers || 0,
        });
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (e) {
      console.error("Gagal memuat direktori pengguna:", e);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedCompanyId, filterMultiOnly]);

  const loadMoreUsers = useCallback(async () => {
    if (isLoading || isLoadingMore || isFetchingMoreRef.current || page >= totalPages) {
      return;
    }
    try {
      isFetchingMoreRef.current = true;
      setIsLoadingMore(true);
      setLoadMoreError(null);

      const nextPage = page + 1;
      const queryParams = new URLSearchParams({
        page: nextPage.toString(),
        limit: "10",
        search: debouncedSearch,
      });

      if (selectedCompanyId) {
        queryParams.append("company_id", selectedCompanyId);
      }

      if (filterMultiOnly) {
        queryParams.append("multi_only", "true");
      }

      const res = await fetchPlatformApi<UsersResponse>(`users?${queryParams.toString()}`);
      if (res.success && res.data) {
        const newItems = res.data.items || [];
        setUsers((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          const uniqueNew = newItems.filter((u) => !existingIds.has(u.id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
        if (res.data.summary) {
          setSummary({
            totalUsers: res.data.summary.totalUsers || 0,
            affiliatedUsers: res.data.summary.affiliatedUsers || 0,
            multiCompanyUsers: res.data.summary.multiCompanyUsers || 0,
            activeUsers: res.data.summary.activeUsers || 0,
          });
        }
      }
    } catch (e: any) {
      console.error("Gagal memuat lebih banyak pengguna:", e);
      setLoadMoreError(e?.message || "Gagal memuat lebih banyak pengguna");
    } finally {
      setIsLoadingMore(false);
      isFetchingMoreRef.current = false;
    }
  }, [isLoading, isLoadingMore, page, totalPages, debouncedSearch, selectedCompanyId, filterMultiOnly]);

  useEffect(() => {
    loadInitialUsers();
  }, [loadInitialUsers]);

  const loadUsers = () => {
    loadInitialUsers();
  };

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
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-gray-100 text-gray-500">
          Anggota
        </span>
      );
    }

    const r = role.toLowerCase();
    if (r.includes("owner") || r.includes("pemilik")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#EEF5F0] text-[#1E3F2B] border border-[#DCE9DF]">
          Pemilik
        </span>
      );
    }
    if (r.includes("manager") || r.includes("admin")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Manajer
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-gray-100 text-gray-600 capitalize">
        {role}
      </span>
    );
  };

  const selectedCompanyName = companiesList.find((c) => c.id === selectedCompanyId)?.name;

  return (
    <div className="flex flex-col gap-6 select-none animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#356E3B]" />
          <h2 className="text-[20px] sm:text-[22px] font-black text-[#111827] tracking-tight">
            Direktori Pengguna
          </h2>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Dropdown Filter Perusahaan / Tenant */}
          <div className="relative min-w-[210px] flex-1 sm:flex-initial">
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setPage(1);
              }}
              className="w-full pl-3 pr-8 py-2.5 bg-white border border-[#DCE9DF] rounded-[16px] text-[12.5px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#356E3B]/20 focus:border-[#356E3B] shadow-2xs cursor-pointer font-medium"
            >
              <option value="">Semua Organisasi (Semua Tenant)</option>
              {companiesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#DCE9DF] rounded-[16px] text-[12.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#356E3B]/20 focus:border-[#356E3B] shadow-2xs"
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

      {/* Filter Active Pill Banners */}
      {(selectedCompanyId || filterMultiOnly) && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-[16px] bg-[#EEF5F0] border border-[#DCE9DF] text-[#1E3F2B] text-[12.5px]">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-[#356E3B] shrink-0" />
            {selectedCompanyId && (
              <span className="inline-flex items-center gap-1.5">
                Organisasi: <strong>{selectedCompanyName || selectedCompanyId}</strong>
              </span>
            )}
            {selectedCompanyId && filterMultiOnly && <span>•</span>}
            {filterMultiOnly && (
              <span className="font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full text-[11px]">
                Hanya Akun Multi-Tenant (&gt;1 PT)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedCompanyId("");
                setFilterMultiOnly(false);
                setPage(1);
              }}
              className="text-[12px] font-bold text-[#1E3F2B] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Reset Semua Filter</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Summary (Multi-Tenant Architecture) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pengguna */}
        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
              Total Pengguna
            </span>
            <span className="text-[26px] font-black text-[#1E3F2B] mt-1">
              {summary.totalUsers}
            </span>
            <span className="text-[11.5px] text-gray-500 mt-0.5">
              Akun terdaftar di platform
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Terafiliasi Organisasi */}
        <div className="bg-white border border-[#E8F0EA] rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
              Terafiliasi Organisasi
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

        {/* Card 3: Multi-Tenant (>1 PT) - Interactive Filter */}
        <div
          onClick={() => {
            setFilterMultiOnly(!filterMultiOnly);
            setPage(1);
          }}
          className={`border rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer transition-all ${
            filterMultiOnly
              ? "bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/30 shadow-md"
              : "bg-white border-[#E8F0EA] hover:border-purple-200 hover:bg-purple-50/20"
          }`}
          title="Klik untuk memfilter hanya akun multi-tenant"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-purple-700 uppercase tracking-wider">
                Multi-Tenant
              </span>
              <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                &gt;1 PT
              </span>
            </div>
            <span className="text-[26px] font-black text-purple-700 mt-1">
              {summary.multiCompanyUsers || 0}
            </span>
            <span className="text-[11.5px] text-gray-500 mt-0.5 flex items-center gap-1">
              {filterMultiOnly ? (
                <span className="font-bold text-purple-700 flex items-center gap-0.5">
                  Filter Aktif <X className="w-3 h-3" />
                </span>
              ) : (
                "Klik untuk filter akun >1 PT"
              )}
            </span>
          </div>
          <div className="w-12 h-12 rounded-[16px] bg-purple-50 flex items-center justify-center text-purple-700 border border-purple-100">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Pengguna Aktif Presensi */}
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

      {/* Users Table Container with Clean Multi-Tenant Dropdown */}
      <div className="bg-white border border-[#E8F0EA] rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F9FBFA] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3.5 pl-6">Pengguna</th>
                <th className="py-3.5 px-4 text-center">Akses Developer</th>
                <th className="py-3.5 px-4">Keanggotaan Organisasi (Multi-Tenant)</th>
                <th className="py-3.5 px-4 text-center">Presensi</th>
                <th className="py-3.5 px-4">Aktivitas Terakhir</th>
                <th className="py-3.5 pr-4 text-right">Terdaftar</th>
                <th className="py-3.5 pr-6 text-right">Aksi</th>
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
                    <td className="py-4 px-4 text-center">
                      <div className="w-16 h-6 bg-gray-100 rounded-full mx-auto" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-36 h-3.5 bg-gray-200 rounded" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="w-12 h-3.5 bg-gray-200 rounded mx-auto" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-24 h-3 bg-gray-200 rounded" />
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <div className="w-16 h-3 bg-gray-200 rounded ml-auto" />
                    </td>
                    <td className="py-4 pr-6 text-right">
                      <div className="w-16 h-6 bg-gray-100 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <UserX className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-[13px] font-medium">Tidak ada data pengguna ditemukan.</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const memberships = user.memberships && user.memberships.length > 0
                    ? user.memberships
                    : user.company_name
                    ? [{
                        company_id: user.company_id || "",
                        company_name: user.company_name,
                        role: user.role || "member",
                        status: "active",
                        is_active: true,
                      }]
                    : [];

                  const mCount = memberships.length;
                  const isMulti = mCount > 1;
                  const primaryMembership = memberships[0] || null;
                  const isDropdownOpen = openDropdownUserId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-[#F9FBFA]/80 transition-colors group"
                    >
                      {/* User Identity Column */}
                      <td className="py-3.5 pl-6 align-middle">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#1E3F2B] text-white flex items-center justify-center font-bold text-[13px] shadow-2xs shrink-0">
                              {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-gray-900 group-hover:text-[#1E3F2B] transition-colors leading-tight">
                                {user.full_name || "Tanpa Nama"}
                              </span>
                              {isMulti && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200"
                                  title="Akun terafiliasi di multi-perusahaan"
                                >
                                  <Layers className="w-3 h-3" />
                                  <span>{mCount} PT</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11.5px] text-gray-400 flex items-center gap-1 mt-0.5 truncate max-w-[210px]">
                              <Mail className="w-3 h-3 shrink-0" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Developer Access Column */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <button
                          type="button"
                          disabled={isTogglingDev === user.id}
                          onClick={() => handleToggleDeveloper(user)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                            user.is_developer
                              ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-2xs"
                              : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                          } ${isTogglingDev === user.id ? "opacity-50 cursor-wait" : ""}`}
                          title={
                            user.is_developer
                              ? "Status Developer aktif (klik untuk mencabut)"
                              : "Bukan Developer (klik untuk memberikan akses)"
                          }
                        >
                          <ShieldCheck
                            className={`w-3.5 h-3.5 ${
                              user.is_developer ? "text-amber-600" : "text-gray-400"
                            }`}
                          />
                          <span>{user.is_developer ? "Developer" : "Bukan"}</span>
                        </button>
                      </td>

                      {/* Multi-Tenant Organization Column with Dropdown */}
                      <td className="py-3.5 px-4 align-middle">
                        {mCount === 0 ? (
                          <span className="text-[12px] text-gray-400 italic">
                            Belum terhubung ke organisasi
                          </span>
                        ) : mCount === 1 && primaryMembership ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Building2 className="w-3.5 h-3.5 text-[#356E3B] shrink-0" />
                              <span
                                className="font-semibold text-gray-800 text-[12.5px] truncate max-w-[170px]"
                                title={primaryMembership.company_name}
                              >
                                {primaryMembership.company_name}
                              </span>
                            </div>
                            {getRoleBadge(primaryMembership.role)}
                          </div>
                        ) : (
                          /* Multi-Tenant Dropdown Trigger & Popover */
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {primaryMembership && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Building2 className="w-3.5 h-3.5 text-[#356E3B] shrink-0" />
                                <span
                                  className="font-semibold text-gray-800 text-[12.5px] truncate max-w-[130px]"
                                  title={primaryMembership.company_name}
                                >
                                  {primaryMembership.company_name}
                                </span>
                              </div>
                            )}
                            {primaryMembership && getRoleBadge(primaryMembership.role)}

                            {/* Dropdown Trigger Button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownUserId(isDropdownOpen ? null : user.id);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer shadow-2xs"
                                title="Klik untuk membuka dropdown daftar organisasi"
                              >
                                <span>+{mCount - 1} PT</span>
                                <ChevronDown
                                  className={`w-3 h-3 transition-transform duration-200 ${
                                    isDropdownOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </button>

                              {/* Dropdown Menu Popover */}
                              {isDropdownOpen && (
                                <>
                                  <div
                                    className="fixed inset-0 z-30"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownUserId(null);
                                    }}
                                  />
                                  <div
                                    className="absolute left-0 top-full mt-1.5 z-40 w-72 bg-white rounded-[20px] border border-[#DCE9DF] shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                                      <div className="flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5 text-purple-700" />
                                        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                                          Keanggotaan PT ({mCount})
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                                        Multi-Tenant
                                      </span>
                                    </div>

                                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                                      {memberships.map((m, idx) => (
                                        <div
                                          key={m.company_id || idx}
                                          className={`p-2 rounded-[12px] border transition-colors flex items-center justify-between gap-2 ${
                                            m.company_id === selectedCompanyId
                                              ? "bg-[#EEF5F0] border-[#356E3B]"
                                              : "bg-[#F9FBFA] border-gray-100 hover:border-gray-200"
                                          }`}
                                        >
                                          <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <Building2 className="w-3 h-3 text-[#356E3B] shrink-0" />
                                              <span
                                                className="font-bold text-[12px] text-gray-900 truncate"
                                                title={m.company_name}
                                              >
                                                {m.company_name}
                                              </span>
                                            </div>
                                            {m.is_active && (
                                              <span className="text-[9.5px] text-emerald-600 font-semibold mt-0.5">
                                                ● Sesi Aktif
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {getRoleBadge(m.role)}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedCompanyId(m.company_id);
                                                setOpenDropdownUserId(null);
                                                setPage(1);
                                              }}
                                              className="p-1 rounded-md text-gray-400 hover:text-[#356E3B] hover:bg-white transition-colors cursor-pointer"
                                              title={`Filter tabel untuk ${m.company_name}`}
                                            >
                                              <Filter className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                                      <span className="text-gray-400">
                                        Klik filter untuk melihat per PT
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenDropdownUserId(null);
                                          setSelectedUserForModal(user);
                                        }}
                                        className="font-bold text-[#1E3F2B] hover:text-[#356E3B] cursor-pointer"
                                      >
                                        Rincian Lengkap
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Attendance Record Column */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold bg-[#EEF5F0] text-[#1E3F2B]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#356E3B]" />
                          {user.total_attendances}
                        </span>
                      </td>

                      {/* Last Activity Column */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-1 text-[12px] text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{formatLastActivity(user.last_attendance)}</span>
                        </div>
                      </td>

                      {/* Registration Date Column */}
                      <td className="py-3.5 pr-4 text-right text-[12px] text-gray-400 align-middle">
                        {formatDate(user.created_at)}
                      </td>

                      {/* Modal Action Column */}
                      <td className="py-3.5 pr-6 text-right align-middle">
                        <button
                          type="button"
                          onClick={() => setSelectedUserForModal(user)}
                          className="px-3 py-1.5 rounded-[12px] bg-white border border-[#DCE9DF] hover:bg-[#EEF5F0] text-[#1E3F2B] text-[12px] font-bold transition-all cursor-pointer shadow-2xs"
                          title="Lihat modal rincian pengguna"
                        >
                          Rincian
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Infinite Scroll Footer */}
        <div className="border-t border-gray-100 bg-[#F9FBFA]">
          <div className="px-6 py-2.5 text-[12px] text-gray-500 border-b border-gray-100 flex items-center justify-between">
            <div>
              Menampilkan <span className="font-semibold text-gray-900">{users.length}</span> dari{" "}
              <span className="font-semibold text-gray-900">{total}</span> pengguna
            </div>
          </div>
          <InfiniteScrollFooter
            isLoadingMore={isLoadingMore}
            hasMore={users.length > 0 && page < totalPages}
            onLoadMore={loadMoreUsers}
            error={loadMoreError}
            onRetry={loadMoreUsers}
            endMessage="Semua pengguna telah ditampilkan"
            className="py-4 bg-[#F9FBFA]"
          />
        </div>
      </div>

      {/* Modal Detail Multi-Tenant Akun */}
      {selectedUserForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] border border-[#E8F0EA] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#F9FBFA]">
              <div className="flex items-center gap-3">
                {selectedUserForModal.avatar_url ? (
                  <img
                    src={selectedUserForModal.avatar_url}
                    alt={selectedUserForModal.full_name}
                    className="w-12 h-12 rounded-full object-cover border border-white shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#1E3F2B] text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {selectedUserForModal.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-[17px] text-gray-900 leading-tight">
                    {selectedUserForModal.full_name || "Tanpa Nama"}
                  </h3>
                  <span className="text-[12px] text-gray-400">
                    {selectedUserForModal.email}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForModal(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="flex items-center justify-between p-3.5 rounded-[16px] bg-[#EEF5F0] border border-[#DCE9DF]">
                <div className="flex items-center gap-2 text-[#1E3F2B] font-bold text-[13px]">
                  <Layers className="w-4 h-4 text-[#356E3B]" />
                  <span>Status Multi-Tenant:</span>
                </div>
                <span className="text-[12px] font-extrabold bg-white text-[#1E3F2B] px-3 py-1 rounded-full shadow-2xs">
                  {selectedUserForModal.memberships?.length || 0} Organisasi Terdaftar
                </span>
              </div>

              {/* Developer Flag Control */}
              <div className="flex items-center justify-between p-3.5 rounded-[16px] bg-amber-50/60 border border-amber-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12.5px] font-bold text-gray-900">Hak Akses Developer</span>
                    <span className="text-[11px] text-gray-500">
                      {selectedUserForModal.is_developer
                        ? "Dapat mengakses Platform Admin"
                        : "Hanya akses aplikasi utama"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isTogglingDev === selectedUserForModal.id}
                  onClick={() => handleToggleDeveloper(selectedUserForModal)}
                  className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold border transition-all cursor-pointer ${
                    selectedUserForModal.is_developer
                      ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700 shadow-sm"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {selectedUserForModal.is_developer ? "Cabut Akses" : "Jadikan Developer"}
                </button>
              </div>

              <div>
                <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Daftar Keanggotaan Perusahaan (PT)
                </h4>

                <div className="space-y-2.5">
                  {selectedUserForModal.memberships && selectedUserForModal.memberships.length > 0 ? (
                    selectedUserForModal.memberships.map((m, idx) => (
                      <div
                        key={m.company_id || idx}
                        className="p-4 rounded-[18px] border border-gray-100 bg-[#F9FBFA] hover:border-gray-200 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-[12px] bg-[#EEF5F0] text-[#1E4738] flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[13px] text-gray-900 truncate">
                              {m.company_name}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono truncate">
                              ID: {m.company_id?.substring(0, 8)}...
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {getRoleBadge(m.role)}
                          {m.is_active && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Aktif
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCompanyId(m.company_id);
                              setSelectedUserForModal(null);
                              setPage(1);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#356E3B] hover:bg-white transition-colors cursor-pointer"
                            title={`Filter tabel ke ${m.company_name}`}
                          >
                            <Filter className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-[12.5px]">
                      Belum terdaftar di organisasi mana pun
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance and system metadata */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-[12px]">
                <div className="p-3 rounded-[14px] bg-gray-50 flex flex-col">
                  <span className="text-gray-400 text-[11px]">Total Presensi Platform</span>
                  <span className="font-black text-gray-900 text-[15px] mt-0.5">
                    {selectedUserForModal.total_attendances} Check-in
                  </span>
                </div>
                <div className="p-3 rounded-[14px] bg-gray-50 flex flex-col">
                  <span className="text-gray-400 text-[11px]">Terdaftar Sejak</span>
                  <span className="font-black text-gray-900 text-[15px] mt-0.5">
                    {formatDate(selectedUserForModal.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
              <button
                type="button"
                onClick={() => setSelectedUserForModal(null)}
                className="px-5 py-2 rounded-[14px] bg-[#1E3F2B] text-white font-bold text-[12.5px] hover:bg-[#356E3B] transition-colors cursor-pointer"
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
