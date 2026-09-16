"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Clock, Calendar, CheckSquare, Users, History, Bell } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function EmployeeDashboard() {
  const [time, setTime] = useState("07:42:24");
  
  useEffect(() => {
    // Just a dummy clock effect
    const interval = setInterval(() => {
      const d = new Date();
      setTime(d.toLocaleTimeString("id-ID", { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Header userName="Budi" avatarUrl="https://i.pravatar.cc/150?u=budi" showNotification={true} />
      
      <div className="p-4 pb-24 space-y-5">
        
        {/* Welcome Section */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-heading font-bold text-foreground">Selamat Pagi, Budi</h2>
            <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none font-semibold px-2 py-0.5 rounded-full text-[10px]">
              Tech Squad Lead
            </Badge>
          </div>
          <div className="flex items-center text-xs text-muted-foreground font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />
            Rabu, 15 Januari 2025 <span className="mx-1.5">•</span> WFO Kantor Pusat
          </div>
        </div>

        {/* Hero Check-in Card */}
        <Card className="shadow-sm border-border bg-card overflow-hidden">
          <CardContent className="p-5 flex flex-col items-center text-center">
            
            {/* Segmented Control */}
            <div className="flex w-full bg-muted/40 p-1 rounded-full mb-4 border border-border">
              <div className="flex-1 bg-primary/20 text-primary font-bold text-sm py-1.5 rounded-full shadow-sm text-center">
                WFO
              </div>
              <div className="flex-1 text-muted-foreground font-medium text-sm py-1.5 text-center">
                WFH
              </div>
              <div className="flex-1 text-muted-foreground font-medium text-sm py-1.5 text-center">
                WFA
              </div>
            </div>

            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs mb-4 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />
              Dalam Radius Kantor (34m)
            </Badge>

            <div className="font-heading font-medium text-5xl tracking-tight text-foreground mb-1">
              {time}
            </div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-6">
              WIB • WAKTU STANDAR INDONESIA
            </div>

            <div className="flex w-full gap-3 mb-5">
              <Link href="/karyawan/check-in" className="flex-1">
                <Button className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary-dark text-white rounded-full shadow-md">
                  CHECK-IN
                </Button>
              </Link>
              <Button variant="outline" className="flex-1 h-12 text-sm font-bold border-primary text-primary hover:bg-primary/5 rounded-full">
                CHECK-OUT
              </Button>
            </div>

            <div className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground pt-3 border-t border-border/60">
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                Jadwal: 08:30 - 17:00 WIB
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold text-[10px] rounded-md">
                Toleransi: 15 Menit
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 4-Grid Stats */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* To-Do */}
          <Link href="/karyawan/todo">
            <Card className="shadow-sm border-border hover:border-primary/50 transition-colors h-full cursor-pointer">
              <CardContent className="p-4 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-1.5 bg-muted/50 rounded-md text-foreground">
                    <CheckSquare size={16} />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">Hari Ini</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">To-Do Kerja</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">1 dari 3 selesai</p>
                  <Progress value={33} className="h-1.5 bg-muted [&>div]:bg-primary" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Sisa Cuti */}
          <Link href="/karyawan/izin">
            <Card className="shadow-sm border-border hover:border-primary/50 transition-colors h-full cursor-pointer">
              <CardContent className="p-4 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-1.5 bg-muted/50 rounded-md text-foreground">
                    <Calendar size={16} />
                  </div>
                  <Badge className="bg-primary/10 text-primary border-none text-[10px] rounded-md px-1.5">Aktif</Badge>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Sisa Cuti</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">9 Hari Tersedia</p>
                  <p className="text-[9px] text-muted-foreground/80 font-medium">Reset: 31 Des 2025</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Disiplin */}
          <Card className="shadow-sm border-border h-full">
            <CardContent className="p-4 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start mb-3">
                <div className="p-1.5 bg-muted/50 rounded-md text-foreground">
                  <History size={16} />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">Januari</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">98% Disiplin</h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">0 Kali Terlambat</p>
                <div className="flex items-center text-[10px] text-muted-foreground font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />
                  14 Hadir Tepat
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tim */}
          <Card className="shadow-sm border-border h-full">
            <CardContent className="p-4 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start mb-3">
                <div className="p-1.5 bg-muted/50 rounded-md text-foreground">
                  <Users size={16} />
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-muted-foreground block">Divisi UI/UX</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[9px] rounded-sm px-1 font-bold">JKT - 892</Badge>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">28/50 Hadir</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">5 WFH • 1 Cuti</p>
                <div className="flex -space-x-2">
                  <Avatar className="w-5 h-5 border border-background">
                    <AvatarImage src="https://i.pravatar.cc/100?u=1" />
                  </Avatar>
                  <Avatar className="w-5 h-5 border border-background">
                    <AvatarImage src="https://i.pravatar.cc/100?u=2" />
                  </Avatar>
                  <div className="w-5 h-5 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[7px] font-bold text-primary">
                    +26
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Riwayat Absensi Saya */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-heading font-bold text-foreground">Riwayat Absensi Saya</h3>
            <span className="text-xs font-semibold text-primary cursor-pointer hover:underline">Lihat Semua</span>
          </div>

          <div className="space-y-3">
            {[
              { id: 1, date: "16 Sep 2026", status: "Hadir (WFO)", checkIn: "08:04", checkOut: "17:15", location: "Kantor Pusat - Lt. 3", color: "text-primary", bg: "bg-primary/10", dot: "bg-primary" },
              { id: 2, date: "15 Sep 2026", status: "Hadir (WFH)", checkIn: "08:10", checkOut: "17:05", location: "Rumah - Jakarta Selatan", color: "text-info", bg: "bg-info/10", dot: "bg-info" },
              { id: 3, date: "14 Sep 2026", status: "Izin (Sakit)", checkIn: "-", checkOut: "-", location: "-", color: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive" },
            ].map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${record.bg} ${record.color}`}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground leading-none mb-1">{record.date}</h4>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${record.dot}`} />
                      <p className="text-xs font-medium text-muted-foreground">{record.status}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="bg-muted/50 text-foreground border-none text-[10px] rounded-full px-2 mb-1 font-mono">
                    {record.checkIn} - {record.checkOut}
                  </Badge>
                  <p className="text-[9px] text-muted-foreground font-medium">{record.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
