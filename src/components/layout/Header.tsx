"use client";

import { Bell, Clock, LogOut, Settings, UserCircle, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
  title?: string;
  userName?: string;
  avatarUrl?: string;
  showNotification?: boolean;
}

export function Header({
  title = "AbsenIn",
  userName = "Budi Santoso",
  avatarUrl = "https://i.pravatar.cc/150?u=budi",
  showNotification = true,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isKaryawan = pathname?.startsWith("/karyawan");

  const toggleRole = () => {
    if (isKaryawan) {
      router.push("/approval/dashboard");
    } else {
      router.push("/karyawan/dashboard");
    }
  };

  const handleSignOut = () => {
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary/80 rounded-md p-1 shadow-sm border border-primary/20">
            <Clock size={16} className="text-white" />
          </div>
          <h1 className="font-heading font-bold text-lg text-foreground tracking-tight">{title}</h1>
          <span className="text-[9px] font-bold text-primary px-1.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 ml-1 tracking-wider uppercase">PWA</span>
        </div>
        
        <div className="flex items-center gap-3">
          {showNotification && (
            <button className="relative p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border border-background"></span>
            </button>
          )}
          
          <Popover>
            <PopoverTrigger render={
              <button className="flex items-center gap-2 outline-none hover:opacity-80 transition-opacity" />
            }>
              <span className="text-sm font-medium hidden sm:inline-block">
                {userName}
              </span>
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {userName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 rounded-xl">
              <div className="flex flex-col gap-1">
                <div className="px-2 py-1.5 mb-1">
                  <p className="text-sm font-semibold">{userName}</p>
                  <p className="text-[10px] text-muted-foreground">Karyawan & Manager</p>
                </div>
                <div className="h-px bg-border my-1" />
                <button 
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-2 w-full px-2 py-2 text-sm text-left hover:bg-muted rounded-md transition-colors"
                >
                  <UserCircle size={16} className="text-muted-foreground" />
                  Manage Profile
                </button>
                <button 
                  onClick={toggleRole}
                  className="flex items-center gap-2 w-full px-2 py-2 text-sm text-left hover:bg-muted rounded-md transition-colors"
                >
                  <Users size={16} className="text-muted-foreground" />
                  {isKaryawan ? "Ganti ke Manager" : "Ganti ke Karyawan"}
                </button>
                <div className="h-px bg-border my-1" />
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-2 py-2 text-sm text-left text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>Manage Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage src={avatarUrl} alt={userName} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">{userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full border-2 border-card">
                  <Settings size={12} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" defaultValue={userName} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue="budi.santoso@kantor.co.id" className="h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">No. Handphone</Label>
              <Input id="phone" defaultValue="081234567890" className="h-10" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsProfileOpen(false)} className="w-full rounded-xl bg-primary hover:bg-primary-dark">
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
