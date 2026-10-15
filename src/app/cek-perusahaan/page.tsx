"use client";

import { Building2, Plus, Hourglass, ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { setPersonalModePreference } from "@/lib/personalMode";

function CekPerusahaanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [status, setStatus] = useState<'idle' | 'pending' | 'checking'>('checking');
  const [companyName, setCompanyName] = useState("");
  const [userName, setUserName] = useState("User");

  const handleBack = () => {
    if (from === "profil") {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.replace("/profil");
      }
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      localStorage.removeItem("activeCompanyId");
      localStorage.removeItem("companyMemberships");
      router.replace("/login");
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setStatus('idle');
        return;
      }

      // Check if user has an approved or pending join request
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success && data.data) {
          if (data.data.status === 'approved') {
            const seen = localStorage.getItem(`join_accepted_seen_${data.data.id}`);
            if (!seen) {
              router.replace("/gabung-perusahaan");
              return;
            }
          } else if (data.data.status === 'pending') {
            setCompanyName(data.data.company_name || "Perusahaan");
            setStatus('pending');
            return;
          }
        }
      } catch (err) {
        console.error(err);
      }

      // Fetch user profile
      try {
        const meRes = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const meData = await meRes.json();
        if (meData.success && meData.data.user) {
          localStorage.setItem("user", JSON.stringify(meData.data.user));
          setUserName(meData.data.user.fullName || "User");
          
          if (meData.data.user.company && from !== "profil") {
            router.push("/dashboard");
            return;
          }
        }
      } catch (e) {
        console.error("Error fetching /auth/me", e);
      }

      setStatus('idle');
    };
    
    fetchStatus();
  }, [router, from]);

  // Polling saat status pending sehingga ketika admin meng-ACC langsung dialihkan ke layar sukses
  useEffect(() => {
    if (status !== 'pending') return;

    const interval = setInterval(async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data && data.data.status === 'approved') {
          router.replace("/gabung-perusahaan");
        }
      } catch (e) {
        console.error("Polling error in cek-perusahaan:", e);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [status, router]);

  if (status === 'checking') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7fbf8]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E4738]"></div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-white items-center justify-center px-6 text-center animate-in fade-in duration-300 relative">
        {/* Back Button */}
        <button
          onClick={handleBack}
          aria-label="Kembali"
          className="absolute top-6 left-6 w-10 h-10 bg-[#f7fbf8] rounded-full flex items-center justify-center text-[#1E4738] shadow-sm border border-gray-100 hover:bg-gray-100 active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-[#1E4738]" strokeWidth={2.5} />
        </button>

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
        <p className="text-gray-500 text-[14px] max-w-[260px] leading-relaxed mb-8">
          Permintaan bergabung Anda telah diteruskan ke Admin
        </p>

        <button
          onClick={handleBack}
          className="px-6 py-2.5 rounded-full border border-[#1E4738] text-[#1E4738] text-[13px] font-semibold hover:bg-[#1E4738]/5 transition-colors"
        >
          {from === "profil" ? "Kembali ke Profil" : "Kembali ke Login"}
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f7fbf8] relative px-6 py-8">
      
      {/* Top Bar with Back Button & Logo */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handleBack}
          aria-label="Kembali"
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1E4738] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-[#eef5f0] hover:bg-[#edf5f0] active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-[#1E4738]" strokeWidth={2.5} />
        </button>

        {/* Logo */}
        <div className="h-[30px] flex items-center">
          <img 
            src="/img/assets/Logo.png" 
            alt="AbsenIN Logo" 
            className="h-[30px] w-auto object-contain"
          />
        </div>
      </div>

      {/* Illustration */}
      <div className="flex justify-center mb-8 w-full max-h-[220px]">
        <img 
          src="/img/assets/cekperusahaan.png" 
          alt="Illustration" 
          className="max-h-[220px] w-auto object-contain"
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
        
        {/* Card 1: Bergabung dengan Perusahaan atau Organisasi */}
        <div 
          onClick={() => router.push(from ? `/gabung-perusahaan?from=${from}` : "/gabung-perusahaan")}
          className="bg-white rounded-[20px] p-5 flex items-center gap-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-[#eef5f0] cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="w-[50px] h-[50px] bg-[#e6f0ea] rounded-[16px] flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-[#1E4738]" strokeWidth={1.5} />
          </div>
          <h2 className="text-[#1E293B] text-[15px] font-bold leading-tight">
            Bergabung dengan<br />Perusahaan atau Organisasi
          </h2>
        </div>

        {/* Card 2: Buat Perusahaan atau Organisasi */}
        <div 
          onClick={() => router.push(from ? `/buat-perusahaan?from=${from}` : "/buat-perusahaan")}
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
        <button 
          onClick={() => {
            setPersonalModePreference();
            if (from === "profil") {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.replace("/profil");
              }
            } else {
              router.replace("/dashboard");
            }
          }}
          className="text-[13px] text-[#64748B] font-semibold hover:text-[#1E4738] transition-colors"
        >
          Nanti saja
        </button>
      </div>

    </div>
  );
}

export default function CekPerusahaanPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7fbf8]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E4738]"></div>
      </div>
    }>
      <CekPerusahaanContent />
    </Suspense>
  );
}
