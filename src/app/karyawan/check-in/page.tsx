"use client";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Target, Camera, CheckCircle2, Cloud, RefreshCw, Fingerprint, PenLine, Building2, Home, Car } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image"; // We'll just use a div with background image for now

export default function CheckInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"wfo" | "wfh" | "wfa">("wfo");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      router.push("/karyawan/todo?from=checkin");
    }, 1500);
  };

  return (
    <>
      <Header userName="Budi" avatarUrl="https://i.pravatar.cc/150?u=budi" showNotification={true} />

      <div className="p-4 pb-24 flex flex-col gap-5">
        
        {/* Title */}
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Presensi Masuk</h2>
          <p className="text-sm text-muted-foreground font-medium">Check-in Pagi</p>
        </div>

        {/* Lokasi Card */}
        <Card className="shadow-sm border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Lokasi</h3>
                  <p className="text-xs text-muted-foreground">Menara Thamrin / Sinar Mas Land</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-1 rounded-full">
                Radius 100m
              </span>
            </div>

            {/* Fake Map */}
            <div className="px-4 pb-4">
              <div className="h-32 bg-muted rounded-xl relative w-full flex items-center justify-center overflow-hidden border border-border">
                {/* Fake map lines */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                     style={{ backgroundImage: 'linear-gradient(#2E5B3E 1px, transparent 1px), linear-gradient(90deg, #2E5B3E 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                
                {/* Map Pin */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary/30 rounded-full animate-ping" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white p-1.5 rounded-full shadow-lg z-10">
                  <Target size={16} />
                </div>

                {/* Distance Badge */}
                <div className="absolute bottom-2 left-2 bg-card px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1.5 border border-border z-20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  34m ke Titik Acuan
                </div>
              </div>
            </div>

            <div className="bg-primary/10 p-3 mx-4 mb-4 rounded-xl flex items-start gap-3 border border-primary/20">
              <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-primary">Terverifikasi: Dalam Radius Presensi</p>
                <p className="text-[10px] text-primary/80 font-medium">Jarak 34m dari batas aman maksimal 100m</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bukti Foto Card */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 text-primary rounded-full">
                <Camera size={20} />
              </div>
              <h3 className="font-semibold text-sm">Bukti Foto</h3>
            </div>
            
            {/* Fake Camera Preview / Photo */}
            <div className="w-full h-48 bg-muted rounded-xl relative overflow-hidden mb-3 border border-border group cursor-pointer">
              {/* Fake image using gradient and icon for now, ideally an Image tag */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-info/20 flex items-center justify-center">
                <Camera size={48} className="text-primary/30" />
              </div>
              
              {/* Photo Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-3 flex justify-between items-end text-white">
                <div>
                  <p className="text-[10px] font-bold">15 Jan 2025 • 07:45:12 WIB</p>
                  <p className="text-[8px] text-white/80">-6.1873° S, 106.8239° E (Thamrin)</p>
                </div>
                <CheckCircle2 size={16} className="text-success" />
              </div>

              {/* Camera Frame Corners */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary/50 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary/50 rounded-tr-lg" />
              <div className="absolute bottom-16 left-4 w-6 h-6 border-b-2 border-l-2 border-primary/50 rounded-bl-lg" />
              <div className="absolute bottom-16 right-4 w-6 h-6 border-b-2 border-r-2 border-primary/50 rounded-br-lg" />
            </div>

            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Cloud size={14} /> 480 KB ≤ 2MB
              </div>
              <button className="flex items-center gap-1.5 text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors">
                <RefreshCw size={12} /> Ambil Ulang
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Mode Kehadiran */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground mb-3">MODE KEHADIRAN</h3>
          <div className="grid grid-cols-3 gap-2">
            <button 
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${mode === "wfo" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
              onClick={() => setMode("wfo")}
            >
              <Building2 size={24} className="mb-2" />
              <span className="text-[10px] font-bold">WFO</span>
              <span className="text-[8px] font-medium opacity-80">Kantor Pusat</span>
            </button>
            <button 
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${mode === "wfh" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
              onClick={() => setMode("wfh")}
            >
              <Home size={24} className="mb-2" />
              <span className="text-[10px] font-bold">WFH</span>
              <span className="text-[8px] font-medium opacity-80">Domisili</span>
            </button>
            <button 
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${mode === "wfa" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
              onClick={() => setMode("wfa")}
            >
              <Car size={24} className="mb-2" />
              <span className="text-[10px] font-bold">WFA</span>
              <span className="text-[8px] font-medium opacity-80">Kunjungan</span>
            </button>
          </div>
        </div>

        {/* Catatan Harian */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-muted-foreground">CATATAN HARIAN</h3>
            <span className="text-[10px] text-muted-foreground/60">Opsional</span>
          </div>
          <div className="relative">
            <PenLine className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Misal: Keadaan Hari Ini" className="pl-9 h-12 bg-card border-border" />
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          className="w-full h-14 mt-2 text-sm font-bold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center"
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? "Memproses..." : "KONFIRMASI CHECK-IN (07:45 WIB)"}
        </Button>

      </div>
    </>
  );
}
