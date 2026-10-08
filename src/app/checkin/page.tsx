"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, RefreshCcw, ArrowRight, Plus, Minus, Target, 
  X, Zap, HelpCircle, MapPin, Check, CheckCircle2
} from "lucide-react";
import dynamic from 'next/dynamic';

import { TopBar } from '@/components/TopBar';
const LeafletMap = dynamic(() => import('@/components/MapLocation'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#e6eedc] animate-pulse" />
});

export default function CheckinPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [workMode, setWorkMode] = useState<"WFO" | "WFH">("WFO");

  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number; address: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);

  // Status State
  const [attendanceStatus, setAttendanceStatus] = useState<"NOT_CHECKED_IN" | "CHECKED_IN" | "CHECKED_OUT" | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // User Data State
  const [userData, setUserData] = useState<{ name: string; role: string } | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [reviewTime, setReviewTime] = useState<Date | null>(null);

  // Camera State
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isMirror, setIsMirror] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      let msg = "Gagal mengakses kamera.";
      if (err.name === "NotAllowedError") msg = "Akses kamera ditolak.";
      else if (err.name === "NotFoundError") msg = "Kamera tidak ditemukan pada perangkat ini.";
      setCameraError(msg);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (isMirror) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            setPhotoBlob(blob);
            if (photoUrl) URL.revokeObjectURL(photoUrl);
            setPhotoUrl(URL.createObjectURL(blob));
            setReviewTime(new Date());
            setStep(3);
          }
        }, "image/jpeg", 0.8);
      }
    }
  };

  useEffect(() => {
    if (step === 2) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  const fetchLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolokasi tidak didukung oleh browser Anda.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          setLocation({
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy),
            address: data.display_name || "Alamat tidak ditemukan"
          });
        } catch (error) {
          setLocation({
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy),
            address: "Gagal mengambil alamat"
          });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        let msg = "Akses lokasi diperlukan untuk melakukan absensi.";
        if (error.code === 1 /* PERMISSION_DENIED */) {
          msg = "Akses lokasi ditolak. Izinkan akses lokasi di pengaturan browser untuk melanjutkan.";
        }
        setLocationError(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchLocation();
    
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("Token tidak ditemukan");
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error("Gagal mengambil data user");
        const data = await res.json();
        setUserData({
          name: data.data.name,
          role: data.data.role
        });
      } catch (err: any) {
        setUserError(err.message || "Gagal mengambil data user");
      }
    };

    const fetchAttendanceStatus = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendances/today`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          setAttendanceStatus(data.data.status);
        } else {
          setSubmitError(data.message || "Gagal memeriksa status kehadiran.");
        }
      } catch (err: any) {
        setSubmitError(err.message || "Gagal memeriksa status kehadiran.");
      } finally {
        setIsStatusLoading(false);
      }
    };

    fetchLocation();
    fetchUser();
    fetchAttendanceStatus();
  }, []);

  const formatDateTime = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${d} ${m} ${y}, ${h}:${min} WIB`;
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.push("/dashboard");
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    if (!location || !location.lat || !location.lng || !photoBlob || (attendanceStatus === "NOT_CHECKED_IN" && !workMode)) {
      setSubmitError("Data tidak lengkap. Pastikan lokasi dan foto sudah tersedia.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const formData = new FormData();
    if (attendanceStatus === "NOT_CHECKED_IN") {
      formData.append("work_mode", workMode);
    }
    formData.append("latitude", location.lat.toString());
    formData.append("longitude", location.lng.toString());
    formData.append("address", location.address);
    formData.append("photo", new File([photoBlob], "attendance.jpg", { type: "image/jpeg" }));

    const endpoint = attendanceStatus === "CHECKED_IN" ? "/attendances/check-out" : "/attendances/check-in";

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const text = await res.text();
        let errMsg = `HTTP ${res.status}`;
        try {
          const errorData = JSON.parse(text);
          errMsg += `: ${errorData.message || errorData.error || text}`;
        } catch {
          errMsg += `: ${text.substring(0, 50)}`;
        }
        console.error("Backend Error:", res.status, text);
        throw new Error(errMsg);
      }

      // Success
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      alert(attendanceStatus === "CHECKED_IN" ? "Check-out berhasil!" : "Check-in berhasil!");
      router.push("/dashboard");
    } catch (err: any) {
      setSubmitError(err.message || "Terjadi kesalahan sistem");
      setIsSubmitting(false);
    }
  };

  const renderStepper = (isOverlay = false) => (
    <div className={`flex items-center justify-between px-10 py-5 ${isOverlay ? 'bg-black/40 backdrop-blur-md rounded-2xl mx-4 border border-white/10' : 'bg-[#fbfdfc] border-b border-[#eef5f0]'}`}>
      {[
        { num: 1, label: "Titik Lokasi" },
        { num: 2, label: "Bukti Foto" },
        { num: 3, label: "Tinjau Data" }
      ].map((s, i) => {
        const isActive = step >= s.num;
        const isCurrent = step === s.num;
        
        return (
          <div key={s.num} className="flex flex-col items-center relative z-10 w-full">
            {/* Connecting Line */}
            {i < 2 && (
              <div className={`absolute top-4 left-[60%] w-[80%] h-[3px] -z-10 ${
                step > s.num ? (isOverlay ? 'bg-white/50' : 'bg-[#356E3B]') : (isOverlay ? 'bg-white/10' : 'bg-[#dce9df]')
              }`} />
            )}
            
            {/* Circle */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold mb-2 transition-colors ${
              isCurrent 
                ? 'bg-[#356E3B] text-white shadow-md shadow-[#356E3B]/20' 
                : isActive 
                  ? (isOverlay ? 'bg-white text-[#356E3B]' : 'bg-[#356E3B] text-white')
                  : (isOverlay ? 'bg-white/20 text-white' : 'bg-[#dce9df] text-[#5C786C]')
            }`}>
              {isActive && s.num < step ? <Check className="w-5 h-5" strokeWidth={3} /> : s.num}
            </div>
            
            {/* Label */}
            <span className={`text-[10px] font-bold whitespace-nowrap ${
              isOverlay ? 'text-white' : (isCurrent ? 'text-[#1E4738]' : 'text-[#5C786C]')
            }`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );

  if (isStatusLoading) {
    return (
      <div className="flex flex-col min-h-[100dvh] w-full bg-[#fbfdfc] relative items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#356E3B]/20 border-t-[#356E3B] rounded-full animate-spin mb-4" />
        <p className="text-[#4B5563] font-medium text-[14px]">Memeriksa status kehadiran...</p>
      </div>
    );
  }

  if (attendanceStatus === "CHECKED_OUT") {
    return (
      <div className="flex flex-col min-h-[100dvh] w-full bg-[#fbfdfc] relative">
        <TopBar title="Kehadiran Selesai" onBack={() => router.push("/dashboard")} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-[#E8F3EB] rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-[#2D5A3F]" strokeWidth={2} />
          </div>
          <h2 className="text-[20px] font-bold text-[#111827] mb-2">Absensi Hari Ini Selesai</h2>
          <p className="text-[#6B7280] text-[14px] leading-relaxed mb-8 max-w-[280px]">
            Anda telah berhasil melakukan Check-in dan Check-out untuk hari ini. Sampai jumpa besok!
          </p>
          <button 
            onClick={() => router.push("/dashboard")}
            className="w-full max-w-[200px] h-12 bg-[#356E3B] text-white rounded-full font-bold text-[14px]"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const isCheckOutMode = attendanceStatus === "CHECKED_IN";
  const titleText = isCheckOutMode ? "Check-out" : "Check-in";

  return (
    <div className="flex flex-col min-h-[100dvh] w-full bg-[#fbfdfc] relative">
      
      {/* Header (Hidden in Step 2 because it's full screen camera) */}
      {step !== 2 && (
        <TopBar 
          title={isCheckOutMode ? "Rekam Check-out" : "Rekam Kehadiran"} 
          onBack={handleBack} 
        />
      )}

      {/* Stepper (Standard) */}
      {step !== 2 && renderStepper()}

      {/* STEP 1: Titik Lokasi */}
      {step === 1 && (
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#e6eedc]">
          {/* Leaflet Map */}
          <div className="absolute inset-0 z-0">
            {location ? (
              <LeafletMap center={[location.lat, location.lng]} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#e6eedc]">
                <span className="text-[#5C786C] font-medium text-sm">
                  {isLocating ? "Mengambil lokasi..." : "Menunggu lokasi..."}
                </span>
              </div>
            )}
          </div>

          {/* Map Controls */}
          <div className="absolute top-6 right-4 flex flex-col gap-3 z-10">
            <div className="bg-white rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden border border-gray-100">
              <button className="w-[42px] h-[42px] flex items-center justify-center hover:bg-gray-50 border-b border-gray-100">
                <Plus className="w-5 h-5 text-gray-700" />
              </button>
              <button className="w-[42px] h-[42px] flex items-center justify-center hover:bg-gray-50">
                <Minus className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <button className="w-[42px] h-[42px] bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex items-center justify-center hover:bg-gray-50 border border-gray-100">
              <Target className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 w-full bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] p-6 pt-3 pb-8 z-20">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            
            {isLocating ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-8 h-8 border-4 border-[#356E3B]/20 border-t-[#356E3B] rounded-full animate-spin mb-3"></div>
                <p className="text-[#1E4738] font-bold text-sm">Mendeteksi lokasi...</p>
              </div>
            ) : locationError ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                  <MapPin className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-red-500 font-bold text-[14px] mb-2">Lokasi Gagal Didapatkan</p>
                <p className="text-[#5C786C] text-[12px] px-4 mb-4">{locationError}</p>
                <button 
                  onClick={fetchLocation}
                  className="px-6 h-10 rounded-full bg-[#356E3B] text-white font-bold text-[13px] flex items-center gap-2 hover:bg-[#1E4738] transition-colors"
                >
                  <RefreshCcw className="w-4 h-4" /> Coba Lagi
                </button>
              </div>
            ) : location ? (
              <>
                <div className="flex gap-4 items-start mb-6">
                  <div className="w-12 h-12 rounded-[14px] bg-[#eef5f0] flex items-center justify-center shrink-0 mt-1">
                    <MapPin className="w-6 h-6 text-[#1E4738]" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[15px] font-bold text-[#1E4738] leading-snug mb-1.5">
                      Apakah titik lokasi kamu saat ini sudah benar?
                    </h3>
                    <p className="text-[#5C786C] text-[12px] leading-relaxed mb-3">
                      {location.address}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-[#9ca3af] font-medium tracking-wide">
                        {location.lat.toFixed(7)}, {location.lng.toFixed(7)}
                      </span>
                      <div className="flex items-center gap-1.5 bg-[#e4faed] px-2.5 py-1 rounded-full">
                        <div className="w-1.5 h-1.5 bg-[#00a859] rounded-full" />
                        <span className="text-[9px] font-bold text-[#1E4738]">Akurasi {location.accuracy}m</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={fetchLocation}
                    className="flex-1 max-w-[140px] h-14 rounded-full border-[1.5px] border-[#a1d6b2] text-[#356E3B] font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCcw className="w-4 h-4" strokeWidth={2.5} />
                    Refresh
                  </button>
                  <button 
                    onClick={() => setStep(2)}
                    className="flex-1 h-14 rounded-full bg-[#356E3B] hover:bg-[#1E4738] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg transition-colors"
                  >
                    Ya, Lanjutkan
                    <ArrowRight className="w-4 h-4" strokeWidth={3} />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* STEP 2: Bukti Foto (Full Screen) */}
      {step === 2 && (
        <div className="fixed inset-0 z-50 bg-[#111] flex flex-col justify-between overflow-hidden max-w-md mx-auto">
          {/* Camera Feed */}
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111] z-20 px-8 text-center">
              <Zap className="w-12 h-12 text-red-500 mb-4 opacity-80" />
              <p className="text-white font-bold text-lg mb-2">Kamera Gagal</p>
              <p className="text-gray-400 text-sm mb-6">{cameraError}</p>
              <button 
                onClick={startCamera}
                className="bg-[#356E3B] px-8 h-12 rounded-full font-bold text-white shadow-lg"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: isMirror ? 'scaleX(-1) scale(1.02)' : 'scale(1.02)' }}
            />
          )}
          {/* Dark Gradient Overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

          {/* Top Controls */}
          <div className="relative z-10 pt-12 px-6 flex justify-between items-center mb-6">
            <button onClick={() => setStep(1)} className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-md">
              <X className="w-5 h-5 text-white" />
            </button>
            <button 
              onClick={() => setIsMirror(!isMirror)}
              className="px-4 h-10 rounded-full bg-white/95 text-[#1E4738] font-bold text-[12px] flex items-center gap-2 shadow-lg"
            >
              <RefreshCcw className="w-3.5 h-3.5" strokeWidth={3} />
              Mirror {isMirror ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Overlaid Stepper */}
          <div className="relative z-10">
            {renderStepper(true)}
          </div>

          {/* Face Oval Guide */}
          <div className="relative flex-1 flex flex-col items-center justify-center z-10 px-8">
            <div className="w-[280px] h-[360px] border-[2px] border-[#a1d6b2] rounded-[100px] rounded-b-[140px] relative mt-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              {/* Corner markers */}
              <div className="absolute -top-[1px] -left-[1px] w-6 h-6 border-t-[3px] border-l-[3px] border-[#a1d6b2] rounded-tl-[16px]" />
              <div className="absolute -top-[1px] -right-[1px] w-6 h-6 border-t-[3px] border-r-[3px] border-[#a1d6b2] rounded-tr-[16px]" />
              <div className="absolute -bottom-[1px] -left-[1px] w-6 h-6 border-b-[3px] border-l-[3px] border-[#a1d6b2] rounded-bl-[20px]" />
              <div className="absolute -bottom-[1px] -right-[1px] w-6 h-6 border-b-[3px] border-r-[3px] border-[#a1d6b2] rounded-br-[20px]" />
              
              {/* Eye Guide */}
              <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-16 h-8 border border-white/40 rounded-[50%] flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
              </div>
            </div>
            
            <p className="text-white text-[15px] font-medium mt-10 drop-shadow-md">
              Tempatkan wajah Anda pada Area Oval
            </p>
            
            <div className="mt-4 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-full flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full border border-gray-400 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#a1d6b2]" />
              </div>
              <span className="text-[10px] text-gray-200">Mode Mirror: Hasil foto akan terbalik seperti cermin</span>
            </div>
          </div>

          {/* Bottom Camera Controls */}
          <div className="relative z-10 pb-12 pt-6 px-10 flex justify-between items-center">
            <button className="w-12 h-12 rounded-full bg-black/40 border border-white/20 flex items-center justify-center backdrop-blur-md">
              <Zap className="w-5 h-5 text-white" />
            </button>
            
            <button 
              onClick={takePhoto} 
              disabled={!!cameraError}
              className="w-[72px] h-[72px] rounded-full border-[4px] border-[#a1d6b2] p-1 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50 disabled:active:scale-100"
            >
              <div className="w-full h-full bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#a1d6b2]" />
              </div>
            </button>
            
            <button className="w-12 h-12 rounded-full bg-black/40 border border-white/20 flex items-center justify-center backdrop-blur-md">
              <HelpCircle className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Tinjau Data */}
      {step === 3 && (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto pb-32">
          
          {/* Captured Photo */}
          <div className="relative w-full aspect-[4/2.8] rounded-[24px] overflow-visible mb-14">
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt="Hasil Foto" 
                className="w-full h-full object-cover rounded-[24px] shadow-sm"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 rounded-[24px] animate-pulse" />
            )}
            {/* Retake Button Overlapping (half outside) */}
            <button 
              onClick={() => setStep(2)}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#eff6f2] border border-[#dce9df] text-[#1E4738] font-bold text-[13px] px-5 py-3 rounded-full flex items-center gap-2 shadow-md hover:bg-white transition-colors whitespace-nowrap"
            >
              <RefreshCcw className="w-4 h-4" strokeWidth={2.5} />
              Ambil Ulang Foto
            </button>
          </div>

          {/* Details Card */}
          <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-[#f3f7f4] flex flex-col mb-6">
            <div className="flex flex-col items-center mb-6">
              {userError ? (
                <span className="text-red-500 text-[13px] font-medium">{userError}</span>
              ) : userData ? (
                <>
                  <h2 className="text-[20px] font-bold text-[#1E4738] mb-1">{userData.name}</h2>
                  <span className="text-[11px] font-bold text-[#356E3B] tracking-wide uppercase">{userData.role}</span>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-32 h-6 bg-gray-200 animate-pulse rounded mb-2"></div>
                  <div className="w-24 h-4 bg-gray-200 animate-pulse rounded"></div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {/* Mode Kerja */}
              {!isCheckOutMode && (
                <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                  <span className="text-[13px] text-[#9ca3af] font-medium">Mode Kerja</span>
                  <div className="bg-[#f5f8f6] p-1 rounded-[10px] flex gap-1 border border-gray-100">
                    <button 
                      onClick={() => setWorkMode("WFO")}
                      className={`px-4 py-1.5 rounded-md text-[11px] font-bold transition-all ${workMode === 'WFO' ? 'bg-white text-[#1E4738] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      WFO
                    </button>
                    <button 
                      onClick={() => setWorkMode("WFH")}
                      className={`px-4 py-1.5 rounded-md text-[11px] font-bold transition-all ${workMode === 'WFH' ? 'bg-white text-[#1E4738] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      WFH
                    </button>
                  </div>
                </div>
              )}

              {/* Tanggal & Waktu */}
              <div className="flex justify-between items-center border-t border-gray-100 pt-4 pb-4">
                <span className="text-[13px] text-[#9ca3af] font-medium">Tanggal & Waktu</span>
                <span className="text-[13px] font-bold text-[#1E4738]">
                  {reviewTime ? formatDateTime(reviewTime) : "-"}
                </span>
              </div>
              
              {/* Lokasi Absensi */}
              <div className="border-t border-dashed border-gray-200 pt-5 relative">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-bold text-[#1E4738]">Lokasi Absensi</span>
                  </div>
                  
                  <div className="bg-[#f5f8f6] border border-[#e8f1ec] rounded-[16px] p-3 flex gap-3 items-start">
                    <div className="bg-white w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <MapPin className="w-4 h-4 text-[#1E4738]" strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-[#1E4738] leading-tight mb-1.5 pr-2">
                        {location?.address || "Alamat tidak ditemukan"}
                      </span>
                      <span className="text-[10px] font-medium text-[#9ca3af] tracking-wide">
                        ({location?.lat.toFixed(7)}, {location?.lng.toFixed(7)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Action for Step 3 */}
      {step === 3 && (
        <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-gradient-to-t from-white via-white to-white/90 p-6 pb-8 z-30 border-x border-border/40">
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 text-red-500 text-[13px] rounded-xl border border-red-100 text-center font-medium">
              {submitError}
            </div>
          )}
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-14 bg-[#356E3B] hover:bg-[#1E4738] text-white rounded-full font-bold text-[15px] shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                {isCheckOutMode ? "Menyimpan Check-out..." : "Menyimpan..."}
              </>
            ) : (
              isCheckOutMode ? "Simpan Check-out" : "Simpan Kehadiran"
            )}
          </button>
        </div>
      )}

    </div>
  );
}
