"use client";

import { ChevronLeft, ScanLine, QrCode, X, Zap, Hourglass, Building2, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useRef } from "react";
import { TopBar } from "@/components/TopBar";
import { Html5Qrcode } from "html5-qrcode";
import { useDialog } from "@/context/DialogContext";

function GabungPerusahaanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useDialog();
  const [kode, setKode] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'accepted'>('idle');
  const [companyName, setCompanyName] = useState("Perusahaan");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setKode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem("accessToken");
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
            if (!seen || forceSuccess) {
              setStatus('accepted');
            } else {
              setStatus('idle');
            }
          } else {
            setStatus('idle');
          }
        } else {
          setStatus('idle');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStatus();
  }, [searchParams]);

  // Polling saat status pending sehingga ketika admin meng-ACC langsung otomatis berubah ke Berhasil Bergabung
  useEffect(() => {
    if (status !== 'pending') return;

    const interval = setInterval(async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data && data.data.status === 'approved') {
          setActiveRequestId(data.data.id);
          setCompanyName(data.data.company_name || "Perusahaan");
          setStatus('accepted');

          // Sinkronisasi data user dan company di localStorage
          try {
            const meRes = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/me", {
              headers: { Authorization: `Bearer ${token}` }
            });
            const meData = await meRes.json();
            if (meData.success && meData.data?.user) {
              localStorage.setItem("user", JSON.stringify(meData.data.user));
              if (meData.data.user.company?.id) {
                localStorage.setItem("activeCompanyId", meData.data.user.company.id);
              }
            }
          } catch (e) {
            console.error("Gagal update profil:", e);
          }
        }
      } catch (err) {
        console.error("Polling join status error:", err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (isScannerOpen) {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      const onScanSuccess = (decodedText: string) => {
        try {
          const url = new URL(decodedText);
          const codeFromUrl = url.searchParams.get("code");
          if (codeFromUrl) {
            setKode(codeFromUrl.toUpperCase());
          } else {
            setKode(decodedText.toUpperCase());
          }
        } catch {
          // If not URL
          setKode(decodedText.toUpperCase());
        }
        setIsScannerOpen(false);
      };

      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {} // onScanFailure ignore
      ).catch(err => {
        console.error("Camera error", err);
        showToast("Kamera tidak dapat diakses atau izin kamera ditolak.", "error");
        setIsScannerOpen(false);
      });

      return () => {
        setIsFlashOn(false);
        try {
          if (html5QrCode.getState() === 2) { // 2 = SCANNING
            html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
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

  const handleGabung = async () => {
    if (!kode) return;
    setErrorMsg("");
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setErrorMsg("Anda belum login");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ join_code: kode })
      });
      const data = await res.json();
      
      if (data.success) {
        // Re-fetch to get company name properly
        const resMe = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dataMe = await resMe.json();
        if (dataMe.success && dataMe.data) {
          setCompanyName(dataMe.data.company_name);
          setActiveRequestId(dataMe.data.id);
        }
        setStatus('pending');
      } else {
        setErrorMsg(data.errors?.[0] || data.message || "Gagal bergabung");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan jaringan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanjutKeBeranda = async () => {
    if (activeRequestId) {
      localStorage.setItem(`join_accepted_seen_${activeRequestId}`, "true");
    }
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const meRes = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const meData = await meRes.json();
        if (meData.success && meData.data?.user) {
          localStorage.setItem("user", JSON.stringify(meData.data.user));
          if (meData.data.user.company?.id) {
            localStorage.setItem("activeCompanyId", meData.data.user.company.id);
          }
        }
      } catch (e) {
        console.error("Gagal refresh user di beranda:", e);
      }
    }
    router.push("/dashboard");
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
        <div className="absolute bottom-8 left-6 right-6 flex justify-center w-full sm:max-w-md mx-auto">
          <button 
            onClick={handleLanjutKeBeranda}
            className="w-full bg-[#2D5A3F] hover:bg-[#234731] text-white py-4 rounded-full text-[15px] font-bold transition-all shadow-[0_6px_20px_rgba(45,90,63,0.25)] active:scale-[0.98] cursor-pointer"
          >
            Lanjut ke Beranda
          </button>
        </div>

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
          
          <div className="relative w-[280px] h-[280px] mb-8">
            
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[#76d8a3] rounded-tl-[24px] z-10"></div>
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[#76d8a3] rounded-tr-[24px] z-10"></div>
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[#76d8a3] rounded-bl-[24px] z-10"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[#76d8a3] rounded-br-[24px] z-10"></div>
            
            {/* White Background with QR (Simulating camera focus area) */}
            <div className="absolute inset-2 bg-[#f4f6f5] rounded-2xl flex items-center justify-center overflow-hidden relative">
              <div id="qr-reader" className="w-full h-full object-cover"></div>
              
              {/* Scan Line glow */}
              <div 
                className="absolute left-0 right-0 h-1 bg-[#76d8a3] shadow-[0_0_16px_8px_rgba(118,216,163,0.5)] z-20"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
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
          className="w-full bg-[#356E3B] hover:bg-[#2b5930] text-white py-4 rounded-[20px] text-[15px] font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-[0_4px_16px_rgba(53,110,59,0.15)]"
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
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              className="w-full border border-gray-200 rounded-[16px] px-5 py-4 text-[15px] text-[#1E293B] font-bold tracking-wider placeholder-gray-400 placeholder:font-normal placeholder:tracking-normal outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all bg-white"
            />
          </div>

          {errorMsg && (
            <p className="text-red-500 text-sm font-medium px-1">{errorMsg}</p>
          )}

          <button 
            onClick={handleGabung}
            disabled={!kode || isLoading}
            className={`w-full py-4 rounded-[20px] text-[15px] font-bold transition-all shadow-[0_4px_16px_rgba(53,110,59,0.15)] flex items-center justify-center gap-2 ${kode && !isLoading ? 'bg-[#356E3B] hover:bg-[#2b5930] text-white active:scale-[0.98]' : 'bg-gray-300 text-gray-100 shadow-none'}`}
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
