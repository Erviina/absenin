"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Building2, Clock, Target, Lock, MapPin, Plus, Coffee, 
  Bell, AlertCircle, Save
} from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <Header userName="Manager" avatarUrl="https://i.pravatar.cc/150?u=manager" showNotification={true} />

      {/* Top Segment Control (Same as Dashboard) */}
      <div className="bg-card border-b border-border p-3 flex gap-2 overflow-x-auto scrollbar-hide">
        <Badge className="bg-primary/20 text-primary border-none whitespace-nowrap rounded-full px-3 py-1 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />
          Divisi Tech & Product
        </Badge>
        <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-none whitespace-nowrap rounded-full px-3 py-1 font-medium hover:bg-muted">
          Karyawan
        </Badge>
        <Badge className="bg-primary-dark text-white border-none whitespace-nowrap rounded-full px-3 py-1 font-bold flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          Approval
        </Badge>
      </div>

      <div className="p-4 pb-24 space-y-6">
        
        {/* Title Area */}
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Kelola & Master Data</h2>
          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
            Konfigurasi parameter operasional presensi, geofence GPS, jadwal shift, dan kebijakan organisasi.
          </p>
        </div>

        {/* Active Policy Card */}
        <Card className="shadow-sm border-none bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-3 items-center">
                <div className="p-2 bg-primary/20 text-primary rounded-xl">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">PT Inovasi Digital #4092</h3>
                  <p className="text-[11px] font-bold text-muted-foreground">Master Policy v2.4 (Aktif)</p>
                </div>
              </div>
              <Badge className="bg-primary/20 text-primary border-none text-[10px] rounded-full px-2 py-0.5">Produksi</Badge>
            </div>
            
            <div className="bg-muted/40 p-2.5 rounded-lg flex items-center gap-1.5 border border-border">
              <Clock size={14} className="text-muted-foreground" />
              <span className="text-[10px] font-bold text-foreground">Terakhir diperbarui: 24 Feb 2025 • Dian HR</span>
            </div>
          </CardContent>
        </Card>

        {/* Penetapan Lokasi */}
        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <Target size={18} />
                </div>
                <h3 className="font-bold text-foreground text-base">Penetapan Lokasi</h3>
              </div>
              <Badge className="bg-primary/20 text-primary border-none text-[10px] font-bold rounded-full px-2">
                1 Titik<br/>Aktif
              </Badge>
            </div>

            {/* Location 1 */}
            <div className="bg-muted/30 p-3 rounded-xl border border-border mb-3">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-sm text-foreground">Kantor Pusat Wisma Nutura Tower</h4>
                <Lock size={16} className="text-primary" />
              </div>
              <p className="text-[11px] text-muted-foreground font-mono mb-2">Lat: -6.218571, Long: 106.802143</p>
              <p className="text-[10px] font-bold text-foreground flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Akurasi GPS Hardware: ±4m terverifikasi
              </p>
            </div>

            {/* Location 2 with map */}
            <div className="bg-card p-3 rounded-xl border border-border shadow-sm mb-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2">
                  <div className="mt-0.5 text-primary">
                    <MapPin size={16} fill="currentColor" className="text-primary/20" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Sinar Mas Land Plaza</h4>
                    <p className="text-[11px] text-muted-foreground">Lt. 12, Tower 2 • Jakarta Pusat</p>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Valid
                </Badge>
              </div>
              
              {/* Fake Map */}
              <div className="h-28 bg-muted rounded-lg relative w-full flex items-center justify-center overflow-hidden border border-border">
                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                     style={{ backgroundImage: 'linear-gradient(#2E5B3E 1px, transparent 1px), linear-gradient(90deg, #2E5B3E 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-primary/20 rounded-full border border-primary/40" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#2F5A3D] text-white p-1 rounded-full shadow-lg z-10">
                  <Target size={14} />
                </div>
                {/* Fake map labels */}
                <span className="absolute top-2 left-2 text-[6px] font-bold text-muted-foreground/60">Jl. MH Thamrin</span>
                <span className="absolute bottom-2 right-2 text-[6px] font-bold text-muted-foreground/60">Monas</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-muted/20 p-3 rounded-xl border border-border">
              <div>
                <h4 className="font-bold text-sm text-foreground">Batas Radius Paten</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Toleransi radius tap presensi</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-card border border-border rounded-lg px-3 py-1.5 text-center shadow-sm">
                  <span className="font-bold text-primary block leading-tight">100</span>
                  <span className="text-[10px] font-bold text-muted-foreground">Meter</span>
                </div>
                <Badge className="bg-primary/20 text-primary border-none text-[10px] font-bold rounded-lg px-2 text-center leading-tight py-1">
                  PRD<br/>100m
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shift & Jam Kerja */}
        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-primary/10 text-primary rounded-full shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base leading-tight">Shift & Jam Kerja</h3>
                <p className="text-[10px] text-muted-foreground font-medium">Parameter waktu & cutoff presensi harian</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <Button variant="outline" className="h-9 flex-1 bg-card border-border shadow-sm text-primary font-bold text-xs">
                Reguler (Default)
              </Button>
              <Button variant="outline" className="h-9 flex-1 bg-muted/30 border-transparent text-muted-foreground font-bold text-xs">
                Fleksibel / Hybrid
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 bg-muted/30 border-transparent text-foreground">
                <Plus size={16} />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-muted/30 p-3 rounded-xl border border-border">
                <p className="text-[10px] font-bold text-foreground mb-1">Jam Masuk Kerja</p>
                <h4 className="font-heading font-bold text-2xl text-foreground flex items-baseline gap-1">
                  08:30 <span className="text-[10px] text-primary">WIB</span>
                </h4>
                <p className="text-[10px] font-bold text-muted-foreground mt-1">Lock awal: 07:00</p>
              </div>
              <div className="bg-muted/30 p-3 rounded-xl border border-border">
                <p className="text-[10px] font-bold text-foreground mb-1">Jam Pulang Kerja</p>
                <h4 className="font-heading font-bold text-2xl text-foreground flex items-baseline gap-1">
                  17:00 <span className="text-[10px] text-primary">WIB</span>
                </h4>
                <p className="text-[10px] font-bold text-muted-foreground mt-1">Min. 8 Jam Kerja</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2">
                <div className="flex gap-2 items-center">
                  <div className="w-5 h-5 rounded-full border-2 border-foreground border-r-transparent rotate-45 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs text-foreground leading-tight">Toleransi Terlambat</h4>
                    <p className="text-[10px] text-muted-foreground">≤ 08:40 WIB Tepat Waktu</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-md px-3 py-1.5 text-[11px] font-bold text-foreground shadow-sm">
                  10 Menit
                </div>
              </div>

              <div className="flex items-center justify-between p-2">
                <div className="flex gap-2 items-center">
                  <Lock size={18} className="text-destructive shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs text-foreground leading-tight">Cutoff Presensi Pagi</h4>
                    <p className="text-[10px] text-muted-foreground">{'>'} 12:00 alih ke Form Koreksi</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-md px-3 py-1.5 text-[11px] font-bold text-foreground shadow-sm">
                  12:00 WIB
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Istirahat & Mid-Shift */}
        <Card className="shadow-sm border-border bg-card mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-primary/10 text-primary rounded-full shrink-0">
                <Coffee size={18} />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base leading-tight">Istirahat & Mid-Shift</h3>
                <p className="text-[10px] text-muted-foreground font-medium">Kebijakan durasi rehat & izin keluar jam kerja</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-muted/30 p-3 rounded-xl border border-border">
                <p className="text-[10px] font-bold text-foreground mb-1">Kuota Istirahat</p>
                <h4 className="font-heading font-bold text-xl text-foreground">60 Menit</h4>
                <p className="text-[10px] font-bold text-primary mt-1">Window 12:00-13:00</p>
              </div>
              <div className="bg-muted/30 p-3 rounded-xl border border-border">
                <p className="text-[10px] font-bold text-foreground mb-1">Batas Mid-Shift</p>
                <h4 className="font-heading font-bold text-xl text-foreground">Maks. 2 Jam</h4>
                <p className="text-[10px] font-bold text-primary mt-1">Wajib Tier-1 Lead</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                  <Bell size={16} className="text-primary" /> Pengingat Menit ke-50
                </div>
                <Badge className="bg-primary/20 text-primary border-none text-[10px] px-3 font-bold rounded-md">Aktif</Badge>
              </div>

              <div className="flex items-center justify-between px-1">
                <div className="flex gap-2 items-center">
                  <AlertCircle size={16} className="text-foreground shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-foreground leading-tight">Toleransi Overbreak</h4>
                    <p className="text-[10px] text-muted-foreground">Tercatat di audit kedisiplinan</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-md px-3 py-1.5 text-[11px] font-bold text-foreground shadow-sm">
                  {'>'} 65 Mnt
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button className="w-full h-14 bg-[#2F5A3D] hover:bg-primary-dark text-white font-bold text-sm shadow-md rounded-xl">
          <Save className="mr-2 w-5 h-5" />
          Simpan Perubahan Master Data
        </Button>

      </div>
    </>
  );
}
