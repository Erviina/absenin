"use client";

import { TopBar } from "@/components/TopBar";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Search, ListFilter, Check, User, ChevronRight, ChevronLeft, FileDown, CalendarDays, CheckCircle2, Clock, FileWarning } from "lucide-react";

export default function LaporanKehadiranPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Oktober 2026");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Data Dummy Karyawan dengan rekap kehadiran
  const dataKaryawan = useMemo(() => [
    { id: "1", name: "Ayu Lestari", role: "Manajemen", hadir: 18, izin: 1, terlambat: 1, total: 20 },
    { id: "2", name: "Budi Santoso", role: "Karyawan", hadir: 20, izin: 0, terlambat: 0, total: 20 },
    { id: "3", name: "Citra Dewi", role: "Karyawan", hadir: 17, izin: 2, terlambat: 1, total: 20 },
    { id: "4", name: "Dika Pratama", role: "Karyawan", hadir: 15, izin: 0, terlambat: 5, total: 20 },
    { id: "5", name: "Rina Aprilia", role: "Karyawan", hadir: 19, izin: 1, terlambat: 0, total: 20 },
    { id: "6", name: "Fajar Nugroho", role: "Karyawan", hadir: 16, izin: 3, terlambat: 1, total: 20 },
  ], []);

  const filteredData = useMemo(() => {
    return dataKaryawan.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [dataKaryawan, searchQuery]);

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

  const handleExport = () => {
    if (selectedItems.length === 0) return;
    setIsExporting(true);
    setTimeout(() => {
      alert(`Berhasil mengekspor rekap kehadiran untuk ${selectedItems.length} karyawan! (Data tersimpan di perangkat)`);
      setIsExporting(false);
      setSelectedItems([]);
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      {/* Header */}
      <TopBar title="Laporan Kehadiran" onBack={() => router.push("/admin/dashboard")} />

      <div className="flex-1 px-5 py-5 flex flex-col gap-4 z-10 relative">
        
        {/* Date Filter & Search */}
        <div className="flex flex-col gap-3">
          <div className="bg-white border border-gray-100 rounded-[16px] p-1 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-full active:scale-95 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#356E3B]" />
              <span className="text-[#1E4738] font-bold text-[14px]">{selectedMonth}</span>
            </div>
            <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-full active:scale-95 transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-3 mt-1">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
              <input 
                type="text" 
                placeholder="Cari nama karyawan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-[16px] pl-12 pr-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
              />
            </div>
            <button className="w-[50px] h-[50px] bg-white border border-gray-100 rounded-[16px] flex items-center justify-center text-gray-500 shadow-[0_2px_12px_rgba(0,0,0,0.02)] active:scale-95 transition-transform">
              <ListFilter className="w-5 h-5" strokeWidth={2} />
            </button>
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
            {filteredData.length === 0 ? (
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
          <div className="w-full pointer-events-auto">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#356E3B] text-white rounded-[16px] font-bold text-[14px] active:scale-95 transition-all shadow-lg shadow-[#356E3B]/20 disabled:opacity-70 disabled:scale-100"
            >
              {isExporting ? (
                "Mengekspor data..."
              ) : (
                <>
                  <FileDown className="w-5 h-5" />
                  Export {selectedItems.length} Laporan (.PDF / .XLSX)
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
