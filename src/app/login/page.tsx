"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Eye, CheckCircle2, ArrowRight } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<"karyawan" | "approval">("karyawan");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      if (role === "karyawan") {
        router.push("/karyawan/dashboard");
      } else {
        router.push("/approval/dashboard");
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header Logo */}
      <div className="flex flex-col items-center justify-center pt-10 pb-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-primary/80 rounded-md p-1 shadow-sm border border-primary/20">
            <Clock size={20} className="text-white" />
          </div>
          <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">AbsenIn</h1>
          <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 ml-1 tracking-wider uppercase">PWA</span>
        </div>
        <h2 className="text-xl font-heading font-bold text-foreground mb-2 text-center">
          Selamat Datang Kembali
        </h2>
        <p className="text-sm text-muted-foreground text-center max-w-[280px]">
          Masuk untuk mengakses dashboard presensi Anda.
        </p>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-6 max-w-md w-full mx-auto">
        
        {/* Role Selection */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Masuk Sebagai</h3>
          </div>
          
          <div className="space-y-2">
            <div 
              className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
                role === "karyawan" ? "border-primary bg-primary/5" : "border-border bg-muted/30"
              }`}
              onClick={() => setRole("karyawan")}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${role === "karyawan" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                </div>
                <span className="font-semibold text-sm">Karyawan</span>
              </div>
              {role === "karyawan" && <CheckCircle2 size={20} className="text-primary" />}
            </div>

            <div 
              className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
                role === "approval" ? "border-primary bg-primary/5" : "border-border bg-muted/30"
              }`}
              onClick={() => setRole("approval")}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${role === "approval" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <span className="font-semibold text-sm">Leader / Manajer</span>
              </div>
              {role === "approval" && <CheckCircle2 size={20} className="text-primary" />}
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-card rounded-3xl p-5 shadow-sm border border-border">
          <Button variant="outline" className="w-full h-12 bg-muted/30 font-semibold border-border shadow-none mb-6">
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" className="mr-2">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Masuk dengan Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground font-semibold tracking-wider">ATAU GUNAKAN EMAIL</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-foreground">Email</label>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <Input type="email" placeholder="nama@kantor.co.id" className="pl-9 h-12 bg-transparent" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-foreground">Kata Sandi</label>
                <Link href="#" className="text-[10px] font-medium text-primary hover:underline">Lupa Sandi?</Link>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <Input type="password" placeholder="Masukkan kata sandi" className="pl-9 pr-9 h-12 bg-transparent" />
                <Eye className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 cursor-pointer" />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <Checkbox id="remember" className="border-muted-foreground" />
              <label htmlFor="remember" className="text-xs font-medium text-muted-foreground">
                Ingat saya di perangkat ini
              </label>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-14 mt-4 text-base font-bold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center">
              {isLoading ? "Memproses..." : (
                <>
                  Masuk Sekarang
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>
        </div>
        
        <div className="text-center text-sm text-muted-foreground mt-4 pb-4">
          Belum punya akun? <Link href="/register" className="text-primary font-semibold hover:underline">Daftar di sini</Link>
        </div>

      </div>
    </div>
  );
}
