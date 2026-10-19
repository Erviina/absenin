"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react";

import { getPersonalModePreference, isTokenValid } from "@/lib/personalMode";
import { useDialog } from "@/context/DialogContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { showToast } = useDialog();
  const [isLoading, setIsLoading] = useState(false);

  // Jika terdapat target redirectParam dari tautan eksternal dan pengguna sudah memiliki token valid, arahkan ke target tersebut
  useEffect(() => {
    if (!redirectParam || !redirectParam.startsWith("/")) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) {
      if (isTokenValid(token)) {
        router.replace(redirectParam);
      } else {
        // Token tidak valid atau kedaluwarsa: bersihkan sesi usang
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      }
    }
  }, [redirectParam, router]);

  const loginWithGoogle = useGoogleLogin({
    prompt: "select_account",
    onSuccess: async (tokenResponse) => {
      if (!tokenResponse.access_token) return;

      setIsLoading(true);
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: tokenResponse.access_token }),
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
          localStorage.setItem("accessToken", data.data.accessToken);
          localStorage.setItem("user", JSON.stringify(data.data.user));
          showToast("Login berhasil!", "success");

          // Cek jika terdapat target redirect dari tautan yang dibagikan
          if (redirectParam && redirectParam.startsWith("/")) {
            router.replace(redirectParam);
            return;
          }

          // Redirect default sesuai PRD
          const user = data.data.user;
          const skipCompany = getPersonalModePreference(user.id);
          if (!user.company && !skipCompany) {
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
    },
    onError: (error) => {
      console.error("Google Login Failed:", error);
      setIsLoading(false);
      showToast("Gagal menghubungkan ke Google", "error");
    },
  });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#edf3ef] relative overflow-hidden">

      {/* Top Section */}
      <div className="flex flex-col items-center pt-20 px-6 z-10">
        <img src="/img/assets/Logo.png" alt="AbsenIn Logo" className="h-10 w-auto object-contain mb-8" />

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

          <div className="flex justify-center w-full mt-2">
            <button
              type="button"
              onClick={() => {
                if (!isLoading) {
                  loginWithGoogle();
                }
              }}
              disabled={isLoading}
              className="w-full max-w-[300px] h-[46px] bg-white hover:bg-[#F8FAFC] active:scale-[0.98] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-full flex items-center justify-center gap-3 px-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200 cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#1E4738]" />
                  <span className="text-[14px] font-semibold text-[#1E4738]">Menghubungkan...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="text-[14px] font-semibold text-[#1F2937] group-hover:text-[#111827]">
                    Masuk dengan Google
                  </span>
                </>
              )}
            </button>
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
