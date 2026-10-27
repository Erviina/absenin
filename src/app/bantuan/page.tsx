"use client";

import React, { Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { 
  Search, 
  X, 
  ChevronDown, 
  HelpCircle, 
  Building2, 
  UserCheck, 
  Sparkles,
  MapPin,
  Clock,
  FileText,
  Lock,
  Compass,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Navigation,
  ExternalLink,
  Shield,
  FileCheck,
  Layers,
  SlidersHorizontal,
  PlayCircle,
  Video,
  RotateCcw,
  Loader2
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { 
  getPublicFaqs, 
  getFaqCategories,
  FaqItem as BackendFaqItem, 
  ContentScope, 
  TargetRole, 
  ContentType, 
  DisplayContext,
  getContentScopeBadge, 
  getContentTypeBadge,
  CONTENT_SCOPE_OPTIONS,
  CONTENT_TYPE_OPTIONS,
  isMediaVideo,
  getYouTubeThumbnail
} from "@/lib/faqApi";
import { FaqAnswerContent } from "@/components/FaqAnswerContent";

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
  icon: any;
  sop_title?: string | null;
  sop_url?: string | null;
  scope?: "global" | "company" | "platform_admin";
  content_scope?: ContentScope;
  target_roles?: TargetRole[];
  content_type?: ContentType;
  display_context?: DisplayContext;
  needs_review?: boolean;
  company_name?: string | null;
}

function getFaqIcon(item: { content_type?: string; category?: string; scope?: string; content_scope?: string; sop_url?: string | null; sop_title?: string | null }) {
  if (isMediaVideo(item.sop_url, item.sop_title)) return Video;
  if (item.content_type === "sop_guide") return FileCheck;
  if (item.content_type === "troubleshooting") return AlertTriangle;
  if (item.content_type === "tips_best_practice") return Sparkles;
  if (item.scope === "platform_admin" || item.content_scope === "platform") return Shield;
  if (item.scope === "company" || item.content_scope === "company") return Building2;

  const c = item.category?.toLowerCase() || "";
  if (c.includes("gps") || c.includes("lokasi") || c.includes("radius")) return MapPin;
  if (c.includes("presensi") || c.includes("absen") || c.includes("hadir")) return Clock;
  if (c.includes("izin") || c.includes("cuti") || c.includes("sakit")) return FileText;
  if (c.includes("akun") || c.includes("sandi") || c.includes("login") || c.includes("password")) return Lock;
  if (c.includes("tugas") || c.includes("agenda")) return CheckCircle2;
  return HelpCircle;
}

function BantuanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, activeRole } = useCompany();

  const [hasLocalAuth, setHasLocalAuth] = useState<boolean | null>(null);
  const [savedRole, setSavedRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem("user");
      const token = localStorage.getItem("accessToken");
      const hasAuth = Boolean(savedUserStr && token);
      setHasLocalAuth(hasAuth);
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed.activeRole) setSavedRole(parsed.activeRole);
      }
    } catch {
      setHasLocalAuth(false);
    }
  }, []);

  const isFromLogin = searchParams.get("from") === "login";
  // Konteks login: dibuka dengan parameter ?from=login ATAU jika pengguna belum login sama sekali
  const isLoginContext = isFromLogin || (hasLocalAuth === false && !currentUser?.id);

  const isPlatformOwner = Boolean(
    currentUser?.is_developer ||
    currentUser?.isDeveloper ||
    (currentUser?.email && ["absenin.my.id@gmail.com"].includes(currentUser.email.toLowerCase()))
  );

  // Pemetaan role pengguna untuk penyaringan relevansi panduan (tanpa membuka peran lain)
  const userMappedRole: TargetRole = useMemo(() => {
    if (isPlatformOwner) return "platform_admin";
    if (activeRole === "owner" || activeRole === "admin" || currentUser?.roles?.includes("Admin") || savedRole === "owner" || savedRole === "admin") {
      return "company_owner_admin";
    }
    if (activeRole === "manager" || savedRole === "manager") return "manager";
    return "employee";
  }, [isPlatformOwner, activeRole, currentUser, savedRole]);

  // State Data Dinamis dari Backend
  const [dynamicFaqs, setDynamicFaqs] = useState<BackendFaqItem[]>([]);
  const [backendCategories, setBackendCategories] = useState<string[]>([]);
  const [isLoadingFaqs, setIsLoadingFaqs] = useState(true);
  const [hasFetchError, setHasFetchError] = useState(false);

  // State Pencarian & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<"all" | ContentType>("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | ContentScope>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // State untuk GPS Diagnostic Tool
  const [isCheckingGPS, setIsCheckingGPS] = useState(false);
  const [gpsDiagnostic, setGpsDiagnostic] = useState<{
    status: "idle" | "success" | "error";
    message: string;
    accuracy?: number;
    latitude?: number;
    longitude?: number;
    timestamp?: string;
  }>({
    status: "idle",
    message: "Klik tombol di bawah untuk menguji keakuratan sinyal GPS pada perangkat Anda saat ini."
  });

  // Fungsi Fetch Data dari Backend
  const loadFaqsData = useCallback(async () => {
    setIsLoadingFaqs(true);
    setHasFetchError(false);

    try {
      const contextParam = isLoginContext ? "login" : "help_center";
      
      // Ambil FAQ dan Kategori Dinamis secara paralel dari Backend
      const [faqsData, categoriesData] = await Promise.all([
        getPublicFaqs({ display_context: contextParam }),
        getFaqCategories({ display_context: contextParam, only_existing: true })
      ]);

      setDynamicFaqs(faqsData);
      setBackendCategories(categoriesData);
      setIsLoadingFaqs(false);
    } catch (err) {
      console.error("Gagal memuat Pusat Bantuan dari backend:", err);
      setHasFetchError(true);
      setIsLoadingFaqs(false);
    }
  }, [isLoginContext]);

  useEffect(() => {
    loadFaqsData();
  }, [loadFaqsData]);

  // Handle GPS Diagnostic Check
  const handleTestGPS = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsDiagnostic({
        status: "error",
        message: "Perangkat atau browser Anda tidak mendukung fitur pendeteksian lokasi GPS."
      });
      return;
    }

    setIsCheckingGPS(true);
    setGpsDiagnostic({
      status: "idle",
      message: "Sedang mengunci satelit GPS dan menghitung akurasi sinyal..."
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsCheckingGPS(false);
        const acc = Math.round(pos.coords.accuracy);
        let msg = "";
        if (acc <= 20) {
          msg = `Sinyal GPS sangat kuat (Akurasi ±${acc} meter). Sangat optimal untuk presensi di lokasi kantor.`;
        } else if (acc <= 60) {
          msg = `Sinyal GPS cukup baik (Akurasi ±${acc} meter). Dapat digunakan untuk absensi dalam radius geofencing standar.`;
        } else {
          msg = `Akurasi sinyal saat ini ±${acc} meter (lemah). Jika berada di dalam gedung, nyalakan Wi-Fi ponsel untuk meningkatkan presisi.`;
        }

        setGpsDiagnostic({
          status: "success",
          message: msg,
          accuracy: acc,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB"
        });
      },
      (err) => {
        setIsCheckingGPS(false);
        let errorMsg = "Gagal membaca lokasi perangkat.";
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = "Akses lokasi ditolak oleh browser. Mohon izinkan akses lokasi pada setelan browser Anda lalu muat ulang halaman.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = "Sinyal GPS tidak tersedia. Pastikan fitur Lokasi di ponsel Anda telah diaktifkan.";
        } else if (err.code === err.TIMEOUT) {
          errorMsg = "Waktu permintaan GPS habis sebelum koordinat didapatkan. Coba pindah ke dekat jendela atau luar ruangan.";
        }
        setGpsDiagnostic({
          status: "error",
          message: errorMsg
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  // Konversi Dynamic FAQs ke FAQItem
  const allFAQs: FAQItem[] = useMemo(() => {
    const list: FAQItem[] = dynamicFaqs.map((item) => ({
      id: item.id,
      category: item.category || "Umum",
      question: item.question,
      answer: item.answer,
      tags: [item.category, item.scope, item.content_scope || "", ...(item.sop_title ? [item.sop_title] : [])].filter(Boolean),
      icon: getFaqIcon(item),
      sop_title: item.sop_title,
      sop_url: item.sop_url,
      scope: item.scope,
      content_scope: item.content_scope,
      target_roles: item.target_roles,
      content_type: item.content_type,
      display_context: item.display_context,
      needs_review: item.needs_review,
      company_name: item.company_name,
    }));

    // Urutkan secara alfabetis (A-Z) berdasarkan judul pertanyaan
    list.sort((a, b) => {
      const cmp = a.question.localeCompare(b.question, "id", { sensitivity: "base" });
      if (cmp !== 0) return cmp;
      return (a.id || "").localeCompare(b.id || "");
    });

    return list;
  }, [dynamicFaqs]);

  // Saring FAQ yang relevan sesuai otorisasi role pengguna (untuk pasca-login)
  const roleAccessibleFAQs = useMemo(() => {
    return allFAQs.filter((item) => {
      if (isLoginContext) {
        // Pada halaman login: hanya login atau both, dan bukan privat perusahaan/platform
        if (item.display_context !== "login" && item.display_context !== "both") return false;
        if (item.scope === "company" || item.scope === "platform_admin" || item.content_scope === "platform") return false;
        return true;
      }

      // Pasca-login:
      // Konten tanpa pembatasan role (target_roles kosong) adalah konten umum untuk semua
      if (item.target_roles && item.target_roles.length > 0) {
        if (!isPlatformOwner) {
          if (userMappedRole === "employee") {
            if (!item.target_roles.includes("employee")) return false;
          } else if (userMappedRole === "manager") {
            if (!item.target_roles.includes("manager") && !item.target_roles.includes("employee")) return false;
          } else if (userMappedRole === "company_owner_admin") {
            if (
              !item.target_roles.includes("company_owner_admin") &&
              !item.target_roles.includes("manager") &&
              !item.target_roles.includes("employee")
            ) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [allFAQs, isLoginContext, userMappedRole, isPlatformOwner]);

  // Daftar Kategori Unik Dinamis: HANYA menampilkan kategori yang memiliki konten relevan
  const relevantCategories = useMemo(() => {
    const presentCategories = new Set<string>();
    roleAccessibleFAQs.forEach((f) => {
      if (f.category?.trim()) presentCategories.add(f.category.trim());
    });

    // Gabungkan dengan backendCategories yang memang ada di presentCategories
    const validCategories = backendCategories.filter((cat) => presentCategories.has(cat));
    // Tambahkan kategori dari presentCategories yang mungkin belum ada di backendCategories
    presentCategories.forEach((cat) => {
      if (!validCategories.includes(cat)) validCategories.push(cat);
    });

    return validCategories.sort((a, b) => a.localeCompare(b, "id"));
  }, [roleAccessibleFAQs, backendCategories]);

  // Filter FAQ Berdasarkan Search, Jenis Konten, Scope, dan Kategori
  const filteredFAQs = useMemo(() => {
    return roleAccessibleFAQs.filter((item) => {
      // 1. Filter Scope (Pasca-login)
      if (!isLoginContext && scopeFilter !== "all") {
        const itemScope = item.content_scope || (item.scope === "platform_admin" ? "platform" : item.scope === "company" ? "company" : "user");
        if (itemScope !== scopeFilter) return false;
      }

      // 2. Filter Jenis Konten (Pasca-login)
      if (!isLoginContext && contentTypeFilter !== "all") {
        const itemType = item.content_type || "faq";
        if (itemType !== contentTypeFilter) return false;
      }

      // 3. Filter Kategori/Topik (Dinamis)
      if (!isLoginContext && categoryFilter !== "all") {
        if (item.category?.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }

      // 4. Filter Query Pencarian (Judul, Jawaban, Tags, SOP Title)
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchQuestion = item.question.toLowerCase().includes(q);
      const matchAnswer = item.answer.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchSopTitle = item.sop_title ? item.sop_title.toLowerCase().includes(q) : false;
      const matchTags = item.tags.some((tag) => tag.toLowerCase().includes(q));

      return matchQuestion || matchAnswer || matchCategory || matchSopTitle || matchTags;
    });
  }, [
    roleAccessibleFAQs, 
    isLoginContext, 
    scopeFilter, 
    contentTypeFilter, 
    categoryFilter, 
    searchQuery
  ]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setScopeFilter("all");
    setContentTypeFilter("all");
    setCategoryFilter("all");
  };

  const hasActiveFilters = Boolean(
    searchQuery || 
    scopeFilter !== "all" || 
    contentTypeFilter !== "all" || 
    categoryFilter !== "all"
  );

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-20">
      {/* TopBar Header */}
      <TopBar 
        title="Pusat Bantuan" 
        onBack={() => (isFromLogin ? router.push("/login") : router.back())} 
      />

      <div className="px-5 py-5 flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Hero Header Banner */}
        <div className="bg-gradient-to-br from-[#1E4738] via-[#245241] to-[#2D5A3F] rounded-[24px] p-5 text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-semibold text-white/90 w-fit">
              <Sparkles className="w-3.5 h-3.5 text-[#7FAF8B]" />
              {isLoginContext ? "Bantuan Masuk & Akses" : "Pusat Bantuan AbsenIN"}
            </div>
            <h1 className="text-[19px] font-extrabold tracking-tight mt-1">
              Pusat Bantuan
            </h1>
            <p className="text-white/80 text-[12.5px] leading-relaxed">
              {isLoginContext
                ? "Panduan tata cara masuk menggunakan Akun Google, verifikasi sesi, dan akses akun baru."
                : "Temukan panduan operasional, SOP, FAQ, dan solusi kendala teknis AbsenIN."}
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full pointer-events-none blur-sm" />
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-[#7d998c]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isLoginContext
                ? "Cari panduan login, akun, atau sesi..."
                : "Cari pertanyaan, prosedur SOP, atau solusi..."
            }
            className="w-full bg-white rounded-2xl pl-10 pr-10 py-3.5 text-[13px] border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#356E3B]/30 focus:border-[#356E3B] transition-all text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.02)] placeholder:text-[#9CA3AF]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
              title="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Section: Jenis Konten, Scope, dan Topik/Kategori Dinamis (Hanya Pasca-Login) */}
        {!isLoginContext && (
          <div className="flex flex-col gap-2.5">
            {/* Filter Scope Pills */}
            <div className="w-full bg-[#EEF4F0] p-1.5 rounded-[18px] border border-[#D5E2D8]/80 flex items-center gap-1 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setScopeFilter("all")}
                className={`flex-1 min-w-[75px] flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                  scopeFilter === "all"
                    ? "bg-[#1E4738] text-white shadow-xs"
                    : "text-[#5C786C] hover:text-[#1E4738] hover:bg-white/70"
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Semua</span>
              </button>

              <button
                type="button"
                onClick={() => setScopeFilter("company")}
                className={`flex-1 min-w-[85px] flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                  scopeFilter === "company"
                    ? "bg-[#1E4738] text-white shadow-xs"
                    : "text-[#5C786C] hover:text-[#1E4738] hover:bg-white/70"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>Perusahaan</span>
              </button>

              <button
                type="button"
                onClick={() => setScopeFilter("user")}
                className={`flex-1 min-w-[80px] flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                  scopeFilter === "user"
                    ? "bg-[#1E4738] text-white shadow-xs"
                    : "text-[#5C786C] hover:text-[#1E4738] hover:bg-white/70"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Pengguna</span>
              </button>

              {isPlatformOwner && (
                <button
                  type="button"
                  onClick={() => setScopeFilter("platform")}
                  className={`flex-1 min-w-[80px] flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                    scopeFilter === "platform"
                      ? "bg-[#1E4738] text-white shadow-xs"
                      : "text-[#5C786C] hover:text-[#1E4738] hover:bg-white/70"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>Platform</span>
                </button>
              )}
            </div>

            {/* Filter Jenis Konten Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
              <button
                type="button"
                onClick={() => setContentTypeFilter("all")}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  contentTypeFilter === "all"
                    ? "bg-[#1E4738] text-white shadow-xs"
                    : "bg-white text-[#5C786C] border border-[#E5E7EB] hover:border-[#1E4738]/30"
                }`}
              >
                Semua Jenis
              </button>
              {CONTENT_TYPE_OPTIONS.map((ct) => {
                const isActive = contentTypeFilter === ct.value;
                return (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setContentTypeFilter(ct.value)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-[#1E4738] text-white shadow-xs"
                        : "bg-white text-[#5C786C] border border-[#E5E7EB] hover:border-[#1E4738]/30"
                    }`}
                  >
                    {ct.label}
                  </button>
                );
              })}
            </div>

            {/* Filter Topik / Kategori Dinamis dari Backend (Hanya yang memiliki konten relevan) */}
            {relevantCategories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    categoryFilter === "all"
                      ? "bg-[#356E3B] text-white shadow-xs"
                      : "bg-white text-[#4B5563] border border-[#E5E7EB] hover:border-[#356E3B]/40"
                  }`}
                >
                  Semua Topik
                </button>
                {relevantCategories.map((cat) => {
                  const isActive = categoryFilter.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? "bg-[#356E3B] text-white shadow-xs"
                          : "bg-white text-[#4B5563] border border-[#E5E7EB] hover:border-[#356E3B]/40"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* GPS Diagnostic Tool (Hanya Pasca-Login saat topik Presensi/GPS atau Semua) */}
        {!isLoginContext && (categoryFilter === "all" || categoryFilter.toLowerCase().includes("gps") || categoryFilter.toLowerCase().includes("presensi")) && (
          <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-4.5 flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#E8F3EB] flex items-center justify-center text-[#2D5A3F]">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[#111827] text-[13.5px] font-bold">Uji Akurasi GPS Perangkat</h2>
                  <p className="text-[#6B7280] text-[11.5px]">Periksa kekuatan sinyal lokasi sebelum check-in</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestGPS}
                disabled={isCheckingGPS}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#356E3B] hover:bg-[#2A582F] text-white rounded-xl text-[12px] font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isCheckingGPS ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>{isCheckingGPS ? "Menguji..." : "Uji GPS"}</span>
              </button>
            </div>

            {gpsDiagnostic.status !== "idle" && (
              <div className={`p-3 rounded-xl text-[12px] flex flex-col gap-1.5 ${
                gpsDiagnostic.status === "success" 
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                  : "bg-rose-50 text-rose-900 border border-rose-200"
              }`}>
                <div className="flex items-start gap-2">
                  {gpsDiagnostic.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium leading-relaxed">{gpsDiagnostic.message}</p>
                    {gpsDiagnostic.latitude && gpsDiagnostic.longitude && (
                      <div className="mt-1.5 pt-1.5 border-t border-emerald-200/60 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-emerald-800">
                        <span>Lat: {gpsDiagnostic.latitude.toFixed(6)}</span>
                        <span>Long: {gpsDiagnostic.longitude.toFixed(6)}</span>
                        <span>Waktu: {gpsDiagnostic.timestamp}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Counter Info & Reset Filter */}
        <div className="flex items-center justify-between text-[12px] text-[#5C786C] px-1 font-medium mt-1">
          <span>Menampilkan {filteredFAQs.length} panduan</span>
          {hasActiveFilters && (
            <button 
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[#356E3B] font-bold hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filter</span>
            </button>
          )}
        </div>

        {/* FAQ / SOP Cards List */}
        <div className="flex flex-col gap-2.5">
          {isLoadingFaqs && dynamicFaqs.length === 0 ? (
            <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-8 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[#356E3B] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-500">Memuat panduan Pusat Bantuan...</span>
            </div>
          ) : hasFetchError && dynamicFaqs.length === 0 ? (
            /* Error State */
            <div className="bg-white rounded-[24px] border border-rose-200 p-8 text-center flex flex-col items-center justify-center gap-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-[#111827] text-[15px] font-bold">
                Gagal memuat konten bantuan
              </h3>
              <p className="text-[#6B7280] text-[12.5px] max-w-[280px] leading-relaxed">
                Terjadi kendala jaringan saat mengambil panduan. Silakan coba muat ulang kembali.
              </p>
              <button
                type="button"
                onClick={loadFaqsData}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1E4738] text-white text-[12px] font-bold hover:bg-[#2A582F] transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Lagi</span>
              </button>
            </div>
          ) : filteredFAQs.length > 0 ? (
            filteredFAQs.map((item) => {
              const isExpanded = expandedId === item.id;
              const Icon = item.icon;
              const scopeBadge = getContentScopeBadge(item.content_scope);
              const typeBadge = getContentTypeBadge(item.content_type);
              const hasVideo = isMediaVideo(item.sop_url, item.sop_title);
              const ytThumb = hasVideo ? getYouTubeThumbnail(item.sop_url) : null;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    className="w-full text-left p-4.5 flex items-start gap-3.5 justify-between hover:bg-gray-50/70 transition-colors select-none cursor-pointer"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        item.content_scope === "platform" || item.scope === "platform_admin"
                          ? "bg-[#FEF3C7] text-[#92400E]" 
                          : item.content_scope === "company" || item.scope === "company"
                          ? "bg-[#E8F3EB] text-[#2D5A3F]"
                          : "bg-[#EAF3FD] text-[#2563EB]"
                      }`}>
                        <Icon className="w-4 h-4" strokeWidth={2.2} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        {/* Judul Pertanyaan / Panduan sebagai Elemen Utama */}
                        <span className="text-[#111827] text-[14px] font-bold leading-snug">
                          {item.question}
                        </span>
                        
                        {/* Badge Ringkas & Relevan */}
                        <div className="flex items-center flex-wrap gap-1.5 mt-2">
                          {/* Badge Jenis Konten */}
                          {item.content_type && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeBadge.className}`}>
                              {typeBadge.label}
                            </span>
                          )}

                          {/* Badge Kategori */}
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {item.category}
                          </span>

                          {/* Badge Scope (Pasca-Login) */}
                          {!isLoginContext && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${scopeBadge.className}`}>
                              {scopeBadge.label}
                            </span>
                          )}

                          {/* Nama Perusahaan jika spesifik tenant */}
                          {item.company_name && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              {item.company_name}
                            </span>
                          )}

                          {/* Indikator Video Tutorial atau Dokumen */}
                          {hasVideo ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                              <PlayCircle className="w-3 h-3 text-rose-600" />
                              <span>Video</span>
                            </span>
                          ) : item.sop_url ? (
                            <span className="text-[10px] font-bold text-[#1E4738] bg-[#E8F3EB] px-2 py-0.5 rounded-full border border-[#356E3B]/20 flex items-center gap-1">
                              <FileCheck className="w-3 h-3" />
                              <span>Dokumen</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 pt-0.5 pl-2">
                      <ChevronDown 
                        className={`w-5 h-5 text-[#9CA3AF] transition-transform duration-200 ${
                          isExpanded ? "rotate-180 text-[#1E4738]" : ""
                        }`} 
                        strokeWidth={2}
                      />
                    </div>
                  </button>

                  {/* Detail Konten Saat Dibuka */}
                  {isExpanded && (
                    <div className="px-4.5 pb-4.5 pt-1 text-[#4B5563] text-[13px] leading-relaxed border-t border-[#F3F4F6] bg-[#FAFCF9]/60">
                      {/* Jawaban / Prosedur SOP dengan format rapi */}
                      <FaqAnswerContent content={item.answer} className="mt-2 text-[#374151]" />

                      {/* Box Materi Pendukung: Video Tutorial atau Dokumen SOP */}
                      {item.sop_url && (
                        <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-col gap-2">
                          {hasVideo ? (
                            /* Video Tutorial Card */
                            <div className="bg-white rounded-xl border border-rose-200/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {ytThumb ? (
                                  <div className="relative w-16 h-10 rounded-lg overflow-hidden shrink-0 border border-gray-200 bg-black">
                                    <img src={ytThumb} alt="Video Thumbnail" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                      <PlayCircle className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                                    <Video className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-[12.5px] font-bold text-[#111827] truncate">
                                    {item.sop_title || "Video Tutorial Panduan"}
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    Materi panduan visual dan langkah praktik
                                  </p>
                                </div>
                              </div>
                              <a
                                href={item.sop_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors text-[11.5px] font-bold shrink-0 shadow-2xs"
                              >
                                <PlayCircle className="w-3.5 h-3.5" />
                                <span>Tonton Video</span>
                                <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                              </a>
                            </div>
                          ) : (
                            /* Dokumen SOP Card */
                            <div className="bg-white rounded-xl border border-emerald-200/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-[#E8F3EB] flex items-center justify-center text-[#2D5A3F] shrink-0">
                                  <FileCheck className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[12.5px] font-bold text-[#111827] truncate">
                                    {item.sop_title || "Dokumen SOP Resmi"}
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    Dokumentasi prosedur kerja dan kebijakan
                                  </p>
                                </div>
                              </div>
                              <a
                                href={item.sop_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E4738] hover:bg-[#2A582F] text-white transition-colors text-[11.5px] font-bold shrink-0 shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Buka Dokumen</span>
                                <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : isLoginContext ? (
            /* Empty State Khusus Bantuan Login */
            <div className="bg-white rounded-[24px] border border-[#E5E7EB] p-8 text-center flex flex-col items-center justify-center gap-3 shadow-2xs">
              <div className="w-14 h-14 rounded-full bg-[#E8F3EB] flex items-center justify-center text-[#2D5A3F]">
                <HelpCircle className="w-7 h-7" />
              </div>
              <h3 className="text-[#111827] text-[16px] font-bold">
                {searchQuery ? "Tidak ada panduan yang cocok" : "Belum Ada Panduan Bantuan Login"}
              </h3>
              <p className="text-[#6B7280] text-[13px] max-w-[280px] leading-relaxed">
                {searchQuery
                  ? "Coba gunakan kata kunci lain seputar login, akun, atau sesi."
                  : "Saat ini belum ada artikel bantuan untuk akses masuk yang dipublikasikan. Silakan kembali ke halaman login atau hubungi administrator kantor Anda."}
              </p>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-2 px-4 py-2 rounded-full bg-[#356E3B] text-white text-[12px] font-bold hover:bg-[#2A582F] transition-colors cursor-pointer"
                >
                  Reset Pencarian
                </button>
              ) : (
                <Link
                  href="/login"
                  className="mt-2 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#1E4738] hover:bg-[#2D5A3F] text-white text-[13px] font-bold transition-all shadow-xs cursor-pointer"
                >
                  Kembali ke Halaman Login
                </Link>
              )}
            </div>
          ) : (
            /* Empty State Pasca-Login */
            <div className="bg-white rounded-[24px] border border-[#E5E7EB] p-8 text-center flex flex-col items-center justify-center gap-2.5 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-[#111827] text-[15px] font-bold">
                Tidak ada pertanyaan yang sesuai
              </h3>
              <p className="text-[#6B7280] text-[12.5px] max-w-[280px] leading-relaxed">
                Coba sesuaikan kata kunci pencarian atau reset filter jenis konten, scope, dan topik.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 rounded-full bg-[#356E3B] text-white text-[12px] font-bold hover:bg-[#2A582F] transition-colors cursor-pointer"
              >
                Reset Semua Filter
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function BantuanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] w-full bg-[#FAFCF9] flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
      </div>
    }>
      <BantuanContent />
    </Suspense>
  );
}
