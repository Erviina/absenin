"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Users, Mail, Download, ChevronDown, Check, X, FileText, 
  Calendar, BellOff, BriefcaseMedical, Clock, Home, Circle, CheckCircle2, ChevronRight, UserPlus, Settings
} from "lucide-react";
import Link from "next/link";

export default function ApprovalDashboard() {
  return (
    <>
      <Header showNotification={true} />


      <div className="p-4 pb-24 space-y-6">
        
        {/* Title Area */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-heading font-bold text-foreground">Portal Approval Tim</h2>
          <span className="text-[10px] font-bold text-muted-foreground">Rabu, 15 Jan 2025</span>
        </div>

        {/* Group Card */}
        <Card className="shadow-sm border-none bg-primary/10 relative overflow-hidden">
          <CardContent className="p-4">
            <p className="text-[9px] font-bold text-primary mb-2 uppercase tracking-widest">GRUP KERJA AKTIF</p>
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-3 items-center">
                <div className="p-2 bg-primary/20 text-primary rounded-xl">
                  <FileText size={20} />
                </div>
                <h3 className="font-bold text-foreground text-base leading-tight max-w-[200px]">
                  Squad Core Web Platform (14 Staf)
                </h3>
              </div>
              <ChevronDown size={20} className="text-muted-foreground" />
            </div>
            
            <div className="flex gap-2">
              <Button className="flex-1 h-10 bg-[#2F5A3D] hover:bg-primary-dark text-white text-xs font-bold rounded-full">
                <UserPlus size={14} className="mr-1.5" />
                Tambah Anggota
              </Button>
              <Button className="flex-1 h-10 bg-primary/20 hover:bg-primary/30 text-primary border-none shadow-none text-xs font-bold rounded-full">
                <Settings size={14} className="mr-1.5" />
                Atur Hak Akses
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2x2 Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-sm border-none bg-card">
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-foreground">Hadir Hari Ini</span>
                <div className="p-1.5 bg-primary/20 text-primary rounded-md">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <h3 className="text-lg font-heading font-bold text-foreground">42/48</h3>
                <span className="text-[10px] font-bold text-primary">87.5%</span>
              </div>
              <Progress value={87.5} className="h-1 bg-muted [&>div]:bg-primary" />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none bg-card">
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-foreground">Terlambat</span>
                <div className="p-1.5 bg-info/20 text-info rounded-md">
                  <BellOff size={14} />
                </div>
              </div>
              <h3 className="text-lg font-heading font-bold text-foreground mb-1">2 Orang</h3>
              <p className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                <Clock size={10} /> {'>'} 08:15 WIB
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none bg-card">
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-foreground">Izin / Sakit</span>
                <div className="p-1.5 bg-muted rounded-md text-foreground">
                  <BriefcaseMedical size={14} />
                </div>
              </div>
              <h3 className="text-lg font-heading font-bold text-foreground mb-1">3 Orang</h3>
              <p className="text-[9px] font-bold text-muted-foreground">2 Sakit • 1 Cuti</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none bg-primary/10">
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-primary">Perlu Respon</span>
                <div className="p-1.5 bg-primary/20 text-primary rounded-md">
                  <Clock size={14} />
                </div>
              </div>
              <h3 className="text-lg font-heading font-bold text-primary mb-1">5 Pengajuan</h3>
              <p className="text-[9px] font-bold text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                Tindakan segera
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Aksi Cepat Tim */}
        <div>
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">AKSI CEPAT TIM</h3>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12 rounded-full border-border bg-card shadow-sm text-xs font-bold text-foreground">
              <Mail size={16} className="mr-2 text-primary" /> Blast Email
            </Button>
            <Link href="/approval/laporan" className="flex-1 flex">
              <Button variant="outline" className="w-full h-12 rounded-full border-border bg-card shadow-sm text-xs font-bold text-foreground">
                <FileText size={16} className="mr-2 text-primary" /> Laporan
              </Button>
            </Link>
          </div>
        </div>

        {/* Approval List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Checkbox id="selectAll" className="rounded-[4px] border-muted-foreground" />
              <label htmlFor="selectAll" className="text-[11px] font-bold text-foreground">Pilih Semua (3)</label>
            </div>
            <Button className="h-8 bg-[#8DB596] hover:bg-primary text-white text-[10px] font-bold rounded-full px-3">
              <Check size={14} className="mr-1" /> Setujui Terpilih
            </Button>
          </div>

          <div className="space-y-4">
            {/* Card 1 */}
            <Card className="shadow-sm border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Checkbox className="rounded-[4px] border-muted-foreground mt-1" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2 items-center">
                        <Avatar className="w-8 h-8 border border-border">
                          <AvatarImage src="https://i.pravatar.cc/150?u=a" />
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-[13px] leading-tight text-foreground">Budi Pratama</h4>
                          <p className="text-[10px] font-medium text-muted-foreground">Lead Backend Dev</p>
                        </div>
                      </div>
                      <Badge className="bg-info/20 text-info border-none text-[9px] font-bold rounded-full px-2">Cuti 2 Hari</Badge>
                    </div>

                    <div className="bg-muted/40 p-3 rounded-lg border border-border">
                      <p className="text-[10px] font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                        <Calendar size={12} className="text-muted-foreground" /> 20 - 21 Januari 2025
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Keperluan keluarga mendesak di luar kota (Yogyakarta), seluruh tiket tugas mingguan telah...
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] font-bold text-primary cursor-pointer hover:underline flex items-center gap-0.5">
                        Detail Riwayat <ChevronRight size={12} />
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-none bg-info/20 text-destructive hover:bg-info/30">
                          <X size={16} />
                        </Button>
                        <Button className="h-8 bg-[#2F5A3D] hover:bg-primary-dark text-white text-[11px] font-bold rounded-full px-4 shadow-sm">
                          <Check size={14} className="mr-1" /> Setujui
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card className="shadow-sm border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Checkbox className="rounded-[4px] border-muted-foreground mt-1" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2 items-center">
                        <Avatar className="w-8 h-8 border border-border">
                          <AvatarImage src="https://i.pravatar.cc/150?u=b" />
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-[13px] leading-tight text-foreground">Siti Rahmawati</h4>
                          <p className="text-[10px] font-medium text-muted-foreground">UI/UX Designer</p>
                        </div>
                      </div>
                      <Badge className="bg-destructive/20 text-destructive border-none text-[9px] font-bold rounded-full px-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" /> Urgent
                      </Badge>
                    </div>

                    <div className="bg-muted/40 p-3 rounded-lg border border-border">
                      <p className="text-[10px] font-bold text-foreground flex items-center gap-1.5 mb-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-destructive"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                        Sakit 1 Hari • Hari Ini (15 Jan)
                      </p>
                      <div className="bg-card border border-border rounded-md p-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-destructive" />
                          <span className="text-[10px] font-bold text-foreground truncate max-w-[120px]">Surat_Dokter_RS_Bunda.pdf</span>
                        </div>
                        <span className="text-[10px] font-bold text-primary cursor-pointer hover:underline">Preview</span>
                      </div>
                    </div>

                    <div className="flex justify-end mt-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-none bg-info/20 text-destructive hover:bg-info/30">
                          <X size={16} />
                        </Button>
                        <Button className="h-8 bg-[#2F5A3D] hover:bg-primary-dark text-white text-[11px] font-bold rounded-full px-4 shadow-sm">
                          <Check size={14} className="mr-1" /> Setujui
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card className="shadow-sm border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Checkbox className="rounded-[4px] border-muted-foreground mt-1" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2 items-center">
                        <Avatar className="w-8 h-8 border border-border">
                          <AvatarImage src="https://i.pravatar.cc/150?u=c" />
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-[13px] leading-tight text-foreground">Ahmad Fauzi</h4>
                          <p className="text-[10px] font-medium text-muted-foreground">QA Automation</p>
                        </div>
                      </div>
                      <Badge className="bg-primary/20 text-primary border-none text-[9px] font-bold rounded-full px-2">WFH Mendadak</Badge>
                    </div>

                    <div className="bg-muted/40 p-3 rounded-lg border border-border">
                      <p className="text-[10px] font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                        <Home size={12} className="text-muted-foreground" /> 1 Hari • 15 Jan 2025
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Akses jalan raya utama tergenang banjir setinggi 40cm pasca hujan lebat semalam. Tetap standby...
                      </p>
                    </div>

                    <div className="flex justify-end mt-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-none bg-info/20 text-destructive hover:bg-info/30">
                          <X size={16} />
                        </Button>
                        <Button className="h-8 bg-[#2F5A3D] hover:bg-primary-dark text-white text-[11px] font-bold rounded-full px-4 shadow-sm">
                          <Check size={14} className="mr-1" /> Setujui
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Daily Progress Tim */}
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-[14px] font-heading font-bold text-foreground flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Daily Progress Tim
            </h3>
            <span className="text-[10px] font-bold text-muted-foreground">3 Anggota Terpantau</span>
          </div>

          <div className="space-y-6">
            
            {/* Person 1 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h4 className="font-bold text-[13px] text-foreground">Budi Pratama</h4>
                  <Badge className="bg-primary/20 text-primary border-none text-[9px] font-bold rounded-md px-1.5 py-0">WFO</Badge>
                </div>
                <span className="text-[10px] font-bold text-primary">1/3 Selesai (33%)</span>
              </div>
              <div className="pl-4 space-y-1.5 border-l-2 border-border ml-1">
                <div className="flex items-start gap-2 text-muted-foreground line-through opacity-70">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  <p className="text-[11px] font-medium">Review PR #142 Core Service</p>
                </div>
                <div className="flex items-start gap-2 text-foreground">
                  <Circle size={14} className="mt-0.5 shrink-0" />
                  <p className="text-[11px] font-medium">Sprint Planning Q1 Alignment</p>
                </div>
              </div>
            </div>

            {/* Person 2 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                  <h4 className="font-bold text-[13px] text-foreground">Siti Rahmawati</h4>
                  <Badge className="bg-destructive/20 text-destructive border-none text-[9px] font-bold rounded-md px-1.5 py-0">Izin Sakit</Badge>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">Tugas Dialihkan</span>
              </div>
              <div className="pl-4 border-l-2 border-border ml-1">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                  <p className="text-[11px] font-medium">Desain Handoff didelegasikan ke Maya Indah</p>
                </div>
              </div>
            </div>

            {/* Person 3 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h4 className="font-bold text-[13px] text-foreground">Doni Kusuma</h4>
                  <Badge className="bg-primary/20 text-primary border-none text-[9px] font-bold rounded-md px-1.5 py-0">WFH</Badge>
                </div>
                <span className="text-[10px] font-bold text-primary">1/2 Selesai (50%)</span>
              </div>
              <div className="pl-4 space-y-1.5 border-l-2 border-border ml-1">
                <div className="flex items-start gap-2 text-muted-foreground line-through opacity-70">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  <p className="text-[11px] font-medium">Setup Staging Environment</p>
                </div>
                <div className="flex items-start gap-2 text-foreground">
                  <Circle size={14} className="mt-0.5 shrink-0" />
                  <p className="text-[11px] font-medium">Sync Database Migration v2.4</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
