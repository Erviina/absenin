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
  ChevronRight,
  Clock,
  Shield,
  X,
  AlertTriangle
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { AccountContextDrawer } from "@/components/AccountContextDrawer";
import { googleLogout } from "@react-oauth/google";

export default function ProfilPage() {
  const router = useRouter();
  const { activeCompany, activeRole, memberships, refreshMemberships } = useCompany();
  const { showConfirm, showToast } = useDialog();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (activeCompany?.id) {
        headers["x-company-id"] = activeCompany.id;
      }

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/me", {
        headers
      });

      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        try {
          localStorage.setItem("user", JSON.stringify(data.data.user));
        } catch {}
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
    refreshMemberships();
  }, [refreshMemberships]);

  useEffect(() => {
    fetchUser();
  }, [activeCompany?.id]);

  const getRoleDisplay = () => {
    if (activeRole === "owner") return "Pemilik (Owner)";
    if (activeRole === "admin") return "Admin";
    if (activeRole === "manager") return "Manajemen";
    if (activeRole === "member") return "Karyawan";
    if (user?.activeRole === "owner") return "Pemilik (Owner)";
    if (user?.activeRole === "admin") return "Admin";
    if (user?.activeRole === "manager") return "Manajemen";
    if (user?.activeRole === "member") return "Karyawan";
    if (user?.roles?.includes("Admin")) return "Admin";
    if (user?.roles?.includes("Manager")) return "Manajemen";
    if (!activeCompany && !user?.company) return "Personal";
    return "Karyawan";
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm({
      title: "Keluar dari Akun?",
      message: "Apakah Anda yakin ingin keluar dari akun Anda saat ini?",
      confirmText: "Ya, Keluar",
      cancelText: "Batal",
      type: "danger",
      icon: "logout",
    });
    if (!confirmed) return;

    try {
      googleLogout();
    } catch (e) {
      console.error("googleLogout error:", e);
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("activeCompanyId");
    localStorage.removeItem("companyMemberships");
    router.push("/login");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Ukuran file maksimal 2 MB", "warning");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showToast("Hanya format JPEG, PNG, dan WebP yang diizinkan", "warning");
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
        showToast("Foto profil berhasil diperbarui", "success");
      } else {
        showToast(data.message || "Gagal mengupload foto profil", "error");
      }
    } catch (err) {
      console.error("Error uploading avatar:", err);
      showToast("Terjadi kesalahan jaringan saat mengupload foto profil", "error");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfdfc] pb-8">
      <TopBar title="Profil" onBack={() => router.push("/dashboard")} />

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
                className="w-[84px] h-[84px] rounded-full object-cover border-[3px] border-[#356E3B]/20 ring-2 ring-[#356E3B]/10 shadow-sm"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-[84px] h-[84px] bg-[#C1DFCD] rounded-full flex items-center justify-center border-[3px] border-[#356E3B]/20 ring-2 ring-[#356E3B]/10 shadow-sm">
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
            <div 
              onClick={() => setIsContextDrawerOpen(true)}
              className="flex items-center gap-1.5 text-[#6B7280] hover:text-[#183B2B] cursor-pointer transition-colors group"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="text-[13px] font-medium group-hover:underline">
                {activeCompany?.name || user.company?.name || "Belum ada organisasi"}
              </span>
              <span className="text-[10px] font-bold text-[#183B2B] bg-[#EAF3ED] px-2 py-0.5 rounded-full ml-1">
                Ganti
              </span>
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
            </div>
          </div>
        </div>

        {/* Profil Perusahaan Card */}
        {(activeCompany || user?.company) && (
          <div 
            onClick={() => router.push("/perusahaan")}
            className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-9 flex justify-center">
                <Building2 className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[#111827] text-[14px] font-bold">Profil Perusahaan</span>
                <span className="text-[#6B7280] text-[12px]">{activeCompany?.name || user?.company?.name || "Lihat profil & informasi organisasi"}</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
          </div>
        )}

        {/* Akses & Perusahaan Card */}
        <div 
          onClick={() => setIsContextDrawerOpen(true)}
          className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-9 flex justify-center">
              <Building2 className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[#111827] text-[14px] font-bold">Akses & Perusahaan</span>
              <span className="text-[#6B7280] text-[12px]">Kelola mode tampilan dan organisasi aktif.</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
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

          </>
        )}
      </div>



      {/* Drawer Peralihan Akun & Perusahaan */}
      <AccountContextDrawer 
        isOpen={isContextDrawerOpen}
        onClose={() => setIsContextDrawerOpen(false)}
        currentMode="personal"
      />
    </div>
  );
}
