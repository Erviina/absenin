"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem("accessToken", data.data.accessToken);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        
        // redirect according to PRD condition
        const user = data.data.user;
        if (!user.company) {
          router.push("/cek-perusahaan"); // "Halaman belum terdaftar"
        } else {
          router.push("/dashboard");
        }
      } else {
        console.error("Login failed:", data.message);
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Network error");
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
          Mulai hari dengan langkah kecil,<br/>untuk hasil yang lebih besar.
        </h1>

        {/* Login Card */}
        <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-sm flex flex-col gap-6 relative z-20">
          <div className="text-center">
            <h2 className="text-[19px] font-bold text-[#1E4738] mb-2">
              Selamat Datang!
            </h2>
            <p className="text-[#5C786C] text-[13px] leading-[1.6]">
              Masuk dengan akun pilihanmu untuk<br/>melanjutkan ke AbsenIN.
            </p>
          </div>

          <div className="flex justify-center w-full mt-2">
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
