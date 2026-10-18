"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
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

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (isLoading || !credentialResponse.credential) return;

    setIsLoading(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
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
  };

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

          <div className={`flex justify-center w-full mt-2 ${isLoading ? "pointer-events-none opacity-50" : ""}`}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                console.error("Login Failed");
                setIsLoading(false);
              }}
              shape="pill"
              size="large"
              width="300"
            />
          </div>
          {isLoading && (
            <div className="flex justify-center mt-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#1E4738]" />
            </div>
          )}
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
