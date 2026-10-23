"use client";

import { TopBar } from "@/components/TopBar";
import { 
  User, 
  Building2, 
  Camera, 
  Mail, 
  Lock, 
  LogOut, 
  ChevronRight,
  ArrowLeftRight,
  Loader2,
  ShieldCheck, 
  Code2,
  HelpCircle
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { AccountContextDrawer } from "@/components/AccountContextDrawer";
import { getActiveCompanyId, setActiveCompanyId, clearAuthSession, getApiUrl } from "@/lib/api";
import { ProfileSkeleton } from "@/components/CardSkeleton";

export default function ProfilPage() {
  const router = useRouter();
  const { activeCompany, activeCompanyId, activeRole, memberships, currentUser, setCurrentUser, isLoading: isCompanyLoading } = useCompany();
  const { showConfirm, showToast } = useDialog();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (currentUser) {
      setUser(currentUser);
      setIsLoading(false);
    } else {
      try {
        const saved = localStorage.getItem("user");
        if (saved) {
          setUser(JSON.parse(saved));
          setIsLoading(false);
        }
      } catch {}
    }
  }, [currentUser]);

  const fetchUser = async (silent = false) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      if (!silent && !user) {
        setIsLoading(true);
      }

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const effectiveCompanyId = activeCompanyId || activeCompany?.id || getActiveCompanyId();
      if (effectiveCompanyId) {
        headers["x-company-id"] = effectiveCompanyId;
      }

      const res = await fetch(getApiUrl("/auth/me"), {
        headers
      });

      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        setCurrentUser(data.data.user);
        setAvatarError(false);
      } else {
        if (!user) {
          setError(data.message || "Gagal memuat profil");
        }
      }
    } catch (err) {
      console.error(err);
      if (!user) {
        setError("Terjadi kesalahan jaringan");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isCompanyLoading) {
      fetchUser(true);
    }
  }, [activeCompanyId, isCompanyLoading]);

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

    clearAuthSession();
    router.replace("/login");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploadingAvatar) return;
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

      const res = await fetch(getApiUrl("/profile/avatar"), {
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
      <TopBar
        title="Profil"
        onBack={() => router.push("/dashboard")}
      />

      <div className="px-6 pt-6 flex flex-col gap-6">
        {(isLoading || isCompanyLoading) && !user ? (
          <ProfileSkeleton />
        ) : error && !user ? (
          <div className="flex-1 flex flex-col items-center justify-center h-[50vh] p-6 text-center">
            <p className="text-red-600 font-bold text-[16px] mb-2">{error}</p>
            <button onClick={() => fetchUser(false)} className="mt-2 px-5 py-2 rounded-full bg-[#356E3B] text-white text-[13px] font-bold active:scale-95 transition-all shadow-sm">Coba Lagi</button>
          </div>
        ) : user ? (
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
              {isUploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-white" />
              )}
            </div>

            {/* Loading Overlay for Avatar */}
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#356E3B]/20 border-t-[#356E3B] rounded-full animate-spin" />
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[#111827] text-[20px] font-bold leading-tight">{user.fullName || "User"}</h1>
            </div>
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <User className="w-3.5 h-3.5" />
              <span className="text-[13px] font-medium">{getRoleDisplay()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <Building2 className="w-3.5 h-3.5" />
              <span className="text-[13px] font-medium">
                {activeCompany?.name || user.company?.name || "Belum ada organisasi"}
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

        {/* Informasi Perusahaan Card */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 flex items-center gap-3 border-b border-[#F3F4F6]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-[#2D5A3F]" strokeWidth={2.5} />
            </div>
            <h2 className="text-[#111827] text-[15px] font-bold">Informasi Perusahaan</h2>
          </div>

          <div className="flex flex-col">
            {/* Profil Perusahaan */}
            {(activeCompany || user?.company) && (
              <div 
                onClick={() => router.push("/perusahaan")}
                className="p-5 flex items-center justify-between border-b border-[#F3F4F6] active:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 flex justify-center">
                    <Building2 className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.75} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#111827] text-[14px] font-bold">Profil Perusahaan</span>
                    <span className="text-[#6B7280] text-[12px]">{activeCompany?.name || user?.company?.name || "Lihat profil & informasi organisasi"}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
              </div>
            )}

            {/* Ganti Perusahaan */}
            <div 
              onClick={() => setIsContextDrawerOpen(true)}
              className="p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <ArrowLeftRight className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.75} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#111827] text-[14px] font-bold">Ganti Perusahaan</span>
                  <span className="text-[#6B7280] text-[12px]">Beralih ke organisasi atau perusahaan lain</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Bantuan & Informasi Card */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 flex items-center gap-3 border-b border-[#F3F4F6]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4 text-[#2D5A3F]" strokeWidth={2.5} />
            </div>
            <h2 className="text-[#111827] text-[15px] font-bold">Bantuan & Informasi</h2>
          </div>

          <div className="flex flex-col">
            {/* Pusat Bantuan */}
            <div 
              onClick={() => router.push("/bantuan")}
              className="p-5 flex items-center justify-between border-b border-[#F3F4F6] active:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <HelpCircle className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.75} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[#111827] text-[14px] font-bold">Pusat Bantuan</span>
                  </div>
                  <span className="text-[#6B7280] text-[12px]">FAQ dan panduan penggunaan aplikasi</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            </div>

            {/* Kebijakan Aplikasi */}
            <div 
              onClick={() => router.push("/kebijakan-privasi")}
              className="p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <ShieldCheck className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.75} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[#111827] text-[14px] font-bold">Kebijakan Aplikasi</span>
                  </div>
                  <span className="text-[#6B7280] text-[12px]">Pelajari transparansi pemrosesan PII dan hak privasi Anda</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Platform Admin Card */}
        <div 
          onClick={() => router.push("/platform-admin/overview")}
          className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-9 flex justify-center">
              <Code2 className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[#111827] text-[14px] font-bold">Platform Admin</span>
              </div>
              <span className="text-[#6B7280] text-[12px]">Kelola seluruh perusahaan, pengguna & platform</span>
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
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center h-[50vh] p-6 text-center">
            <p className="text-gray-500 font-medium text-[14px]">Data profil tidak tersedia</p>
            <button onClick={() => router.push("/dashboard")} className="mt-2 px-5 py-2 rounded-full bg-[#356E3B] text-white text-[13px] font-bold active:scale-95 transition-all shadow-sm">Kembali ke Beranda</button>
          </div>
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
