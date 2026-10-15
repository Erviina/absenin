"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, RefreshCcw, ArrowRight, 
  MapPin, Check, CheckCircle2, AlertTriangle, Info, SwitchCamera
} from "lucide-react";
import dynamic from 'next/dynamic';

import { TopBar } from '@/components/TopBar';
import { PrimaryButton } from "@/components/PrimaryButton";
import { Badge } from "@/components/Badge";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { evaluateSchedule, getNextCheckInSchedule, calculateServerOffsetMs, CompanyScheduleData } from "@/lib/schedule";
import { formatDateTime } from "@/lib/dateUtils";
const LeafletMap = dynamic(() => import('@/components/MapLocation'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#e6eedc] animate-pulse" />
});

export default function CheckinPage() {
  const router = useRouter();
  const { activeCompanyId } = useCompany();
  const { showToast } = useDialog();
  const [step, setStep] = useState(1);
  const [workMode, setWorkMode] = useState<"WFO" | "WFH">("WFO");

  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number; address: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);

  // Status State
  const [attendanceStatus, setAttendanceStatus] = useState<"NOT_CHECKED_IN" | "CHECKED_IN" | "CHECKED_OUT" | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [companySchedule, setCompanySchedule] = useState<CompanyScheduleData | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());
  const [showEarlyCheckoutModal, setShowEarlyCheckoutModal] = useState<boolean>(false);
  const [showLowAccuracyModal, setShowLowAccuracyModal] = useState<boolean>(false);
  const [lowAccuracyConfirmed, setLowAccuracyConfirmed] = useState<boolean>(false);

  // Live timer interval untuk evaluasi jadwal secara dinamis tanpa reload halaman
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

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
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const checkAvailableCameras = async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
        setHasMultipleCameras(false);
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setHasMultipleCameras(videoInputs.length > 1);
    } catch (e) {
      console.warn("Could not enumerate camera devices:", e);
      setHasMultipleCameras(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (targetFacingMode: "user" | "environment" = facingMode) => {
    setCameraError(null);
    stopCamera();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Browser Anda tidak mendukung akses kamera.");
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (idealErr) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: targetFacingMode },
            audio: false,
          });
        } catch (directErr) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {}
      }

      // Periksa facingMode aktual dari track bila didukung browser
      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings?.();
        if (settings?.facingMode === "user" || settings?.facingMode === "environment") {
          setFacingMode(settings.facingMode);
        }
      }

      await checkAvailableCameras();
    } catch (err: any) {
      console.error("Gagal memulai kamera:", err);
      let msg = "Gagal mengakses kamera.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Akses kamera ditolak. Mohon izinkan akses kamera di pengaturan browser.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "Kamera tidak ditemukan pada perangkat ini.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        msg = "Kamera sedang digunakan oleh aplikasi lain.";
      }
      setCameraError(msg);
    }
  };

  const toggleCamera = async () => {
    if (isSwitchingCamera) return;
    setIsSwitchingCamera(true);
    const nextFacingMode: "user" | "environment" = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacingMode);
    try {
      await startCamera(nextFacingMode);
    } catch (e) {
      console.error("Gagal beralih kamera:", e);
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Otomatis mirror foto jika menggunakan kamera depan (selfie)
        if (facingMode === "user") {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            setPhotoBlob(blob);
            if (photoUrl) URL.revokeObjectURL(photoUrl);
            setPhotoUrl(URL.createObjectURL(blob));
            setReviewTime(new Date());
            setStep(3);
          }
        }, "image/jpeg", 0.85);
      }
    }
  };

  useEffect(() => {
    if (step === 2) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.addEventListener) {
      const handleDeviceChange = () => checkAvailableCameras();
      navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
      };
    }
  }, []);

  const fetchLocation = () => {
    setIsLocating(true);
    setLocationError(null);
    setLowAccuracyConfirmed(false);

    if (!navigator.geolocation) {
      setLocationError("Geolokasi tidak didukung oleh browser Anda.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const roundedAccuracy = Math.round(accuracy);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          setLocation({
            lat: latitude,
            lng: longitude,
            accuracy: roundedAccuracy,
            address: data.display_name || "Alamat tidak ditemukan"
          });
        } catch (error) {
          setLocation({
            lat: latitude,
            lng: longitude,
            accuracy: roundedAccuracy,
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
        } else if (error.code === 2 /* POSITION_UNAVAILABLE */) {
          msg = "Informasi lokasi tidak tersedia. Pastikan GPS/layanan lokasi aktif.";
        } else if (error.code === 3 /* TIMEOUT */) {
          msg = "Waktu pencarian lokasi habis. Silakan klik Coba Lagi.";
        }
        setLocationError(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
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
        if (!activeCompanyId) {
          setSubmitError("Silakan masuk atau bergabung ke perusahaan terlebih dahulu untuk melakukan presensi.");
          setIsStatusLoading(false);
          return;
        }
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }
        const headers: Record<string, string> = {
          "Authorization": `Bearer ${token}`
        };
        if (activeCompanyId) {
          headers["x-company-id"] = activeCompanyId;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendances/today`, {
          headers
        });
        const data = await res.json();
        if (res.ok) {
          setAttendanceStatus(data.data.status);
          if (data.data?.company) {
            setCompanySchedule(data.data.company);
            const offset = calculateServerOffsetMs(data.data.company.server_time);
            setServerOffsetMs(offset);
          } else {
            // Fallback ke /companies/me jika company belum disertakan
            try {
              const compRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/me`, { headers });
              if (compRes.ok) {
                const compData = await compRes.json();
                if (compData.data) {
                  setCompanySchedule(compData.data);
                }
              }
            } catch (e) {
              console.error("Failed to load company schedule fallback", e);
            }
          }
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
  }, [activeCompanyId]);

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

    if (!activeCompanyId) {
      setSubmitError("Silakan masuk atau bergabung ke perusahaan terlebih dahulu untuk melakukan presensi.");
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
    if (activeCompanyId) {
      formData.append("company_id", activeCompanyId);
    }
    formData.append("latitude", location.lat.toString());
    formData.append("longitude", location.lng.toString());
    formData.append("address", location.address);
    formData.append("photo", new File([photoBlob], "attendance.jpg", { type: "image/jpeg" }));

    const endpoint = attendanceStatus === "CHECKED_IN" ? "/attendances/check-out" : "/attendances/check-in";

    try {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`
      };
      if (activeCompanyId) {
        headers["x-company-id"] = activeCompanyId;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: "POST",
        headers,
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
      showToast(attendanceStatus === "CHECKED_IN" ? "Presensi keluar berhasil!" : "Presensi masuk berhasil!", "success");
      router.push("/dashboard");
    } catch (err: any) {
      setSubmitError(err.message || "Terjadi kesalahan sistem");
      setIsSubmitting(false);
    }
  };

  const renderStepper = (isOverlay = false) => (
    <div className={`flex items-center justify-between ${
      isOverlay 
        ? 'px-4 sm:px-6 py-2 bg-black/40 backdrop-blur-md rounded-2xl mx-4 border border-white/10' 
        : 'px-10 py-5 bg-[#fbfdfc] border-b border-[#eef5f0]'
    }`}>
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
              <div className={`absolute ${isOverlay ? 'top-3.5' : 'top-4'} left-[60%] w-[80%] h-[3px] -z-10 ${
                step > s.num ? (isOverlay ? 'bg-white/50' : 'bg-[#356E3B]') : (isOverlay ? 'bg-white/10' : 'bg-[#dce9df]')
              }`} />
            )}
            
            {/* Circle */}
            <div className={`${isOverlay ? 'w-7 h-7 text-[12px] mb-1' : 'w-8 h-8 text-[13px] mb-2'} rounded-full flex items-center justify-center font-bold transition-colors ${
              isCurrent 
                ? 'bg-[#356E3B] text-white shadow-md shadow-[#356E3B]/20' 
                : isActive 
                  ? (isOverlay ? 'bg-white text-[#356E3B]' : 'bg-[#356E3B] text-white')
                  : (isOverlay ? 'bg-white/20 text-white' : 'bg-[#dce9df] text-[#5C786C]')
            }`}>
              {isActive && s.num < step ? <Check className={isOverlay ? "w-4 h-4" : "w-5 h-5"} strokeWidth={3} /> : s.num}
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

  const scheduleEval = evaluateSchedule(
    companySchedule,
    serverOffsetMs,
    new Date(currentTimeMs + serverOffsetMs)
  );

  const nextSchedule = getNextCheckInSchedule(
    companySchedule,
    serverOffsetMs,
    {
      afterCheckout: attendanceStatus === "CHECKED_OUT",
      referenceDate: new Date(currentTimeMs + serverOffsetMs)
    }
  );

  const isCheckOutMode = attendanceStatus === "CHECKED_IN";
  const isCheckInBlocked = !isCheckOutMode && !scheduleEval.isCheckInOpen;
  const titleText = isCheckOutMode ? "Keluar" : "Masuk";

  const bottomDrawerRef = useRef<HTMLDivElement>(null);
  const [bottomDrawerHeight, setBottomDrawerHeight] = useState<number>(240);

  useEffect(() => {
    if (!bottomDrawerRef.current) return;
    const updateHeight = () => {
      if (bottomDrawerRef.current) {
        setBottomDrawerHeight(bottomDrawerRef.current.offsetHeight);
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(bottomDrawerRef.current);
    return () => observer.disconnect();
  }, [location, isCheckInBlocked]);

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
          <h2 className="text-[20px] font-bold text-[#111827] mb-2">Terima Kasih Atas Kontribusinya Hari Ini!</h2>
          <p className="text-[#6B7280] text-[14px] leading-relaxed mb-8 max-w-[320px]">
            Anda telah berhasil melakukan presensi masuk dan keluar untuk hari ini. Selamat beristirahat!
            <br /><br />
            Presensi masuk berikutnya dibuka pada hari{" "}
            <strong className="text-[#1E4738] font-bold">
              {nextSchedule.isTomorrow ? `Besok (${nextSchedule.dayName})` : nextSchedule.dayName}
            </strong>
            {nextSchedule.dateFormatted !== "-" ? `, ${nextSchedule.dateFormatted}` : ""}{" "}
            pukul{" "}
            <strong className="text-[#1E4738] font-bold">
              {nextSchedule.openTimeFormatted} WIB
            </strong>
            .
          </p>
          <button 
            onClick={() => router.push("/dashboard")}
            className="w-full max-w-[200px] h-12 bg-[#356E3B] hover:bg-[#153428] text-white rounded-full font-bold text-[14px] transition-colors shadow-sm"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const handleTriggerSubmit = () => {
    if (!location || !location.lat || !location.lng) {
      setSubmitError("Titik lokasi belum tersedia.");
      return;
    }

    // Validasi akurasi GPS: jika toleransi > 100m dan belum dikonfirmasi pengguna
    if (location.accuracy > 100 && !lowAccuracyConfirmed) {
      setShowLowAccuracyModal(true);
      return;
    }

    if (isCheckOutMode && scheduleEval.isEarlyCheckout) {
      setShowEarlyCheckoutModal(true);
      return;
    }
    handleSubmit();
  };

  return (
    <div className="flex flex-col min-h-[100dvh] w-full bg-[#fbfdfc] relative">
      
      {/* Header (Hidden in Step 2 because it's full screen camera) */}
      {step !== 2 && (
        <TopBar 
          title={isCheckOutMode ? "Rekam Keluar" : "Rekam Kehadiran"} 
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
              <LeafletMap 
                center={[location.lat, location.lng]} 
                showControls={true}
                showRecenter={true}
                onRecenter={fetchLocation}
                isLocating={isLocating}
                bottomOffset={bottomDrawerHeight}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#e6eedc]">
                <span className="text-[#5C786C] font-medium text-sm">
                  {isLocating ? "Mengambil lokasi..." : "Menunggu lokasi..."}
                </span>
              </div>
            )}
          </div>

          {/* Bottom Sheet */}
          <div 
            ref={bottomDrawerRef}
            className="absolute bottom-0 left-0 w-full bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] p-6 pt-3 pb-8 z-20"
          >
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
                <PrimaryButton 
                  onClick={fetchLocation}
                  size="sm"
                  icon={<RefreshCcw className="w-4 h-4" />}
                >
                  Coba Lagi
                </PrimaryButton>
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
                      {location.accuracy <= 100 ? (
                        <Badge variant="success" size="sm" dot>
                          Akurasi Baik ({location.accuracy}m)
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm" icon={<AlertTriangle className="w-3 h-3 text-amber-600" />}>
                          Akurasi Rendah ({location.accuracy}m &gt; 100m)
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Warning Banner jika Check-in belum dibuka / bukan hari kerja */}
                {isCheckInBlocked && (
                  <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-[14px] p-3 mb-4 text-amber-800 text-[12px] font-medium">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{scheduleEval.reason}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button 
                    onClick={fetchLocation}
                    className="flex-1 max-w-[140px] h-14 rounded-full border-[1.5px] border-[#a1d6b2] text-[#356E3B] font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCcw className="w-4 h-4" strokeWidth={2.5} />
                    Refresh
                  </button>
                  <PrimaryButton 
                    onClick={() => setStep(2)}
                    disabled={isCheckInBlocked}
                    rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={3} />}
                    className="flex-1"
                  >
                    Ya, Lanjutkan
                  </PrimaryButton>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* STEP 2: Bukti Foto (Full Screen Responsive) */}
      {step === 2 && (
        <div className="fixed inset-0 h-[100dvh] max-h-[100dvh] w-full z-50 bg-[#111] flex flex-col justify-between overflow-hidden sm:max-w-md mx-auto select-none">
          {/* Camera Feed */}
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111] z-20 px-8 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
              <p className="text-white font-bold text-lg mb-2">Kamera Gagal</p>
              <p className="text-gray-400 text-sm mb-6">{cameraError}</p>
              <PrimaryButton 
                onClick={() => startCamera(facingMode)}
                icon={<RefreshCcw className="w-4 h-4" />}
              >
                Coba Lagi
              </PrimaryButton>
            </div>
          ) : (
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: facingMode === "user" ? 'scaleX(-1) scale(1.02)' : 'scale(1.02)' }}
            />
          )}
          {/* Dark Gradient Overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

          {/* Top Controls */}
          <div className="relative z-10 pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] px-4 sm:px-6 flex justify-between items-center shrink-0 mb-1.5 sm:mb-2">
            <button 
              onClick={() => setStep(1)} 
              aria-label="Kembali"
              className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-md hover:bg-black/70 active:scale-95 transition-all text-white shrink-0"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="w-10 h-10" />
          </div>

          {/* Overlaid Stepper */}
          <div className="relative z-10 shrink-0 mb-1">
            {renderStepper(true)}
          </div>

          {/* Face Oval Guide - Flexible & Auto-scaling for all mobile viewports */}
          <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center z-10 px-4 py-1 overflow-hidden">
            <div className="w-[min(250px,65vw)] h-[min(310px,36vh)] sm:w-[270px] sm:h-[350px] border-[2px] border-[#a1d6b2] rounded-[100px] rounded-b-[140px] relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] shrink-0 flex items-center justify-center">
              {/* Corner markers */}
              <div className="absolute -top-[1px] -left-[1px] w-5 h-5 sm:w-6 sm:h-6 border-t-[3px] border-l-[3px] border-[#a1d6b2] rounded-tl-[16px]" />
              <div className="absolute -top-[1px] -right-[1px] w-5 h-5 sm:w-6 sm:h-6 border-t-[3px] border-r-[3px] border-[#a1d6b2] rounded-tr-[16px]" />
              <div className="absolute -bottom-[1px] -left-[1px] w-5 h-5 sm:w-6 sm:h-6 border-b-[3px] border-l-[3px] border-[#a1d6b2] rounded-bl-[20px]" />
              <div className="absolute -bottom-[1px] -right-[1px] w-5 h-5 sm:w-6 sm:h-6 border-b-[3px] border-r-[3px] border-[#a1d6b2] rounded-br-[20px]" />
              
              {/* Eye Guide */}
              <div className="absolute top-[38%] left-1/2 -translate-x-1/2 w-14 sm:w-16 h-7 sm:h-8 border border-white/40 rounded-[50%] flex items-center justify-center">
                <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-white/40" />
              </div>
            </div>
            
            <p className="text-white text-[13px] sm:text-[14px] font-medium mt-2.5 sm:mt-3 drop-shadow-md text-center shrink-0">
              {facingMode === "user" ? "Tempatkan wajah Anda pada Area Oval" : "Arahkan kamera ke bukti kehadiran Anda"}
            </p>
          </div>

          {/* Bottom Camera Controls - Guaranteed Visible & Safe-area Compliant */}
          <div className="relative z-10 shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] pt-2 sm:pt-3 px-6 sm:px-8 flex items-center justify-between w-full max-w-sm mx-auto">
            {/* Left Spacer to keep shutter button centered */}
            <div className="w-12 h-12 shrink-0" />

            {/* Shutter Button (Center) */}
            <button 
              onClick={takePhoto} 
              disabled={!!cameraError}
              aria-label="Ambil Foto"
              className="w-[68px] h-[68px] sm:w-[72px] sm:h-[72px] rounded-full border-[4px] border-[#a1d6b2] p-1 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50 disabled:active:scale-100 shrink-0 shadow-lg cursor-pointer"
            >
              <div className="w-full h-full bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#a1d6b2]" />
              </div>
            </button>

            {/* Right: Switch Camera Button */}
            {hasMultipleCameras ? (
              <button 
                type="button"
                onClick={toggleCamera} 
                disabled={!!cameraError || isSwitchingCamera}
                aria-label="Ganti Kamera"
                className="w-12 h-12 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-md hover:bg-black/70 active:scale-90 transition-all text-white shrink-0 shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={facingMode === "user" ? "Ganti ke Kamera Belakang" : "Ganti ke Kamera Depan"}
              >
                <SwitchCamera className={`w-5 h-5 text-white ${isSwitchingCamera ? 'animate-spin' : ''}`} />
              </button>
            ) : (
              <div className="w-12 h-12 shrink-0" />
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Tinjau Data */}
      {step === 3 && (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto pb-32">
          
          {/* Details Card */}
          <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-[#f3f7f4] flex flex-col mb-6">
            
            {/* Foto Kehadiran di dalam Card */}
            <div className="w-full aspect-[4/3] rounded-[20px] overflow-hidden bg-gray-100 shadow-xs">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Hasil Foto" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 animate-pulse" />
              )}
            </div>

            {/* Tombol Ambil Ulang Foto */}
            <div className="flex justify-center -mt-5 mb-3 z-10">
              <button 
                type="button"
                onClick={() => setStep(2)}
                className="bg-[#eff6f2] hover:bg-white border border-[#dce9df] text-[#1E4738] font-bold text-[12.5px] px-5 py-2.5 rounded-full flex items-center gap-2 shadow-md active:scale-95 transition-all whitespace-nowrap cursor-pointer"
              >
                <RefreshCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>Ambil Ulang Foto</span>
              </button>
            </div>

            {/* User Info jika tersedia */}
            {(userData || userError) && (
              <div className="flex flex-col items-center mb-3">
                {userError ? (
                  <span className="text-red-500 text-[13px] font-medium">{userError}</span>
                ) : userData ? (
                  <>
                    <h2 className="text-[18px] font-bold text-[#1E4738] leading-tight">{userData.name}</h2>
                    <span className="text-[11px] font-semibold text-[#356E3B] tracking-wide uppercase mt-0.5">{userData.role}</span>
                  </>
                ) : null}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* Mode Kerja */}
              {!isCheckOutMode && (
                <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                  <span className="text-[13px] text-[#9ca3af] font-medium">Mode Kerja</span>
                  <div className="bg-[#f5f8f6] p-1 rounded-full flex gap-1 border border-gray-100">
                    <button 
                      type="button"
                      onClick={() => setWorkMode("WFO")}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${workMode === 'WFO' ? 'bg-white text-[#1E4738] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      WFO
                    </button>
                    <button 
                      type="button"
                      onClick={() => setWorkMode("WFH")}
                      className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${workMode === 'WFH' ? 'bg-white text-[#1E4738] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-medium text-[#9ca3af] tracking-wide">
                          ({location?.lat.toFixed(7)}, {location?.lng.toFixed(7)})
                        </span>
                        {location && (
                          location.accuracy <= 100 ? (
                            <Badge variant="success" size="sm">
                              ±{location.accuracy}m
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm" icon={<AlertTriangle className="w-2.5 h-2.5" />}>
                              ±{location.accuracy}m (rendah)
                            </Badge>
                          )
                        )}
                      </div>
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
        <div className="fixed bottom-0 left-0 right-0 mx-auto w-full sm:max-w-md bg-gradient-to-t from-white via-white to-white/90 p-6 pb-8 z-30 border-t border-border/40 sm:border-x border-x-0">
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 text-red-500 text-[13px] rounded-xl border border-red-100 text-center font-medium">
              {submitError}
            </div>
          )}
          {isCheckInBlocked && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[12px] font-medium flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{scheduleEval.reason}</span>
            </div>
          )}
          <PrimaryButton 
            onClick={handleTriggerSubmit}
            disabled={isSubmitting || isCheckInBlocked}
            isLoading={isSubmitting}
            loadingText={isCheckOutMode ? "Menyimpan Keluar..." : "Menyimpan Masuk..."}
            icon={<CheckCircle2 className="w-5 h-5" />}
            className="w-full"
          >
            {isCheckOutMode ? "Simpan Keluar" : "Simpan Masuk"}
          </PrimaryButton>
        </div>
      )}

      {/* Modal Konfirmasi Pulang Lebih Awal */}
      {showEarlyCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600">
              <AlertTriangle className="w-7 h-7" strokeWidth={2.2} />
            </div>
            <h3 className="text-[18px] font-bold text-[#111827] mb-2">
              Konfirmasi Pulang Lebih Awal
            </h3>
            <p className="text-[13px] text-[#4B5563] leading-relaxed mb-6">
              Jam pulang perusahaan adalah pukul <strong className="text-[#111827] font-bold">{scheduleEval.endTimeFormatted} WIB</strong>. Apakah Anda yakin ingin melakukan presensi keluar sekarang sebelum jam pulang kerja?
            </p>
            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={() => setShowEarlyCheckoutModal(false)}
                className="flex-1 py-3.5 px-4 rounded-full border border-gray-200 text-[#4B5563] font-bold text-[14px] hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <PrimaryButton
                type="button"
                onClick={() => {
                  setShowEarlyCheckoutModal(false);
                  handleSubmit();
                }}
                icon={<Check className="w-4 h-4" strokeWidth={3} />}
                className="flex-1"
              >
                Ya, Keluar
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Akurasi GPS Rendah */}
      {showLowAccuracyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600">
              <AlertTriangle className="w-7 h-7" strokeWidth={2.2} />
            </div>
            <h3 className="text-[18px] font-bold text-[#111827] mb-2">
              Akurasi GPS Rendah (±{location?.accuracy}m)
            </h3>
            <p className="text-[13px] text-[#4B5563] leading-relaxed mb-6">
              Toleransi akurasi lokasi Anda saat ini ({location?.accuracy} meter) melebihi batas yang disarankan (&le; 100 meter). Hal ini dapat menyebabkan perbedaan titik atau alamat saat {isCheckOutMode ? "presensi keluar" : "presensi masuk"}.
              <br /><br />
              Pastikan GPS aktif dan berada di area terbuka untuk mendapatkan akurasi terbaik.
            </p>
            <div className="flex flex-col w-full gap-2.5">
              <PrimaryButton
                type="button"
                onClick={() => {
                  setShowLowAccuracyModal(false);
                  setStep(1);
                  fetchLocation();
                }}
                icon={<RefreshCcw className="w-4 h-4" />}
                className="w-full"
              >
                Perbarui Lokasi
              </PrimaryButton>
              <button
                type="button"
                onClick={() => {
                  setShowLowAccuracyModal(false);
                  setLowAccuracyConfirmed(true);
                  if (isCheckOutMode && scheduleEval.isEarlyCheckout) {
                    setShowEarlyCheckoutModal(true);
                  } else {
                    handleSubmit();
                  }
                }}
                className="w-full py-3 px-4 rounded-full border border-gray-200 text-[#4B5563] font-semibold text-[13px] hover:bg-gray-50 transition-colors"
              >
                Tetap Lanjutkan ({titleText})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
