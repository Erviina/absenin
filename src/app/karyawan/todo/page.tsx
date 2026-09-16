"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QrCode, MessageSquare, Layers, Target, CheckCircle2, MessageCircle, PlusCircle, LayoutDashboard, Coffee, Activity, Briefcase } from "lucide-react";

export default function WorkspacePage() {
  return (
    <>
      <Header userName="Budi" avatarUrl="https://i.pravatar.cc/150?u=budi" showNotification={true} />

      <div className="p-4 pb-24 flex flex-col gap-6">
        
        {/* Title Area */}
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Ruang Kolaborasi & Tim</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            Pantau kehadiran rekan, jadwal squad, dan koordinasi shift harian Anda secara transparan.
          </p>
        </div>

        {/* Pilih Ruang Kerja */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-muted-foreground">Pilih Ruang Kerja</h3>
            <button className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline">
              <QrCode size={14} /> + Gabung via Kode
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {/* Active Card */}
            <Card className="min-w-[280px] border-2 border-primary shadow-sm bg-card shrink-0">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-primary/20 text-primary rounded-xl shrink-0">
                    <Layers size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        Squad Core Web
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </h4>
                      <Badge className="bg-primary/20 text-primary border-none text-[10px] rounded-full px-2 hover:bg-primary/30">Aktif</Badge>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Sub-Grup Proyek • 14 Anggota</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MessageSquare size={14} />
                    Standup 09:30 WIB
                  </div>
                  <span className="text-primary cursor-pointer hover:underline">Lihat Board</span>
                </div>
              </CardContent>
            </Card>

            {/* Inactive Card */}
            <Card className="min-w-[280px] border border-border shadow-sm bg-muted/20 shrink-0 opacity-70">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-muted text-muted-foreground rounded-xl shrink-0">
                    <LayoutDashboard size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-foreground">Divisi Frontend</h4>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Departemen • 42 Anggota</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                  <div>Geofence: Menara Thamrin</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Radar Rekan Tim */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-heading font-bold flex items-center gap-2">
              <Target size={18} className="text-primary" />
              Radar Rekan Tim
            </h3>
            <Badge variant="outline" className="bg-primary/10 border-none text-primary text-[10px] font-bold rounded-full">
              14 Terdaftar
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: "Hadir Tim", count: "11", color: "bg-primary" },
              { label: "Izin Sakit", count: "1", color: "bg-destructive" },
              { label: "Mid-Shift", count: "1", color: "bg-primary" },
              { label: "Cuti/Libur", count: "1", color: "bg-muted-foreground" },
            ].map((stat, i) => (
              <Card key={i} className="shadow-sm border-border text-center">
                <CardContent className="p-2 flex flex-col items-center justify-center h-full">
                  <h4 className="font-heading font-bold text-base flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${stat.color}`} />
                    {stat.count}
                  </h4>
                  <p className="text-[9px] font-medium text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            {[
              { 
                name: "Siti Aminah", role: "Scrum Master", avatar: "1", dot: "bg-primary", 
                statusBadge: { text: "WFO Lt. 3 (#A12)", color: "bg-primary/20 text-primary border-none" },
                desc: "Online • Daily Standup", time: "In: 08:14 WIB" 
              },
              { 
                name: "Dimas Saputra", role: "Backend", avatar: "2", dot: "bg-primary", 
                statusBadge: { text: "WFH Mandiri", color: "bg-muted text-muted-foreground border-none" },
                desc: "Kondisi: Sehat (Remote JKT)", time: "In: 08:29 WIB" 
              },
              { 
                name: "Kevin Pratama", role: "QA Engineer", avatar: "3", dot: "bg-primary", 
                statusBadge: { text: "Break Jam Makan", color: "bg-primary/10 text-primary border-primary/20", icon: Coffee },
                desc: "Istirahat (12:00 - 13:00)", time: "Kembali 13:00" 
              },
              { 
                name: "Nabila Rahma", role: "UI Designer", avatar: "4", dot: "bg-destructive", 
                statusBadge: { text: "WFH Pemulihan", color: "bg-destructive/10 text-destructive border-destructive/20", icon: Activity },
                desc: "Flu Ringan • Status Pro", time: "Lapor 07:50 WIB" 
              },
              { 
                name: "Fajar Maulana", role: "DevOps", avatar: "5", dot: "bg-muted-foreground", 
                statusBadge: { text: "Dinas Luar", color: "bg-muted text-muted-foreground border-muted-foreground/20", icon: Briefcase },
                desc: "Client Meeting • Data Center", time: "GPS Validated" 
              },
            ].map((member, i) => (
              <Card key={i} className="shadow-sm border-border overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10 border border-border">
                          <AvatarImage src={`https://i.pravatar.cc/150?u=${member.avatar}`} />
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 w-3 h-3 ${member.dot} border-2 border-card rounded-full`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm text-foreground">{member.name}</h4>
                          <Badge className="bg-muted text-muted-foreground border-none px-1.5 py-0 text-[9px] rounded-md pointer-events-none">
                            {member.role}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-medium text-muted-foreground">{member.desc}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant="outline" className={`${member.statusBadge.color} px-2 py-0.5 text-[9px] font-bold rounded-full flex items-center gap-1`}>
                        {member.statusBadge.icon && <member.statusBadge.icon size={10} />}
                        {member.statusBadge.text}
                      </Badge>
                      <p className="text-[9px] font-medium text-muted-foreground">{member.time}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sprint Goal & Task Hari Ini */}
        <div className="bg-muted/30 -mx-4 px-4 py-5 border-t border-border mt-2">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-heading font-bold text-foreground">Sprint Goal & Task<br/>Hari Ini</h3>
              <p className="text-[11px] font-medium text-muted-foreground mt-1">Sinkronisasi tugas saat Daily<br/>Standup</p>
            </div>
            <Badge className="bg-muted text-muted-foreground border-none text-[10px] rounded-md px-2 py-1">
              Sprint 14 • Hari<br/>ke-6
            </Badge>
          </div>

          <div className="space-y-3 mb-4">
            {[
              { icon: Target, title: "PR #849 Design Tokens Sy...", desc: "Budi Pratama (Saya) • Frontend", status: "In Progress", color: "bg-primary/20 text-primary" },
              { icon: CheckCircle2, title: "Geofence 100m Boundary Testir...", desc: "Kevin Pratomo • QA Mobile", status: "Done", color: "bg-success/20 text-success" },
              { icon: MessageCircle, title: "API Leave Multi-Tier V2 Staging", desc: "Dimas Saputra • Backend", status: "In Review", color: "bg-info/20 text-info" },
            ].map((task, i) => (
              <Card key={i} className="shadow-sm border-none bg-card hover:border-primary/50 transition-colors cursor-pointer border-2 border-transparent">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-full shrink-0">
                    <task.icon size={16} className="text-foreground" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-[13px] text-foreground truncate">{task.title}</h4>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{task.desc}</p>
                  </div>
                  <Badge className={`${task.color} border-none text-[10px] font-bold rounded-md px-2 shrink-0 hover:opacity-80 transition-opacity`}>
                    {task.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <Dialog>
            <DialogTrigger render={
              <Button className="w-full h-12 bg-primary/20 hover:bg-primary/30 text-primary font-bold text-sm border-none shadow-none rounded-xl" />
            }>
              <PlusCircle size={18} className="mr-2" />
              Tambah Update Tugas Saya
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl w-[90vw]">
              <DialogHeader>
                <DialogTitle>Update Pekerjaan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Judul Tugas / Tiket</label>
                  <Input placeholder="Misal: Perbaikan bug login" className="h-12" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Status Pekerjaan</label>
                  <select className="w-full h-12 px-3 bg-muted/40 rounded-lg border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
                    <option>To Do</option>
                    <option>In Progress</option>
                    <option>In Review</option>
                    <option>Done</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Catatan / Link PR</label>
                  <Input placeholder="Tautan hasil kerja..." className="h-12" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full h-12 rounded-xl text-md font-bold bg-[#2F5A3D] hover:bg-primary-dark">Simpan Update</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

      </div>
    </>
  );
}
