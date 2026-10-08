"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Search, ListFilter, Download, CheckCircle2, XCircle, X, CalendarDays, Check, RefreshCcw } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { useRouter } from "next/navigation";
import { CustomCalendar } from "@/components/CustomCalendar";
import { TopBar } from "@/components/TopBar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function KehadiranPage() {
  const router = useRouter();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCalendar, setActiveCalendar] = useState<"start" | "end" | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  
  // Date states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [attendances, setAttendances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Pilih Tanggal";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Pilih Tanggal";
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

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
    // Sync current applied state to modal inputs when opening
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

  const fetchAttendances = async () => {
    setIsLoading(true);
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
      const qString = queryParams.toString();
      if (qString) url += `?${qString}`;
      
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Gagal mengambil data kehadiran");
      }
      
      setAttendances(data.data || []);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendances();
  }, [appliedStartDate, appliedEndDate]);

  const searchedAttendances = attendances.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const dateStr = formatDate(item.check_in_time).toLowerCase();
    const mode = (item.work_mode || "").toLowerCase();
    const addressIn = (item.check_in_address || "").toLowerCase();
    const addressOut = (item.check_out_address || "").toLowerCase();
    
    return dateStr.includes(q) || mode.includes(q) || addressIn.includes(q) || addressOut.includes(q);
  });

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

  const handleDownloadPDF = () => {
    setIsDownloadOpen(false);
    const doc = new jsPDF();
    doc.text("Rekap Kehadiran", 14, 15);
    
    const tableData = searchedAttendances.map((item, idx) => [
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
  };

  const handleDownloadExcel = () => {
    setIsDownloadOpen(false);
    const excelData = searchedAttendances.map((item, idx) => ({
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
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8] relative pb-32">
      {/* Header */}
      <TopBar 
        title="Kehadiran" 
        onBack={() => router.push("/dashboard")} 
        rightAction={
          <div className="relative">
            <button 
              onClick={() => setIsDownloadOpen(!isDownloadOpen)}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
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
          
          {isLoading ? (
            <div className="bg-white rounded-[20px] p-8 border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 border-4 border-[#356E3B]/20 border-t-[#356E3B] rounded-full animate-spin mb-4" />
              <p className="text-[#4B5563] font-medium text-[14px]">Memuat riwayat kehadiran...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-[20px] p-8 border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center text-center">
              <XCircle className="w-12 h-12 text-red-400 mb-3" />
              <p className="text-red-600 font-medium text-[15px]">Gagal Memuat Data</p>
              <p className="text-[#9CA3AF] text-[13px] mt-1 mb-4">{error}</p>
              <button 
                onClick={fetchAttendances}
                className="px-6 h-10 rounded-full bg-[#356E3B] text-white font-bold text-[13px] flex items-center gap-2 hover:bg-[#1E4738] transition-colors"
              >
                <RefreshCcw className="w-4 h-4" /> Coba Lagi
              </button>
            </div>
          ) : searchedAttendances.length === 0 ? (
            <div className="bg-white rounded-[20px] p-8 border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center text-center">
              <CalendarDays className="w-12 h-12 text-[#D1D5DB] mb-3" />
              <p className="text-[#4B5563] font-medium text-[15px]">Belum ada riwayat kehadiran.</p>
              {appliedStartDate || appliedEndDate ? (
                <p className="text-[#9CA3AF] text-[13px] mt-1">Coba sesuaikan rentang tanggal filter Anda.</p>
              ) : null}
            </div>
          ) : (
            searchedAttendances.map((item) => (
              <div 
                key={item.id} 
                onClick={() => router.push(`/kehadiran/${item.id}`)}
                className="bg-white rounded-[20px] p-5 border border-[#E5E7EB] shadow-sm flex flex-col cursor-pointer hover:border-[#356E3B] transition-colors"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#374151] font-medium text-[15px]">
                    {getDayName(item.check_in_time)}, {formatDate(item.check_in_time)}
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
                    <div className="flex flex-col">
                      <span className="text-[#9CA3AF] text-[12px] font-medium mb-0.5">Jam Masuk</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[#111827] font-bold text-[16px]">{extractTime(item.check_in_time)}</span>
                        <span className="text-[#6B7280] text-[12px] font-medium">WIB</span>
                      </div>
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
                    <div className="flex flex-col">
                      <span className="text-[#9CA3AF] text-[12px] font-medium mb-0.5">Jam Keluar</span>
                      {item.check_out_time ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-[#111827] font-bold text-[16px]">{extractTime(item.check_out_time)}</span>
                          <span className="text-[#6B7280] text-[12px] font-medium">WIB</span>
                        </div>
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

        {/* Footer Text */}
        <p className="text-center text-[#9CA3AF] text-[13px] font-medium mt-6 mb-24">
          {appliedStartDate && appliedEndDate 
            ? `Menampilkan riwayat periode ${formatDate(appliedStartDate)} - ${formatDate(appliedEndDate)}`
            : "Menampilkan semua riwayat kehadiran"}
        </p>

      </div>



      {/* Bottom Navigation */}
      <BottomNav activeTab="kehadiran" />

      {/* Filter Modal Overlay */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end max-w-md mx-auto">
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
