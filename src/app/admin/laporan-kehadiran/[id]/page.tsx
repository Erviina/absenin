"use client";

import { TopBar } from "@/components/TopBar";
import { useRouter } from "next/navigation";
import { useState, use, useEffect } from "react";
import { 
  User, 
  FileDown, 
  CalendarDays, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  MapPin,
  Clock,
  Camera,
  ExternalLink,
  ImageOff,
  Maximize2,
  X,
  Info
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatDate, formatDateWithDay, formatTime } from "@/lib/dateUtils";

interface PreviewPhotoData {
  url: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  coords?: string;
}

export default function LaporanDetailUser({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
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

  // Photo Preview Modal
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhotoData | null>(null);

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

        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        const activeCompanyId = localStorage.getItem("activeCompanyId");
        if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendances/management/employees/${id}?month=${monthNum}&year=${yearNum}`, {
          headers
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

  const handleExport = (type: 'pdf' | 'xlsx') => {
    if (!employee || attendances.length === 0) return;

    const [monthName, yearString] = selectedMonth.split(" ");
    const sanitizedName = (employee.full_name || "Karyawan").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `rekap-${sanitizedName}-${monthName.toLowerCase()}-${yearString}`;

    // Header Tabel
    const tableColumn = ["Tanggal", "Check In", "Check Out", "Mode Kerja", "Alamat Check In", "Alamat Check Out", "Status"];
    
    // Baris Data
    const tableRows = attendances.map(item => {
      const tanggal = item.check_in_time ? formatDate(item.check_in_time) : "-";
      const checkIn = item.check_in_time ? `${formatTime(item.check_in_time)} WIB` : "-";
      const checkOut = item.check_out_time ? `${formatTime(item.check_out_time)} WIB` : "-";
      const mode = item.work_mode || "-";
      const addrIn = item.check_in_address || "-";
      const addrOut = item.check_out_address || "-";
      const status = item.is_terlambat ? "Terlambat" : "Disiplin";
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
          headStyles: { fillColor: [53, 110, 59] },
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
        title="Detail Kehadiran" 
        onBack={() => {
          if (previewPhoto) {
            setPreviewPhoto(null);
          } else {
            router.push("/admin/laporan-kehadiran");
          }
        }} 
        rightAction={
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isLoading || !employee || attendances.length === 0}
              className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition-all z-10 disabled:opacity-50"
              aria-label="Ekspor Laporan"
            >
              <FileDown className="w-5 h-5 text-white" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-[16px] shadow-lg border border-gray-100 p-2 flex flex-col gap-1 z-50">
                <button 
                  onClick={() => { setShowExportMenu(false); handleExport('pdf'); }} 
                  className="text-left px-3 py-2 text-[13px] font-medium rounded-[8px] hover:bg-gray-50 text-[#111827]"
                >
                  Export PDF
                </button>
                <button 
                  onClick={() => { setShowExportMenu(false); handleExport('xlsx'); }} 
                  className="text-left px-3 py-2 text-[13px] font-medium rounded-[8px] hover:bg-gray-50 text-[#111827]"
                >
                  Export XLSX
                </button>
              </div>
            )}
          </div>
        }
      />

      <div className="px-6 pt-6 flex flex-col gap-5 z-10 relative">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#9CA3AF]">
            <Loader2 className="w-10 h-10 animate-spin text-[#356E3B] mb-4" />
            <span className="text-[14px] font-medium">Memuat detail karyawan...</span>
          </div>
        ) : error ? (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
            <span className="text-red-500 text-[14px] font-medium">{error}</span>
            <button onClick={() => router.push("/admin/laporan-kehadiran")} className="px-5 py-2 rounded-full bg-[#356E3B] text-white text-[13px] font-bold active:scale-95 transition-all shadow-sm">Kembali ke Laporan</button>
          </div>
        ) : employee ? (
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
                {(() => {
                  const r = (employee.role || "employee").toLowerCase();
                  if (r === "owner") {
                    return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit bg-[#1E4738] text-white">Owner</span>;
                  }
                  if (r === "admin") {
                    return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit bg-[#eef5f0] text-[#356E3B] border border-[#dce9df]">Admin</span>;
                  }
                  if (r === "manager") {
                    return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit bg-[#eef5f0] text-[#1E4738] border border-[#dce9df]">Manajemen</span>;
                  }
                  return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit bg-gray-100 text-gray-600 border border-gray-200">Karyawan</span>;
                })()}
              </div>
            </div>

            {/* Filter Bulan */}
            <div className="bg-white border border-[#E5E7EB] rounded-full px-2 py-1 flex items-center justify-between shadow-sm">
              <button 
                onClick={handlePrevMonth} 
                className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full active:scale-95 transition-all"
                aria-label="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#356E3B]" />
                <span className="text-[#111827] font-bold text-[14px]">{selectedMonth}</span>
              </div>
              <button 
                onClick={handleNextMonth} 
                className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full active:scale-95 transition-all"
                aria-label="Bulan Berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Row */}
            {summary && (
              <div className="flex gap-2 mb-1">
                <div className="flex-1 bg-white border border-[#E5E7EB] rounded-[18px] p-3 text-center flex flex-col items-center justify-center shadow-xs">
                  <span className="text-[18px] font-bold text-[#356E3B]">{summary.hadir}</span>
                  <span className="text-[10px] font-medium text-gray-500">Hadir</span>
                </div>
                <div className="flex-1 bg-white border border-[#E5E7EB] rounded-[18px] p-3 text-center flex flex-col items-center justify-center shadow-xs">
                  <span className="text-[18px] font-bold text-[#EF4444]">{summary.izin}</span>
                  <span className="text-[10px] font-medium text-gray-500">Izin</span>
                </div>
                <div className="flex-1 bg-white border border-[#E5E7EB] rounded-[18px] p-3 text-center flex flex-col items-center justify-center shadow-xs">
                  <span className="text-[18px] font-bold text-[#F59E0B]">{summary.terlambat}</span>
                  <span className="text-[10px] font-medium text-gray-500">Terlambat</span>
                </div>
              </div>
            )}

            {/* Catatan Kehadiran List */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-[#111827] text-[14px] font-bold">
                  Catatan Kehadiran ({attendances.length})
                </span>
              </div>

              {attendances.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  Belum ada data kehadiran pada bulan ini.
                </p>
              ) : (
                attendances.map((item) => {
                  const hasCheckInCoords = 
                    item.check_in_latitude !== null && 
                    item.check_in_latitude !== undefined && 
                    item.check_in_longitude !== null && 
                    item.check_in_longitude !== undefined &&
                    item.check_in_latitude !== "" &&
                    item.check_in_longitude !== "";

                  const hasCheckOutCoords = 
                    item.check_out_latitude !== null && 
                    item.check_out_latitude !== undefined && 
                    item.check_out_longitude !== null && 
                    item.check_out_longitude !== undefined &&
                    item.check_out_latitude !== "" &&
                    item.check_out_longitude !== "";

                  return (
                    <div 
                      key={item.id} 
                      className="bg-white rounded-[24px] p-5 border border-[#eef5f0] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-4 transition-colors hover:border-[#dce9df]"
                    >
                      {/* Header: Tanggal & Badge Mode Kerja / Status */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#f4f9f6] flex items-center justify-center text-[#356E3B] shrink-0">
                            <CalendarDays className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[#111827] text-[14px] font-bold block leading-tight">
                              {formatDateWithDay(item.check_in_time)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Mode Kerja */}
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            item.work_mode === "WFH"
                              ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                              : "bg-[#eef5f0] text-[#1E4738] border border-[#dce9df]"
                          }`}>
                            {item.work_mode === "WFH" ? "Work From Home" : "Work From Office"}
                          </span>
                        </div>
                      </div>

                      {/* Konten Terpisah: Masuk vs Keluar */}
                      <div className="flex flex-col gap-3.5">
                        
                        {/* 1. DETAIL MASUK (CHECK-IN) */}
                        <div className="bg-[#fbfdfc] border border-[#eef5f0] rounded-[18px] p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                              <span className="text-[#1E4738] text-[12px] font-bold uppercase tracking-wider">
                                Detail Masuk (Check-In)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                item.is_terlambat
                                  ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              }`}>
                                {item.is_terlambat ? "Terlambat" : "Disiplin"}
                              </span>
                              <div className="flex items-baseline gap-1 bg-white px-2.5 py-1 rounded-full border border-gray-100 shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[#111827] font-bold text-[13px]">
                                  {formatTime(item.check_in_time)}
                                </span>
                                <span className="text-[#6B7280] text-[10px] font-medium">WIB</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3.5 items-start justify-between">
                            {/* Lokasi Masuk */}
                            <div className="flex-1 flex flex-col gap-1 min-w-0">
                              <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                                Lokasi Masuk
                              </span>
                              <div className="flex items-start gap-1.5 text-gray-700 text-[13px] leading-snug">
                                <MapPin className="w-4 h-4 text-[#356E3B] shrink-0 mt-0.5" />
                                <span className="font-medium break-words">
                                  {item.check_in_address || "Alamat tidak tersedia"}
                                </span>
                              </div>

                              {/* Koordinat */}
                              {hasCheckInCoords ? (
                                <div className="flex items-center gap-2 pl-5.5 mt-0.5 flex-wrap">
                                  <span className="text-[11px] text-gray-500 font-mono">
                                    Lat: {parseFloat(item.check_in_latitude).toFixed(5)} • Long: {parseFloat(item.check_in_longitude).toFixed(5)}
                                  </span>
                                  <a 
                                    href={`https://www.google.com/maps?q=${item.check_in_latitude},${item.check_in_longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-[#356E3B] hover:underline font-bold inline-flex items-center gap-0.5"
                                    title="Buka titik lokasi masuk di Google Maps"
                                  >
                                    <span>Buka Peta</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-400 pl-5.5 italic">
                                  Koordinat tidak tersedia
                                </span>
                              )}
                            </div>

                            {/* Foto Bukti Masuk */}
                            <div className="shrink-0 flex flex-col gap-1 w-full sm:w-auto">
                              <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                                Foto Bukti Masuk
                              </span>
                              {item.check_in_photo_url ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewPhoto({
                                    url: item.check_in_photo_url,
                                    title: `Foto Bukti Masuk`,
                                    date: formatDateWithDay(item.check_in_time),
                                    time: `${formatTime(item.check_in_time)} WIB`,
                                    location: item.check_in_address || undefined,
                                    coords: hasCheckInCoords ? `${item.check_in_latitude}, ${item.check_in_longitude}` : undefined
                                  })}
                                  className="group relative w-full sm:w-24 h-24 rounded-[14px] overflow-hidden border border-gray-200 shadow-xs active:scale-95 transition-transform bg-gray-50 cursor-pointer"
                                  title="Klik untuk memperbesar foto bukti masuk"
                                >
                                  <img 
                                    src={item.check_in_photo_url} 
                                    alt="Foto Masuk" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                      (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="hidden absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-gray-100 text-gray-400 text-[10px]">
                                    <ImageOff className="w-5 h-5 mb-1" />
                                    <span>Gagal memuat foto</span>
                                  </div>
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Maximize2 className="w-5 h-5 text-white drop-shadow" />
                                  </div>
                                </button>
                              ) : (
                                <div className="w-full sm:w-24 h-24 rounded-[14px] border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center p-2 text-gray-400">
                                  <Camera className="w-5 h-5 text-gray-300 mb-1" />
                                  <span className="text-[10px] font-medium leading-tight">Foto tidak tersedia</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. DETAIL KELUAR (CHECK-OUT) */}
                        <div className={`border rounded-[18px] p-4 flex flex-col gap-3 ${
                          item.check_out_time ? "bg-[#fffdfb] border-[#fde8d7]" : "bg-gray-50/60 border-dashed border-gray-200"
                        }`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                item.check_out_time ? "bg-orange-500" : "bg-gray-300"
                              }`}></span>
                              <span className={`text-[12px] font-bold uppercase tracking-wider ${
                                item.check_out_time ? "text-orange-800" : "text-gray-400"
                              }`}>
                                Detail Keluar (Check-Out)
                              </span>
                            </div>
                            {item.check_out_time ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                  item.is_pulang_cepat
                                    ? "bg-orange-50 text-orange-700 border border-orange-200/60"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                }`}>
                                  {item.is_pulang_cepat ? "Pulang Cepat" : "Disiplin"}
                                </span>
                                <div className="flex items-baseline gap-1 bg-white px-2.5 py-1 rounded-full border border-gray-100 shadow-2xs">
                                  <Clock className="w-3.5 h-3.5 text-orange-600" />
                                  <span className="text-[#111827] font-bold text-[13px]">
                                    {formatTime(item.check_out_time)}
                                  </span>
                                  <span className="text-[#6B7280] text-[10px] font-medium">WIB</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                Belum Check-Out
                              </span>
                            )}
                          </div>

                          {item.check_out_time ? (
                            <div className="flex flex-col sm:flex-row gap-3.5 items-start justify-between">
                              {/* Lokasi Keluar */}
                              <div className="flex-1 flex flex-col gap-1 min-w-0">
                                <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                                  Lokasi Keluar
                                </span>
                                <div className="flex items-start gap-1.5 text-gray-700 text-[13px] leading-snug">
                                  <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                                  <span className="font-medium break-words">
                                    {item.check_out_address || "Alamat tidak tersedia"}
                                  </span>
                                </div>

                                {/* Koordinat */}
                                {hasCheckOutCoords ? (
                                  <div className="flex items-center gap-2 pl-5.5 mt-0.5 flex-wrap">
                                    <span className="text-[11px] text-gray-500 font-mono">
                                      Lat: {parseFloat(item.check_out_latitude).toFixed(5)} • Long: {parseFloat(item.check_out_longitude).toFixed(5)}
                                    </span>
                                    <a 
                                      href={`https://www.google.com/maps?q=${item.check_out_latitude},${item.check_out_longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] text-orange-600 hover:underline font-bold inline-flex items-center gap-0.5"
                                      title="Buka titik lokasi keluar di Google Maps"
                                    >
                                      <span>Buka Peta</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-gray-400 pl-5.5 italic">
                                    Koordinat tidak tersedia
                                  </span>
                                )}
                              </div>

                              {/* Foto Bukti Keluar */}
                              <div className="shrink-0 flex flex-col gap-1 w-full sm:w-auto">
                                <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                                  Foto Bukti Keluar
                                </span>
                                {item.check_out_photo_url ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewPhoto({
                                      url: item.check_out_photo_url,
                                      title: `Foto Bukti Keluar`,
                                      date: formatDateWithDay(item.check_out_time),
                                      time: `${formatTime(item.check_out_time)} WIB`,
                                      location: item.check_out_address || undefined,
                                      coords: hasCheckOutCoords ? `${item.check_out_latitude}, ${item.check_out_longitude}` : undefined
                                    })}
                                    className="group relative w-full sm:w-24 h-24 rounded-[14px] overflow-hidden border border-gray-200 shadow-xs active:scale-95 transition-transform bg-gray-50 cursor-pointer"
                                    title="Klik untuk memperbesar foto bukti keluar"
                                  >
                                    <img 
                                      src={item.check_out_photo_url} 
                                      alt="Foto Keluar" 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                        (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                    <div className="hidden absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-gray-100 text-gray-400 text-[10px]">
                                      <ImageOff className="w-5 h-5 mb-1" />
                                      <span>Gagal memuat foto</span>
                                    </div>
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Maximize2 className="w-5 h-5 text-white drop-shadow" />
                                    </div>
                                  </button>
                                ) : (
                                  <div className="w-full sm:w-24 h-24 rounded-[14px] border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center p-2 text-gray-400">
                                    <Camera className="w-5 h-5 text-gray-300 mb-1" />
                                    <span className="text-[10px] font-medium leading-tight">Foto tidak tersedia</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="py-2 text-gray-400 text-[12px] italic flex items-center gap-1.5">
                              <Info className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>Karyawan belum melakukan presensi keluar untuk hari ini.</span>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
            <span className="text-gray-500 text-[14px] font-medium">Data karyawan tidak ditemukan</span>
            <button onClick={() => router.push("/admin/laporan-kehadiran")} className="px-5 py-2 rounded-full bg-[#356E3B] text-white text-[13px] font-bold active:scale-95 transition-all shadow-sm">Kembali ke Laporan</button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL PREVIEW FOTO KEHADIRAN (ZOOM PHOTO MODAL) */}
      {/* ======================================================== */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-[24px] overflow-hidden flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#fbfdfc]">
              <div className="flex flex-col">
                <span className="text-[#111827] text-[14px] font-bold truncate">
                  {previewPhoto.title}
                </span>
                <span className="text-gray-500 text-[11px]">
                  {previewPhoto.date ? `${previewPhoto.date}` : ""} {previewPhoto.time ? `• ${previewPhoto.time}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                aria-label="Tutup Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Image Body */}
            <div className="p-3 bg-black/5 flex items-center justify-center max-h-[65vh] overflow-hidden">
              <img 
                src={previewPhoto.url} 
                alt="Foto Bukti Kehadiran" 
                className="w-full max-h-[60vh] object-contain rounded-[14px]"
              />
            </div>

            {/* Modal Footer / Location details */}
            <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
              {previewPhoto.location && (
                <div className="flex items-start gap-1.5 text-[12px] text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-[#356E3B] shrink-0 mt-0.5" />
                  <span className="font-medium break-words leading-relaxed">{previewPhoto.location}</span>
                </div>
              )}

              {previewPhoto.coords && (
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-gray-400 font-mono">Koordinat: {previewPhoto.coords}</span>
                  <a
                    href={`https://www.google.com/maps?q=${previewPhoto.coords}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#356E3B] font-bold hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Buka Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="w-full py-2.5 px-4 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-bold active:scale-95 transition-all text-center mt-1"
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
