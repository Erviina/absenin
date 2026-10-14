"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCompany, CompanyCategoryCode, CompanyRole } from "@/context/CompanyContext";
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  Users, 
  Briefcase, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  Crown,
  ChevronRight,
  LogOut
} from "lucide-react";
import { useRouter } from "next/navigation";

interface CompanySwitcherProps {
  compact?: boolean;
  variant?: "light" | "dark";
}

export function CompanySwitcher({ compact = false, variant = "light" }: CompanySwitcherProps) {
  const router = useRouter();
  const { 
    memberships, 
    activeCompanyId, 
    activeCompany, 
    activeRole, 
    switchCompany,
    isLoading 
  } = useCompany();

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getCategoryBadge = (categoryCode?: CompanyCategoryCode | null) => {
    switch (categoryCode) {
      case "business":
        return {
          label: "Business",
          icon: Briefcase,
          className: "bg-blue-50 text-blue-700",
        };
      case "organization":
        return {
          label: "Organization",
          icon: Building2,
          className: "bg-emerald-50 text-emerald-700",
        };
      case "community":
        return {
          label: "Community",
          icon: Users,
          className: "bg-purple-50 text-purple-700",
        };
      default:
        return {
          label: "Organization",
          icon: Building2,
          className: "bg-gray-50 text-gray-700",
        };
    }
  };

  const getRoleBadge = (role?: CompanyRole | null) => {
    switch (role) {
      case "owner":
        return {
          label: "Owner",
          icon: Crown,
          className: "bg-amber-50 text-amber-800 font-bold",
        };
      case "admin":
        return {
          label: "Admin",
          icon: ShieldCheck,
          className: "bg-emerald-50 text-emerald-800 font-semibold",
        };
      case "manager":
        return {
          label: "Manager",
          icon: UserCheck,
          className: "bg-sky-50 text-sky-800 font-semibold",
        };
      case "member":
      default:
        return {
          label: "Member",
          icon: Users,
          className: "bg-slate-50 text-slate-600 font-medium",
        };
    }
  };

  if (!mounted || isLoading) {
    if (variant === "dark") {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 animate-pulse text-white/70 text-[12px]">
          <div className="w-3.5 h-3.5 rounded-full bg-white/30" />
          <span>Memuat...</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EAF3ED] border border-[#BFDFCA] animate-pulse text-[#3B7053] text-[12px] font-medium">
        <div className="w-3.5 h-3.5 rounded-full bg-[#1E4738]/30 animate-spin" />
        <span>Memuat...</span>
      </div>
    );
  }

  if (memberships.length === 0) {
    if (variant === "dark") {
      return (
        <button
          onClick={() => router.push("/cek-perusahaan?from=profil")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[12px] font-bold transition-all border border-white/20 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Pilih / Gabung Organisasi</span>
        </button>
      );
    }
    return (
      <button
        onClick={() => router.push("/cek-perusahaan?from=profil")}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1E4738] hover:bg-[#2A5E4B] text-white text-[12px] font-bold shadow-sm transition-all active:scale-95"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Pilih / Gabung Organisasi</span>
      </button>
    );
  }

  const activeCategoryInfo = getCategoryBadge(activeCompany?.category?.code);
  const activeRoleInfo = getRoleBadge(activeRole);
  const ActiveCategoryIcon = activeCategoryInfo.icon;

  const isDark = variant === "dark";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Switcher Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-[16px] transition-all active:scale-[0.98] ${
          compact ? "max-w-[130px] sm:max-w-[180px]" : "max-w-[260px]"
        } cursor-pointer ${
          isDark
            ? "bg-white/20 hover:bg-white/30 border border-white/25 text-white backdrop-blur-sm"
            : "bg-[#EAF3ED] hover:bg-[#DCEEE0] border border-[#BFDFCA] text-[#1E4738] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        }`}
        title="Ganti Organisasi / Perusahaan"
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
          isDark ? "bg-white/25 text-white" : "bg-[#1E4738] text-white shadow-xs"
        }`}>
          <ActiveCategoryIcon className="w-3.5 h-3.5" />
        </div>

        <div className="flex flex-col text-left overflow-hidden">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className={`text-[13px] font-bold truncate ${isDark ? "text-white" : "text-[#1E4738]"}`}>
              {activeCompany?.name || "Pilih Perusahaan"}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
              isDark ? "text-white" : "text-[#1E4738]"
            } ${isOpen ? "rotate-180" : ""}`} />
          </div>
          
          {!compact && (
            <div className={`flex items-center gap-1 text-[10px] leading-tight ${
              isDark ? "text-white/80" : "text-[#3B7053] font-medium"
            }`}>
              <span>{activeCategoryInfo.label}</span>
              <span>•</span>
              <span className="capitalize font-semibold">{activeRoleInfo.label}</span>
            </div>
          )}
        </div>
      </button>

      {/* Dropdown Menu Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[310px] rounded-[24px] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-gray-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="px-3 pt-2 pb-2.5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Pilih Tenant / Company</span>
              <span className="text-[10px] bg-emerald-50 text-[#1E4738] font-bold px-2 py-0.5 rounded-full">
                {memberships.length} Aktif
              </span>
            </div>
          </div>

          {/* Company List */}
          <div className="max-h-[260px] overflow-y-auto py-2 flex flex-col gap-1.5">
            {memberships.map((m) => {
              const isSelected = m.company_id === activeCompanyId;
              const catInfo = getCategoryBadge(m.company.category?.code);
              const roleInfo = getRoleBadge(m.role);
              const CatIcon = catInfo.icon;
              const RoleIcon = roleInfo.icon;

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    if (m.company_id === activeCompanyId) {
                      setIsOpen(false);
                      return;
                    }
                    setIsOpen(false);
                    switchCompany(m.company_id);
                  }}
                  className={`p-2.5 rounded-[16px] cursor-pointer transition-all flex items-center justify-between border ${
                    isSelected 
                      ? "bg-[#eef5f0] border-[#356E3B]/30 shadow-xs" 
                      : "hover:bg-gray-50 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 border ${
                      isSelected ? "bg-white border-[#356E3B]/20 text-[#1E4738]" : "bg-gray-100 border-gray-200/60 text-gray-600"
                    }`}>
                      <CatIcon className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col overflow-hidden">
                      <span className={`text-[13px] font-bold leading-tight truncate ${
                        isSelected ? "text-[#1E4738]" : "text-gray-800"
                      }`}>
                        {m.company.name}
                      </span>

                      <div className="flex items-center gap-1.5 mt-1">
                        {/* Category Badge */}
                        <span className={`text-[9px] px-2 py-0.5 rounded-full ${catInfo.className}`}>
                          {catInfo.label}
                        </span>

                        {/* Role Badge */}
                        <span className={`text-[9px] px-2 py-0.5 rounded-full flex items-center gap-0.5 ${roleInfo.className}`}>
                          <RoleIcon className="w-2.5 h-2.5" />
                          <span>{roleInfo.label}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#1E4738] flex items-center justify-center shrink-0 text-white ml-2">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-1">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/buat-perusahaan?from=profil");
              }}
              className="w-full text-left px-3 py-2 text-[12px] font-semibold text-[#1E4738] hover:bg-[#eef5f0] rounded-[12px] transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Organisasi Baru</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/gabung-perusahaan?from=profil");
              }}
              className="w-full text-left px-3 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 rounded-[12px] transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span>Gabung dengan Kode / QR</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {activeCompany && activeRole !== "owner" && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/profil");
                }}
                className="w-full text-left px-3 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50 rounded-[12px] transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <span>Ajukan Keluar Organisasi</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-red-300" />
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
