"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, Plus, Hourglass } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function CekPerusahaanPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'pending' | 'checking'>('checking');
  const [companyName, setCompanyName] = useState("");
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem("accessToken");
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          if (userObj.fullName) setUserName(userObj.fullName);
        } catch (e) {}
      }

      if (!token) {
        setStatus('idle');
        return;
      }
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data && data.data.status === 'pending') {
          setCompanyName(data.data.company_name || "Perusahaan");
          setStatus('pending');
        } else {
          setStatus('idle');
        }
      } catch (err) {
        console.error(err);
        setStatus('idle');
      }
    };
    fetchStatus();
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7fbf8]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E4738]"></div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-white items-center justify-center px-6 text-center animate-in fade-in duration-300">
        <div className="relative flex items-center justify-center w-24 h-24 mb-6">
          <div className="absolute inset-0 border border-gray-100 rounded-full scale-110"></div>
          <div className="absolute inset-0 border border-gray-50 rounded-full scale-[1.3]"></div>
          <div className="w-16 h-16 bg-white rounded-full border border-gray-100 flex items-center justify-center shadow-sm relative z-10">
            <Hourglass className="w-7 h-7 text-[#1E293B]" fill="#1E293B" strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-[17px] font-bold text-[#1E293B] mb-1">Permintaan Terkirim!</h1>
        <div className="flex items-center justify-center gap-1.5 text-[#1E293B] font-bold text-[14px] mb-4">
          <Building2 className="w-4 h-4 text-[#1E293B]" strokeWidth={2} />
          <span>{companyName}</span>
        </div>
        <p className="text-gray-500 text-[14px] max-w-[260px] leading-relaxed">
          Permintaan bergabung Anda telah diteruskan ke Admin
        </p>
      </div>
    );
  }
  
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
          Selamat datang,<br />{userName}!
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
