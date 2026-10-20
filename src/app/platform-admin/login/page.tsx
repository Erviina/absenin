"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Shield, ShieldAlert, Loader2, ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import {
  getPlatformAuthToken,
  verifyPlatformAdmin,
  logoutPlatformAdmin,
} from "@/lib/platformAdminApi";

export default function PlatformAdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingExistingSession, setIsCheckingExistingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Periksa apakah pengguna sudah memiliki sesi aktif yang valid
  useEffect(() => {
    const checkActiveSession = async () => {
      const token = getPlatformAuthToken();
      if (token) {
        try {
          const res = await verifyPlatformAdmin();
          if (res.success && res.data) {
            router.replace("/platform-admin/overview");
            return;
          }
        } catch {}
      }
      setIsCheckingExistingSession(false);
    };

    checkActiveSession();
  }, [router]);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (isLoading || !credentialResponse.credential) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Dapatkan token JWT dari backend Absenin
      const authRes = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });

      const authData = await authRes.json();

      if (!authRes.ok || !authData.success || !authData.data?.accessToken) {
        throw new Error(authData.message || "Gagal melakukan verifikasi identitas Google.");
      }

      const token = authData.data.accessToken;
      localStorage.setItem("accessToken", token);
      if (authData.data.user) {
        localStorage.setItem("user", JSON.stringify(authData.data.user));
      }

      // 2. Verifikasi hak akses Platform Owner secara server-side
      const verifyRes = await verifyPlatformAdmin();

      if (verifyRes.success && verifyRes.data) {
        // Berhasil lolos allowlist
        router.replace("/platform-admin/overview");
      } else {
        // Gagal allowlist: hapus token agar sesi tidak tercemar
        logoutPlatformAdmin();
        setErrorMessage(
          verifyRes.message ||
            "Akun Google Anda berhasil diverifikasi, namun email tersebut tidak terdaftar dalam allowlist Platform Owner Absenin."
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat memproses login Platform Admin.");
      logoutPlatformAdmin();
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingExistingSession) {
    return (
      <div className="min-h-screen bg-[#F4F9F6] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3F2B] mb-2" />
        <span className="text-[13px] font-medium text-[#5C786C]">Memeriksa sesi Platform Owner...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F2318] flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#356E3B]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#86EFAC]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Top Navbar */}
      <div className="p-6 sm:p-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-[#86EFAC] shadow-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-extrabold text-[18px] tracking-tight leading-none">
              AbsenIn
            </span>
            <span className="text-[11px] text-[#86EFAC] font-semibold tracking-wide">
              Platform Admin Portal
            </span>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="text-white/70 hover:text-white text-[12.5px] font-medium flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Aplikasi Utama</span>
        </Link>
      </div>

      {/* Center Card */}
      <div className="w-full max-w-md mx-auto p-4 z-10">
        <div className="bg-white/95 backdrop-blur-xl border border-white/40 rounded-[32px] p-7 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col items-center text-center">
          {/* Security Badge */}
          <div className="inline-flex items-center gap-2 bg-[#EEF5F0] border border-[#DCE9DF] px-3.5 py-1.5 rounded-full text-[11px] font-extrabold text-[#1E4738] mb-5 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-[#356E3B]" />
            <span>PORTAL KHUSUS PLATFORM OWNER</span>
          </div>

          <h2 className="text-[22px] sm:text-[24px] font-black text-[#111827] tracking-tight leading-tight mb-2">
            Selamat Datang, Owner
          </h2>
          <p className="text-[13px] text-gray-500 leading-relaxed mb-6 max-w-xs">
            Akses analitik pertumbuhan platform global, direktori perusahaan, dan telemetri sistem.
          </p>

          {/* Error Alert jika akun ditolak */}
          {errorMessage && (
            <div className="w-full mb-6 p-4 rounded-[20px] bg-red-50/90 border border-red-200 text-left flex items-start gap-3 text-red-800 animate-in fade-in zoom-in-95 duration-200">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex flex-col text-[12px] leading-snug">
                <span className="font-bold mb-0.5">Otorisasi Ditolak</span>
                <span className="text-red-700">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Google Sign In Component */}
          <div className={`w-full flex justify-center my-2 ${isLoading ? "pointer-events-none opacity-50" : ""}`}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                setErrorMessage("Gagal menghubungkan ke layanan Google Sign-In.");
                setIsLoading(false);
              }}
              shape="pill"
              size="large"
              width="320"
              theme="outline"
              text="continue_with"
            />
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-[12.5px] text-[#1E4738] font-bold mt-4 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memverifikasi otorisasi allowlist...</span>
            </div>
          )}

          {/* Security notes footer */}
          <div className="mt-8 pt-5 border-t border-gray-100 w-full flex flex-col gap-2 text-[11px] text-gray-400">
            <div className="flex items-center justify-center gap-1.5 text-gray-500 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#356E3B]" />
              <span>Dilindungi Server-Side Allowlist Kriptografi</span>
            </div>
            <span>Hanya akun Google yang terdaftar yang dapat melihat data.</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="p-6 text-center text-white/40 text-[11.5px] z-10">
        &copy; {new Date().getFullYear()} AbsenIn Internal Platform Administration. All rights reserved.
      </div>
    </div>
  );
}
