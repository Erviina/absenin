"use client";

import { useState, useEffect, use } from "react";
import { ChevronLeft, ShieldCheck, MapPin, ExternalLink, Info, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { TopBar } from "@/components/TopBar";
import { formatDateWithDay } from "@/lib/dateUtils";

import { useCompany } from "@/context/CompanyContext";

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
  const { activeCompanyId } = useCompany();
  
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }
      
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`
      };
      const companyId = activeCompanyId || (typeof window !== "undefined" ? localStorage.getItem("activeCompanyId") : null);
      if (companyId) {
        headers["x-company-id"] = companyId;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendances/${id}`, {
        headers
      });
      
      const result = await res.json();
      
      if (res.status === 404) {
        throw new Error("Data kehadiran tidak ditemukan.");
      }
      if (!res.ok) {
        throw new Error(result.message || "Gagal mengambil data kehadiran");
      }
      
      setData(result.data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);



  const extractTime = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).replace(/\./g, ':');
  };

  let durasiKerja = "-- jam";
  if (data?.check_in_time && data?.check_out_time) {
    const dIn = new Date(data.check_in_time);
    const dOut = new Date(data.check_out_time);
    let diffMs = dOut.getTime() - dIn.getTime();
    if (diffMs > 0) {
      const diffM = Math.floor(diffMs / 60000);
      const h = Math.floor(diffM / 60);
      const m = diffM % 60;
      durasiKerja = m > 0 ? `${h}j ${m}m` : `${h} jam`;
    }
  }

  const checkInLat =
    data?.check_in_latitude !== null && data?.check_in_latitude !== undefined && data?.check_in_latitude !== ""
      ? parseFloat(data.check_in_latitude)
      : null;
  const checkInLng =
    data?.check_in_longitude !== null && data?.check_in_longitude !== undefined && data?.check_in_longitude !== ""
      ? parseFloat(data.check_in_longitude)
      : null;
  const hasValidCheckInCoords =
    checkInLat !== null &&
    checkInLng !== null &&
    !isNaN(checkInLat) &&
    !isNaN(checkInLng) &&
    checkInLat >= -90 &&
    checkInLat <= 90 &&
    checkInLng >= -180 &&
    checkInLng <= 180;

  const checkOutLat =
    data?.check_out_latitude !== null && data?.check_out_latitude !== undefined && data?.check_out_latitude !== ""
      ? parseFloat(data.check_out_latitude)
      : null;
  const checkOutLng =
    data?.check_out_longitude !== null && data?.check_out_longitude !== undefined && data?.check_out_longitude !== ""
      ? parseFloat(data.check_out_longitude)
      : null;
  const hasValidCheckOutCoords =
    checkOutLat !== null &&
    checkOutLng !== null &&
    !isNaN(checkOutLat) &&
    !isNaN(checkOutLng) &&
    checkOutLat >= -90 &&
    checkOutLat <= 90 &&
    checkOutLng >= -180 &&
    checkOutLng <= 180;

  const mapMarkers: Array<{ lat: number; lng: number; label: string; type: "check-in" | "check-out" }> = [];
  if (hasValidCheckInCoords && checkInLat !== null && checkInLng !== null) {
    mapMarkers.push({
      lat: checkInLat,
      lng: checkInLng,
      label: "Presensi Masuk",
      type: "check-in"
    });
  }
  if (hasValidCheckOutCoords && checkOutLat !== null && checkOutLng !== null) {
    mapMarkers.push({
      lat: checkOutLat,
      lng: checkOutLng,
      label: "Presensi Keluar",
      type: "check-out"
    });
  }
  const hasValidCoords = mapMarkers.length > 0;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white relative">
      {/* Header */}
      <TopBar 
        title="Detail Kehadiran" 
        onBack={() => router.push("/kehadiran")} 
      />

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center h-[50vh]">
          <div className="w-10 h-10 border-4 border-[#356E3B]/20 border-t-[#356E3B] rounded-full animate-spin mb-4" />
          <p className="text-[#4B5563] font-medium text-[14px]">Memuat detail kehadiran...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center h-[50vh] p-6 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-red-500" strokeWidth={2} />
          </div>
          <p className="text-red-600 font-bold text-[18px] mb-2">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-4 px-6 h-12 rounded-full bg-[#356E3B] text-white font-bold text-[14px] flex items-center gap-2 hover:bg-[#1E4738] transition-colors"
          >
            <RefreshCcw className="w-4 h-4" /> Coba Lagi
          </button>
        </div>
      ) : data && (
        <div className="px-6 pt-6 pb-12 flex flex-col gap-6">
          {/* Title Section */}
        <div>
          <p className="text-[#6EA874] text-[11px] font-bold tracking-wider uppercase mb-1">
            Tanggal Presensi
          </p>
          <h2 className="text-[#111827] text-[22px] font-bold tracking-tight">
            {formatDateWithDay(data.check_in_time)}
          </h2>
        </div>

        {/* Status Card */}
        <div className="bg-[#F8FAF9] border border-[#E8F1EA] rounded-[24px] p-5 shadow-xs">
          {/* Header Row */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-[14px] bg-[#183B2B] flex items-center justify-center text-white shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[#111827] text-[14px] sm:text-[15px] font-bold leading-tight truncate">
                  {data.work_mode === "WFH" ? "Work From Home" : "Work From Office"}
                </span>
              </div>
            </div>
            
            <div className="bg-[#f4f9f6] rounded-full px-3 py-1.5 flex items-center shrink-0">
              <span className="text-[#6B7280] text-[11px] font-semibold">Durasi:</span>
              <span className="text-[#111827] text-[11px] font-bold ml-1.5">{durasiKerja}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Jam Masuk */}
            <div className="bg-white border border-[#E8F0EA] rounded-[18px] p-4 flex flex-col justify-between min-h-[114px] shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
                <span className="text-[#6B7280] text-[12px] font-semibold">Jam Masuk</span>
              </div>
              
              <div className="flex items-baseline gap-1.5 my-1">
                <span className="text-[#111827] text-[22px] sm:text-[24px] font-bold leading-none tracking-tight">
                  {extractTime(data.check_in_time)}
                </span>
                <span className="text-[#9CA3AF] text-[11px] font-bold">WIB</span>
              </div>

              <div className="flex items-center">
                <span className="text-[10.5px] font-bold text-[#15803D] bg-[#DCFCE7]/70 px-2.5 py-0.5 rounded-full">
                  Tercatat
                </span>
              </div>
            </div>
            
            {/* Jam Keluar */}
            {data.check_out_time ? (
              <div className="bg-white border border-[#E8F0EA] rounded-[18px] p-4 flex flex-col justify-between min-h-[114px] shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#EA580C]" />
                  <span className="text-[#6B7280] text-[12px] font-semibold">Jam Keluar</span>
                </div>
                
                <div className="flex items-baseline gap-1.5 my-1">
                  <span className="text-[#111827] text-[22px] sm:text-[24px] font-bold leading-none tracking-tight">
                    {extractTime(data.check_out_time)}
                  </span>
                  <span className="text-[#9CA3AF] text-[11px] font-bold">WIB</span>
                </div>

                <div className="flex items-center">
                  <span className="text-[10.5px] font-bold text-[#EA580C] bg-[#FFEDD5]/80 px-2.5 py-0.5 rounded-full">
                    Selesai
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-[#D1D5DB]/80 rounded-[18px] p-4 flex flex-col justify-between min-h-[114px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                  <span className="text-[#9CA3AF] text-[12px] font-medium">Jam Keluar</span>
                </div>
                
                <div className="flex items-baseline gap-1.5 my-1">
                  <span className="text-[#9CA3AF] text-[20px] sm:text-[22px] font-bold leading-none tracking-wider">
                    -- : --
                  </span>
                  <span className="text-[#9CA3AF] text-[11px] font-bold">WIB</span>
                </div>

                <div className="flex items-center">
                  <span className="text-[10.5px] font-medium text-[#6B7280] bg-[#F1F5F9] px-2.5 py-0.5 rounded-full">
                    Belum Keluar
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Peta Lokasi Presensi */}
        <div className="border border-[#E5E7EB] rounded-[24px] overflow-hidden flex flex-col">
          <div className="px-5 py-4 flex items-center bg-white border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#4B5563]" strokeWidth={2.5} />
              <span className="text-[#111827] text-[14px] font-bold">Peta Lokasi Presensi</span>
            </div>
          </div>
          
          <div className="w-full h-[240px] relative z-0">
            {hasValidCoords ? (
              <MapLocation 
                markers={mapMarkers} 
                showControls={true}
                controlsPosition="bottom-right"
                showRecenter={true}
              />
            ) : (
              <div className="w-full h-full bg-[#F9FAFB] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <MapPin className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-[#374151] font-bold text-[14px] mb-1">Titik Lokasi Tidak Tersedia</p>
                <p className="text-[#6B7280] text-[12px] max-w-[260px]">
                  Koordinat presensi tidak valid atau belum terekam.
                </p>
              </div>
            )}
          </div>

          <div className="p-5 bg-white flex flex-col gap-3">
            {/* Info Masuk */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#E8F3EB] flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#356E3B]" />
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[#1E4738] text-[11px] font-bold uppercase tracking-wider">Lokasi Masuk</span>
                </div>
                <span className="text-[#111827] text-[13px] font-semibold leading-tight mb-1">
                  {data.check_in_address || "Lokasi tidak diketahui"}
                </span>
                {hasValidCheckInCoords ? (
                  <span className="text-[#6B7280] text-[11px] font-mono">
                    Lat: {data.check_in_latitude} • Long: {data.check_in_longitude}
                  </span>
                ) : (
                  <span className="text-gray-400 text-[11px] italic">Koordinat tidak tercatat</span>
                )}
              </div>
            </div>

            {/* Info Keluar */}
            {data.check_out_time && (
              <div className="flex items-start gap-3 border-t border-gray-100 pt-3">
                <div className="w-7 h-7 rounded-lg bg-[#FFEDD5] flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[#EA580C] text-[11px] font-bold uppercase tracking-wider">Lokasi Keluar</span>
                  </div>
                  <span className="text-[#111827] text-[13px] font-semibold leading-tight mb-1">
                    {data.check_out_address || "Lokasi tidak diketahui"}
                  </span>
                  {hasValidCheckOutCoords ? (
                    <span className="text-[#6B7280] text-[11px] font-mono">
                      Lat: {data.check_out_latitude} • Long: {data.check_out_longitude}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-[11px] italic">Koordinat tidak tercatat</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Foto Bukti */}
        <div className="border border-[#E5E7EB] rounded-[24px] overflow-hidden flex flex-col bg-white p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-4">
            <span className="text-[#111827] text-[14px] font-bold">Foto Bukti Kehadiran</span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-[12px] font-bold text-[#4B5563]">Masuk</span>
              {data.check_in_photo_url ? (
                <img src={data.check_in_photo_url} alt="Foto Masuk" className="w-full aspect-[3/4] object-cover rounded-[16px] bg-gray-100" />
              ) : (
                <div className="w-full aspect-[3/4] bg-gray-100 rounded-[16px] flex items-center justify-center text-gray-400 text-[12px]">Tidak ada foto</div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-[12px] font-bold text-[#4B5563]">Keluar</span>
              {data.check_out_time ? (
                data.check_out_photo_url ? (
                  <img src={data.check_out_photo_url} alt="Foto Keluar" className="w-full aspect-[3/4] object-cover rounded-[16px] bg-gray-100" />
                ) : (
                  <div className="w-full aspect-[3/4] bg-gray-100 rounded-[16px] flex items-center justify-center text-gray-400 text-[12px]">Tidak ada foto</div>
                )
              ) : (
                <div className="w-full aspect-[3/4] border-2 border-dashed border-gray-200 rounded-[16px] flex items-center justify-center text-gray-400 text-[12px]">Belum Keluar</div>
              )}
            </div>
          </div>
        </div>

      </div>
      )}
    </div>
  );
}
