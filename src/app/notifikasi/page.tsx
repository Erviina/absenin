"use client";

import { TopBar } from "@/components/TopBar";
import { CustomCalendar } from "@/components/CustomCalendar";
import { Pagination } from "@/components/Pagination";
import { 
  Search, ListFilter, Bell, Clock, Calendar, Users, 
  Megaphone, Info, ChevronRight, X, CalendarDays, Check 
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";
import { getActiveCompanyId } from "@/lib/api";
import { handleNotificationNavigation } from "@/lib/notificationNavigation";
import { formatDate, formatDateRange } from "@/lib/dateUtils";
import { parseMembershipNotification, cleanNotificationMessage } from "@/lib/membershipNotificationUtils";
import { CardListSkeleton } from "@/components/CardSkeleton";
import { buildCacheKey, getCachedData, setCachedData, invalidateCache } from "@/lib/clientCache";

export default function NotifikasiPage() {
  const router = useRouter();
  const { activeCompanyId, activeRole, memberships, switchCompany } = useCompany();
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination states
  const [offset, setOffset] = useState(0);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const limit = 10;

  // Date Filter States (sama dengan halaman Kehadiran)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCalendar, setActiveCalendar] = useState<"start" | "end" | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  const categories = ["Semua", "Absensi", "Izin & Cuti", "Sistem"];

  const [notifications, setNotifications] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    const compId = getActiveCompanyId();
    return getCachedData<any[]>(buildCacheKey("notifications", compId, { limit: 10, offset: 0, searchQuery: "", activeCategory: "Semua", appliedStartDate: "", appliedEndDate: "" }))?.data || [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const compId = getActiveCompanyId();
    return !getCachedData(buildCacheKey("notifications", compId, { limit: 10, offset: 0, searchQuery: "", activeCategory: "Semua", appliedStartDate: "", appliedEndDate: "" }))?.data;
  });
  const [error, setError] = useState("");

  const activeFetchCompanyIdRef = useRef<string | null>(null);
  const prevCompanyIdRef = useRef<string | null | undefined>(undefined);

  // Reset offset and data HANYA saat active company benar-benar berganti
  useEffect(() => {
    if (prevCompanyIdRef.current !== undefined && prevCompanyIdRef.current !== activeCompanyId) {
      setNotifications([]);
      setOffset(0);
      setIsLoading(true);
    }
    prevCompanyIdRef.current = activeCompanyId;
  }, [activeCompanyId]);

  useEffect(() => {
    const handleCompanyChanged = () => {
      setNotifications([]);
      setOffset(0);
      setIsLoading(true);
    };
    window.addEventListener("companyChanged", handleCompanyChanged);
    return () => window.removeEventListener("companyChanged", handleCompanyChanged);
  }, []);

  // Reset offset when filter, search, or date changes
  useEffect(() => {
    setOffset(0);
  }, [activeCategory, searchQuery, appliedStartDate, appliedEndDate]);

  const fetchNotifications = useCallback(async () => {
    const compId = activeCompanyId || getActiveCompanyId();
    activeFetchCompanyIdRef.current = compId;
    try {
      const cacheKey = buildCacheKey("notifications", compId, {
        limit,
        offset,
        searchQuery,
        activeCategory,
        appliedStartDate,
        appliedEndDate
      });

      const cached = getCachedData<any[]>(cacheKey);
      if (cached) {
        setNotifications(cached.data);
        if (typeof cached.total === "number") setTotalNotifications(cached.total);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (activeCategory && activeCategory !== "Semua") params.set("category", activeCategory);
      if (appliedStartDate) params.set("start_date", appliedStartDate);
      if (appliedEndDate) params.set("end_date", appliedEndDate);

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (compId) {
        headers["x-company-id"] = compId;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications?${params.toString()}`, {
        headers
      });
      const json = await res.json();
      if (activeFetchCompanyIdRef.current !== compId) return;

      if (json.success) {
        const items = json.data || [];
        const total = json.pagination?.total ?? json.meta?.total ?? (json.data?.length || 0);
        setNotifications(items);
        setTotalNotifications(total);
        setCachedData(cacheKey, items, total);
      } else {
        setError(json.message);
      }
    } catch (err: any) {
      if (activeFetchCompanyIdRef.current !== compId) return;
      setError(err.message || "Gagal mengambil data");
    } finally {
      if (activeFetchCompanyIdRef.current === compId) {
        setIsLoading(false);
      }
    }
  }, [activeCompanyId, limit, offset, searchQuery, activeCategory, appliedStartDate, appliedEndDate]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const getIconAndCategory = (type: string) => {
    switch(type) {
      case "LEAVE_PENDING":
      case "LEAVE_APPROVED":
      case "LEAVE_REJECTED":
        return { category: "Izin & Cuti", icon: <Bell className="w-5 h-5 text-[#356E3B]" />, bgIcon: "bg-[#eef5f0]" };
      case "ATTENDANCE_REMINDER":
        return { category: "Absensi", icon: <Clock className="w-5 h-5 text-[#3B82F6]" />, bgIcon: "bg-[#eff6ff]" };
      case "AGENDA_UPCOMING":
        return { category: "Absensi", icon: <Calendar className="w-5 h-5 text-[#F59E0B]" />, bgIcon: "bg-[#fffbeb]" };
      case "JOIN_REQUEST_PENDING":
      case "JOIN_REQUEST_APPROVED":
      case "JOIN_REQUEST_REJECTED":
        return { category: "Sistem", icon: <Users className="w-5 h-5 text-[#0D9488]" />, bgIcon: "bg-[#f0fdfa]" };
      case "NEW_ANNOUNCEMENT":
        return { category: "Sistem", icon: <Megaphone className="w-5 h-5 text-[#8B5CF6]" />, bgIcon: "bg-[#f5f3ff]" };
      default:
        return { category: "Sistem", icon: <Info className="w-5 h-5 text-[#0EA5E9]" />, bgIcon: "bg-[#f0f9ff]" };
    }
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Baru saja";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
    return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
  };

  const handleNotificationClick = async (notif: any) => {
    invalidateCache("notifications");
    await handleNotificationNavigation(
      notif,
      { activeCompanyId, activeRole, memberships, switchCompany },
      router,
      (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    );
  };

  // Date Filter Modal Handlers
  const handleApplyFilter = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setIsFilterOpen(false);
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setActiveCalendar(null);
  };

  const openFilter = () => {
    setStartDate(appliedStartDate);
    setEndDate(appliedEndDate);
    setActiveCalendar(null);
    setIsFilterOpen(true);
  };

  const handleDateSelect = (dateStr: string) => {
    if (activeCalendar === "start") {
      setStartDate(dateStr);
      setActiveCalendar("end");
      if (endDate && dateStr > endDate) {
        setEndDate("");
      }
    } else {
      setEndDate(dateStr);
      setActiveCalendar(null);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-8">
      <TopBar 
        title="Aktivitas" 
        onBack={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
          } else {
            router.push("/dashboard");
          }
        }} 
      />

      <div className="px-6 pt-4 flex flex-col gap-4">
        {/* Search & Filter */}
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-[#9CA3AF] absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <input
              type="text"
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-2xl border border-[#E5E7EB] bg-white text-[14px] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={openFilter}
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-colors shadow-sm ${
              appliedStartDate || appliedEndDate 
                ? "bg-[#356E3B] border-[#356E3B] text-white" 
                : "bg-white border-[#E5E7EB] text-[#4B5563] active:scale-95"
            }`}
          >
            <ListFilter className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                activeCategory === category
                  ? "bg-[#356E3B] text-white"
                  : "bg-[#f1f5f2] text-[#5C786C] hover:bg-[#e6ece8]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Info filter tanggal jika aktif */}
        {(appliedStartDate || appliedEndDate) && (
          <p className="text-[#9CA3AF] text-[12px] font-medium mt-1">
            Menampilkan dari {formatDateRange(appliedStartDate, appliedEndDate)}
          </p>
        )}

        {/* Notifications List */}
        <div className="flex flex-col gap-3">
          {isLoading && notifications.length === 0 ? (
            <CardListSkeleton count={4} type="notification" />
          ) : error && notifications.length === 0 ? (
            <p className="text-sm text-red-500 text-center py-6">{error}</p>
          ) : notifications.length > 0 ? (
            <>
              {notifications.map((notif) => {
                const { icon, bgIcon } = getIconAndCategory(notif.type);
                const membershipInfo = parseMembershipNotification(notif.message, notif.type);
                return (
                <div
                  key={`notif-${notif.id}`}
                  onClick={() => handleNotificationClick(notif)}
                  className={`border rounded-[20px] p-4 flex gap-4 items-start shadow-sm active:bg-gray-50 transition-colors cursor-pointer ${notif.is_read ? 'bg-white border-[#E5E7EB]' : 'bg-[#f4f7f5] border-[#356E3B]/20'}`}
                >
                  <div
                    className={`w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0 ${bgIcon}`}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-1">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-[#EF4444] shrink-0" />
                        )}
                        <h3 className={`text-[14px] leading-tight ${notif.is_read ? 'text-[#4B5563] font-semibold' : 'text-[#111827] font-bold'}`}>
                          {notif.title}
                        </h3>
                      </div>
                      <span className="text-[#9CA3AF] text-[11px] whitespace-nowrap shrink-0">
                        {getTimeAgo(notif.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2 mt-0.5">
                      <p className={`text-[13px] leading-snug line-clamp-2 ${notif.is_read ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                        {cleanNotificationMessage(notif.message)}
                      </p>
                      <ChevronRight className="w-5 h-5 text-[#D1D5DB] shrink-0" />
                    </div>
                    {membershipInfo?.approverName && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] font-semibold bg-[#eef5f0] text-[#356E3B] px-2 py-0.5 rounded-full border border-[#356E3B]/15 inline-flex items-center gap-1">
                          <Check className="w-3 h-3 text-[#356E3B]" strokeWidth={2.5} />
                          Disetujui oleh: {membershipInfo.approverName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )})}

              <Pagination
                total={totalNotifications}
                limit={limit}
                offset={offset}
                onPageChange={setOffset}
                isLoading={isLoading}
                label="notifikasi"
                className="mt-2"
              />
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-6">
              {appliedStartDate || appliedEndDate || searchQuery || activeCategory !== "Semua"
                ? "Tidak ada aktivitas yang sesuai."
                : "Belum ada aktivitas."}
            </p>
          )}
        </div>
      </div>

      {/* Filter Modal Overlay */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end w-full sm:max-w-md mx-auto">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity animate-in fade-in duration-300"
            onClick={() => setIsFilterOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="bg-white w-full rounded-t-[32px] pt-3 pb-8 px-6 relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            {/* Handle */}
            <div className="w-12 h-1.5 bg-[#E5E7EB] rounded-full mx-auto mb-6" />
            
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-[18px] font-bold text-[#111827] mb-1">Atur Rentang Tanggal</h2>
                <p className="text-[#6B7280] text-[13px]">Pilih periode riwayat yang ditampilkan</p>
              </div>
              <button 
                onClick={() => setIsFilterOpen(false)}
                className="text-[#9CA3AF] hover:text-[#4B5563] p-1"
              >
                <X className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="h-[1px] w-full bg-[#F3F4F6] mb-6 -mx-6 px-6 box-content" />
            
            {/* Content */}
            <div className="mb-8">
              <p className="text-[#9CA3AF] text-[11px] font-bold uppercase tracking-wider mb-3">
                RENTANG DIPILIH
              </p>
              <div className="flex gap-3">
                {/* Dari Date Picker Button */}
                <div 
                  onClick={() => setActiveCalendar(activeCalendar === "start" ? null : "start")}
                  className={`flex-1 border rounded-2xl p-3.5 flex justify-between items-center cursor-pointer transition-colors ${
                    activeCalendar === "start" ? "border-[#356E3B] bg-[#F7F9F8]" : "border-[#E5E7EB] hover:border-[#356E3B]"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[#9CA3AF] text-[11px] font-medium mb-1">Dari</span>
                    <span className={`text-[14px] font-bold ${activeCalendar === "start" ? "text-[#356E3B]" : "text-[#111827]"}`}>
                      {formatDate(startDate)}
                    </span>
                  </div>
                  <CalendarDays className={`w-5 h-5 ${activeCalendar === "start" ? "text-[#356E3B]" : "text-[#9CA3AF]"}`} strokeWidth={2.5} />
                </div>
                
                {/* Sampai Date Picker Button */}
                <div 
                  onClick={() => setActiveCalendar(activeCalendar === "end" ? null : "end")}
                  className={`flex-1 border rounded-2xl p-3.5 flex justify-between items-center cursor-pointer transition-colors ${
                    activeCalendar === "end" ? "border-[#356E3B] bg-[#F7F9F8]" : "border-[#E5E7EB] hover:border-[#356E3B]"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[#9CA3AF] text-[11px] font-medium mb-1">Sampai</span>
                    <span className={`text-[14px] font-bold ${activeCalendar === "end" ? "text-[#356E3B]" : "text-[#111827]"}`}>
                      {formatDate(endDate)}
                    </span>
                  </div>
                  <CalendarDays className={`w-5 h-5 ${activeCalendar === "end" ? "text-[#356E3B]" : "text-[#9CA3AF]"}`} strokeWidth={2.5} />
                </div>
              </div>

              {/* Custom Calendar Dropdown */}
              {activeCalendar && (
                <CustomCalendar 
                  selectedDate={activeCalendar === "start" ? startDate : endDate}
                  onSelect={handleDateSelect}
                  minDate={activeCalendar === "end" && startDate ? startDate : undefined}
                />
              )}
            </div>
            
            <div className="h-[1px] w-full bg-[#F3F4F6] mb-6 -mx-6 px-6 box-content" />
            
            {/* Actions */}
            <div className="flex gap-3">
              <button 
                className="flex-1 py-4 rounded-full border border-[#E5E7EB] text-[#4B5563] font-bold text-[14px] hover:bg-gray-50 transition-colors active:scale-[0.98]"
                onClick={handleReset}
              >
                Atur Ulang
              </button>
              <button 
                className="flex-[1.5] py-4 rounded-full bg-[#356E3B] text-white font-bold text-[14px] flex justify-center items-center gap-2 hover:bg-[#2A582F] transition-colors active:scale-[0.98] shadow-sm"
                onClick={handleApplyFilter}
              >
                Terapkan Filter
                <Check className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
