"use client";

import { use } from "react";
import { ChevronLeft, ShieldCheck, MapPin, ExternalLink, Info, Plus, Minus } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import MapLocation to prevent SSR issues
const MapLocation = dynamic(() => import("@/components/MapLocation"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[200px] bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
      Memuat peta...
    </div>
  )
});

export default function DetailKehadiranPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  // Dummy data (in real app, this would be fetched from API based on params.id)
  const dummyHistory = [
    { id: "1", date: "2026-09-17", type: "WFH", checkIn: "11:51", checkOut: "17:05", checkInStatus: "Terlambat 3j 51m", checkOutStatus: "Tepat Waktu" },
    { id: "2", date: "2026-09-16", type: "WFO", checkIn: "07:58", checkOut: "17:05", checkInStatus: "Tepat Waktu", checkOutStatus: "Tepat Waktu" },
    { id: "3", date: "2026-09-15", type: "WFO", checkIn: "08:05", checkOut: "17:10", checkInStatus: "Terlambat 5m", checkOutStatus: "Tepat Waktu" },
    { id: "4", date: "2026-09-10", type: "WFH", checkIn: "08:15", checkOut: "17:02", checkInStatus: "Terlambat 15m", checkOutStatus: "Tepat Waktu" },
    { id: "5", date: "2026-09-02", type: "WFO", checkIn: "07:50", checkOut: "17:00", checkInStatus: "Tepat Waktu", checkOutStatus: "Tepat Waktu" },
    { id: "6", date: "2026-08-30", type: "WFO", checkIn: "08:00", checkOut: "17:01", checkInStatus: "Tepat Waktu", checkOutStatus: "Tepat Waktu" },
    // Example for ongoing/missing checkout today:
    { id: "7", date: "2026-09-29", type: "WFO", checkIn: "07:55", checkOut: null, checkInStatus: "Tepat Waktu", checkOutStatus: "" },
  ];

  const data = dummyHistory.find(item => item.id === id) || dummyHistory[0];

  const formatDateWithDay = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Kalkulasi durasi kerja jika checkOut ada
  let durasiKerja = "-- jam";
  if (data.checkIn && data.checkOut) {
    const [inH, inM] = data.checkIn.split(':').map(Number);
    const [outH, outM] = data.checkOut.split(':').map(Number);
    let diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff < 0) diff += 24 * 60; // Just in case it crosses midnight
    const diffH = Math.floor(diff / 60);
    const diffM = diff % 60;
    durasiKerja = diffM > 0 ? `${diffH}j ${diffM}m` : `${diffH} jam`;
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white relative">
      {/* Header */}
      <div className="bg-[#356E3B] pt-12 pb-4 px-6 flex items-center justify-between sticky top-0 z-20">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-[18px] font-bold absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
          Detail Kehadiran
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      <div className="px-6 pt-6 pb-12 flex flex-col gap-6">
        {/* Title Section */}
        <div>
          <p className="text-[#6EA874] text-[11px] font-bold tracking-wider uppercase mb-1">
            Tanggal Presensi
          </p>
          <h2 className="text-[#111827] text-[22px] font-bold tracking-tight">
            {formatDateWithDay(data.date)}
          </h2>
        </div>

        {/* Status Card */}
        <div className="bg-[#F6FAF7] border border-[#E8F3EB] rounded-[24px] p-5">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#5C8966] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[#111827] text-[14px] font-bold">{data.type} • {data.type === "WFH" ? "Work From Home" : "Work From Office"}</span>
                <span className="text-[#6B7280] text-[12px]">Shift Reguler (08:00 - 17:00)</span>
              </div>
            </div>
            <div className="bg-white border border-[#E8F3EB] rounded-full px-3 py-1.5 flex items-center">
              <span className="text-[#6B7280] text-[11px] font-bold">Durasi: </span>
              <span className="text-[#9CA3AF] text-[11px] font-medium ml-1">{durasiKerja}</span>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Jam Masuk */}
            <div className="flex-1 bg-white border border-[#E8F3EB] rounded-[16px] p-4 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#5C8966]" />
                <span className="text-[#6B7280] text-[12px] font-medium">Jam Masuk</span>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[#111827] text-[24px] font-bold leading-none">{data.checkIn}</span>
                <span className="text-[#9CA3AF] text-[12px] font-bold">WIB</span>
              </div>
              <span className={`text-[11px] font-bold ${data.checkInStatus.includes("Terlambat") ? "text-[#EF4444]" : "text-[#356E3B]"}`}>
                {data.checkInStatus}
              </span>
            </div>
            
            {/* Jam Keluar */}
            {data.checkOut ? (
              <div className="flex-1 bg-white border border-[#E8F3EB] rounded-[16px] p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#5C8966]" />
                  <span className="text-[#6B7280] text-[12px] font-medium">Jam Keluar</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[#111827] text-[24px] font-bold leading-none">{data.checkOut}</span>
                  <span className="text-[#9CA3AF] text-[12px] font-bold">WIB</span>
                </div>
                <span className={`text-[11px] font-bold ${data.checkOutStatus.includes("Cepat") ? "text-[#EF4444]" : "text-[#356E3B]"}`}>
                  {data.checkOutStatus}
                </span>
              </div>
            ) : (
              <div className="flex-1 bg-white border border-dashed border-[#E5E7EB] rounded-[16px] p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#D1D5DB]" />
                  <span className="text-[#9CA3AF] text-[12px] font-medium">Jam Keluar</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[#9CA3AF] text-[20px] font-bold leading-none tracking-widest">- - : - -</span>
                  <span className="text-[#9CA3AF] text-[12px] font-bold">WIB</span>
                </div>
                <span className="text-[#9CA3AF] text-[11px] font-medium">Belum Checkout</span>
              </div>
            )}
          </div>
        </div>

        {/* Peta Lokasi Presensi */}
        <div className="border border-[#E5E7EB] rounded-[24px] overflow-hidden flex flex-col">
          <div className="px-5 py-4 flex justify-between items-center bg-white border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#4B5563]" strokeWidth={2.5} />
              <span className="text-[#111827] text-[14px] font-bold">Peta Lokasi Presensi</span>
            </div>
            <div className="bg-[#E8F3EB] px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#356E3B]" />
              <span className="text-[#356E3B] text-[11px] font-bold">Radius Valid (15m)</span>
            </div>
          </div>
          
          <div className="w-full h-[240px] relative z-0">
            <MapLocation label="Titik Presensi Masuk" />
            
            {/* Custom Map Controls Overlay (Visual only, to match design) */}
            <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-2">
              <button className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-[#4B5563] active:scale-95 transition-transform">
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <button className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-[#4B5563] active:scale-95 transition-transform">
                <Minus className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="p-5 bg-white flex justify-between items-center">
            <div className="flex flex-col pr-4">
              <span className="text-[#111827] text-[13px] font-bold leading-tight mb-1">
                Jalan Merak No. 5, Coblong, Kota Bandung, Jawa Barat
              </span>
              <span className="text-[#9CA3AF] text-[11px] font-mono">
                Lat: -7.2564186 • Long: 112.4882029
              </span>
            </div>
            <button className="flex items-center gap-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] px-3 py-2 rounded-xl text-[#4B5563] text-[12px] font-bold shrink-0 transition-colors">
              Buka Maps
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Detail Pelanggaran & Jam Kerja */}
        <div className="border border-[#E5E7EB] rounded-[24px] p-5">
          <div className="flex items-center gap-2 mb-5">
            <Info className="w-4 h-4 text-[#4B5563]" strokeWidth={2.5} />
            <span className="text-[#111827] text-[14px] font-bold">Detail Pelanggaran & Jam Kerja</span>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[#6B7280]">Total Jam Kerja</span>
              <span className="text-[#111827] font-bold">
                {data.checkOut ? durasiKerja : "- (Sedang Berjalan)"}
              </span>
            </div>
            
            <div className="flex justify-between items-center bg-[#FEF2F2] px-3 py-2 -mx-3 rounded-xl text-[13px]">
              <span className="text-[#374151]">Keterlambatan</span>
              <span className="text-[#EF4444] font-bold">
                {data.checkInStatus.includes("Terlambat") ? data.checkInStatus.replace("Terlambat ", "").replace("j", " jam").replace("m", " menit") : "-"}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[#6B7280]">Pulang Cepat</span>
              <span className={`${data.checkOutStatus.includes("Cepat") ? "text-[#EF4444]" : "text-[#356E3B]"} font-bold`}>
                {data.checkOutStatus === "Tepat Waktu" ? "0 menit (Tepat Waktu)" : (data.checkOutStatus || "-")}
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#FEF2F2] px-3 py-2.5 -mx-3 rounded-xl text-[13px] mt-1">
              <span className="text-[#7F1D1D] font-bold">Total Durasi Pelanggaran</span>
              <span className="text-[#EF4444] font-bold">
                {data.checkInStatus.includes("Terlambat") ? data.checkInStatus.replace("Terlambat ", "").replace("j", " jam").replace("m", " menit") : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
