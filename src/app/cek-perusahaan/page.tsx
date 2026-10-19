"use client";

import { Building2, Plus, Hourglass, ChevronLeft, AlertCircle, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useCallback } from "react";
import { setPersonalModePreference } from "@/lib/personalMode";
import { clearAuthSession, setActiveCompanyId } from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";

function CekPerusahaanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const { isCompanyLoading, memberships, activeCompanyId, companyError, refreshMemberships, currentUser } = useCompany();

  const [status, setStatus] = useState<'checking' | 'idle' | 'pending' | 'error'>('checking');
  const [companyName, setCompanyName] = useState("");
  const [userName, setUserName] = useState("User");
  const [errorMsg, setErrorMsg] = useState("");

  const handleBack = () => {
    if (from === "profil") {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.replace("/profil");
      }
    } else {
      clearAuthSession();
      router.replace("/login");
    }
  };

  useEffect(() => {
    if (currentUser?.fullName) {
      setUserName(currentUser.fullName);
    } else {
      try {
        const u = localStorage.getItem("user");
        if (u) {
          const parsed = JSON.parse(u);
          if (parsed.fullName) setUserName(parsed.fullName);
        }
      } catch {}
    }
  }, [currentUser]);

  const verifyStatus = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      clearAuthSession();
      router.replace("/login");
      return;
    }

    // Jika CompanyContext masih loading memvalidasi membership, tunggu
    if (isCompanyLoading) {
      setStatus('checking');
      return;
    }

    // Jika terjadi error jaringan/server dari CompanyContext, tampilkan error dan opsi coba lagi
    if (companyError) {
      setStatus('error');
      setErrorMsg(companyError);
      return;
    }

    // 1. Pengguna sudah memiliki perusahaan aktif yang diverifikasi backend
    if (memberships.length > 0 || activeCompanyId) {
      if (from !== "profil") {
        if (!activeCompanyId && memberships[0]?.company_id) {
          setActiveCompanyId(memberships[0].company_id);
        }
        router.replace("/dashboard");
        return;
      }
    }

    // 2. Jika belum memiliki perusahaan aktif, periksa apakah ada permintaan bergabung (pending)
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests/me", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok && res.status >= 500) {
        setStatus('error');
        setErrorMsg("Gagal menghubungi server untuk memvalidasi status keanggotaan.");
        return;
      }

      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.status === 'pending') {
          setCompanyName(data.data.company_name || "Perusahaan");
          setStatus('pending');
          return;
        } else if (data.data.status === 'approved') {
          // Permintaan disetujui: akui permintaan, pulihkan perusahaan aktif, dan arahkan ke dashboard
          if (data.data.id) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/company/join-requests/${data.data.id}/acknowledge`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => {});
          }
          if (data.data.company_id) {
            setActiveCompanyId(data.data.company_id);
          }
          await refreshMemberships();
          router.replace("/dashboard");
          return;
        }
      }
      setStatus('idle');
    } catch (err) {
      console.error("Error fetching join requests in cek-perusahaan:", err);
      setStatus('error');
      setErrorMsg("Terjadi kesalahan jaringan saat memvalidasi status keanggotaan.");
    }
  }, [isCompanyLoading, companyError, memberships, activeCompanyId, from, router, refreshMemberships]);

  useEffect(() => {
    verifyStatus();
  }, [verifyStatus]);

  // Polling saat status pending sehingga ketika admin meng-ACC langsung dialihkan ke layar sukses
  useEffect(() => {
    if (status !== 'pending') return;

    const interval = setInterval(async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) return;
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data && data.data.status === 'approved') {
          clearInterval(interval);
          router.replace("/gabung-perusahaan?success=true");
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

  if (status === 'error') {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#f7fbf8] items-center justify-center px-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-[17px] font-bold text-[#1E293B] mb-2">Gagal Memeriksa Status Perusahaan</h2>
        <p className="text-[13.5px] text-gray-500 mb-6 max-w-xs">
          {errorMsg || companyError || "Terjadi kesalahan jaringan atau server saat memeriksa keanggotaan Anda."}
        </p>
        <button
          onClick={() => {
            setStatus('checking');
            refreshMemberships();
          }}
          className="px-6 py-2.5 bg-[#1E4738] text-white rounded-full font-semibold text-[14px] hover:bg-[#16352b] transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Coba Lagi
        </button>
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
    <div className="flex flex-col min-h-[100dvh] bg-[#f7fbf8] relative">
      
      {/* Top Bar with Back Button & Logo */}
      <div className="h-[72px] px-6 flex items-center justify-between shrink-0">
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

      <div className="flex-1 px-6 pb-8 pt-2 flex flex-col">

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
