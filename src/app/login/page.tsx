"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useGoogleLogin } from "@react-oauth/google";
import { Loader2, ShieldCheck, HelpCircle } from "lucide-react";

import { getPersonalModePreference, isTokenValid, getSafeInternalRedirect } from "@/lib/personalMode";
import { useDialog } from "@/context/DialogContext";
import { clearAuthSession, getApiUrl, setAuthSession } from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";
import { AbsenInLogo } from "@/components/AbsenInLogo";

import { GoogleIcon } from "@/components/GoogleIcon";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { showToast } = useDialog();
  const { refreshMemberships } = useCompany();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(false);
  const [sessionVerifyError, setSessionVerifyError] = useState<string | null>(null);


  // Verifikasi ke backend jika terdapat token lokal sebelum melakukan redirect
  useEffect(() => {
    let isMounted = true;
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    // Jika tidak ada token lokal: biarkan pengguna di halaman login untuk memilih akun Google
    if (!token) {
      return;
    }

    // Penyaringan awal di sisi klien: jika token kedaluwarsa atau strukturnya cacat, bersihkan sesi dan tetap di login
    if (!isTokenValid(token)) {
      clearAuthSession();
      return;
    }

    // Token tampak valid di sisi klien -> verifikasi keabsahannya ke backend (/auth/me)
    const verifySession = async () => {
      setIsVerifyingSession(true);
      setSessionVerifyError(null);
      try {
        const res = await fetch(getApiUrl("/auth/me"), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isMounted) return;

        if (res.status === 401) {
          // Backend menolak token (kedaluwarsa di server / revokasi): bersihkan sesi usang dan tetap di login
          clearAuthSession();
          setIsVerifyingSession(false);
          return;
        }

        if (res.ok) {
          const json = await res.json();
          if (!isMounted) return;

          if (json?.success && json?.data) {
            const verifiedUser = json.data?.user || json.data;
            try {
              localStorage.setItem("user", JSON.stringify(verifiedUser));
            } catch {}

            // HANYA jika akun ini belum pernah menyetujui syarat & kebijakan, arahkan ke alur persetujuan
            if (verifiedUser?.isNewUser || verifiedUser?.consent?.hasConsented === false) {
              const q = redirectParam ? `?flow=consent&consent=required&redirect=${encodeURIComponent(redirectParam)}` : `?flow=consent&consent=required`;
              router.replace(`/syarat-ketentuan${q}`);
              return;
            }

            // Pengguna yang sudah pernah menyetujui: langsung ke target internal yang aman atau dashboard
            const safeRedirect = getSafeInternalRedirect(redirectParam);
            if (safeRedirect) {
              router.replace(safeRedirect);
            } else {
              const effectiveCompany = verifiedUser?.company || null;
              const skipCompany = getPersonalModePreference(verifiedUser?.id);
              if (!effectiveCompany && !skipCompany) {
                router.replace("/cek-perusahaan");
              } else {
                router.replace("/dashboard");
              }
            }
            return;
          }
        }

        // Gangguan server (misal 500, 404, atau respons rusak):
        // Jangan menganggap token valid dan jangan menghapus token secara prematur
        setIsVerifyingSession(false);
        setSessionVerifyError(`Gagal memverifikasi sesi (HTTP ${res.status}). Silakan coba lagi.`);
      } catch (err) {
        // Gangguan jaringan
        if (!isMounted) return;
        setIsVerifyingSession(false);
        setSessionVerifyError("Tidak dapat terhubung ke server untuk memverifikasi sesi. Silakan periksa koneksi Anda.");
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [redirectParam, router]);

  const handleGoogleSuccess = async (authPayload: { idToken?: string; accessToken?: string }) => {
    if (isLoading || isVerifyingSession || (!authPayload.idToken && !authPayload.accessToken)) return;

    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authPayload),
      });

      const contentType = res.headers.get("content-type");
      let data: any = null;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      }

      if (!res.ok) {
        console.error("Login failed with status:", res.status, data);
        showToast(data?.message || `Gagal login (Error ${res.status})`, "error");
        return;
      }

      if (data?.success) {
        const user = data.data.user;
        const token = data.data.accessToken;

        // 1. Simpan sesi secara terpusat dan beritahu seluruh aplikasi (membersihkan cache akun lama)
        setAuthSession(token, user, user?.company?.id);

        // 2. HANYA JIKA akun Google ini baru mendaftar atau belum pernah menyetujui kebijakan privasi:
        const isNewRegistration = user?.isNewUser === true || user?.consent?.hasConsented === false;
        if (isNewRegistration) {
          const q = redirectParam ? `?flow=consent&consent=required&redirect=${encodeURIComponent(redirectParam)}` : `?flow=consent&consent=required`;
          router.replace(`/syarat-ketentuan${q}`);
          return;
        }

        // 3. Pengguna lama yang sudah pernah menyetujui: langsung ke alur aplikasi tanpa verifikasi ulang
        await refreshMemberships();
        showToast("Login berhasil! Selamat datang kembali.", "success");

        // Cek jika terdapat target redirect yang aman dari tautan yang dibagikan
        const safeRedirect = getSafeInternalRedirect(redirectParam);
        if (safeRedirect) {
          router.replace(safeRedirect);
          return;
        }

        // Dapatkan data user & perusahaan terbaru yang telah terkonfirmasi dari backend
        let effectiveUser = user;
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            effectiveUser = JSON.parse(userStr);
          }
        } catch {}

        const effectiveCompany = effectiveUser?.company || null;
        const skipCompany = getPersonalModePreference(effectiveUser?.id || user.id);
        if (!effectiveCompany && !skipCompany) {
          router.replace("/cek-perusahaan"); // "Halaman belum terdaftar"
        } else {
          router.replace("/dashboard");
        }
      } else {
        console.error("Login failed:", data?.message);
        showToast(data?.message || "Login failed", "error");
      }
    } catch (err) {
      console.error("Login error:", err);
      showToast("Terjadi kesalahan jaringan saat login", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      handleGoogleSuccess({ accessToken: tokenResponse.access_token });
    },
    onError: (error) => {
      console.error("Google Login Error:", error);
      setIsLoading(false);
      showToast("Gagal login dengan Google", "error");
    },
    prompt: "select_account",
  });

  const handleInitiateGoogleLogin = () => {
    loginWithGoogle();
  };


  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#edf3ef] relative overflow-hidden">

      {/* Top Help Button */}
      <div className="absolute top-5 right-5 z-30">
        <Link
          href="/bantuan"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-[#1E4738] text-[12px] font-semibold shadow-xs border border-white/60 backdrop-blur-xs transition-all hover:scale-105 active:scale-95"
          title="Buka Pusat Bantuan & FAQ"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#356E3B]" />
          <span>Bantuan</span>
        </Link>
      </div>

      {/* Top Section */}
      <div className="flex flex-col items-center pt-20 px-6 z-10">
        <AbsenInLogo size="md" className="mb-8" />

        <h1 className="text-[20px] leading-[1.4] font-bold text-[#1E4738] text-center mb-10 max-w-[500px]">
          Mulai hari dengan langkah kecil,<br />untuk hasil yang lebih besar.
        </h1>

        {/* Login Card */}
        <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-sm flex flex-col gap-6 relative z-20">
          <div className="text-center">
            <h2 className="text-[19px] font-bold text-[#1E4738] mb-2">
              Selamat Datang!
            </h2>
            <p className="text-[#5C786C] text-[13px] leading-[1.6]">
              Masuk dengan akun pilihanmu untuk<br />melanjutkan ke AbsenIN.
            </p>
          </div>

          {/* Status Verifikasi Sesi */}
          {isVerifyingSession && (
            <div className="flex items-center justify-center gap-2 text-sm text-[#5C786C] py-1">
              <Loader2 className="w-4 h-4 animate-spin text-[#356E3B]" />
              <span>Memverifikasi sesi Anda...</span>
            </div>
          )}

          {/* Pesan Gagal Verifikasi Sesi */}
          {sessionVerifyError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl p-3 flex flex-col gap-2">
              <p className="leading-relaxed">{sessionVerifyError}</p>
              <div className="flex items-center gap-3 font-semibold text-xs">
                <button
                  type="button"
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="text-[#1E4738] underline hover:text-[#356E3B]"
                >
                  Coba Lagi
                </button>
                <span className="text-amber-400">•</span>
                <button
                  type="button"
                  onClick={() => {
                    clearAuthSession();
                    setSessionVerifyError(null);
                  }}
                  className="text-amber-800 underline hover:text-amber-950"
                >
                  Masuk dengan Akun Lain
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center w-full mt-1">
            <button
              type="button"
              onClick={handleInitiateGoogleLogin}
              disabled={isLoading || isVerifyingSession}
              className="relative w-full max-w-[300px] h-11 bg-white border border-[#dadce0] hover:bg-[#f8fafd] hover:border-[#c6c8cc] active:bg-[#f1f3f4] text-[#3c4043] font-medium text-[14px] rounded-full shadow-[0_1px_2px_rgba(60,64,67,0.08)] flex items-center justify-center transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <div className="absolute left-4 w-5 h-5 flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#356E3B]" />
                ) : (
                  <GoogleIcon className="w-[18px] h-[18px]" />
                )}
              </div>
              <span className="font-medium text-[14px] text-[#3c4043]">
                {isLoading ? "Menghubungkan..." : "Sign in with Google"}
              </span>
            </button>

            {/* Disclaimer Syarat dan Ketentuan serta Kebijakan Privasi di Bawah Tombol Login */}
            <p className="text-[12px] text-[#6B7280] text-center mt-3.5 leading-relaxed max-w-[300px]">
              Dengan melanjutkan, Anda menyetujui{" "}
              <Link
                href="/syarat-ketentuan"
                className="text-[#1E4738] font-bold underline hover:text-[#356E3B] transition-colors whitespace-nowrap"
              >
                Syarat dan Ketentuan
              </Link>{" "}
              serta{" "}
              <Link
                href="/kebijakan-privasi"
                className="text-[#1E4738] font-bold underline hover:text-[#356E3B] transition-colors whitespace-nowrap"
              >
                Kebijakan Privasi
              </Link>
            </p>

            {/* Navigasi ke Pusat Bantuan & FAQ */}
            <div className="mt-3 pt-3 border-t border-gray-100 w-full flex items-center justify-center">
              <Link
                href="/bantuan"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#5C786C] hover:text-[#1E4738] transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#356E3B]" />
                <span>Butuh Bantuan? Pusat Bantuan &amp; FAQ</span>
              </Link>
            </div>
          </div>
        </div>
      </div>


      {/* Bottom Illustration */}
      <div className="absolute bottom-0 left-0 w-full h-[60vh] pointer-events-none z-0">
        {/* Soft fade out at the top of the illustration */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#edf3ef] to-transparent z-10" />

        <img
          src="/img/assets/imagelogin.png"
          alt="Login Workspace Illustration"
          className="w-full h-full object-cover object-bottom opacity-90"
        />
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-[100dvh] bg-[#edf3ef] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
