"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, RefreshCcw, ArrowRight, Plus, Minus, Target, 
  X, Zap, HelpCircle, MapPin, Check
} from "lucide-react";
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('@/components/MapLocation'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#e6eedc] animate-pulse" />
});

export default function CheckinPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [workMode, setWorkMode] = useState<"WFO" | "WFH">("WFO");

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.push("/dashboard");
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

  return (
    <div className="flex flex-col min-h-[100dvh] w-full bg-[#fbfdfc] relative">
      
      {/* Header (Hidden in Step 2 because it's full screen camera) */}
      {step !== 2 && (
        <div className="bg-[#356E3B] pt-12 pb-4 px-4 flex items-center justify-center relative shrink-0">
          <button 
            onClick={handleBack}
            className="absolute left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-white text-[16px] font-bold tracking-wide">Rekam Kehadiran</h1>
        </div>
      )}

      {/* Stepper (Standard) */}
      {step !== 2 && renderStepper()}

      {/* STEP 1: Titik Lokasi */}
      {step === 1 && (
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#e6eedc]">
          {/* Leaflet Map */}
          <div className="absolute inset-0 z-0">
            <LeafletMap />
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
            
            <div className="flex gap-4 items-start mb-6">
              <div className="w-12 h-12 rounded-[14px] bg-[#eef5f0] flex items-center justify-center shrink-0 mt-1">
                <MapPin className="w-6 h-6 text-[#1E4738]" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[15px] font-bold text-[#1E4738] leading-snug mb-1.5">
                  Apakah titik lokasi kamu saat ini sudah benar?
                </h3>
                <p className="text-[#5C786C] text-[12px] leading-relaxed mb-3">
                  Jalan Merak No. 5, Coblong, Kota Bandung, Jawa Barat
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-[#9ca3af] font-medium tracking-wide">
                    -7.2564186, 112.4882029
                  </span>
                  <div className="flex items-center gap-1.5 bg-[#e4faed] px-2.5 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 bg-[#00a859] rounded-full" />
                    <span className="text-[9px] font-bold text-[#1E4738]">Akurasi tinggi (5m)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 max-w-[140px] h-14 rounded-full border-[1.5px] border-[#a1d6b2] text-[#356E3B] font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
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
          </div>
        </div>
      )}

      {/* STEP 2: Bukti Foto (Full Screen) */}
      {step === 2 && (
        <div className="fixed inset-0 z-50 bg-[#111] flex flex-col justify-between overflow-hidden max-w-md mx-auto">
          {/* Camera Feed Mock */}
          <img 
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop" 
            alt="Camera Feed" 
            className="absolute inset-0 w-full h-full object-cover scale-[1.02]"
          />
          {/* Dark Gradient Overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

          {/* Top Controls */}
          <div className="relative z-10 pt-12 px-6 flex justify-between items-center mb-6">
            <button onClick={() => setStep(1)} className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-md">
              <X className="w-5 h-5 text-white" />
            </button>
            <button className="px-4 h-10 rounded-full bg-white/95 text-[#1E4738] font-bold text-[12px] flex items-center gap-2 shadow-lg">
              <RefreshCcw className="w-3.5 h-3.5" strokeWidth={3} />
              Mirror ON
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
            
            <button onClick={() => setStep(3)} className="w-[72px] h-[72px] rounded-full border-[4px] border-[#a1d6b2] p-1 flex items-center justify-center transition-transform active:scale-90">
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
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop" 
              alt="Hasil Foto" 
              className="w-full h-full object-cover rounded-[24px] shadow-sm"
            />
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
              <h2 className="text-[20px] font-bold text-[#1E4738] mb-1">Ervina</h2>
              <span className="text-[11px] font-bold text-[#356E3B] tracking-wide uppercase">STAFF OPERASIONAL</span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Mode Kerja */}
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

              {/* Area */}
              <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                <span className="text-[13px] text-[#9ca3af] font-medium">Area</span>
                <span className="text-[13px] font-bold text-[#1E4738]">Cimahi</span>
              </div>

              {/* Tanggal & Waktu */}
              <div className="flex justify-between items-center border-t border-gray-100 pt-4 pb-4">
                <span className="text-[13px] text-[#9ca3af] font-medium">Tanggal & Waktu</span>
                <span className="text-[13px] font-bold text-[#1E4738]">17 Sep 2026, 11:51 WIB</span>
              </div>
              
              {/* Lokasi Absensi */}
              <div className="border-t border-dashed border-gray-200 pt-5 relative">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-bold text-[#1E4738]">Lokasi Absensi</span>
                    <div className="flex items-center gap-1.5 bg-[#e4faed] border border-[#a1d6b2]/30 px-2.5 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 bg-[#00a859] rounded-full" />
                      <span className="text-[9px] font-bold text-[#00a859]">Di dalam radius kerja (Valid)</span>
                    </div>
                  </div>
                  
                  <div className="bg-[#f5f8f6] border border-[#e8f1ec] rounded-[16px] p-3 flex gap-3 items-start">
                    <div className="bg-white w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <MapPin className="w-4 h-4 text-[#1E4738]" strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-[#1E4738] leading-tight mb-1.5 pr-2">
                        Jalan Merak No. 5, Coblong, Kota Bandung, Jawa Barat
                      </span>
                      <span className="text-[10px] font-medium text-[#9ca3af] tracking-wide">
                        (-7.2564186, 112.4882029)
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
          <button 
            onClick={() => router.push("/dashboard")}
            className="w-full h-14 bg-[#356E3B] hover:bg-[#1E4738] text-white rounded-full font-bold text-[15px] shadow-lg transition-transform active:scale-95 flex items-center justify-center"
          >
            Simpan Kehadiran
          </button>
        </div>
      )}

    </div>
  );
}
