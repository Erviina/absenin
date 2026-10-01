"use client";

import { ChevronLeft, ScanLine, QrCode, X, Zap, Hourglass, Building2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { TopBar } from "@/components/TopBar";

export default function GabungPerusahaanPage() {
  const router = useRouter();
  const [kode, setKode] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'accepted'>('idle');

  useEffect(() => {
    if (status === 'pending') {
      // Simulate admin accepting the request after 3 seconds
      const timer = setTimeout(() => {
        setStatus('accepted');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleGabung = () => {
    if (!kode) return;
    setStatus('pending');
  };

  if (status === 'pending') {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-white items-center justify-center px-6 text-center animate-in fade-in duration-300">
        
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
          <span>PT Contoh Indonesia</span>
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
        <div className="w-[84px] h-[84px] bg-[#356E3B] rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(53,110,59,0.3)] mb-8">
          <Check className="w-10 h-10 text-white" strokeWidth={3} />
        </div>

        {/* Text Content */}
        <h1 className="text-[20px] font-bold text-[#1E293B] mb-1.5">Berhasil Bergabung!</h1>
        <h2 className="text-[#356E3B] font-bold text-[15px] mb-4">
          PT Contoh Indonesia
        </h2>
        
        <p className="text-gray-500 text-[13px] px-6 leading-relaxed max-w-[280px]">
          Selamat datang di tim! Sekarang Anda sudah menjadi anggota dari perusahaan ini.
        </p>

        {/* Bottom Button */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-center">
          <button 
            onClick={() => router.push("/dashboard")}
            className="w-full max-w-md bg-[#356E3B] hover:bg-[#2b5930] text-white py-4 rounded-full text-[15px] font-bold transition-all shadow-[0_4px_16px_rgba(53,110,59,0.2)] active:scale-[0.98]"
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
          <button className="w-10 h-10 flex items-center justify-center -mr-2 active:scale-95 transition-transform">
            <Zap className="w-6 h-6 fill-white" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center pb-20">
          
          <div className="relative w-[280px] h-[280px] mb-8">
            
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[#76d8a3] rounded-tl-[24px]"></div>
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[#76d8a3] rounded-tr-[24px]"></div>
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[#76d8a3] rounded-bl-[24px]"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[#76d8a3] rounded-br-[24px]"></div>
            
            {/* White Background with QR (Simulating camera focus area) */}
            <div className="absolute inset-2 bg-[#f4f6f5] rounded-2xl flex items-center justify-center overflow-hidden">
              <QrCode className="w-[180px] h-[180px] text-[#222]" strokeWidth={1} />
              
              {/* Scan Line glow */}
              <div 
                className="absolute left-0 right-0 h-1 bg-[#76d8a3] shadow-[0_0_16px_8px_rgba(118,216,163,0.5)]"
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
      <TopBar title="Gabung Perusahaan" />

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

          <button 
            onClick={handleGabung}
            disabled={!kode}
            className={`w-full py-4 rounded-[20px] text-[15px] font-bold transition-all shadow-[0_4px_16px_rgba(53,110,59,0.15)] ${kode ? 'bg-[#356E3B] hover:bg-[#2b5930] text-white active:scale-[0.98]' : 'bg-gray-300 text-gray-100 shadow-none'}`}
          >
            Gabung Sekarang
          </button>
        </div>

      </div>
    </div>
  );
}
