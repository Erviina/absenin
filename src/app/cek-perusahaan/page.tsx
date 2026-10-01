"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CekPerusahaanPage() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f7fbf8] relative px-6 py-8">
      
      {/* Logo */}
      <div className="flex items-center gap-1.5 mb-8">
        {/* Placeholder for Logo, since we might not know exactly how Logo.png looks, let's use it */}
        <div className="relative w-[100px] h-[30px]">
          <Image 
            src="/img/assets/Logo.png" 
            alt="AbsenIN Logo"
            fill
            className="object-contain object-left"
          />
        </div>
      </div>

      {/* Illustration */}
      <div className="flex justify-center mb-8 relative w-full aspect-[4/3] max-h-[220px]">
        <Image 
          src="/img/assets/cekperusahaan.png" 
          alt="Illustration"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Text Content */}
      <div className="flex flex-col gap-3 mb-8">
        <h1 className="text-[22px] font-bold text-[#1E293B] leading-tight">
          Selamat datang,<br />Shakila Aulia!
        </h1>
        <p className="text-[13px] text-[#64748B] leading-relaxed">
          Untuk mulai menggunakan AbsenIN, terlebih dahulu bergabung dengan perusahaan atau organisasi.
        </p>
      </div>

      {/* Action Cards */}
      <div className="flex flex-col gap-4">
        
        {/* Card 1: Bergabung dengan Perusahaan */}
        <div 
          onClick={() => router.push("/gabung-perusahaan")}
          className="bg-white rounded-[20px] p-5 flex items-center gap-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-[#eef5f0] cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="w-[50px] h-[50px] bg-[#e6f0ea] rounded-[16px] flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-[#1E4738]" strokeWidth={1.5} />
          </div>
          <h2 className="text-[#1E293B] text-[15px] font-bold leading-tight">
            Bergabung dengan<br />Perusahaan
          </h2>
        </div>

        {/* Card 2: Buat Perusahaan atau Organisasi */}
        <div 
          onClick={() => router.push("/buat-perusahaan")}
          className="bg-white rounded-[20px] p-5 flex items-center gap-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-[#eef5f0] cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="w-[50px] h-[50px] bg-[#e6f0ea] rounded-[16px] flex items-center justify-center shrink-0">
            <Plus className="w-6 h-6 text-[#1E4738]" strokeWidth={1.5} />
          </div>
          <h2 className="text-[#1E293B] text-[15px] font-bold leading-tight">
            Buat Perusahaan atau<br />Organisasi
          </h2>
        </div>

      </div>

      {/* Bottom Link */}
      <div className="mt-auto pt-10 pb-4 text-center">
        <Link href="/dashboard" className="text-[13px] text-[#64748B] font-semibold hover:text-[#1E4738] transition-colors">
          Nanti saja
        </Link>
      </div>

    </div>
  );
}
