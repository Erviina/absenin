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
import { CompanySwitcher } from "@/components/CompanySwitcher";

export default function ProfilPage() {
  const router = useRouter();
  const { activeCompany, activeRole, memberships, refreshMemberships } = useCompany();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exit Request States
  const [myExitRequest, setMyExitRequest] = useState<any>(null);
  const [isLoadingExitReq, setIsLoadingExitReq] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitReason, setExitReason] = useState("");
  const [isSubmittingExit, setIsSubmittingExit] = useState(false);
  const [exitError, setExitError] = useState("");
  const [isCancellingExit, setIsCancellingExit] = useState(false);

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

  const fetchExitRequestMe = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || !activeCompany?.id) {
      setMyExitRequest(null);
      return;
    }

    setIsLoadingExitReq(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/company/exit-requests/me?company_id=${activeCompany.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-company-id": activeCompany.id,
          },
        }
      );
      const data = await res.json();
      if (data.success) {
        setMyExitRequest(data.data);
      } else {
        setMyExitRequest(null);
      }
    } catch (err) {
      console.error("Fetch exit request error:", err);
    } finally {
      setIsLoadingExitReq(false);
    }
  };

  const handleSubmitExitRequest = async () => {
    if (!activeCompany?.id || isSubmittingExit) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setIsSubmittingExit(true);
    setExitError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/company/exit-requests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-company-id": activeCompany.id,
        },
        body: JSON.stringify({
          company_id: activeCompany.id,
          reason: exitReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsExitModalOpen(false);
        setExitReason("");
        await fetchExitRequestMe();
      } else {
        setExitError(data.message || "Gagal mengajukan permohonan keluar");
      }
    } catch (err) {
      setExitError("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmittingExit(false);
    }
  };

  const handleCancelExitRequest = async () => {
    if (!activeCompany?.id || isCancellingExit) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    if (!confirm("Batalkan permohonan keluar dari organisasi ini?")) return;

    setIsCancellingExit(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/company/exit-requests/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-company-id": activeCompany.id,
        },
        body: JSON.stringify({ company_id: activeCompany.id }),
      });
      const data = await res.json();
      if (data.success) {
        setMyExitRequest(null);
      } else {
        alert(data.message || "Gagal membatalkan permohonan keluar");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setIsCancellingExit(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [activeCompany?.id]);

  useEffect(() => {
    if (activeCompany?.id) {
      fetchExitRequestMe();
    }
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
              <span className="text-[13px] font-medium">{activeCompany?.name || user.company?.name || "Belum ada organisasi"}</span>
            </div>
          </div>
        </div>

        {/* Card Organisasi / Company Switcher */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#356E3B]" />
              <span className="text-[#6B7280] text-[11px] font-bold uppercase tracking-wider">Organisasi / Komunitas Aktif</span>
            </div>
          </div>
          <CompanySwitcher />

          {/* Status Permohonan Keluar atau Tombol Keluar Organisasi */}
          {activeCompany && (
            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              {myExitRequest ? (
                <div className="bg-[#fff8ef] border border-amber-200 rounded-[16px] p-3.5 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[12px] font-bold text-amber-900 leading-tight">Permohonan Keluar Sedang Diproses</span>
                      <span className="text-[11px] text-amber-700 leading-tight">Menunggu konfirmasi Admin atau Manager di Kelola Karyawan</span>
                    </div>
                  </div>

                  {myExitRequest.reason && (
                    <div className="bg-white/80 border border-amber-200/60 rounded-[10px] p-2 text-[11px] text-amber-900 italic">
                      "{myExitRequest.reason}"
                    </div>
                  )}

                  <button
                    onClick={handleCancelExitRequest}
                    disabled={isCancellingExit}
                    className="w-full py-2 px-3 border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-[10px] text-[11px] font-bold transition-all active:scale-95 text-center disabled:opacity-50"
                  >
                    {isCancellingExit ? "Membatalkan..." : "Batalkan Permohonan Keluar"}
                  </button>
                </div>
              ) : activeRole !== "owner" ? (
                <button
                  onClick={() => {
                    setExitError("");
                    setExitReason("");
                    setIsExitModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 border border-red-200 hover:bg-red-50 text-red-600 rounded-[14px] text-[12px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-all mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Ajukan Keluar dari Organisasi</span>
                </button>
              ) : (
                <div className="bg-[#f4f9f6] text-[#356E3B] text-[11px] font-medium p-2.5 rounded-[12px] flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Anda adalah Pemilik (Owner) organisasi ini.</span>
                </div>
              )}
            </div>
          )}
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

          </>
        )}
      </div>

      {/* Modal Ajukan Keluar Organisasi */}
      {isExitModalOpen && activeCompany && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-5">
          <div className="w-full max-w-sm bg-white rounded-[24px] p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#111827] leading-tight">Ajukan Keluar</h3>
                  <span className="text-[12px] text-gray-500 font-medium">{activeCompany.name}</span>
                </div>
              </div>
              <button 
                onClick={() => setIsExitModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-95 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[12px] text-gray-500 leading-relaxed">
              Permohonan keluar Anda akan diverifikasi dan <span className="font-semibold text-gray-700">dikonfirmasi kembali oleh Admin atau Manager</span> di halaman Kelola Karyawan sebelum status keanggotaan Anda dinonaktifkan.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-gray-700">Alasan Keluar (Opsional)</label>
              <textarea
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                rows={3}
                placeholder="Contoh: Resign, pindah domisili, atau keperluan lainnya..."
                maxLength={500}
                className="w-full p-3 rounded-[14px] border border-gray-200 text-[13px] text-gray-800 focus:outline-none focus:border-[#356E3B] transition-colors resize-none placeholder:text-gray-400"
              />
              <span className="text-[10px] text-gray-400 text-right">{exitReason.length}/500</span>
            </div>

            {exitError && (
              <div className="text-red-600 text-[12px] bg-red-50 p-2.5 rounded-[12px] border border-red-200 text-center font-medium">
                {exitError}
              </div>
            )}

            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={() => setIsExitModalOpen(false)}
                disabled={isSubmittingExit}
                className="flex-1 py-3 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-[13px] transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitExitRequest}
                disabled={isSubmittingExit}
                className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-[13px] active:scale-95 transition-all shadow-md shadow-red-600/20 disabled:opacity-50"
              >
                {isSubmittingExit ? "Mengirim..." : "Kirim Pengajuan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
