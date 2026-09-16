"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BriefcaseMedical, CalendarOff, BellRing, Home, Calendar, FileText, Send, Share2, Stethoscope, Plane, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function IzinPage() {
  const [type, setType] = useState<"sakit" | "cuti" | "mendesak" | "wfh">("sakit");

  return (
    <>
      <Header userName="Budi" avatarUrl="https://i.pravatar.cc/150?u=budi" showNotification={true} />

      <div className="p-4 pb-24 space-y-6">
        
        {/* Title */}
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Pengajuan Izin</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Kelola ketidakhadiran & surat medis tim</p>
        </div>

        {/* Summary Cards */}
        <div className="bg-muted/30 -mx-4 px-4 py-4 border-y border-border flex gap-3">
          <Card className="flex-1 shadow-sm border-none bg-card">
            <CardContent className="p-3 text-center flex flex-col justify-center h-full">
              <p className="text-[10px] font-bold text-muted-foreground mb-1">Sisa Cuti</p>
              <h3 className="text-2xl font-heading font-bold text-primary">10 <span className="text-[13px] text-muted-foreground font-medium">/12</span></h3>
              <p className="text-[9px] font-bold text-primary mt-1">Hari Aktif</p>
            </CardContent>
          </Card>
          <Card className="flex-1 shadow-sm border-none bg-card">
            <CardContent className="p-3 text-center flex flex-col justify-center h-full">
              <p className="text-[10px] font-bold text-muted-foreground mb-1">Review</p>
              <h3 className="text-2xl font-heading font-bold text-foreground">1</h3>
              <p className="text-[9px] font-bold text-muted-foreground mt-1">Menunggu</p>
            </CardContent>
          </Card>
          <Card className="flex-1 shadow-sm border-none bg-card">
            <CardContent className="p-3 text-center flex flex-col justify-center h-full">
              <p className="text-[10px] font-bold text-muted-foreground mb-1">Disetujui</p>
              <h3 className="text-2xl font-heading font-bold text-primary">4</h3>
              <p className="text-[9px] font-bold text-primary/60 mt-1">Tahun Ini</p>
            </CardContent>
          </Card>
        </div>

        {/* Form Container */}
        <div className="space-y-5">
          
          {/* Tipe Pengajuan */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-foreground">Tipe Pengajuan</h3>
              <span className="text-[10px] font-bold text-primary">*Wajib diisi</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${type === "sakit" ? "bg-primary/20 border-primary text-primary" : "bg-muted/30 border-transparent text-foreground hover:bg-muted/50"}`}
                onClick={() => setType("sakit")}
              >
                <div className={`p-2 rounded-lg shrink-0 ${type === "sakit" ? "bg-card text-primary shadow-sm" : "bg-card text-muted-foreground shadow-sm"}`}>
                  <BriefcaseMedical size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Sakit</h4>
                  <p className="text-[10px] font-medium opacity-80">Surat medis</p>
                </div>
              </button>

              <button 
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${type === "cuti" ? "bg-primary/20 border-primary text-primary" : "bg-muted/30 border-transparent text-foreground hover:bg-muted/50"}`}
                onClick={() => setType("cuti")}
              >
                <div className={`p-2 rounded-lg shrink-0 ${type === "cuti" ? "bg-card text-primary shadow-sm" : "bg-card text-muted-foreground shadow-sm"}`}>
                  <CalendarOff size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Cuti Tahunan</h4>
                  <p className="text-[10px] font-medium opacity-80">Potong kuota</p>
                </div>
              </button>

              <button 
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${type === "mendesak" ? "bg-primary/20 border-primary text-primary" : "bg-muted/30 border-transparent text-foreground hover:bg-muted/50"}`}
                onClick={() => setType("mendesak")}
              >
                <div className={`p-2 rounded-lg shrink-0 ${type === "mendesak" ? "bg-card text-primary shadow-sm" : "bg-card text-muted-foreground shadow-sm"}`}>
                  <BellRing size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Mendesak</h4>
                  <p className="text-[10px] font-medium opacity-80">Keperluan urgen</p>
                </div>
              </button>

              <button 
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${type === "wfh" ? "bg-primary/20 border-primary text-primary" : "bg-muted/30 border-transparent text-foreground hover:bg-muted/50"}`}
                onClick={() => setType("wfh")}
              >
                <div className={`p-2 rounded-lg shrink-0 ${type === "wfh" ? "bg-card text-primary shadow-sm" : "bg-card text-muted-foreground shadow-sm"}`}>
                  <Home size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">WFH Khusus</h4>
                  <p className="text-[10px] font-medium opacity-80">Kerja remote</p>
                </div>
              </button>
            </div>
          </div>

          {/* Rentang Tanggal */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-foreground">Rentang Tanggal</h3>
              <Badge className="bg-primary/20 text-primary border-none text-[10px] rounded-full px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1" />
                Total 2 Hari Kerja
              </Badge>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-bold text-foreground mb-1 block">Mulai</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <div className="pl-9 h-11 bg-muted/40 rounded-lg flex items-center text-sm font-medium border border-border">
                    20/01/2025
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-bold text-foreground mb-1 block">Selesai</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <div className="pl-9 h-11 bg-muted/40 rounded-lg flex items-center text-sm font-medium border border-border">
                    21/01/2025
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alasan */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">Alasan / Catatan Medis</h3>
            <Textarea 
              placeholder="Demam dan flu berat, butuh istirahat sesuai anjuran dokter klinik..."
              className="min-h-[90px] resize-none bg-muted/30 border-transparent text-sm font-medium focus-visible:ring-primary/50"
              defaultValue="Demam dan flu berat, butuh istirahat sesuai anjuran dokter klinik..."
            />
          </div>

          {/* Lampiran Bukti */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-foreground">Lampiran Bukti</h3>
              <span className="text-[10px] font-bold text-muted-foreground">PDF, PNG, JPG (Maks. 5MB)</span>
            </div>
            
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-card text-foreground rounded-lg shadow-sm">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Surat_Keterangan_Dokter.pdf</h4>
                  <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                    1.2 MB • <span className="text-primary flex items-center gap-0.5"><CheckCircle2 size={10} /> Terverifikasi</span>
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold bg-card">Ganti</Button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-muted/40 p-3 rounded-xl flex gap-3 items-start border border-border">
            <Share2 size={18} className="text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
              Akan diteruskan otomatis ke approval lead <strong>Ratna Dewi</strong> & notifikasi email ke tim squad.
            </p>
          </div>

          {/* Submit Button */}
          <Button className="w-full h-14 bg-[#759D81] hover:bg-primary text-white font-bold text-sm shadow-md rounded-xl">
            <Send className="mr-2 w-5 h-5" />
            KIRIM PERMOHONAN IZIN
          </Button>

        </div>

        {/* Riwayat */}
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-heading font-bold text-foreground">Riwayat Izin Terbaru</h3>
            <span className="text-xs font-bold text-primary cursor-pointer hover:underline">Lihat Semua</span>
          </div>

          <div className="space-y-3">
            <Card className="shadow-sm border-none bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Izin Sakit</h4>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">20 Jan - 21 Jan (2 Hari Kerja)</p>
                  </div>
                </div>
                <Badge className="bg-muted text-muted-foreground border-none text-[10px] px-2 py-1 flex items-center gap-1.5 rounded-full hover:bg-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  Menunggu Review
                </Badge>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                    <Plane size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Cuti Tahunan</h4>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">05 Jan - 07 Jan (3 Hari Kerja)</p>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary border-none text-[10px] px-2 py-1 flex items-center gap-1.5 rounded-full hover:bg-primary/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Disetujui
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </>
  );
}
