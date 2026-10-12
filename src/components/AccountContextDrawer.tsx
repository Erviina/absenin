"use client";

import React from "react";
import { 
  User, 
  Building2, 
  Check, 
  ChevronRight, 
  Briefcase, 
  Users, 
  Plus, 
  X, 
  ShieldCheck,
  ArrowRightLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";

interface AccountContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: "personal" | "management";
}

export function AccountContextDrawer({
  isOpen,
  onClose,
  currentMode
}: AccountContextDrawerProps) {
  const router = useRouter();
  const { 
    activeCompanyId, 
    activeCompany, 
    activeRole, 
    memberships, 
    switchCompany 
  } = useCompany();

  if (!isOpen) return null;

  const isManagement = activeRole 
    ? ["owner", "admin", "manager"].includes(activeRole) 
    : false;

  const getCategoryIcon = (categoryCode?: string | null) => {
    switch (categoryCode) {
      case "business":
        return Briefcase;
      case "community":
        return Users;
      case "organization":
      default:
        return Building2;
    }
  };

  const getRoleBadgeStyle = (role?: string | null) => {
    switch (role) {
      case "owner":
        return "bg-amber-50 text-amber-800 border-amber-200/80 font-bold";
      case "admin":
        return "bg-emerald-50 text-emerald-800 border-emerald-200/80 font-semibold";
      case "manager":
        return "bg-sky-50 text-sky-800 border-sky-200/80 font-semibold";
      case "member":
      default:
        return "bg-slate-50 text-slate-700 border-slate-200/60 font-medium";
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose} 
      />

      {/* Sheet Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl z-10 p-5 pb-8 flex flex-col max-h-[88vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Pull handle for mobile */}
        <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-3.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-[17px] font-bold text-[#111827] leading-tight">
              Akses & Perusahaan
            </h3>
            <p className="text-[12px] text-[#6B7280] font-medium mt-0.5">
              Beralih peran tampilan dan ganti organisasi / PT aktif
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto pt-4 flex flex-col gap-5">
          {/* SECTION 1: MODE TAMPILAN (ROLE SWITCH) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                Pilih Mode Tampilan
              </span>
              {isManagement && (
                <span className="text-[10px] text-[#356E3B] font-semibold bg-[#EAF3ED] px-2 py-0.5 rounded-full">
                  Multi-Role
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {/* Mode Personal Card */}
              {currentMode === "personal" ? (
                <div className="flex items-center justify-between p-3.5 bg-[#F0FDF4] border-2 border-[#22C55E]/40 rounded-[18px] shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[12px] bg-[#1E4738] flex items-center justify-center text-white shrink-0 shadow-xs">
                      <User className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#111827] text-[14px] font-bold leading-tight">
                          Mode Personal
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#15803D]">
                          Aktif
                        </span>
                      </div>
                      <span className="text-[#5C786C] text-[12px] font-medium mt-0.5">
                        Absensi harian, agenda pribadi, dan izin
                      </span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#1E4738] text-white flex items-center justify-center shrink-0 ml-2">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => {
                    onClose();
                    router.push("/dashboard");
                  }}
                  className="flex items-center justify-between p-3.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-[18px] cursor-pointer transition-all active:scale-[0.99] group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[12px] bg-gray-100 group-hover:bg-[#EAF3ED] flex items-center justify-center text-gray-600 group-hover:text-[#1E4738] shrink-0 border border-gray-200 transition-colors">
                      <User className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#111827] text-[14px] font-bold leading-tight group-hover:text-[#1E4738] transition-colors">
                        Mode Personal
                      </span>
                      <span className="text-[#6B7280] text-[12px] font-medium mt-0.5">
                        Beralih ke absensi dan izin staf
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] font-bold text-[#1E4738] bg-[#EAF3ED] px-2.5 py-1 rounded-full group-hover:bg-[#1E4738] group-hover:text-white transition-all shrink-0 ml-2">
                    <span>Beralih</span>
                    <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              {/* Mode Manajemen Card */}
              {isManagement ? (
                currentMode === "management" ? (
                  <div className="flex items-center justify-between p-3.5 bg-[#F0FDF4] border-2 border-[#22C55E]/40 rounded-[18px] shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[12px] bg-[#1E4738] flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Building2 className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#111827] text-[14px] font-bold leading-tight">
                            Mode Manajemen
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#15803D]">
                            Aktif
                          </span>
                        </div>
                        <span className="text-[#5C786C] text-[12px] font-medium mt-0.5">
                          Kelola karyawan, approval izin, dan laporan
                        </span>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#1E4738] text-white flex items-center justify-center shrink-0 ml-2">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => {
                      onClose();
                      router.push("/admin/dashboard");
                    }}
                    className="flex items-center justify-between p-3.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-[18px] cursor-pointer transition-all active:scale-[0.99] group shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[12px] bg-gray-100 group-hover:bg-[#EAF3ED] flex items-center justify-center text-gray-600 group-hover:text-[#1E4738] shrink-0 border border-gray-200 transition-colors">
                        <Building2 className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#111827] text-[14px] font-bold leading-tight group-hover:text-[#1E4738] transition-colors">
                          Mode Manajemen
                        </span>
                        <span className="text-[#6B7280] text-[12px] font-medium mt-0.5">
                          Kelola karyawan, approval izin, dan laporan
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[12px] font-bold text-[#1E4738] bg-[#EAF3ED] px-2.5 py-1 rounded-full group-hover:bg-[#1E4738] group-hover:text-white transition-all shrink-0 ml-2">
                      <span>Beralih</span>
                      <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                  </div>
                )
              ) : (
                <div className="p-3.5 bg-gray-50 border border-gray-200/60 rounded-[18px] flex items-center gap-2.5 text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-[12px] leading-tight">
                    Akun Anda memiliki akses karyawan pada perusahaan ini.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: ORGANISASI & TENANT (MULTI-TENANT SWITCH) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                Ganti Perusahaan / Tenant
              </span>
              <span className="text-[10px] bg-[#EAF3ED] text-[#1E4738] font-bold px-2 py-0.5 rounded-full">
                {memberships.length} Terdaftar
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-0.5">
              {memberships.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-[13px] bg-gray-50 rounded-[16px]">
                  Belum ada perusahaan terdaftar.
                </div>
              ) : (
                memberships.map((m) => {
                  const isSelected = m.company_id === activeCompanyId;
                  const CatIcon = getCategoryIcon(m.company?.category?.code);
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (m.company_id !== activeCompanyId) {
                          switchCompany(m.company_id);
                        }
                        onClose();
                      }}
                      className={`p-3 rounded-[18px] cursor-pointer transition-all flex items-center justify-between border ${
                        isSelected 
                          ? "bg-[#F0FDF4] border-[#86EFAC] shadow-xs" 
                          : "bg-white hover:bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[#1E4738] text-white" : "bg-gray-100 text-gray-600"
                        }`}>
                          <CatIcon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-bold text-[#111827] truncate">
                            {m.company.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-md border capitalize ${getRoleBadgeStyle(m.role)}`}>
                              {m.role}
                            </span>
                            <span className="text-[11px] text-gray-400">•</span>
                            <span className="text-[11px] text-[#6B7280]">
                              {m.company.category?.name || "Organisasi"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-[#1E4738] text-white flex items-center justify-center shrink-0 ml-2">
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-gray-400 shrink-0 ml-2 hover:text-[#1E4738] transition-colors">
                          Pilih
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Button to join/register new company */}
            <button
              onClick={() => {
                onClose();
                router.push("/cek-perusahaan?from=profil");
              }}
              className="mt-3 w-full py-2.5 px-4 rounded-[16px] border border-dashed border-[#1E4738]/40 hover:bg-[#EAF3ED]/40 text-[#1E4738] font-bold text-[12px] flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              <span>Gabung atau Daftarkan Organisasi Baru</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
