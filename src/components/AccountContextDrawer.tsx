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
  ArrowRightLeft,
  LogOut
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
    switch (role?.toLowerCase()) {
      case "owner":
        return "bg-[#FFF7ED] text-[#C2410C] font-bold";
      case "admin":
        return "bg-[#ECFDF5] text-[#065F46] font-bold";
      case "manager":
        return "bg-[#F0F9FF] text-[#0369A1] font-bold";
      case "member":
      default:
        return "bg-[#F8FAFC] text-[#475569] font-semibold";
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
      <div className="relative w-full sm:max-w-[460px] bg-white rounded-t-[32px] sm:rounded-[28px] shadow-2xl z-10 p-5 sm:p-6 pb-7 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 shrink-0">
          <div>
            <h3 className="text-[18px] sm:text-[19px] font-bold text-[#111827] leading-tight">
              Akses & Perusahaan
            </h3>
            <p className="text-[12.5px] sm:text-[13px] text-[#6B7280] font-medium mt-1">
              Kelola mode tampilan dan organisasi aktif.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] flex items-center justify-center text-[#4B5563] transition-colors cursor-pointer shrink-0 ml-3"
            aria-label="Tutup"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-5 pr-0.5">
          {/* SECTION 1: MODE TAMPILAN (ROLE SWITCH) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#8C9AA8] uppercase tracking-wider">
                PILIH MODE TAMPILAN
              </span>
              {(isManagement || memberships.length > 0) && (
                <span className="text-[11px] text-[#2D5A3F] font-bold bg-[#EAF3ED] px-2.5 py-0.5 rounded-full">
                  Multi-Role
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Mode Personal Card */}
              {currentMode === "personal" ? (
                <div className="flex items-center justify-between p-3.5 sm:p-4 bg-[#F4F9F6] border-[1.5px] border-[#356E3B] rounded-[20px] shadow-[0_2px_8px_rgba(53,110,59,0.06)]">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-[16px] bg-[#183B2B] flex items-center justify-center text-white shrink-0">
                      <User className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[#111827] text-[15px] font-bold leading-tight">
                        Mode Personal
                      </span>
                      <span className="text-[#5C786C] text-[12px] sm:text-[12.5px] font-normal mt-0.5 leading-normal">
                        Absensi harian, agenda pribadi, dan izin
                      </span>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#183B2B] text-white flex items-center justify-center shrink-0 ml-3">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => {
                    onClose();
                    router.push("/dashboard");
                  }}
                  className="flex items-center justify-between p-3.5 sm:p-4 bg-white hover:bg-gray-50/80 border border-[#E5E7EB] rounded-[20px] cursor-pointer transition-all active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0]/80 group-hover:bg-[#EAF3ED] flex items-center justify-center text-[#334155] group-hover:text-[#183B2B] shrink-0 transition-colors">
                      <User className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[#111827] text-[15px] font-bold leading-tight group-hover:text-[#183B2B] transition-colors">
                        Mode Personal
                      </span>
                      <span className="text-[#6B7280] text-[12px] sm:text-[12.5px] font-normal mt-0.5 leading-normal">
                        Absensi harian, agenda pribadi, dan izin
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] font-bold text-[#183B2B] bg-[#EDF4F0] px-3.5 py-1.5 rounded-full group-hover:bg-[#183B2B] group-hover:text-white transition-all shrink-0 ml-3">
                    <span>Beralih</span>
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                </div>
              )}

              {/* Mode Manajemen Card */}
              {isManagement && (
                currentMode === "management" ? (
                  <div className="flex items-center justify-between p-3.5 sm:p-4 bg-[#F4F9F6] border-[1.5px] border-[#356E3B] rounded-[20px] shadow-[0_2px_8px_rgba(53,110,59,0.06)]">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-[16px] bg-[#183B2B] flex items-center justify-center text-white shrink-0 overflow-hidden border-2 border-[#1E4738]/20 ring-1 ring-[#1E4738]/10">
                        {activeCompany?.avatar_company_url ? (
                          <img src={activeCompany.avatar_company_url} alt={activeCompany.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-5 h-5" strokeWidth={2} />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[#111827] text-[15px] font-bold leading-tight">
                          Mode Manajemen
                        </span>
                        <span className="text-[#5C786C] text-[12px] sm:text-[12.5px] font-normal mt-0.5 leading-normal">
                          Kelola karyawan, approval izin, dan laporan
                        </span>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#183B2B] text-white flex items-center justify-center shrink-0 ml-3">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => {
                      onClose();
                      router.push("/admin/dashboard");
                    }}
                    className="flex items-center justify-between p-3.5 sm:p-4 bg-white hover:bg-gray-50/80 border border-[#E5E7EB] rounded-[20px] cursor-pointer transition-all active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0]/80 group-hover:bg-[#EAF3ED] flex items-center justify-center text-[#334155] group-hover:text-[#183B2B] shrink-0 transition-colors overflow-hidden border-2 border-[#1E4738]/20 ring-1 ring-[#1E4738]/10">
                        {activeCompany?.avatar_company_url ? (
                          <img src={activeCompany.avatar_company_url} alt={activeCompany.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-5 h-5" strokeWidth={1.8} />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[#111827] text-[15px] font-bold leading-tight group-hover:text-[#183B2B] transition-colors">
                          Mode Manajemen
                        </span>
                        <span className="text-[#6B7280] text-[12px] sm:text-[12.5px] font-normal mt-0.5 leading-normal">
                          Kelola karyawan, approval izin, dan laporan
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[12px] font-bold text-[#183B2B] bg-[#EDF4F0] px-3.5 py-1.5 rounded-full group-hover:bg-[#183B2B] group-hover:text-white transition-all shrink-0 ml-3">
                      <span>Beralih</span>
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* SECTION 2: ORGANISASI & TENANT (MULTI-TENANT SWITCH) */}
          <div>
            <div className="mb-3">
              <span className="text-[11px] font-bold text-[#8C9AA8] uppercase tracking-wider">
                GANTI PERUSAHAAN / TENANT
              </span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[240px] overflow-y-auto pr-0.5">
              {memberships.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-[13px] bg-gray-50 rounded-[18px]">
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
                      className={`p-3.5 sm:p-4 rounded-[20px] cursor-pointer transition-all flex items-center justify-between border ${
                        isSelected 
                          ? "bg-[#F4F9F6] border-[1.5px] border-[#356E3B] shadow-[0_2px_8px_rgba(53,110,59,0.06)]" 
                          : "bg-white hover:bg-gray-50/80 border-[#E5E7EB] active:scale-[0.99] group"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 overflow-hidden border-2 border-[#1E4738]/20 ring-1 ring-[#1E4738]/10 ${
                          isSelected 
                            ? "bg-[#183B2B] text-white" 
                            : "bg-[#F8FAFC] text-[#334155] group-hover:bg-[#EAF3ED] group-hover:text-[#183B2B] transition-colors"
                        }`}>
                          {m.company?.avatar_company_url ? (
                            <img src={m.company.avatar_company_url} alt={m.company.name} className="w-full h-full object-cover" />
                          ) : (
                            <CatIcon className="w-5 h-5" strokeWidth={isSelected ? 2 : 1.8} />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-[15px] font-bold leading-tight truncate ${
                            isSelected ? "text-[#111827]" : "text-[#111827] group-hover:text-[#183B2B] transition-colors"
                          }`}>
                            {m.company.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[10.5px] px-2.5 py-0.5 rounded-full capitalize ${getRoleBadgeStyle(m.role)}`}>
                              {m.role}
                            </span>
                            <span className="text-[11px] text-[#9CA3AF]">•</span>
                            <span className="text-[12px] text-[#6B7280] font-normal truncate">
                              {m.company.category?.name || "Perusahaan"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isSelected ? (
                        <div className="w-7 h-7 rounded-full bg-[#183B2B] text-white flex items-center justify-center shrink-0 ml-3">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[12px] font-bold text-[#183B2B] bg-[#EDF4F0] px-3.5 py-1.5 rounded-full group-hover:bg-[#183B2B] group-hover:text-white transition-all shrink-0 ml-3">
                          <span>Beralih</span>
                          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
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
              className="mt-3 w-full py-3.5 px-4 rounded-[20px] border-[1.5px] border-dashed border-[#183B2B]/40 hover:border-[#183B2B] hover:bg-[#EAF3ED]/30 text-[#183B2B] font-bold text-[13.5px] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Gabung atau Daftarkan Organisasi Baru</span>
            </button>

            {activeCompany && activeRole !== "owner" && (
              <button
                onClick={() => {
                  onClose();
                  router.push("/profil");
                }}
                className="mt-2.5 w-full py-2.5 px-3 text-red-600 hover:bg-red-50 rounded-[16px] text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.99]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ajukan Keluar Organisasi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
