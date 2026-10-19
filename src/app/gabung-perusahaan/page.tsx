"use client";

import { ChevronLeft, ScanLine, QrCode, X, Zap, Hourglass, Building2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { TopBar } from "@/components/TopBar";
import { Html5Qrcode } from "html5-qrcode";
import { useDialog } from "@/context/DialogContext";
import { useCompany } from "@/context/CompanyContext";

function GabungPerusahaanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useDialog();
  const { refreshMemberships, setCurrentUser, activeCompanyId, currentUser } = useCompany();
  const [kode, setKode] = useState("");
  const [, setActiveRequestId] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending'>('idle');
  const [companyName, setCompanyName] = useState("Perusahaan");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const isRedirectingRef = useRef<boolean>(false);

  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setKode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const completeJoinAndGoToDashboard = useCallback(
    async (requestId?: string | null, targetCompanyId?: string | null) => {
      if (isRedirectingRef.current) return;
      isRedirectingRef.current = true;
      setIsLoading(true);

      if (requestId) {
        try {
          localStorage.setItem(`join_accepted_seen_${requestId}`, "true");
        } catch (e) {
          console.error("Gagal menyimpan flag join_accepted_seen:", e);
        }
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      let finalCompanyId = targetCompanyId || null;

      if (token) {
        try {
          const meRes = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/me", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const meData = await meRes.json();
          if (meData.success && meData.data?.user) {
            localStorage.setItem("user", JSON.stringify(meData.data.user));
            setCurrentUser(meData.data.user);
            if (meData.data.user.company?.id) {
              finalCompanyId = meData.data.user.company.id;
            }
          }
        } catch (e) {
          console.error("Gagal refresh user di beranda:", e);
        }
      }

      if (finalCompanyId) {
        try {
          localStorage.setItem("activeCompanyId", finalCompanyId);
        } catch (e) {
          console.error("Gagal simpan activeCompanyId:", e);
        }
      }

      // Pastikan context memberships diperbarui sebelum berpindah ke dashboard
      try {
        await refreshMemberships();
      } catch (e) {
        console.error("Gagal refresh memberships context:", e);
      }

      showToast("Berhasil bergabung dengan perusahaan!", "success");
      router.replace("/dashboard");
    },
    [router, refreshMemberships, setCurrentUser, showToast]
  );

  useEffect(() => {
    const fetchStatus = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) return;
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          setActiveRequestId(data.data.id);
          setCompanyName(data.data.company_name || "Perusahaan");

          if (data.data.status === 'pending') {
            setStatus('pending');
          } else if (data.data.status === 'approved') {
            const seen = localStorage.getItem(`join_accepted_seen_${data.data.id}`);
            const forceSuccess = searchParams.get("success") === "true";
            const isFromProfile = searchParams.get("from") === "profil";
            const hasActiveCompany = !!(activeCompanyId || currentUser?.company);

            // Layar sukses / auto-redirect ke dashboard hanya boleh berjalan jika:
            // 1. Ada parameter eksplisit ?success=true (dari notifikasi ACC atau transisi polling)
            // 2. ATAU pengguna benar-benar belum memiliki perusahaan aktif sama sekali dan belum pernah melihat konfirmasi
            if (forceSuccess || (!seen && !hasActiveCompany && !isFromProfile)) {
              await completeJoinAndGoToDashboard(data.data.id, data.data.company_id);
              return;
            } else {
              // Jika sudah menjadi anggota aktif atau sudah pernah melihat konfirmasi, tandai seen dan tetap idle
              if (data.data.id) {
                try {
                  localStorage.setItem(`join_accepted_seen_${data.data.id}`, "true");
                } catch {}
              }
              setStatus('idle');
            }
          } else {
            setStatus('idle');
          }
        } else {
          setStatus('idle');
        }
      } catch (err) {
        console.error("Error fetching join status:", err);
      }
    };
    fetchStatus();
  }, [searchParams, completeJoinAndGoToDashboard, activeCompanyId, currentUser]);

  // Polling saat status pending sehingga ketika admin meng-ACC langsung otomatis masuk ke Dashboard
  useEffect(() => {
    if (status !== 'pending') return;

    const interval = setInterval(async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) return;
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data && data.data.status === 'approved') {
          clearInterval(interval);
          setActiveRequestId(data.data.id);
          setCompanyName(data.data.company_name || "Perusahaan");
          await completeJoinAndGoToDashboard(data.data.id, data.data.company_id);
        }
      } catch (err) {
        console.error("Polling join status error:", err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [status, completeJoinAndGoToDashboard]);

  const handleGabung = async (codeOverride?: string) => {
    if (isLoading || isProcessingRef.current) return;
    const codeToJoin = (typeof codeOverride === "string" ? codeOverride : kode).trim().toUpperCase();
    if (!codeToJoin) {
      setErrorMsg("Masukkan kode perusahaan terlebih dahulu");
      return;
    }
    setErrorMsg("");
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      setErrorMsg("Anda belum login");
      showToast("Anda belum login", "error");
      isProcessingRef.current = false;
      return;
    }
    
    setIsLoading(true);
    isProcessingRef.current = true;

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests", {
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
        const resMe = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dataMe = await resMe.json();
        const requestData = (dataMe.success && dataMe.data) ? dataMe.data : data.data;

        if (requestData) {
          if (requestData.id) setActiveRequestId(requestData.id);
          if (requestData.company_name) setCompanyName(requestData.company_name);

          // Jika request langsung disetujui
          if (requestData.status === 'approved') {
            await completeJoinAndGoToDashboard(requestData.id, requestData.company_id);
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
    }
  };

  useEffect(() => {
    if (isScannerOpen) {
      isProcessingRef.current = false;
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      const onScanSuccess = (decodedText: string) => {
        if (isProcessingRef.current || isRedirectingRef.current) return;
        isProcessingRef.current = true;

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
          const codeFromUrl = url.searchParams.get("code");
          cleanCode = (codeFromUrl || decodedText).trim().toUpperCase();
        } catch {
          cleanCode = decodedText.trim().toUpperCase();
        }

        if (!cleanCode) {
          showToast("Kode QR tidak valid atau kosong.", "error");
          setErrorMsg("Kode QR tidak valid atau kosong.");
          isProcessingRef.current = false;
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
      });

      return () => {
        setIsFlashOn(false);
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
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      const from = searchParams.get("from");
      router.replace(from ? `/cek-perusahaan?from=${from}` : "/cek-perusahaan");
    }
  };

  if (status === 'pending') {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-white items-center justify-center px-6 text-center animate-in fade-in duration-300 relative">
        {/* Back Button */}
        <button
          onClick={handleBack}
          aria-label="Kembali"
          className="absolute top-6 left-6 w-10 h-10 bg-[#f7fbf8] rounded-full flex items-center justify-center text-[#1E4738] shadow-sm border border-gray-100 hover:bg-gray-100 active:scale-95 transition-all"
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

          {isLoading && (
            <div className="flex items-center justify-center gap-2.5 py-3 px-4 bg-emerald-50 text-[#1E4738] rounded-2xl text-[13.5px] font-semibold border border-emerald-100 animate-in fade-in">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1E4738] border-t-transparent" />
              <span>Memproses verifikasi perusahaan...</span>
            </div>
          )}

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
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            {isLoading ? "Memproses..." : "Gabung Sekarang"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default function GabungPerusahaanPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <GabungPerusahaanContent />
    </Suspense>
  );
}
