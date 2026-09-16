"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Download, Search, Filter, FileSpreadsheet, FileIcon as FilePdf } from "lucide-react";

export default function LaporanPage() {
  const reports = [
    { id: 1, name: "Budi Santoso", role: "Frontend Dev", present: 20, late: 1, absent: 0, sick: 1 },
    { id: 2, name: "Siti Aminah", role: "Product Manager", present: 22, late: 0, absent: 0, sick: 0 },
    { id: 3, name: "Agus Riyadi", role: "Backend Dev", present: 19, late: 3, absent: 0, sick: 0 },
    { id: 4, name: "Nabila Rahma", role: "UI/UX Designer", present: 18, late: 0, absent: 1, sick: 3 },
  ];

  return (
    <>
      <Header title="Laporan & Rekap" showNotification={false} />
      
      <div className="p-4 pb-24 space-y-5">
        
        {/* Header Section */}
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Laporan Presensi</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            Lihat rekapitulasi kehadiran dan ekspor data laporan bulanan.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border p-3 rounded-2xl shadow-sm space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <select className="w-full h-10 pl-9 bg-muted/40 rounded-lg border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
                <option>Januari 2025</option>
                <option>Desember 2024</option>
                <option>November 2024</option>
              </select>
            </div>
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <select className="w-full h-10 pl-9 bg-muted/40 rounded-lg border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
                <option>Semua Divisi</option>
                <option>Tech & Product</option>
                <option>Marketing</option>
              </select>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Cari nama karyawan..." className="pl-9 h-10 bg-muted/40 border-border" />
          </div>
        </div>

        {/* Export Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Dialog>
            <DialogTrigger render={
              <Button className="h-12 bg-[#2F5A3D] hover:bg-primary-dark text-white rounded-xl font-bold shadow-sm" />
            }>
              <FileSpreadsheet size={18} className="mr-2" /> Export CSV
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl w-[90vw]">
              <DialogHeader>
                <DialogTitle>Export Laporan CSV</DialogTitle>
                <DialogDescription>Pilih data yang ingin disertakan dalam rekapan bulan ini.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Filter Status Kehadiran</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Hadir (WFO/WFH)", "Sakit", "Izin/Cuti", "Alpha (Tidak Hadir)"].map(status => (
                      <div key={status} className="flex items-center space-x-2 bg-muted/40 p-2 rounded-lg border border-border">
                        <Checkbox id={`csv-${status}`} defaultChecked />
                        <label htmlFor={`csv-${status}`} className="text-xs font-medium">{status}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full bg-primary hover:bg-primary-dark rounded-xl font-bold h-11 text-sm">Unduh CSV</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger render={
              <Button variant="outline" className="h-12 border-primary text-primary hover:bg-primary/5 rounded-xl font-bold shadow-sm" />
            }>
              <FilePdf size={18} className="mr-2" /> Export PDF
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl w-[90vw]">
              <DialogHeader>
                <DialogTitle>Export Laporan PDF</DialogTitle>
                <DialogDescription>Pilih data yang ingin disertakan dalam rekapan bulan ini.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Filter Status Kehadiran</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Hadir (WFO/WFH)", "Sakit", "Izin/Cuti", "Alpha (Tidak Hadir)"].map(status => (
                      <div key={status} className="flex items-center space-x-2 bg-muted/40 p-2 rounded-lg border border-border">
                        <Checkbox id={`pdf-${status}`} defaultChecked />
                        <label htmlFor={`pdf-${status}`} className="text-xs font-medium">{status}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full bg-primary hover:bg-primary-dark rounded-xl font-bold h-11 text-sm">Unduh PDF</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Data Table / List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-bold text-sm text-foreground">Data Rekapitulasi</h3>
            <span className="text-[10px] font-bold text-muted-foreground">Total: {reports.length} Data</span>
          </div>

          {reports.map(user => (
            <Card key={user.id} className="shadow-sm border-border overflow-hidden rounded-xl">
              <CardContent className="p-0">
                <div className="p-3 border-b border-border flex items-center justify-between bg-card">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={`https://i.pravatar.cc/150?u=${user.id}`} />
                      <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-sm leading-tight text-foreground">{user.name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{user.role}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <ChevronDownIcon />
                  </Button>
                </div>
                
                <div className="grid grid-cols-4 divide-x divide-border bg-muted/20">
                  <div className="p-2 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Hadir</p>
                    <p className="font-bold text-sm text-success">{user.present}</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Telat</p>
                    <p className="font-bold text-sm text-warning">{user.late}</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Alpa</p>
                    <p className="font-bold text-sm text-destructive">{user.absent}</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Sakit/Izin</p>
                    <p className="font-bold text-sm text-primary">{user.sick}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

function ChevronDownIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
