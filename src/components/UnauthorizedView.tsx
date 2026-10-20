"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, RefreshCw, Building2, CheckCircle2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useCompany } from "@/context/CompanyContext";

export function UnauthorizedView() {
  const router = useRouter();
  const { activeCompany, activeRole, memberships, switchCompany, refreshMemberships } = useCompany();
  const [isChecking, setIsChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  // Cari apakah ada perusahaan lain yang perannya adalah manajemen (owner, admin, manager)
  const managementMemberships = memberships.filter(
    (m) =>
      m.company_id !== activeCompany?.id &&
      m.status === "active" &&
      ["owner", "admin", "manager"].includes((m.role || "").toLowerCase())
  );

  const handleRecheck = async () => {
    setIsChecking(true);
    setCheckMessage(null);
    try {
      await refreshMemberships();
      // Baca role terbaru dari user di localStorage atau CompanyContext
      const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      let newRole = activeRole;
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          newRole = u.activeRole || newRole;
        } catch {}
      }

      if (newRole && ["owner", "admin", "manager"].includes(newRole.toLowerCase())) {
        setCheckMessage("Hak akses aktif ditemukan! Mengalihkan ke dashboard admin...");
        setTimeout(() => {
          router.replace("/admin/dashboard");
        }, 800);
      } else {
        setCheckMessage("Status hak akses Anda saat ini masih sebagai Karyawan (Member).");
      }
    } catch (e) {
      setCheckMessage("Gagal memperbarui status. Silakan coba beberapa saat lagi.");
    } finally {
      setIsChecking(false);
    }
  };

  const formatRoleLabel = (role?: string | null) => {
    if (!role) return "Karyawan";
    const r = role.toLowerCase();
    if (r === "member") return "Karyawan";
    if (r === "owner") return "Pemilik (Owner)";
    if (r === "admin") return "Administrator";
    if (r === "manager") return "Manajer";
    return role;
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFCF9] text-[#1F2937]">
      <TopBar 
        title="Akses Dibatasi" 
        onBack={() => router.push("/dashboard")} 
        bgColor="bg-[#356E3B]" 
      />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
          
          {/* Glowing Shield Icon */}
          <div className="relative mb-5 flex items-center justify-center">
            <div className="w-24 h-24 rounded-3xl bg-red-50 border border-red-100 flex items-center justify-center shadow-[0_8px_24px_rgba(220,38,38,0.12)]">
              <ShieldAlert className="w-12 h-12 text-[#DC2626]" strokeWidth={1.8} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-bold shadow-md border-2 border-white">
              !
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-700 text-[12px] font-bold mb-3 tracking-wide">
            <span>NO AUTHORIZED</span>
          </div>

          {/* Heading */}
          <h1 className="text-[22px] sm:text-[24px] font-bold text-[#111827] tracking-tight leading-snug">
            Tidak Memiliki Hak Akses
          </h1>

          {/* Description */}
          <p className="text-[13.5px] sm:text-[14px] text-[#5C786C] font-normal mt-2 leading-relaxed max-w-xs">
            Hak akses manajemen atau pemilik untuk akun Anda telah dinonaktifkan atau Anda tidak memiliki izin untuk mengelola halaman admin ini.
          </p>

          {/* Status Context Card */}
          <div className="w-full bg-white rounded-2xl border border-[#E5E7EB] p-4 mt-6 text-left shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <span className="text-[12px] text-[#6B7280] font-medium">Perusahaan Aktif</span>
              <span className="text-[13px] font-bold text-[#111827] truncate max-w-[170px]">
                {activeCompany?.name || "Perusahaan"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3">
              <span className="text-[12px] text-[#6B7280] font-medium">Peran Anda Saat Ini</span>
              <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#2D5A3F] bg-[#EAF3ED] px-2.5 py-0.5 rounded-full">
                {formatRoleLabel(activeRole)}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-[#F3F4F6] text-[11.5px] text-[#6B7280] leading-relaxed">
              Halaman admin hanya dapat diakses oleh akun dengan peran <strong className="text-[#374151]">Owner</strong>, <strong className="text-[#374151]">Admin</strong>, atau <strong className="text-[#374151]">Manajer</strong>.
            </div>
          </div>

          {checkMessage && (
            <div className={`w-full mt-3 p-3 rounded-xl text-[12.5px] font-medium text-center ${
              checkMessage.includes("ditemukan")
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}>
              {checkMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3 mt-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full h-12 bg-[#356E3B] hover:bg-[#2A582F] text-white font-bold text-[14px] rounded-full flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(53,110,59,0.2)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Kembali ke Dashboard Karyawan</span>
            </button>

            <button
              onClick={handleRecheck}
              disabled={isChecking}
              className="w-full h-11 bg-white hover:bg-gray-50 text-[#374151] border border-[#E5E7EB] font-bold text-[13px] rounded-full flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 stroke-[2] ${isChecking ? "animate-spin text-[#356E3B]" : "text-gray-500"}`} />
              <span>{isChecking ? "Memeriksa Status..." : "Periksa Ulang Hak Akses"}</span>
            </button>
          </div>

          {/* Quick Switch to another company with management rights if any */}
          {managementMemberships.length > 0 && (
            <div className="w-full mt-6 pt-5 border-t border-[#E5E7EB]/80 text-left">
              <span className="text-[11.5px] font-bold text-[#8C9AA8] uppercase tracking-wider block mb-2.5">
                Perusahaan Lain Dengan Akses Manajemen
              </span>
              <div className="flex flex-col gap-2">
                {managementMemberships.map((m) => (
                  <button
                    key={m.company_id}
                    onClick={() => {
                      switchCompany(m.company_id);
                      router.push("/admin/dashboard");
                    }}
                    className="w-full flex items-center justify-between p-3 bg-white hover:bg-emerald-50/50 border border-[#E5E7EB] hover:border-[#356E3B]/40 rounded-xl transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#EAF3ED] text-[#356E3B] flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-bold text-[#111827] truncate group-hover:text-[#356E3B]">
                          {m.company?.name || "Perusahaan"}
                        </span>
                        <span className="text-[11px] text-[#6B7280]">
                          Peran: {formatRoleLabel(m.role)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#356E3B] bg-[#EAF3ED] px-2 py-0.5 rounded-full shrink-0">
                      Buka Admin
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
