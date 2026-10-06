"use client";

import { TopBar } from "@/components/TopBar";
import { useRouter } from "next/navigation";
import { useState, use } from "react";
import { User, FileDown, CalendarDays, CheckCircle2, XCircle, Clock, FileWarning, Search, ListFilter, Check, X } from "lucide-react";
import { CustomCalendar } from "@/components/CustomCalendar";

export default function LaporanDetailUser({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  // Date states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCalendar, setActiveCalendar] = useState<"start" | "end" | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Mock data user
  const emp = {
    name: id === "1" ? "Ayu Lestari" : "Karyawan Default",
    role: "Manajemen",
    email: "email@perusahaan.com"
  };

  // Mock data history (mirip pribadi)
  const dummyHistory = [
    { id: 1, date: "2026-10-17", type: "WFH", checkIn: "11:51", checkOut: null },
    { id: 2, date: "2026-10-16", type: "WFO", checkIn: "07:58", checkOut: "17:05" },
    { id: 3, date: "2026-10-15", type: "WFO", checkIn: "08:05", checkOut: "17:10" },
    { id: 4, date: "2026-10-10", type: "WFH", checkIn: "08:15", checkOut: "17:02" },
    { id: 5, date: "2026-10-02", type: "Cuti", checkIn: null, checkOut: null },
    { id: 6, date: "2026-09-30", type: "WFO", checkIn: "08:00", checkOut: "17:01" },
  ];

  const filteredHistory = dummyHistory.filter(item => {
    if (!appliedStartDate && !appliedEndDate) return true;
    if (appliedStartDate && item.date < appliedStartDate) return false;
    if (appliedEndDate && item.date > appliedEndDate) return false;
    return true;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "Pilih Tanggal";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Pilih Tanggal";
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[d.getDay()];
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      alert(`Rekap absensi ${emp.name} berhasil diunduh!`);
      setIsExporting(false);
    }, 1500);
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
    setStartDate(appliedStartDate);
    setEndDate(appliedEndDate);
    setActiveCalendar(null);
    setIsFilterOpen(true);
  };

  const handleDateSelect = (dateStr: string) => {
    if (activeCalendar === "start") {
      setStartDate(dateStr);
      setActiveCalendar("end");
      if (endDate && dateStr > endDate) setEndDate("");
    } else {
      setEndDate(dateStr);
      setActiveCalendar(null);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8] relative pb-24">
      <TopBar 
        title="Detail Rekap" 
        onBack={() => router.push("/admin/laporan-kehadiran")} 
        rightAction={
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors active:scale-95 disabled:opacity-50"
          >
            <FileDown className="w-5 h-5 text-white" />
          </button>
        }
      />

      <div className="px-6 pt-6 flex flex-col gap-5 z-10 relative">
        {/* Profile Card */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E5E7EB] flex items-center">
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-[#111827] text-[16px] font-bold truncate mb-1">{emp.name}</span>
            <span className="text-gray-500 text-[12px] truncate mb-2">{emp.email}</span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-[6px] w-fit bg-[#E8F3EB] text-[#2D5A3F]">{emp.role}</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white border border-[#E5E7EB] rounded-2xl px-4 py-3.5 flex items-center gap-2 shadow-sm">
            <CalendarDays className="w-5 h-5 text-[#9CA3AF]" />
            <span className="text-[#374151] text-[14px] font-medium truncate">
              {appliedStartDate && appliedEndDate ? `${formatDate(appliedStartDate)} - ${formatDate(appliedEndDate)}` : "Semua Riwayat"}
            </span>
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
          {filteredHistory.length === 0 ? (
            <div className="bg-white rounded-[20px] p-8 border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center text-center">
              <CalendarDays className="w-12 h-12 text-[#D1D5DB] mb-3" />
              <p className="text-[#4B5563] font-medium text-[15px]">Tidak ada riwayat</p>
              <p className="text-[#9CA3AF] text-[13px] mt-1">Coba sesuaikan rentang tanggal filter Anda.</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-[20px] p-5 border border-[#E5E7EB] shadow-sm flex flex-col"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#374151] font-medium text-[15px]">
                    {getDayName(item.date)}, {formatDate(item.date)}
                  </span>
                  <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${item.type === 'Cuti' || item.type === 'Izin' ? 'bg-[#fef2f2] text-[#EF4444]' : 'bg-[#E8F3EB] text-[#2D5A3F]'}`}>
                    {item.type}
                  </span>
                </div>
                
                <div className="h-[1px] w-full bg-[#F3F4F6] mb-4" />
                
                {item.type === 'Cuti' || item.type === 'Izin' ? (
                  <div className="flex items-center justify-center py-2">
                    <span className="text-gray-400 text-[13px] italic">Karyawan Sedang {item.type}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-[#2D5A3F]" strokeWidth={2} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#9CA3AF] text-[12px] font-medium mb-0.5">Jam Masuk</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[#111827] font-bold text-[16px]">{item.checkIn || "—"}</span>
                          {item.checkIn && <span className="text-[#6B7280] text-[12px] font-medium">WIB</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-[1px] h-10 bg-[#F3F4F6] mx-2" />
                    
                    <div className="flex items-start gap-3 flex-1 pl-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.checkOut ? "bg-[#E8F3EB]" : "bg-[#F3F4F6]"}`}>
                        {item.checkOut ? (
                          <CheckCircle2 className="w-6 h-6 text-[#2D5A3F]" strokeWidth={2} />
                        ) : (
                          <XCircle className="w-6 h-6 text-[#D1D5DB]" strokeWidth={2} />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#9CA3AF] text-[12px] font-medium mb-0.5">Jam Keluar</span>
                        {item.checkOut ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-[#111827] font-bold text-[16px]">{item.checkOut}</span>
                            <span className="text-[#6B7280] text-[12px] font-medium">WIB</span>
                          </div>
                        ) : (
                          <span className="text-[#D1D5DB] font-bold text-[16px]">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

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
