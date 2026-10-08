"use client";

import { useState, useEffect, use } from "react";
import { ChevronLeft, ShieldCheck, MapPin, ExternalLink, Info, Plus, Minus, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { TopBar } from "@/components/TopBar";

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
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendances/${id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
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

  const formatDateWithDay = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

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

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white relative">
      {/* Header */}
      <TopBar title="Detail Kehadiran" />

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
        <div className="bg-[#F6FAF7] border border-[#E8F3EB] rounded-[24px] p-5">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#5C8966] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[#111827] text-[14px] font-bold uppercase">{data.work_mode} • {data.work_mode === "WFH" ? "Work From Home" : "Work From Office"}</span>
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
                <span className="text-[#111827] text-[24px] font-bold leading-none">{extractTime(data.check_in_time)}</span>
                <span className="text-[#9CA3AF] text-[12px] font-bold">WIB</span>
              </div>
            </div>
            
            {/* Jam Keluar */}
            {data.check_out_time ? (
              <div className="flex-1 bg-white border border-[#E8F3EB] rounded-[16px] p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#5C8966]" />
                  <span className="text-[#6B7280] text-[12px] font-medium">Jam Keluar</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[#111827] text-[24px] font-bold leading-none">{extractTime(data.check_out_time)}</span>
                  <span className="text-[#9CA3AF] text-[12px] font-bold">WIB</span>
                </div>
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
                Check-in: {data.check_in_address || "Lokasi tidak diketahui"}
              </span>
              <span className="text-[#9CA3AF] text-[11px] font-mono mb-3">
                Lat: {data.check_in_latitude} • Long: {data.check_in_longitude}
              </span>
              
              {data.check_out_time && (
                <>
                  <span className="text-[#111827] text-[13px] font-bold leading-tight mb-1 border-t border-gray-100 pt-3">
                    Check-out: {data.check_out_address || "Lokasi tidak diketahui"}
                  </span>
                  <span className="text-[#9CA3AF] text-[11px] font-mono">
                    Lat: {data.check_out_latitude} • Long: {data.check_out_longitude}
                  </span>
                </>
              )}
            </div>
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
                <img src={data.check_in_photo_url} alt="Foto Check-in" className="w-full aspect-[3/4] object-cover rounded-[16px] bg-gray-100" />
              ) : (
                <div className="w-full aspect-[3/4] bg-gray-100 rounded-[16px] flex items-center justify-center text-gray-400 text-[12px]">Tidak ada foto</div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-[12px] font-bold text-[#4B5563]">Keluar</span>
              {data.check_out_time ? (
                data.check_out_photo_url ? (
                  <img src={data.check_out_photo_url} alt="Foto Check-out" className="w-full aspect-[3/4] object-cover rounded-[16px] bg-gray-100" />
                ) : (
                  <div className="w-full aspect-[3/4] bg-gray-100 rounded-[16px] flex items-center justify-center text-gray-400 text-[12px]">Tidak ada foto</div>
                )
              ) : (
                <div className="w-full aspect-[3/4] border-2 border-dashed border-gray-200 rounded-[16px] flex items-center justify-center text-gray-400 text-[12px]">Belum Checkout</div>
              )}
            </div>
          </div>
        </div>

      </div>
      )}
    </div>
  );
}
