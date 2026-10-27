"use client";

import { ChevronLeft, ScanLine, QrCode, X, Zap, Hourglass, Building2, Check, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { TopBar } from "@/components/TopBar";
import { Html5Qrcode } from "html5-qrcode";
import { useDialog } from "@/context/DialogContext";
import { useCompany } from "@/context/CompanyContext";
import { setActiveCompanyId, getApiUrl } from "@/lib/api";

function LoadingOverlay({ text }: { text: string }) {
  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-[3px] select-none pointer-events-auto transition-all animate-in fade-in duration-200"
      aria-live="assertive"
      role="status"
    >
      <div className="flex flex-col items-center justify-center p-6 text-center max-w-xs">
        <Loader2 className="w-10 h-10 animate-spin text-[#1E4738] mb-4" />
        <p className="text-[15px] font-semibold text-[#1E293B]">
          {text}
        </p>
        <p className="text-[13px] text-gray-500 mt-1">
          Mohon tunggu sebentar
        </p>
      </div>
    </div>
  );
}

function GabungPerusahaanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useDialog();
  const { refreshMemberships, setCurrentUser, activeCompanyId, currentUser, memberships, isCompanyLoading, companyError, switchCompany } = useCompany();
  const [kode, setKode] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [targetCompanyId, setTargetCompanyId] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [status, setStatus] = useState<'checking' | 'idle' | 'pending' | 'accepted' | 'error'>('checking');
  const [companyName, setCompanyName] = useState("Perusahaan");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Memverifikasi perusahaan...");
  const [isFlashOn, setIsFlashOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const isScannerHandlingRef = useRef<boolean>(false);
  const isRedirectingRef = useRef<boolean>(false);

  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setKode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const handleLanjutKeBeranda = useCallback(async () => {
    if (isRedirectingRef.current) return;
    isRedirectingRef.current = true;
    setLoadingText("Sedang memproses permintaan...");
    setIsLoading(true);

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    // 1. Beritahu backend bahwa pengguna telah melihat dan mengakui keberhasilan bergabung
    // Ini mengarsipkan join request (soft-delete) sehingga tidak akan pernah memicu layar sukses kembali
    if (activeRequestId && token) {
      try {
        await fetch(getApiUrl(`/company/join-requests/${activeRequestId}/acknowledge`), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error("Gagal acknowledge join request:", e);
      }
    }

    let finalCompanyId = targetCompanyId || null;

    if (finalCompanyId) {
      setActiveCompanyId(finalCompanyId);
      switchCompany(finalCompanyId);
    }

    if (token) {
      try {
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        if (finalCompanyId) {
          headers["x-company-id"] = finalCompanyId;
        }
        const meRes = await fetch(getApiUrl("/auth/me"), { headers });
        const meData = await meRes.json();
        if (meData.success && meData.data?.user) {
          localStorage.setItem("user", JSON.stringify(meData.data.user));
          setCurrentUser(meData.data.user);
          const userCompId = meData.data.user.company?.id;
          if (!finalCompanyId && userCompId) {
            finalCompanyId = userCompId;
            setActiveCompanyId(userCompId);
            switchCompany(userCompId);
          }
        }
      } catch (e) {
        console.error("Gagal refresh user di beranda:", e);
      }
    }

    try {
      await refreshMemberships(true, finalCompanyId);
      if (finalCompanyId) {
        switchCompany(finalCompanyId);
      }
    } catch (e) {
      console.error("Gagal refresh memberships context:", e);
    }

    router.replace("/dashboard");
    // Pertahankan isLoading = true agar loading overlay tetap menutupi layar sampai Next.js selesai berganti ke dashboard
  }, [activeRequestId, targetCompanyId, setCurrentUser, refreshMemberships, switchCompany, router]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      setStatus('idle');
      return;
    }

    // Tunggu validasi CompanyContext selesai sebelum menyimpulkan status keanggotaan
    if (isCompanyLoading) {
      setStatus('checking');
      return;
    }

    if (companyError) {
      setStatus('error');
      setErrorMsg(companyError);
      return;
    }

    const forceSuccess = searchParams.get("success") === "true";
    const isFromProfile = searchParams.get("from") === "profil";

    const fetchStatus = async () => {
      try {
        const res = await fetch(getApiUrl("/company/join-requests/me"), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok && res.status >= 500) {
          setStatus('error');
          setErrorMsg("Gagal menghubungi server untuk memvalidasi permintaan bergabung.");
          return;
        }

        const data = await res.json();
        if (data.success && data.data) {
          setActiveRequestId(data.data.id);
          setCompanyName(data.data.company_name || "Perusahaan");
          setTargetCompanyId(data.data.company_id);

          if (data.data.status === 'pending') {
            setStatus('pending');
            return;
          } else if (data.data.status === 'approved') {
            const isAlreadyMember = memberships.some((m) => m.company_id === data.data.company_id);
            const alreadySeen = typeof window !== "undefined" && Boolean(sessionStorage.getItem(`ack_seen_${data.data.id}`));

            // Jika pengguna sudah menjadi anggota aktif dan ini adalah refresh, login ulang, atau sudah pernah melihat layar sukses:
            if (isAlreadyMember && (alreadySeen || !forceSuccess)) {
              if (data.data.id) {
                fetch(getApiUrl(`/company/join-requests/${data.data.id}/acknowledge`), {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` }
                }).catch(() => {});
              }

              if (data.data.company_id) {
                setActiveCompanyId(data.data.company_id);
                switchCompany(data.data.company_id);
              }

              if (isFromProfile) {
                setStatus('idle');
              } else {
                setLoadingText("Sedang memproses permintaan...");
                setIsLoading(true);
                isRedirectingRef.current = true;
                router.replace("/dashboard");
              }
              return;
            } else {
              // Proses bergabung yang baru berhasil (pertama kali dibuka setelah di-ACC)
              if (data.data.company_id) {
                setActiveCompanyId(data.data.company_id);
                switchCompany(data.data.company_id);
              }
              try {
                sessionStorage.setItem(`ack_seen_${data.data.id}`, "true");
                if (typeof window !== "undefined" && window.history.replaceState) {
                  window.history.replaceState({}, '', isFromProfile ? '/gabung-perusahaan?from=profil' : '/gabung-perusahaan');
                }
              } catch {}
              setStatus('accepted');
              return;
            }
          }
        }

        // Tidak ada pending atau approved request
        if (memberships.length > 0 && !isFromProfile) {
          if (!activeCompanyId && memberships[0]?.company_id) {
            setActiveCompanyId(memberships[0].company_id);
          }
          setLoadingText("Sedang memproses permintaan...");
          setIsLoading(true);
          isRedirectingRef.current = true;
          router.replace("/dashboard");
        } else {
          setStatus('idle');
        }
      } catch (err) {
        console.error("Error fetching join status:", err);
        setStatus('error');
        setErrorMsg("Terjadi kesalahan jaringan saat memvalidasi permintaan bergabung.");
      }
    };

    fetchStatus();
  }, [searchParams, isCompanyLoading, companyError, memberships, activeCompanyId, router]);

  // Polling saat status pending sehingga ketika admin meng-ACC langsung beralih ke layar Berhasil Bergabung
  useEffect(() => {
    if (status !== 'pending') return;

    const interval = setInterval(async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) return;
      try {
        const res = await fetch(getApiUrl("/company/join-requests/me"), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data && data.data.status === 'approved') {
          clearInterval(interval);
          setActiveRequestId(data.data.id);
          setCompanyName(data.data.company_name || "Perusahaan");
          setTargetCompanyId(data.data.company_id);
          if (data.data.company_id) {
            setActiveCompanyId(data.data.company_id);
            switchCompany(data.data.company_id);
          }
          try {
            sessionStorage.setItem(`ack_seen_${data.data.id}`, "true");
          } catch {}
          setStatus('accepted'); // Tampilkan halaman Berhasil Bergabung!
        }
      } catch (err) {
        console.error("Polling join status error:", err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [status]);

  const handleGabung = async (codeOverride?: string) => {
    if (isLoading || isProcessingRef.current || isRedirectingRef.current) {
      isScannerHandlingRef.current = false;
      return;
    }
    const codeToJoin = (typeof codeOverride === "string" ? codeOverride : kode).trim().toUpperCase();
    if (!codeToJoin) {
      setErrorMsg("Masukkan kode perusahaan terlebih dahulu");
      isScannerHandlingRef.current = false;
      return;
    }
    setErrorMsg("");
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      setErrorMsg("Anda belum login");
      showToast("Anda belum login", "error");
      isScannerHandlingRef.current = false;
      return;
    }
    
    setLoadingText("Memverifikasi perusahaan...");
    setIsLoading(true);
    isProcessingRef.current = true;

    try {
      const res = await fetch(getApiUrl("/company/join-requests"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ join_code: codeToJoin })
      });
      const data = await res.json();
      
      if (data.success) {
        // Ambil detail request terkini dari backend
        const resMe = await fetch(getApiUrl("/company/join-requests/me"), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dataMe = await resMe.json();
        const requestData = (dataMe.success && dataMe.data) ? dataMe.data : data.data;

        if (requestData) {
          if (requestData.id) setActiveRequestId(requestData.id);
          if (requestData.company_name) setCompanyName(requestData.company_name);
          if (requestData.company_id) setTargetCompanyId(requestData.company_id);

          // Jika request langsung disetujui (misal auto-join)
          if (requestData.status === 'approved') {
            if (requestData.company_id) {
              setActiveCompanyId(requestData.company_id);
              switchCompany(requestData.company_id);
            }
            try {
              sessionStorage.setItem(`ack_seen_${requestData.id}`, "true");
            } catch {}
            setStatus('accepted');
            return;
          }
        }
        setStatus('pending');
      } else {
        const errorText = data.errors?.[0] || data.message || "Gagal bergabung";
        setErrorMsg(errorText);
        showToast(errorText, "error");
      }
    } catch (err) {
      console.error("Join company error:", err);
      setErrorMsg("Terjadi kesalahan jaringan");
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
      isScannerHandlingRef.current = false;
    }
  };

  useEffect(() => {
    if (isScannerOpen) {
      isProcessingRef.current = false;
      isScannerHandlingRef.current = false;
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      const onScanSuccess = (decodedText: string) => {
        if (isLoading || isProcessingRef.current || isRedirectingRef.current || isScannerHandlingRef.current) return;
        isScannerHandlingRef.current = true;

        try {
          if (html5QrCode.getState() === 2) { // 2 = SCANNING
            html5QrCode.stop().then(() => {
              try { html5QrCode.clear(); } catch {}
            }).catch(console.error);
          } else {
            html5QrCode.clear();
          }
        } catch (e) {
          console.error(e);
        }

        setIsScannerOpen(false);

        let cleanCode = "";
        try {
          const url = new URL(decodedText);
          const codeFromUrl = url.searchParams.get("code") || url.searchParams.get("join_code");
          cleanCode = (codeFromUrl || "").trim().toUpperCase();
          if (!cleanCode) {
            showToast("Kode QR tidak berisi tautan perusahaan yang valid.", "error");
            setErrorMsg("Kode QR tidak valid atau bukan QR AbsenIN.");
            isScannerHandlingRef.current = false;
            return;
          }
        } catch {
          cleanCode = decodedText.trim().toUpperCase();
        }

        if (!cleanCode) {
          showToast("Kode QR tidak valid atau kosong.", "error");
          setErrorMsg("Kode QR tidak valid atau kosong.");
          isScannerHandlingRef.current = false;
          return;
        }

        setKode(cleanCode);
        handleGabung(cleanCode);
      };

      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10 },
        onScanSuccess,
        () => {} // onScanFailure ignore
      ).catch(err => {
        console.error("Camera error", err);
        showToast("Kamera tidak dapat diakses atau izin kamera ditolak.", "error");
        setIsScannerOpen(false);
        isProcessingRef.current = false;
        isScannerHandlingRef.current = false;
      });

      return () => {
        setIsFlashOn(false);
        isScannerHandlingRef.current = false;
        try {
          if (html5QrCode.getState() === 2) {
            html5QrCode.stop().then(() => {
              try { html5QrCode.clear(); } catch {}
            }).catch(console.error);
          } else {
            html5QrCode.clear();
          }
        } catch (e) {
          console.error(e);
        }
      };
    }
  }, [isScannerOpen]);

  const toggleFlash = async () => {
    if (!scannerRef.current) return;
    const html5QrCode = scannerRef.current;
    
    try {
      if (html5QrCode.getState() !== 2) return; // 2 = SCANNING
      
      await html5QrCode.applyVideoConstraints({
        advanced: [{ torch: !isFlashOn } as any]
      });
      setIsFlashOn(!isFlashOn);
    } catch (error) {
      console.warn("Torch failed", error);
      showToast("Flash tidak didukung di perangkat atau browser ini.", "info");
    }
  };

  const handleBack = () => {
    if (isLoading || isProcessingRef.current || isRedirectingRef.current) return;
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      const from = searchParams.get("from");
      router.replace(from ? `/cek-perusahaan?from=${from}` : "/cek-perusahaan");
    }
  };

  if (isCompanyLoading || status === 'checking') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7fbf8]" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#f7fbf8] items-center justify-center px-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-[17px] font-bold text-[#1E293B] mb-2">Gagal Memverifikasi Permintaan</h2>
        <p className="text-[13.5px] text-gray-500 mb-6 max-w-xs">
          {errorMsg || companyError || "Terjadi kesalahan jaringan atau server saat memeriksa status bergabung."}
        </p>
        <button
          onClick={() => {
            setStatus('checking');
            refreshMemberships();
          }}
          className="px-6 py-2.5 bg-[#1E4738] text-white rounded-full font-semibold text-[14px] hover:bg-[#16352b] transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Coba Lagi
        </button>
      </div>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-white items-center justify-center px-6 text-center animate-in zoom-in-95 duration-500 relative">
        {/* Success Icon */}
        <div className="w-[84px] h-[84px] bg-[#2D5A3F] rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(45,90,63,0.25)] mb-8">
          <Check className="w-10 h-10 text-white stroke-[3]" />
        </div>

        {/* Text Content */}
        <h1 className="text-[22px] font-bold text-[#111827] mb-1.5">Berhasil Bergabung!</h1>
        <h2 className="text-[#2D5A3F] font-bold text-[16px] mb-3.5">
          {companyName}
        </h2>
        
        <p className="text-[#6B7280] text-[13.5px] px-6 leading-relaxed max-w-[290px]">
          Selamat datang di tim! Sekarang Anda sudah menjadi anggota dari perusahaan ini.
        </p>

        {/* Bottom Button */}
        <div className="absolute bottom-8 left-0 right-0 px-6 flex justify-center w-full max-w-md mx-auto">
          <button 
            onClick={handleLanjutKeBeranda}
            disabled={isLoading}
            className="w-full bg-[#2D5A3F] hover:bg-[#234731] text-white py-4 rounded-full text-[15px] font-bold transition-all shadow-[0_6px_20px_rgba(45,90,63,0.25)] active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isLoading ? "Memproses..." : "Lanjut ke Beranda"}
          </button>
        </div>

        {/* Full-Page Loading Overlay */}
        {isLoading && (
          <LoadingOverlay text={loadingText || "Sedang memproses permintaan..."} />
        )}
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-white items-center justify-center px-6 text-center animate-in fade-in duration-300 relative">
        {/* Back Button */}
        <button
          onClick={handleBack}
          aria-label="Kembali"
          className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center text-[#1E4738] shadow-sm border border-gray-100 hover:bg-gray-100 active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-[#1E4738]" strokeWidth={2.5} />
        </button>
        
        {/* Hourglass Icon with concentric circles */}
        <div className="relative flex items-center justify-center w-24 h-24 mb-6">
          <div className="absolute inset-0 border border-gray-100 rounded-full scale-110"></div>
          <div className="absolute inset-0 border border-gray-50 rounded-full scale-[1.3]"></div>
          <div className="w-16 h-16 bg-white rounded-full border border-gray-100 flex items-center justify-center shadow-sm relative z-10">
            <Hourglass className="w-7 h-7 text-[#1E293B]" fill="#1E293B" strokeWidth={1.5} />
          </div>
        </div>

        {/* Text Content */}
        <h1 className="text-[17px] font-bold text-[#1E293B] mb-1">Permintaan Terkirim!</h1>
        <div className="flex items-center justify-center gap-1.5 text-[#1E293B] font-bold text-[14px] mb-4">
          <Building2 className="w-4 h-4 text-[#1E293B]" strokeWidth={2} />
          <span>{companyName}</span>
        </div>
        
        <p className="text-gray-500 text-[14px] max-w-[260px] leading-relaxed">
          Permintaan bergabung Anda telah diteruskan ke Admin
        </p>

      </div>
    );
  }

  if (isScannerOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#12161A] flex flex-col animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-10 pb-6 text-white">
          <button 
            onClick={() => setIsScannerOpen(false)}
            className="w-10 h-10 flex items-center justify-center -ml-2 active:scale-95 transition-transform"
          >
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-[17px] font-bold">Scan QR</h1>
          <button 
            onClick={toggleFlash}
            className="w-10 h-10 flex items-center justify-center -mr-2 active:scale-95 transition-transform"
          >
            <Zap className={`w-6 h-6 ${isFlashOn ? 'fill-yellow-400 text-yellow-400' : 'fill-white text-white'}`} />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center pb-20">
          <style>{`
            #qr-shaded-region {
              display: none !important;
            }
            #qr-reader {
              border: none !important;
              width: 100% !important;
              height: 100% !important;
            }
            #qr-reader video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
              border-radius: 1rem !important;
            }
            @keyframes qrScan {
              0% { top: 8%; opacity: 0.7; }
              50% { top: 92%; opacity: 1; }
              100% { top: 8%; opacity: 0.7; }
            }
            .animate-qr-scan {
              animation: qrScan 2.4s ease-in-out infinite;
            }
          `}</style>
          
          <div className="relative w-[280px] h-[280px] mb-8">
            
            {/* Corner Brackets - Only Green Border */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[#76d8a3] rounded-tl-[24px] z-10 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[#76d8a3] rounded-tr-[24px] z-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[#76d8a3] rounded-bl-[24px] z-10 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[#76d8a3] rounded-br-[24px] z-10 pointer-events-none"></div>
            
            {/* Camera Viewfinder */}
            <div className="absolute inset-2 bg-black rounded-2xl flex items-center justify-center overflow-hidden">
              <div id="qr-reader" className="w-full h-full"></div>
              
              {/* Scan Line glow */}
              <div 
                className="absolute left-0 right-0 h-1 bg-[#76d8a3] shadow-[0_0_16px_8px_rgba(118,216,163,0.5)] z-20 pointer-events-none animate-qr-scan"
              ></div>
            </div>
            
          </div>

          <p className="text-gray-300 text-[14px] text-center max-w-[240px] leading-relaxed">
            Arahkan kamera ke QR code perusahaan atau organisasi.
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f7fbf8] relative">
      
      {/* Header */}
      <TopBar 
        title="Gabung Perusahaan" 
        onBack={handleBack} 
      />

      {/* Main Content */}
      <div className="flex-1 px-6 py-8 flex flex-col items-center">
        
        {/* Illustration */}
        <div className="relative w-[200px] h-[200px] flex items-center justify-center mb-6">
          {/* Shadow at the bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-28 h-2.5 bg-[#e2e8f0]/80 rounded-[100%] blur-[2px]"></div>
          
          {/* Phone Mockup */}
          <div className="w-[110px] h-[160px] border-[5px] border-[#2A3441] rounded-[24px] bg-white relative flex flex-col items-center justify-center z-10 rotate-[2deg]">
            <div className="w-[72px] h-[72px] bg-[#f4f8f5] rounded-2xl flex items-center justify-center border border-[#eef5f0] mb-2 mt-[-10px]">
              <QrCode className="w-10 h-10 text-[#356E3B]" strokeWidth={1.5} />
            </div>
            {/* Phone bottom line */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-[#e2e8f0] rounded-full"></div>
          </div>
          
          {/* Leaf Decoration */}
          <div className="absolute left-6 bottom-14 z-0">
            <svg width="24" height="42" viewBox="0 0 24 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Stem */}
              <path d="M12 40V20" stroke="#356E3B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Left Leaf */}
              <path d="M12 25C12 25 3 25 3 15C13 15 12 25 12 25Z" fill="#f7fbf8" stroke="#356E3B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Right Leaf */}
              <path d="M12 30C12 30 21 30 21 22C11 22 12 30 12 30Z" fill="#f7fbf8" stroke="#356E3B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Scan QR Button */}
        <button 
          onClick={() => setIsScannerOpen(true)}
          disabled={isLoading}
          className={`w-full bg-[#356E3B] hover:bg-[#2b5930] text-white py-4 rounded-[20px] text-[15px] font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-[0_4px_16px_rgba(53,110,59,0.15)] ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <ScanLine className="w-5 h-5" strokeWidth={2} />
          Scan QR
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full my-7">
          <div className="h-[1px] bg-gray-200 flex-1"></div>
          <span className="text-gray-400 text-[13px] font-medium">atau</span>
          <div className="h-[1px] bg-gray-200 flex-1"></div>
        </div>

        {/* Form Section */}
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[#1E293B] text-[13px] font-bold">
              Masukkan Kode Perusahaan
            </label>
            <input 
              type="text" 
              placeholder="Contoh: ABC123"
              value={kode}
              disabled={isLoading}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              className="w-full border border-gray-200 rounded-[16px] px-5 py-4 text-[15px] text-[#1E293B] font-bold tracking-wider placeholder-gray-400 placeholder:font-normal placeholder:tracking-normal outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all bg-white disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {errorMsg && !isLoading && (
            <p className="text-red-500 text-sm font-medium px-1">{errorMsg}</p>
          )}

          <button 
            onClick={() => handleGabung()}
            disabled={!kode || isLoading}
            className={`w-full py-4 rounded-[20px] text-[15px] font-bold transition-all shadow-[0_4px_16px_rgba(53,110,59,0.15)] flex items-center justify-center gap-2 ${
              kode && !isLoading 
                ? 'bg-[#356E3B] hover:bg-[#2b5930] text-white active:scale-[0.98]' 
                : isLoading
                  ? 'bg-[#356E3B]/90 text-white cursor-wait'
                  : 'bg-gray-300 text-gray-100 shadow-none cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin -ml-1 mr-2 text-white" />
            ) : null}
            {isLoading ? "Memproses..." : "Gabung Sekarang"}
          </button>
        </div>

      </div>

      {/* Full-Page Loading Overlay */}
      {isLoading && (
        <LoadingOverlay text={loadingText || "Memverifikasi perusahaan..."} />
      )}
    </div>
  );
}

export default function GabungPerusahaanPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7fbf8]" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
      </div>
    }>
      <GabungPerusahaanContent />
    </Suspense>
  );
}
