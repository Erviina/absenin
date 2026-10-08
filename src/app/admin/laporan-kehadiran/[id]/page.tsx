"use client";

import { TopBar } from "@/components/TopBar";
import { useRouter } from "next/navigation";
import { useState, use, useEffect } from "react";
import { User, FileDown, CalendarDays, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function LaporanDetailUser({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [employee, setEmployee] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
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

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendances/management/employees/${id}?month=${monthNum}&year=${yearNum}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (res.status === 401 || res.status === 403) {
          router.push("/admin/dashboard");
          return;
        }

        if (data.success) {
          setEmployee(data.data.employee);
          setSummary(data.data.summary);
          setAttendances(data.data.attendances || []);
        } else {
          setError(data.message || "Gagal memuat detail kehadiran");
        }
      } catch (err) {
        console.error("Fetch detail error:", err);
        setError("Terjadi kesalahan jaringan");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [selectedMonth, id, router]);

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

  const formatDate = (dateString: string) => {
    if (!dateString) return "Pilih Tanggal";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Pilih Tanggal";
    return `${date.getDate().toString().padStart(2, '0')} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[d.getDay()];
  };

  const handleExport = (type: 'pdf' | 'xlsx') => {
    if (!employee || attendances.length === 0) return;

    const [monthName, yearString] = selectedMonth.split(" ");
    const sanitizedName = (employee.full_name || "Karyawan").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `rekap-${sanitizedName}-${monthName.toLowerCase()}-${yearString}`;

    // Header CSV
    const tableColumn = ["Tanggal", "Check In", "Check Out", "Mode Kerja", "Alamat Check In", "Alamat Check Out", "Status"];
    
    // Baris CSV
    const tableRows = attendances.map(item => {
      const tanggal = item.check_in_time ? formatDate(item.check_in_time) : "-";
      const checkIn = item.check_in_time ? new Date(item.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "-";
      const checkOut = item.check_out_time ? new Date(item.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "-";
      const mode = item.work_mode || "-";
      const addrIn = item.check_in_address || "-";
      const addrOut = item.check_out_address || "-";
      const status = item.work_mode ? "Hadir" : "Cuti/Izin"; // since attendances table only has presence
      return [tanggal, checkIn, checkOut, mode, addrIn, addrOut, status];
    });

    if (type === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(16);
        doc.text("REKAP KEHADIRAN KARYAWAN", 14, 20);
        
        doc.setFontSize(11);
        doc.text(`Nama: ${employee.full_name || "-"}`, 14, 30);
        doc.text(`Email: ${employee.email || "-"}`, 14, 36);
        doc.text(`Role: ${employee.role || "-"}`, 14, 42);
        doc.text(`Periode: ${selectedMonth}`, 14, 48);
        doc.text(`Ringkasan: Hadir (${summary?.hadir || 0}) | Izin (${summary?.izin || 0}) | Terlambat (${summary?.terlambat || 0}) | Total (${summary?.total || 0})`, 14, 54);
        
        autoTable(doc, {
          startY: 60,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [45, 90, 63] },
          styles: { fontSize: 9 }
        });
        
        doc.save(`${fileName}.pdf`);
    } else {
        const wsData = [
          ["REKAP KEHADIRAN KARYAWAN"],
          [`Nama`, employee.full_name || "-"],
          [`Email`, employee.email || "-"],
          [`Role`, employee.role || "-"],
          [`Periode`, selectedMonth],
          [`Hadir`, summary?.hadir || 0],
          [`Izin`, summary?.izin || 0],
          [`Terlambat`, summary?.terlambat || 0],
          [`Total`, summary?.total || 0],
          [],
          tableColumn,
          ...tableRows
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekap Kehadiran");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8] relative pb-24">
      <TopBar 
        title="Detail Rekap" 
        onBack={() => router.push("/admin/laporan-kehadiran")} 
        rightAction={
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isLoading || !employee || attendances.length === 0}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors active:scale-95 disabled:opacity-50"
            >
              <FileDown className="w-5 h-5 text-white" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-[16px] shadow-lg border border-gray-100 p-2 flex flex-col gap-1 z-50">
                <button onClick={() => { setShowExportMenu(false); handleExport('pdf'); }} className="text-left px-3 py-2 text-[13px] font-medium rounded-[8px] hover:bg-gray-50 text-[#111827]">Export PDF</button>
                <button onClick={() => { setShowExportMenu(false); handleExport('xlsx'); }} className="text-left px-3 py-2 text-[13px] font-medium rounded-[8px] hover:bg-gray-50 text-[#111827]">Export XLSX</button>
              </div>
            )}
          </div>
        }
      />

      <div className="px-6 pt-6 flex flex-col gap-5 z-10 relative">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#9CA3AF]">
            <Loader2 className="w-10 h-10 animate-spin text-[#2D5A3F] mb-4" />
            <span className="text-[14px] font-medium">Memuat detail karyawan...</span>
          </div>
        ) : error ? (
          <div className="py-20 text-center text-red-500 text-[14px] font-medium">{error}</div>
        ) : employee && (
          <>
            {/* Profile Card */}
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E5E7EB] flex items-center gap-4">
              <div className="w-14 h-14 bg-[#F3F4F6] rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-gray-200">
                {employee.avatar_url ? (
                  <img src={employee.avatar_url} alt={employee.full_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-[#111827] text-[16px] font-bold truncate mb-1">{employee.full_name}</span>
                <span className="text-gray-500 text-[12px] truncate mb-2">{employee.email || "Tidak ada email"}</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-[6px] w-fit bg-[#E8F3EB] text-[#2D5A3F]">{employee.role}</span>
              </div>
            </div>

            {/* Filter Bulan */}
            <div className="bg-white border border-[#E5E7EB] rounded-[16px] p-1 flex items-center justify-between shadow-sm">
              <button onClick={handlePrevMonth} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-full active:scale-95 transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#2D5A3F]" />
                <span className="text-[#111827] font-bold text-[14px]">{selectedMonth}</span>
              </div>
              <button onClick={handleNextMonth} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-full active:scale-95 transition-all">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Row */}
            {summary && (
              <div className="flex gap-2 mb-1">
                <div className="flex-1 bg-white border border-[#E5E7EB] rounded-[16px] p-3 text-center flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[18px] font-bold text-[#2D5A3F]">{summary.hadir}</span>
                  <span className="text-[10px] font-medium text-gray-500">Hadir</span>
                </div>
                <div className="flex-1 bg-white border border-[#E5E7EB] rounded-[16px] p-3 text-center flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[18px] font-bold text-[#EF4444]">{summary.izin}</span>
                  <span className="text-[10px] font-medium text-gray-500">Izin</span>
                </div>
                <div className="flex-1 bg-white border border-[#E5E7EB] rounded-[16px] p-3 text-center flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[18px] font-bold text-[#F59E0B]">{summary.terlambat}</span>
                  <span className="text-[10px] font-medium text-gray-500">Terlambat</span>
                </div>
              </div>
            )}

            {/* History Cards */}
            <div className="flex flex-col gap-4">
              {attendances.length === 0 ? (
                <div className="bg-white rounded-[20px] p-8 border border-[#E5E7EB] shadow-sm flex flex-col items-center justify-center text-center">
                  <CalendarDays className="w-12 h-12 text-[#D1D5DB] mb-3" />
                  <p className="text-[#4B5563] font-medium text-[15px]">Tidak ada riwayat</p>
                  <p className="text-[#9CA3AF] text-[13px] mt-1">Belum ada data kehadiran pada bulan ini.</p>
                </div>
              ) : (
                attendances.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-white rounded-[20px] p-5 border border-[#E5E7EB] shadow-sm flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[#374151] font-medium text-[15px]">
                        {getDayName(item.check_in_time)}, {formatDate(item.check_in_time)}
                      </span>
                      <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-[#E8F3EB] text-[#2D5A3F]">
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
                            <span className="text-[#111827] font-bold text-[16px]">
                              {new Date(item.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
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
                              <span className="text-[#111827] font-bold text-[16px]">
                                {new Date(item.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
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
          </>
        )}
      </div>
    </div>
  );
}
