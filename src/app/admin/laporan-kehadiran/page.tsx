"use client";

import { TopBar } from "@/components/TopBar";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { Search, ListFilter, Check, User, ChevronRight, ChevronLeft, FileDown, CalendarDays, CheckCircle2, Clock, FileWarning, Loader2, X } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function LaporanKehadiranPage() {
  const router = useRouter();
  
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  });
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const [dataKaryawan, setDataKaryawan] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }

        const [monthName, yearString] = selectedMonth.split(" ");
        const monthNum = monthNames.indexOf(monthName) + 1;
        const yearNum = parseInt(yearString);

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendances/management/summary?month=${monthNum}&year=${yearNum}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (res.status === 401 || res.status === 403) {
          router.push("/dashboard"); // fallback if not admin
          return;
        }

        if (data.success) {
          setDataKaryawan(data.data);
        } else {
          setError(data.message || "Gagal memuat laporan kehadiran");
        }
      } catch (err) {
        console.error("Fetch summary error:", err);
        setError("Terjadi kesalahan jaringan");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, [selectedMonth, router]);

  const handlePrevMonth = () => {
    const [monthName, yearString] = selectedMonth.split(" ");
    let monthIdx = monthNames.indexOf(monthName);
    let year = parseInt(yearString);
    if (monthIdx === 0) {
      monthIdx = 11;
      year -= 1;
    } else {
      monthIdx -= 1;
    }
    setSelectedMonth(`${monthNames[monthIdx]} ${year}`);
  };

  const handleNextMonth = () => {
    const [monthName, yearString] = selectedMonth.split(" ");
    let monthIdx = monthNames.indexOf(monthName);
    let year = parseInt(yearString);
    if (monthIdx === 11) {
      monthIdx = 0;
      year += 1;
    } else {
      monthIdx += 1;
    }
    setSelectedMonth(`${monthNames[monthIdx]} ${year}`);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setActiveStatusFilter(null);
    setIsFilterMenuOpen(false);
  };

  const filteredData = useMemo(() => {
    return dataKaryawan.filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchStatus = true;
      if (activeStatusFilter === "Hadir") {
        matchStatus = emp.hadir > 0;
      } else if (activeStatusFilter === "Terlambat") {
        matchStatus = emp.terlambat > 0;
      } else if (activeStatusFilter === "Izin") {
        matchStatus = emp.izin > 0;
      } else if (activeStatusFilter === "Tidak Hadir") {
        matchStatus = emp.total === 0;
      }

      return matchSearch && matchStatus;
    });
  }, [dataKaryawan, searchQuery, activeStatusFilter]);

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredData.length && filteredData.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredData.map(e => e.id));
    }
  };

  const toggleItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleExport = (type: 'pdf' | 'xlsx') => {
    if (selectedItems.length === 0) return;
    setIsExporting(true);
    
    try {
      const selectedData = dataKaryawan.filter(emp => selectedItems.includes(emp.id));
      const [monthName, yearString] = selectedMonth.split(" ");
      const fileName = `laporan-kehadiran-${monthName}-${yearString}`;
      
      const tableColumn = ["No", "Nama", "Email", "Hadir", "Izin", "Terlambat", "Total"];
      const tableRows = selectedData.map((emp, index) => [
        index + 1,
        emp.name || "-",
        emp.email || "-", // API currently doesn't return email, fallback to "-"
        emp.hadir || 0,
        emp.izin || 0,
        emp.terlambat || 0,
        emp.total || 0
      ]);

      if (type === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(16);
        doc.text("LAPORAN KEHADIRAN KARYAWAN", 14, 20);
        doc.setFontSize(11);
        doc.text(`Periode: ${selectedMonth}`, 14, 28);
        
        autoTable(doc, {
          startY: 35,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [45, 90, 63] } // matching #2D5A3F
        });
        
        doc.save(`${fileName}.pdf`);
      } else if (type === 'xlsx') {
        const wsData = [
          ["LAPORAN KEHADIRAN KARYAWAN"],
          [`Periode: ${selectedMonth}`],
          [],
          tableColumn,
          ...tableRows
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan Kehadiran");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      }
    } catch (err) {
      console.error("Export error", err);
      // fallback without alert per requirements, just log it.
    } finally {
      setIsExporting(false);
      setSelectedItems([]);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      {/* Header */}
      <TopBar title="Laporan Kehadiran" onBack={() => router.push("/admin/dashboard")} />

      <div className="flex-1 px-5 py-5 flex flex-col gap-4 z-10 relative">
        
        {/* Date Filter & Search */}
        <div className="flex flex-col gap-3">
          <div className="bg-white border border-gray-100 rounded-[16px] p-1 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <button onClick={handlePrevMonth} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-full active:scale-95 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#356E3B]" />
              <span className="text-[#1E4738] font-bold text-[14px]">{selectedMonth}</span>
            </div>
            <button onClick={handleNextMonth} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-full active:scale-95 transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-3 mt-1 relative">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
              <input 
                type="text" 
                placeholder="Cari nama karyawan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-[16px] pl-12 pr-10 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className={`w-[50px] h-[50px] bg-white border ${activeStatusFilter ? 'border-[#356E3B] text-[#356E3B]' : 'border-gray-100 text-gray-500'} rounded-[16px] flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] active:scale-95 transition-transform`}
              >
                <ListFilter className="w-5 h-5" strokeWidth={2} />
              </button>
              
              {isFilterMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-[16px] shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center">
                      <span className="text-[12px] font-bold text-[#1E4738]">Filter Status</span>
                      {(activeStatusFilter || searchQuery) && (
                        <button onClick={resetFilters} className="text-[10px] text-red-500 font-medium hover:underline">Reset</button>
                      )}
                    </div>
                    <button 
                      onClick={() => { setActiveStatusFilter(null); setIsFilterMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors ${!activeStatusFilter ? 'bg-[#f4f9f6] text-[#356E3B]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Semua
                    </button>
                    <button 
                      onClick={() => { setActiveStatusFilter("Hadir"); setIsFilterMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors ${activeStatusFilter === 'Hadir' ? 'bg-[#f4f9f6] text-[#356E3B]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Hadir
                    </button>
                    <button 
                      onClick={() => { setActiveStatusFilter("Terlambat"); setIsFilterMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors ${activeStatusFilter === 'Terlambat' ? 'bg-[#f4f9f6] text-[#356E3B]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Terlambat
                    </button>
                    <button 
                      onClick={() => { setActiveStatusFilter("Izin"); setIsFilterMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors ${activeStatusFilter === 'Izin' ? 'bg-[#f4f9f6] text-[#356E3B]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Izin
                    </button>
                    <button 
                      onClick={() => { setActiveStatusFilter("Tidak Hadir"); setIsFilterMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors ${activeStatusFilter === 'Tidak Hadir' ? 'bg-[#f4f9f6] text-[#356E3B]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Tidak Hadir
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* List Section */}
        <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] p-5 flex flex-col gap-4 mt-2 mb-20">
          
          {/* Header List */}
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#111827] text-[14px] font-bold">Pilih Karyawan</span>
            
            <label className="flex items-center gap-2 cursor-pointer active:opacity-70 group" onClick={(e) => e.preventDefault()}>
               <span className="text-[12px] text-gray-500 font-medium group-hover:text-[#356E3B] transition-colors">Pilih Semua</span>
               <div 
                 onClick={toggleSelectAll}
                 className={`w-5 h-5 rounded-[6px] border-[1.5px] flex items-center justify-center transition-colors ${selectedItems.length > 0 && selectedItems.length === filteredData.length ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}
               >
                 {selectedItems.length > 0 && selectedItems.length === filteredData.length && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
               </div>
            </label>
          </div>

          {/* List Items */}
          <div className="flex flex-col gap-3">
            {isLoading ? (
              <div className="py-10 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#356E3B] mb-2" />
                <span className="text-[13px]">Memuat data...</span>
              </div>
            ) : error ? (
              <div className="py-10 text-center text-red-500 text-[13px]">{error}</div>
            ) : filteredData.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-[13px]">Karyawan tidak ditemukan</div>
            ) : (
              filteredData.map((emp) => (
                <div 
                  key={emp.id} 
                  className={`flex items-start gap-3 p-4 rounded-[16px] border transition-colors ${selectedItems.includes(emp.id) ? 'bg-[#f4f9f6] border-[#356E3B]/30' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                >
                  {/* Checkbox */}
                  <div 
                    onClick={() => toggleItem(emp.id)}
                    className="pt-2 cursor-pointer shrink-0"
                  >
                    <div className={`w-5 h-5 rounded-[6px] border-[1.5px] flex items-center justify-center transition-colors ${selectedItems.includes(emp.id) ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}>
                      {selectedItems.includes(emp.id) && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                  </div>

                  {/* Rest of the Card */}
                  <div 
                    className="flex flex-col flex-1 gap-3 cursor-pointer group"
                    onClick={() => router.push(`/admin/laporan-kehadiran/${emp.id}`)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="text-[#111827] text-[14px] font-bold leading-none truncate mb-1.5 group-hover:text-[#356E3B] transition-colors">{emp.name}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-[6px] w-fit ${emp.role === 'Manajemen' ? 'bg-[#eef5f0] text-[#356E3B]' : 'bg-gray-100 text-gray-500'}`}>
                          {emp.role}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </div>

                  {/* Summary Bar */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100/60">
                    <div className="flex items-center gap-1.5">
                       <CheckCircle2 className="w-3.5 h-3.5 text-[#356E3B]" />
                       <span className="text-[11px] text-[#1E4738] font-bold">{emp.hadir}/{emp.total} <span className="font-normal text-gray-500">Hadir</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                       <span className="text-[11px] text-[#F59E0B] font-bold">{emp.terlambat} <span className="font-normal text-gray-500">Telat</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <FileWarning className="w-3.5 h-3.5 text-[#EF4444]" />
                       <span className="text-[11px] text-[#EF4444] font-bold">{emp.izin} <span className="font-normal text-gray-500">Izin</span></span>
                    </div>
                  </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Floating Export Button */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-6 pt-4 bg-gradient-to-t from-white via-white to-transparent z-50 animate-in slide-in-from-bottom-5 pointer-events-none">
          <div className="w-full flex gap-3 pointer-events-auto">
            <button 
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#EF4444] text-white rounded-[16px] font-bold text-[14px] active:scale-95 transition-all shadow-lg shadow-[#EF4444]/20 disabled:opacity-70 disabled:scale-100"
            >
              <FileDown className="w-5 h-5" />
              {isExporting ? "Memproses..." : "Export PDF"}
            </button>
            <button 
              onClick={() => handleExport('xlsx')}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#356E3B] text-white rounded-[16px] font-bold text-[14px] active:scale-95 transition-all shadow-lg shadow-[#356E3B]/20 disabled:opacity-70 disabled:scale-100"
            >
              <FileDown className="w-5 h-5" />
              {isExporting ? "Memproses..." : "Export XLSX"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
