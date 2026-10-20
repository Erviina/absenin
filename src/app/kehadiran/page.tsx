"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Search, ListFilter, Download, CheckCircle2, XCircle, X, CalendarDays, Check, RefreshCcw } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { useRouter } from "next/navigation";
import { CustomCalendar } from "@/components/CustomCalendar";
import { TopBar } from "@/components/TopBar";

import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { formatDate, formatDateWithDay } from "@/lib/dateUtils";
import { Pagination } from "@/components/Pagination";
import { getActiveCompanyId } from "@/lib/api"; 
import { CardListSkeleton } from "@/components/CardSkeleton";
import { buildCacheKey, getCachedData, setCachedData } from "@/lib/clientCache";

export default function KehadiranPage() {
  const router = useRouter();
  const { activeCompanyId, isLoading: isCompanyLoading } = useCompany();
  const { showToast } = useDialog();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCalendar, setActiveCalendar] = useState<"start" | "end" | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  
  // Date states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const [attendances, setAttendances] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    const compId = getActiveCompanyId();
    const cacheKey = buildCacheKey("attendances", compId, {
      start: "",
      end: "",
      search: "",
      limit: 10,
      offset: 0,
    });
    return getCachedData<any[]>(cacheKey)?.data || [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const compId = getActiveCompanyId();
    const cacheKey = buildCacheKey("attendances", compId, {
      start: "",
      end: "",
      search: "",
      limit: 10,
      offset: 0,
    });
    return !getCachedData(cacheKey)?.data;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleApplyFilter = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setOffset(0);
    setIsFilterOpen(false);
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setOffset(0);
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

  const activeFetchCompanyIdRef = useRef<string | null>(null);

  const fetchAttendances = async (silent = false) => {
    if (isCompanyLoading) return;
    const compId = activeCompanyId || getActiveCompanyId();
    activeFetchCompanyIdRef.current = compId;
    if (!compId) {
      setAttendances([]);
      setTotal(0);
      setIsLoading(false);
      setError(null);
      return;
    }
    const cacheKey = buildCacheKey("attendances", compId, {
      start: appliedStartDate,
      end: appliedEndDate,
      search: debouncedSearch.trim(),
      limit,
      offset,
    });

    const cached = getCachedData<any[]>(cacheKey);
    if (cached?.data && !silent) {
      setAttendances(cached.data);
      if (cached.total !== undefined) setTotal(cached.total);
      setIsLoading(false);
    } else if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }
      
      let url = `${process.env.NEXT_PUBLIC_API_URL}/attendances`;
      const queryParams = new URLSearchParams();
      if (appliedStartDate) queryParams.append("start_date", appliedStartDate);
      if (appliedEndDate) queryParams.append("end_date", appliedEndDate);
      if (debouncedSearch.trim()) queryParams.append("search", debouncedSearch.trim());
      queryParams.append("limit", String(limit));
      queryParams.append("offset", String(offset));

      const qString = queryParams.toString();
      if (qString) url += `?${qString}`;
      
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`
      };
      if (compId) {
        headers["x-company-id"] = compId;
      }

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (activeFetchCompanyIdRef.current !== compId) return;

      if (!res.ok) {
        throw new Error(data.message || data.error || "Gagal mengambil data kehadiran");
      }
      
      const list = data.data || [];
      const totalCount = Number(data.pagination?.total ?? data.meta?.total ?? list.length);
      setAttendances(list);
      setTotal(totalCount);
      setCachedData(cacheKey, list, totalCount);
    } catch (err: any) {
      if (activeFetchCompanyIdRef.current !== compId) return;
      if (attendances.length === 0) {
        setError(err.message || "Terjadi kesalahan sistem");
      }
    } finally {
      if (activeFetchCompanyIdRef.current === compId) {
        setIsLoading(false);
      }
    }
  };

  const prevCompanyIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Reset state and offset HANYA saat active company benar-benar berganti
    if (prevCompanyIdRef.current !== undefined && prevCompanyIdRef.current !== activeCompanyId) {
      setAttendances([]);
      setOffset(0);
      setIsLoading(true);
    }
    prevCompanyIdRef.current = activeCompanyId;
  }, [activeCompanyId]);

  useEffect(() => {
    const handleCompanyChanged = () => {
      setAttendances([]);
      setOffset(0);
      setIsLoading(true);
    };
    window.addEventListener("companyChanged", handleCompanyChanged);
    return () => window.removeEventListener("companyChanged", handleCompanyChanged);
  }, []);

  useEffect(() => {
    fetchAttendances(false);
  }, [appliedStartDate, appliedEndDate, activeCompanyId, isCompanyLoading, debouncedSearch, offset]);

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[d.getDay()];
  };

  const extractTime = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).replace(/\./g, ':');
  };

  const fetchAllForExport = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const compId = activeCompanyId || getActiveCompanyId();
      if (!token || !compId) return attendances;
      const queryParams = new URLSearchParams();
      if (appliedStartDate) queryParams.append("start_date", appliedStartDate);
      if (appliedEndDate) queryParams.append("end_date", appliedEndDate);
      if (debouncedSearch.trim()) queryParams.append("search", debouncedSearch.trim());
      queryParams.append("limit", "500");
      queryParams.append("offset", "0");
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`,
        "x-company-id": compId
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendances?${queryParams.toString()}`, { headers });
      const data = await res.json();
      return data.data || [];
    } catch {
      return attendances;
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloadOpen(false);
    if (!activeCompanyId) {
      showToast("Silakan bergabung atau pilih perusahaan terlebih dahulu.", "warning");
      return;
    }
    const [{ default: jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = (autoTableModule as any).default || autoTableModule;
    const exportList = await fetchAllForExport();
    const doc = new jsPDF();
    doc.text("Rekap Kehadiran", 14, 15);
    
    const tableData = exportList.map((item: any, idx: number) => [
      idx + 1,
      formatDate(item.check_in_time),
      item.work_mode,
      extractTime(item.check_in_time),
      extractTime(item.check_out_time),
      item.check_in_address || "-"
    ]);

    autoTable(doc, {
      head: [["No", "Tanggal", "Tipe", "Jam Masuk", "Jam Keluar", "Alamat Masuk"]],
      body: tableData,
      startY: 20
    });

    doc.save("Rekap_Kehadiran.pdf");
    showToast("Rekap kehadiran PDF berhasil diunduh!", "success");
  };

  const handleDownloadExcel = async () => {
    setIsDownloadOpen(false);
    if (!activeCompanyId) {
      showToast("Silakan bergabung atau pilih perusahaan terlebih dahulu.", "warning");
      return;
    }
    const XLSX = await import("xlsx");
    const exportList = await fetchAllForExport();
    const excelData = exportList.map((item: any, idx: number) => ({
      No: idx + 1,
      Tanggal: formatDate(item.check_in_time),
      "Tipe": item.work_mode,
      "Jam Masuk": extractTime(item.check_in_time),
      "Jam Keluar": extractTime(item.check_out_time),
      "Alamat Masuk": item.check_in_address || "-",
      "Alamat Keluar": item.check_out_address || "-"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kehadiran");
    XLSX.writeFile(workbook, "Rekap_Kehadiran.xlsx");
    showToast("Rekap kehadiran Excel berhasil diunduh!", "success");
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8] relative pb-32">
      {/* Header */}
      <TopBar 
        title="Kehadiran" 
        onBack={() => {
          if (isFilterOpen) {
            setIsFilterOpen(false);
          } else if (isDownloadOpen) {
            setIsDownloadOpen(false);
          } else {
            router.push("/dashboard");
          }
        }} 
        rightAction={
          <div className="relative">
            <button 
              onClick={() => setIsDownloadOpen(!isDownloadOpen)}
              className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition-all z-10"
              aria-label="Unduh Rekap Kehadiran"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
            
            {isDownloadOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsDownloadOpen(false)}
                />
                <div className="absolute top-12 right-0 w-40 bg-white rounded-xl shadow-lg border border-[#E5E7EB] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button 
                    onClick={handleDownloadPDF}
                    className="w-full text-left px-4 py-2 text-[13px] font-medium text-[#4B5563] hover:bg-[#F3F4F6] transition-colors"
                  >
                    Unduh PDF
                  </button>
                  <button 
                    onClick={handleDownloadExcel}
                    className="w-full text-left px-4 py-2 text-[13px] font-medium text-[#4B5563] hover:bg-[#F3F4F6] transition-colors"
                  >
                    Unduh Excel
                  </button>
                </div>
              </>
            )}
          </div>
        }
      />

      <div className="px-6 pt-6 flex flex-col gap-5">
        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-[#9CA3AF] absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <input 
              type="text" 
              placeholder="Cari (tanggal, wfo/wfh, alamat)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-2xl border border-[#E5E7EB] bg-white text-[14px] focus:outline-none focus:border-[#2D5A3F] focus:ring-1 focus:ring-[#2D5A3F] transition-all"
            />
          </div>
          <button 
            onClick={openFilter}
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-colors ${
              appliedStartDate || appliedEndDate 
                ? "bg-[#2D5A3F] border-[#2D5A3F] text-white" 
                : "bg-white border-[#E5E7EB] text-[#2D5A3F] hover:bg-gray-50"
            }`}
          >
            <ListFilter className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* History Cards */}
        <div className="flex flex-col gap-4">
          
          {isLoading && attendances.length === 0 ? (
            <CardListSkeleton count={3} type="attendance" />
          ) : error && attendances.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <p className="text-red-600 font-medium text-[14px]">Gagal Memuat Data</p>
              <p className="text-[#9CA3AF] text-[13px] mt-1 mb-3">{error}</p>
              <button 
                onClick={() => fetchAttendances()}
                className="px-5 h-9 rounded-full bg-[#356E3B] text-white font-medium text-[13px] flex items-center gap-2 hover:bg-[#1E4738] transition-colors"
              >
                <RefreshCcw className="w-3.5 h-3.5" /> Coba Lagi
              </button>
            </div>
          ) : attendances.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              {appliedStartDate || appliedEndDate || debouncedSearch
                ? "Tidak ada riwayat kehadiran yang sesuai."
                : "Belum ada riwayat kehadiran."}
            </p>
          ) : (
            attendances.map((item) => (
              <div 
                key={item.id} 
                onClick={() => router.push(`/kehadiran/${item.id}`)}
                className="bg-white rounded-[20px] p-5 border border-[#E5E7EB] shadow-sm flex flex-col cursor-pointer hover:border-[#356E3B] transition-colors"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#374151] font-medium text-[15px]">
                    {formatDateWithDay(item.check_in_time)}
                  </span>
                  <span className="bg-[#E8F3EB] text-[#2D5A3F] text-[12px] font-bold px-3 py-1 rounded-full uppercase">
                    {item.work_mode}
                  </span>
                </div>
                
                <div className="h-[1px] w-full bg-[#F3F4F6] mb-4" />
                
                <div className="flex justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-[#2D5A3F]" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[#9CA3AF] text-[12px] font-medium mb-0.5">Jam Masuk</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[#111827] font-bold text-[16px]">{extractTime(item.check_in_time)}</span>
                        <span className="text-[#6B7280] text-[12px] font-medium">WIB</span>
                      </div>
                      {item.is_terlambat && (
                        <span className="mt-1 bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Terlambat
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-[1px] h-10 bg-[#F3F4F6] mx-2" />
                  
                  <div className="flex items-start gap-3 flex-1 pl-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.check_out_time ? "bg-[#E8F3EB]" : "bg-[#F3F4F6]"}`}>
                      {item.check_out_time ? (
                        <CheckCircle2 className="w-6 h-6 text-[#2D5A3F]" strokeWidth={2} />
                      ) : (
                        <XCircle className="w-6 h-6 text-[#D1D5DB]" strokeWidth={2} />
                      )}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[#9CA3AF] text-[12px] font-medium mb-0.5">Jam Keluar</span>
                      {item.check_out_time ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[#111827] font-bold text-[16px]">{extractTime(item.check_out_time)}</span>
                            <span className="text-[#6B7280] text-[12px] font-medium">WIB</span>
                          </div>
                          {item.is_pulang_cepat && (
                            <span className="mt-1 bg-orange-50 text-orange-700 border border-orange-200/60 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Pulang Cepat
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[#D1D5DB] font-bold text-[16px]">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

        </div>

        {/* Pagination Component */}
        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          onPageChange={(newOffset) => setOffset(newOffset)}
          label="riwayat"
          isLoading={isLoading}
        />

      </div>



      {/* Bottom Navigation */}
      <BottomNav activeTab="kehadiran" />

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
                <p className="text-[#6B7280] text-[13px]">Pilih periode riwayat kehadiran yang ditampilkan</p>
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
                    activeCalendar === "start" ? "border-[#2D5A3F] bg-[#F7F9F8]" : "border-[#E5E7EB] hover:border-[#2D5A3F]"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[#9CA3AF] text-[11px] font-medium mb-1">Dari</span>
                    <span className={`text-[14px] font-bold ${activeCalendar === "start" ? "text-[#2D5A3F]" : "text-[#111827]"}`}>
                      {formatDate(startDate)}
                    </span>
                  </div>
                  <CalendarDays className={`w-5 h-5 ${activeCalendar === "start" ? "text-[#2D5A3F]" : "text-[#9CA3AF]"}`} strokeWidth={2.5} />
                </div>
                
                {/* Sampai Date Picker Button */}
                <div 
                  onClick={() => setActiveCalendar(activeCalendar === "end" ? null : "end")}
                  className={`flex-1 border rounded-2xl p-3.5 flex justify-between items-center cursor-pointer transition-colors ${
                    activeCalendar === "end" ? "border-[#2D5A3F] bg-[#F7F9F8]" : "border-[#E5E7EB] hover:border-[#2D5A3F]"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[#9CA3AF] text-[11px] font-medium mb-1">Sampai</span>
                    <span className={`text-[14px] font-bold ${activeCalendar === "end" ? "text-[#2D5A3F]" : "text-[#111827]"}`}>
                      {formatDate(endDate)}
                    </span>
                  </div>
                  <CalendarDays className={`w-5 h-5 ${activeCalendar === "end" ? "text-[#2D5A3F]" : "text-[#9CA3AF]"}`} strokeWidth={2.5} />
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
