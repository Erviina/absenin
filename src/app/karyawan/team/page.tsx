"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QrCode, Search, Users, LogOut, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function KaryawanTeamPage() {
  return (
    <>
      <Header userName="Budi" avatarUrl="https://i.pravatar.cc/150?u=budi" showNotification={true} />

      <div className="p-4 pb-24 space-y-6">
        
        {/* Title Area */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground">Tim Saya</h2>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
              Lihat anggota tim, squad aktif, dan gabung grup baru.
            </p>
          </div>
          <Dialog>
            <DialogTrigger render={
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/5 rounded-xl h-9 px-3 text-xs shadow-sm" />
            }>
              <QrCode size={16} className="mr-1.5" /> Gabung
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl w-[90vw]">
              <DialogHeader>
                <DialogTitle>Gabung ke Grup</DialogTitle>
                <DialogDescription>
                  Masukkan kode grup yang diberikan oleh manajer atau HR Anda.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-center">
                <div className="space-y-2">
                  <Label htmlFor="groupCode" className="text-muted-foreground">Kode Grup</Label>
                  <Input 
                    id="groupCode" 
                    placeholder="Misal: TECH-25A" 
                    className="h-14 font-mono font-bold text-center text-xl tracking-[0.3em] uppercase bg-muted/30 border-2" 
                    maxLength={8}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full h-12 rounded-xl text-md font-bold bg-primary hover:bg-primary-dark">
                  Verifikasi Kode <ArrowRight size={18} className="ml-2" />
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Grup Aktif */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Users size={18} className="text-primary" /> Grup Saat Ini
          </h3>
          
          <Card className="shadow-sm border-2 border-primary/20 bg-card overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
                    SC
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Squad Core Web</h3>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      14 Anggota <span className="w-1 h-1 rounded-full bg-muted-foreground" /> Leader: Siti
                    </p>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary border-none text-[10px] rounded-full px-2">
                  Utama
                </Badge>
              </div>
              
              {/* Member Avatars */}
              <div className="flex justify-between items-center bg-muted/30 p-2.5 rounded-lg border border-border">
                <div className="flex -space-x-2 pl-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Avatar key={i} className="w-8 h-8 border-2 border-card">
                      <AvatarImage src={`https://i.pravatar.cc/100?u=${i}`} />
                    </Avatar>
                  ))}
                  <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground z-10">
                    +9
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-muted-foreground hover:text-primary">
                  Lihat Semua
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Semua Anggota (Tim Divisi) */}
        <div className="pt-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-sm text-foreground">Rekan Divisi Tech</h3>
            <div className="relative w-[140px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
              <Input placeholder="Cari..." className="pl-8 h-8 text-xs bg-muted/40 shadow-none border-border rounded-full" />
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { name: "Siti Aminah", role: "Product Manager", status: "WFO", avatar: "2" },
              { name: "Dimas Saputra", role: "Backend Developer", status: "WFH", avatar: "3" },
              { name: "Agus Riyadi", role: "Frontend Developer", status: "WFO", avatar: "4" },
              { name: "Nabila Rahma", role: "UI/UX Designer", status: "Cuti", avatar: "5" },
            ].map((member, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${member.avatar}`} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground leading-none">{member.name}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">{member.role}</p>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={`border-none font-bold text-[9px] px-2 py-0.5 rounded-full ${
                    member.status === "WFO" ? "bg-primary/10 text-primary" : 
                    member.status === "WFH" ? "bg-info/10 text-info" : 
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  {member.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
