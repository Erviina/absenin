"use client";

import { TopBar } from "@/components/TopBar";
import { 
  User, 
  Building2, 
  Camera, 
  Mail, 
  Phone, 
  Lock, 
  LogOut, 
  LogIn, 
  ChevronRight 
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        setAvatarError(false);
      } else {
        setError(data.message || "Gagal memuat profil");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan jaringan");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [router]);

  const getRoleDisplay = () => {
    if (!user?.roles) return "Karyawan";
    if (user.roles.includes("Admin")) return "Admin";
    if (user.roles.includes("Manager")) return "Manajemen";
    return "Karyawan";
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    router.push("/login");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file maksimal 2 MB");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Hanya format JPEG, PNG, dan WebP yang diizinkan");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const token = localStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/profile/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        // Refresh the profile to get new avatarUrl
        await fetchUser();
      } else {
        alert(data.message || "Gagal mengupload foto profil");
      }
    } catch (err) {
      console.error("Error uploading avatar:", err);
      alert("Terjadi kesalahan jaringan saat mengupload foto profil");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfdfc] pb-8">
      <TopBar title="Profil" onBack={() => router.back()} />

      <div className="px-6 pt-6 flex flex-col gap-6">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center h-[50vh]">
            <div className="w-10 h-10 border-4 border-[#356E3B]/20 border-t-[#356E3B] rounded-full animate-spin mb-4" />
            <p className="text-[#4B5563] font-medium text-[14px]">Memuat profil...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center h-[50vh] p-6 text-center">
            <p className="text-red-600 font-bold text-[16px] mb-2">{error}</p>
          </div>
        ) : user && (
          <>
        {/* Profile Header section */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/jpeg, image/png, image/webp"
              className="hidden" 
            />
            {user.avatarUrl && !avatarError ? (
              <img 
                src={user.avatarUrl} 
                alt="Avatar" 
                className="w-[84px] h-[84px] rounded-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-[84px] h-[84px] bg-[#C1DFCD] rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-[#1E4738]" />
              </div>
            )}
            <div 
              className="absolute bottom-0 right-0 w-[26px] h-[26px] bg-[#1E4738] rounded-full border-[3px] border-white flex items-center justify-center cursor-pointer hover:bg-[#153428] transition-colors"
              onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>

            {/* Loading Overlay for Avatar */}
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#356E3B]/20 border-t-[#356E3B] rounded-full animate-spin" />
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-1">
            <h1 className="text-[#111827] text-[20px] font-bold leading-tight">{user.fullName || "User"}</h1>
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <User className="w-3.5 h-3.5" />
              <span className="text-[13px] font-medium">{getRoleDisplay()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <Building2 className="w-3.5 h-3.5" />
              <span className="text-[13px] font-medium">{user.company?.name || "Perusahaan"}</span>
            </div>
          </div>
        </div>

        {/* Informasi Pribadi Card */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 flex items-center gap-3 border-b border-[#F3F4F6]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-[#2D5A3F]" strokeWidth={2.5} />
            </div>
            <h2 className="text-[#111827] text-[15px] font-bold">Informasi Pribadi</h2>
          </div>

          <div className="flex flex-col">
            {/* Nama Lengkap */}
            <div className="p-5 flex items-center justify-between border-b border-[#F3F4F6] active:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <User className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#9CA3AF] text-[11px] font-medium mb-0.5">Nama Lengkap</span>
                  <span className="text-[#111827] text-[14px] font-bold">{user.fullName}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            </div>

            {/* Email */}
            <div className="p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <Mail className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#9CA3AF] text-[11px] font-medium mb-0.5">Email</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#111827] text-[14px] font-bold">{user.email}</span>
                    <Lock className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Keluar dari Akun Card */}
        <div 
          onClick={handleLogout}
          className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-9 flex justify-center">
              <LogOut className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={2} />
            </div>
            <span className="text-[#111827] text-[14px] font-bold">Keluar dari Akun</span>
          </div>
          <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
        </div>

        {/* Masuk Manajemen Card */}
        {(user.roles.includes("Admin") || user.roles.includes("Manager")) && (
          <div 
            onClick={() => router.push("/admin/dashboard")}
            className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-9 flex justify-center">
                <LogIn className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={2} />
              </div>
              <span className="text-[#111827] text-[14px] font-bold">Masuk Manajemen</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
