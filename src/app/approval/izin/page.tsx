"use client";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, FileText, Search, Filter, AlertCircle, Clock, CalendarOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ApprovalRequestsPage() {
  return (
    <>
      <Header title="Permintaan Approval" showNotification={true} />

      <div className="p-4 pb-24 space-y-5">
        
        {/* Header Title */}
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Permintaan Tertunda</h2>
          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
            Review dan proses pengajuan izin, lembur, dan koreksi absen tim Anda.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Cari nama karyawan..." className="pl-9 h-12 bg-card shadow-sm rounded-xl border-border" />
          </div>
          <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 bg-card shadow-sm rounded-xl border-border">
            <Filter size={20} className="text-muted-foreground" />
          </Button>
        </div>

        {/* Tabs / Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          <Badge className="bg-primary hover:bg-primary/90 px-4 py-2 text-xs rounded-full whitespace-nowrap shadow-sm cursor-pointer border-none font-bold">
            Pending (5)
          </Badge>
          <Badge variant="outline" className="px-4 py-2 text-xs rounded-full whitespace-nowrap cursor-pointer bg-card border-border text-muted-foreground font-semibold hover:bg-muted/50">
            Disetujui (12)
          </Badge>
          <Badge variant="outline" className="px-4 py-2 text-xs rounded-full whitespace-nowrap cursor-pointer bg-card border-border text-muted-foreground font-semibold hover:bg-muted/50">
            Ditolak (2)
          </Badge>
        </div>

        {/* List Approval */}
        <div className="space-y-4">
          {[
            { id: 1, name: "Budi Santoso", role: "Frontend Dev", type: "Cuti Tahunan", icon: CalendarOff, color: "text-primary", bg: "bg-primary/10", date: "15-16 Jan 2025", days: "2 hari", reason: "Ada urusan keluarga di luar kota." },
            { id: 2, name: "Siti Aminah", role: "Product Manager", type: "Izin Sakit", icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", date: "15 Jan 2025", days: "1 hari", reason: "Demam dan flu sejak semalam.", doc: true },
            { id: 3, name: "Agus Riyadi", role: "Backend Dev", type: "Koreksi Absen", icon: Clock, color: "text-warning", bg: "bg-warning/10", date: "14 Jan 2025", days: "Lupa Check-out", reason: "Sistem error saat mau tap keluar.", doc: false },
          ].map(item => (
            <Card key={item.id} className="shadow-sm border-border overflow-hidden rounded-2xl">
              <CardContent className="p-0">
                <div className="p-4 border-b border-border bg-card">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3 items-center">
                      <div className={`p-2.5 rounded-xl ${item.bg} ${item.color}`}>
                        <item.icon size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground leading-tight">{item.name}</h4>
                        <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{item.role}</p>
                      </div>
                    </div>
                    <Badge className="bg-warning/10 text-warning border-none text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Menunggu
                    </Badge>
                  </div>
                  
                  <div className="bg-muted/30 rounded-xl p-3 border border-border mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`${item.bg} ${item.color} border-none text-[9px] px-1.5 py-0 rounded-sm font-bold uppercase tracking-wider`}>
                        {item.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1.5">
                      <p className="flex justify-between"><span className="font-semibold text-foreground">Waktu:</span> <span>{item.date} ({item.days})</span></p>
                      <p className="flex justify-between"><span className="font-semibold text-foreground">Alasan:</span> <span className="text-right pl-4">{item.reason}</span></p>
                    </div>
                  </div>

                  {item.doc && (
                    <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-card rounded-md shadow-sm">
                          <FileText size={16} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-foreground leading-none">Lampiran_Surat.pdf</p>
                          <p className="text-[9px] font-medium text-muted-foreground mt-0.5">1.2 MB</p>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger render={
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-primary hover:bg-primary/10" />
                        }>
                          Lihat
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] rounded-2xl w-[90vw]">
                          <DialogHeader>
                            <DialogTitle>Dokumen Lampiran</DialogTitle>
                          </DialogHeader>
                          <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl border border-border min-h-[300px]">
                            <FileText size={48} className="text-muted-foreground mb-4" />
                            <p className="text-sm font-semibold text-foreground">Preview Dokumen (Dummy)</p>
                            <p className="text-xs text-muted-foreground mt-1">Dokumen Lampiran_Surat.pdf</p>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
                
                <div className="flex bg-muted/20">
                  <button className="flex-1 py-3.5 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors border-r border-border flex items-center justify-center gap-2">
                    <X size={18} /> Tolak
                  </button>
                  <button className="flex-1 py-3.5 text-sm font-bold text-success hover:bg-success/10 transition-colors flex items-center justify-center gap-2">
                    <Check size={18} /> Setujui
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
