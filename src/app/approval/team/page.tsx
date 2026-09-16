"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, Search, Users, ShieldAlert, Edit2, Trash2, Mail, CheckCircle2, Copy } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function TeamManagementPage() {
  const [activeTab, setActiveTab] = useState<"groups" | "members">("groups");

  return (
    <>
      <Header title="Tim & Grup" showNotification={true} />

      <div className="p-4 pb-24 space-y-6">
        {/* Title Area */}
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Pengaturan Tim & Grup</h2>
          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
            Kelola grup divisi, proyek, dan undang anggota baru ke dalam workspace.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-muted/40 p-1 rounded-xl border border-border">
          <button 
            className={`flex-1 font-bold text-sm py-2 rounded-lg transition-all ${activeTab === "groups" ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("groups")}
          >
            Daftar Grup
          </button>
          <button 
            className={`flex-1 font-bold text-sm py-2 rounded-lg transition-all ${activeTab === "members" ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("members")}
          >
            Anggota Tim
          </button>
        </div>

        {/* Tab Content: Groups */}
        {activeTab === "groups" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative flex-1 mr-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Cari nama grup..." className="pl-9 bg-card shadow-sm" />
              </div>
              <Dialog>
                <DialogTrigger render={
                  <Button className="bg-primary hover:bg-primary-dark text-white rounded-xl shadow-sm px-3" />
                }>
                  <PlusCircle size={18} className="mr-1.5" /> Buat Grup
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-2xl w-[90vw]">
                  <DialogHeader>
                    <DialogTitle>Buat Grup Baru</DialogTitle>
                    <DialogDescription>
                      Tambahkan grup divisi atau proyek baru untuk tim Anda.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nama Grup</Label>
                      <Input id="name" placeholder="Misal: Divisi Frontend, Squad Web" className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desc">Deskripsi</Label>
                      <Input id="desc" placeholder="Tujuan atau penjelasan grup" className="h-12" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-12 rounded-xl text-md font-bold">Buat Grup</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {[
                { name: "Divisi Tech & Product", desc: "Tim utama pengembangan", members: 24, code: "TECH-25A" },
                { name: "Squad Core Web", desc: "Fokus pada platform web", members: 14, code: "WEB-X99" },
                { name: "Tim UI/UX", desc: "Desain dan riset", members: 6, code: "UIX-442" },
              ].map((group, idx) => (
                <Dialog key={idx}>
                  <DialogTrigger render={<div className="cursor-pointer outline-none" />}>
                    <Card className="shadow-sm border-border bg-card overflow-hidden hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                              <Users size={20} />
                            </div>
                            <div className="text-left">
                              <h3 className="font-bold text-sm text-foreground">{group.name}</h3>
                              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{group.desc}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary pointer-events-none">
                              <Edit2 size={14} />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="bg-muted/40 p-2.5 rounded-lg flex justify-between items-center border border-border">
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-primary/20 text-primary border-none font-bold text-[10px] px-2 py-0.5">
                              {group.members} Anggota
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground">Kode: <span className="text-foreground tracking-wider">{group.code}</span></span>
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-md bg-card border-border pointer-events-none">
                              <Copy size={12} className="text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] rounded-2xl w-[90vw]">
                    <DialogHeader>
                      <DialogTitle>{group.name}</DialogTitle>
                      <DialogDescription>{group.desc}</DialogDescription>
                    </DialogHeader>
                    <div className="py-2 space-y-4">
                      <div className="flex justify-between items-center bg-muted/40 p-3 rounded-xl border border-border">
                        <span className="text-sm font-semibold">Kode Undangan</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold tracking-wider">{group.code}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8"><Copy size={14} /></Button>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold mb-2">Anggota Tim ({group.members})</h4>
                        <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center justify-between p-2.5 border border-border rounded-xl bg-card">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8"><AvatarImage src={`https://i.pravatar.cc/150?u=${i + group.name}`} /></Avatar>
                                <div>
                                  <span className="text-xs font-semibold block">Anggota {i}</span>
                                  <span className="text-[10px] text-muted-foreground">karyawan{i}@kantor.com</span>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive">Keluarkan</Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 rounded-xl">Hapus Grup</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: Members */}
        {activeTab === "members" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative flex-1 mr-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Cari nama anggota..." className="pl-9 bg-card shadow-sm" />
              </div>
              <Dialog>
                <DialogTrigger render={
                  <Button className="bg-[#2F5A3D] hover:bg-primary-dark text-white rounded-xl shadow-sm px-3" />
                }>
                  <PlusCircle size={18} className="mr-1.5" /> Undang
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-2xl w-[90vw]">
                  <DialogHeader>
                    <DialogTitle>Undang Anggota</DialogTitle>
                    <DialogDescription>
                      Kirim undangan via email atau bagikan kode grup.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Karyawan</Label>
                      <Input id="email" type="email" placeholder="nama@kantor.com" className="h-12" />
                    </div>
                    <div className="relative flex justify-center text-xs py-2">
                      <span className="bg-background px-2 text-muted-foreground font-semibold">ATAU BAGIKAN KODE GRUP</span>
                      <div className="absolute inset-0 flex items-center -z-10">
                        <div className="w-full border-t border-border"></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input readOnly value="TECH-25A" className="h-12 font-mono font-bold text-center tracking-widest text-lg" />
                      <Button variant="outline" className="h-12 px-4 shrink-0">
                        <Copy size={18} />
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-12 rounded-xl text-md font-bold">Kirim Undangan</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {[
                { name: "Budi Santoso", role: "Karyawan", group: "Squad Core Web", status: "Aktif", avatar: "1" },
                { name: "Siti Aminah", role: "Manager", group: "Divisi Tech", status: "Aktif", avatar: "2" },
                { name: "Agus Riyadi", role: "Karyawan", group: "Squad Core Web", status: "Pending", avatar: "3" },
              ].map((member, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarImage src={`https://i.pravatar.cc/150?u=${member.avatar}`} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-foreground leading-none">{member.name}</h4>
                        {member.role === "Manager" && <ShieldAlert size={12} className="text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{member.group}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {member.status === "Aktif" ? (
                      <Badge className="bg-success/10 text-success hover:bg-success/20 border-none font-bold text-[10px] px-2 py-0.5">
                        <CheckCircle2 size={10} className="mr-1" /> Aktif
                      </Badge>
                    ) : (
                      <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-none font-bold text-[10px] px-2 py-0.5">
                        <Mail size={10} className="mr-1" /> Pending
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10">
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
