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
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Shield,
  FileCheck,
  Layers,
  SlidersHorizontal,
  PlayCircle,
  Video,
  RotateCcw,
  Loader2,
  Check,
  Tag
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
  video_title?: string | null;
  video_url?: string | null;
  scope?: "global" | "company" | "platform_admin";
  content_scope?: ContentScope;
  target_roles?: TargetRole[];
  content_type?: ContentType;
  display_context?: DisplayContext;
  needs_review?: boolean;
  company_name?: string | null;
}

function getFaqIcon(item: { content_type?: string; category?: string; scope?: string; content_scope?: string; sop_url?: string | null; sop_title?: string | null; video_url?: string | null }) {
  if (item.video_url || isMediaVideo(item.sop_url, item.sop_title)) return Video;
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

function getContentTypeLabel(type?: ContentType) {
  switch (type) {
    case "sop_guide": return "SOP & Panduan";
    case "faq": return "FAQ (Tanya Jawab)";
    case "troubleshooting": return "Kendala Teknis";
    case "tips_best_practice": return "Tips & Praktik";
    default: return "Semua Jenis";
  }
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

  // State Pencarian & Faceted Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");

  const [selectedScopes, setSelectedScopes] = useState<ContentScope[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<ContentType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<("video" | "doc")[]>([]);

  // State Accordion untuk bagian facet di panel filter
  const [expandedFacets, setExpandedFacets] = useState<Record<string, boolean>>({
    scope: true,
    contentType: true,
    category: true,
    media: true,
  });

  const toggleFacetSection = (facetKey: string) => {
    setExpandedFacets((prev) => ({
      ...prev,
      [facetKey]: !prev[facetKey],
    }));
  };

  const toggleScope = (scope: ContentScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const toggleContentType = (ct: ContentType) => {
    setSelectedContentTypes((prev) =>
      prev.includes(ct) ? prev.filter((t) => t !== ct) : [...prev, ct]
    );
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleMedia = (m: "video" | "doc") => {
    setSelectedMedia((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  // Tutup panel filter saat tombol Escape ditekan & kunci scroll latar belakang
  useEffect(() => {
    if (isFilterDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFilterDrawerOpen) {
        setIsFilterDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterDrawerOpen]);

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
      video_title: item.video_title,
      video_url: item.video_url,
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

  // Perhitungan Facet Counts secara Dinamis dari Data Aktual yang Cocok
  const facetCounts = useMemo(() => {
    // Saring dasar berdasarkan teks pencarian (tanpa memutus pilihan facet saat mengetik)
    const baseItems = roleAccessibleFAQs.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchQuestion = item.question.toLowerCase().includes(q);
      const matchAnswer = item.answer.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchSopTitle = item.sop_title ? item.sop_title.toLowerCase().includes(q) : false;
      const matchVideoTitle = item.video_title ? item.video_title.toLowerCase().includes(q) : false;
      const matchCompanyName = item.company_name ? item.company_name.toLowerCase().includes(q) : false;
      const matchTags = item.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchQuestion || matchAnswer || matchCategory || matchSopTitle || matchVideoTitle || matchCompanyName || matchTags;
    });

    const scopes: Record<string, number> = { company: 0, user: 0, platform: 0 };
    const contentTypes: Record<string, number> = { sop_guide: 0, faq: 0, troubleshooting: 0, tips_best_practice: 0 };
    const categories: Record<string, number> = {};
    let videoCount = 0;
    let docCount = 0;

    baseItems.forEach((item) => {
      const scope = item.content_scope || (item.scope === "platform_admin" ? "platform" : item.scope === "company" ? "company" : "user");
      if (scopes[scope] !== undefined) scopes[scope]++;

      const cType = item.content_type || "faq";
      if (contentTypes[cType] !== undefined) contentTypes[cType]++;

      const cat = item.category?.trim() || "Umum";
      categories[cat] = (categories[cat] || 0) + 1;

      const hasVideo = !!item.video_url || isMediaVideo(item.sop_url, item.sop_title);
      const hasDoc = !!item.sop_url && item.sop_url !== (item.video_url || (isMediaVideo(item.sop_url, item.sop_title) ? item.sop_url : null));
      if (hasVideo) videoCount++;
      if (hasDoc) docCount++;
    });

    return { scopes, contentTypes, categories, videoCount, docCount, totalMatching: baseItems.length };
  }, [roleAccessibleFAQs, searchQuery]);

  // Daftar Kategori Aktual yang Tersedia di Data
  const availableCategories = useMemo(() => {
    return Object.keys(facetCounts.categories).sort((a, b) => a.localeCompare(b, "id"));
  }, [facetCounts.categories]);

  // Filter Kategori di Dalam Facet Panel
  const filteredCategoryList = useMemo(() => {
    if (!categorySearchQuery.trim()) return availableCategories;
    const q = categorySearchQuery.toLowerCase();
    return availableCategories.filter((c) => c.toLowerCase().includes(q));
  }, [availableCategories, categorySearchQuery]);

  // Filter FAQ Berdasarkan Kombinasi Pencarian dan Multi-Facet Filter
  const filteredFAQs = useMemo(() => {
    return roleAccessibleFAQs.filter((item) => {
      // 1. Filter Scope (Pasca-login)
      if (!isLoginContext && selectedScopes.length > 0) {
        const itemScope = item.content_scope || (item.scope === "platform_admin" ? "platform" : item.scope === "company" ? "company" : "user");
        if (!selectedScopes.includes(itemScope)) return false;
      }

      // 2. Filter Jenis Konten (Pasca-login)
      if (!isLoginContext && selectedContentTypes.length > 0) {
        const itemType = item.content_type || "faq";
        if (!selectedContentTypes.includes(itemType)) return false;
      }

      // 3. Filter Kategori/Topik (Dinamis)
      if (!isLoginContext && selectedCategories.length > 0) {
        if (!selectedCategories.includes(item.category)) return false;
      }

      // 4. Filter Materi Pendukung (Video / Dokumen SOP)
      if (!isLoginContext && selectedMedia.length > 0) {
        const effectiveVideoUrl = item.video_url || (isMediaVideo(item.sop_url, item.sop_title) ? item.sop_url : null);
        const hasVideo = !!effectiveVideoUrl;
        const hasDoc = !!item.sop_url && item.sop_url !== effectiveVideoUrl;
        const matchVideo = selectedMedia.includes("video") && hasVideo;
        const matchDoc = selectedMedia.includes("doc") && hasDoc;
        if (!matchVideo && !matchDoc) return false;
      }

      // 5. Filter Query Pencarian (Judul, Jawaban, Kategori, SOP, Video, Perusahaan, Tags)
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchQuestion = item.question.toLowerCase().includes(q);
      const matchAnswer = item.answer.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchSopTitle = item.sop_title ? item.sop_title.toLowerCase().includes(q) : false;
      const matchVideoTitle = item.video_title ? item.video_title.toLowerCase().includes(q) : false;
      const matchCompanyName = item.company_name ? item.company_name.toLowerCase().includes(q) : false;
      const matchTags = item.tags.some((tag) => tag.toLowerCase().includes(q));

      return matchQuestion || matchAnswer || matchCategory || matchSopTitle || matchVideoTitle || matchCompanyName || matchTags;
    });
  }, [
    roleAccessibleFAQs, 
    isLoginContext, 
    selectedScopes, 
    selectedContentTypes, 
    selectedCategories, 
    selectedMedia,
    searchQuery
  ]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const totalActiveFiltersCount = useMemo(() => {
    return (
      selectedScopes.length +
      selectedContentTypes.length +
      selectedCategories.length +
      selectedMedia.length
    );
  }, [selectedScopes, selectedContentTypes, selectedCategories, selectedMedia]);

  const hasActiveFilters = Boolean(searchQuery || totalActiveFiltersCount > 0);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedScopes([]);
    setSelectedContentTypes([]);
    setSelectedCategories([]);
    setSelectedMedia([]);
  };

  const handleResetFacets = () => {
    setSelectedScopes([]);
    setSelectedContentTypes([]);
    setSelectedCategories([]);
    setSelectedMedia([]);
  };

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

        {/* Search Bar & Tombol Filter di Sampingnya */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
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
              className="w-full bg-white rounded-2xl pl-10 pr-10 py-3 text-[13px] border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#356E3B]/30 focus:border-[#356E3B] transition-all text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.02)] placeholder:text-[#9CA3AF]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Tombol Filter Tepat di Samping Kolom Search */}
          {!isLoginContext && (
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`relative inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-3 rounded-2xl border text-[13px] font-bold transition-all shrink-0 cursor-pointer shadow-xs select-none ${
                totalActiveFiltersCount > 0
                  ? "bg-[#1E4738] text-white border-[#1E4738] hover:bg-[#2A582F]"
                  : "bg-white text-gray-700 border-[#D1D5DB] hover:bg-gray-50/80"
              }`}
              aria-label="Buka Filter Panduan"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
              {totalActiveFiltersCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-white text-[#1E4738] text-[11px] font-extrabold flex items-center justify-center leading-none shadow-2xs">
                  {totalActiveFiltersCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Counter Info & Active Filter Chips */}
        <div className="flex flex-col gap-2 pt-0.5">
          <div className="flex items-center justify-between text-[12px] text-[#5C786C] px-1 font-medium">
            <span>
              Menampilkan <strong className="text-gray-900 font-bold">{filteredFAQs.length}</strong> panduan
            </span>
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

          {/* Active Filter Chips (Dapat Ditutup Satu per Satu) */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 px-0.5">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  <span>&ldquo;{searchQuery}&rdquo;</span>
                  <button type="button" onClick={() => setSearchQuery("")} className="hover:text-black cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedScopes.map((scope) => (
                <span key={scope} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span>{scope === "company" ? "Perusahaan" : scope === "user" ? "Pengguna" : "Platform"}</span>
                  <button type="button" onClick={() => toggleScope(scope)} className="hover:text-emerald-950 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedContentTypes.map((ct) => (
                <span key={ct} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                  <span>{getContentTypeLabel(ct)}</span>
                  <button type="button" onClick={() => toggleContentType(ct)} className="hover:text-blue-950 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedCategories.map((cat) => (
                <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200">
                  <span>{cat}</span>
                  <button type="button" onClick={() => toggleCategory(cat)} className="hover:text-purple-950 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedMedia.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <span>{m === "video" ? "Ada Video" : "Ada Dokumen"}</span>
                  <button type="button" onClick={() => toggleMedia(m)} className="hover:text-amber-950 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
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
              const effectiveVideoUrl = item.video_url || (isMediaVideo(item.sop_url, item.sop_title) ? item.sop_url : null);
              const effectiveVideoTitle = item.video_title || (item.video_url ? null : (isMediaVideo(item.sop_url, item.sop_title) ? item.sop_title : null));
              const hasVideo = !!effectiveVideoUrl;
              const ytThumb = hasVideo ? getYouTubeThumbnail(effectiveVideoUrl) : null;
              const hasDoc = !!item.sop_url && item.sop_url !== effectiveVideoUrl;

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

                          {/* Indikator Video Tutorial */}
                          {hasVideo && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                              <PlayCircle className="w-3 h-3 text-rose-600" />
                              <span>Video</span>
                            </span>
                          )}

                          {/* Indikator Dokumen SOP */}
                          {hasDoc && (
                            <span className="text-[10px] font-bold text-[#1E4738] bg-[#E8F3EB] px-2 py-0.5 rounded-full border border-[#356E3B]/20 flex items-center gap-1">
                              <FileCheck className="w-3 h-3" />
                              <span>Dokumen</span>
                            </span>
                          )}
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

                      {/* Box Materi Pendukung: Video Tutorial dan/atau Dokumen SOP */}
                      {(hasVideo || hasDoc) && (
                        <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-col gap-2.5">
                          {hasVideo && (
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
                                    {effectiveVideoTitle || "Video Tutorial Panduan"}
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    Materi panduan visual dan langkah praktik
                                  </p>
                                </div>
                              </div>
                              <a
                                href={effectiveVideoUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors text-[11.5px] font-bold shrink-0 shadow-2xs"
                              >
                                <PlayCircle className="w-3.5 h-3.5" />
                                <span>Tonton Video</span>
                                <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                              </a>
                            </div>
                          )}

                          {hasDoc && (
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
                                href={item.sop_url!}
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

      {/* Faceted Filter Drawer / Popover Panel */}
      {isFilterDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs transition-opacity duration-200 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-panel-title"
        >
          {/* Backdrop dismiss */}
          <div 
            className="absolute inset-0"
            onClick={() => setIsFilterDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content Card */}
          <div 
            className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in fade-in slide-in-from-bottom-6 duration-200"
          >
            {/* Mobile Top Drag Indicator */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header (X Close, Title, Reset All) */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="Tutup Filter"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h2 id="filter-panel-title" className="text-[17px] font-extrabold text-gray-900 tracking-tight">
                    Pilih Preferensi
                  </h2>
                  <p className="text-[11.5px] text-gray-500">
                    {totalActiveFiltersCount > 0 
                      ? `${totalActiveFiltersCount} filter aktif` 
                      : "Pilih kriteria untuk menyaring panduan"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetFacets}
                disabled={totalActiveFiltersCount === 0}
                className={`text-[13px] font-bold transition-colors cursor-pointer ${
                  totalActiveFiltersCount > 0
                    ? "text-rose-600 hover:text-rose-700"
                    : "text-gray-300 cursor-not-allowed"
                }`}
              >
                Atur Ulang
              </button>
            </div>

            {/* Scrollable Facet Accordion Sections */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 divide-y divide-gray-100">
              
              {/* FACET 1: Cakupan Panduan (Scope) */}
              <div className="pt-2 first:pt-0">
                <button
                  type="button"
                  onClick={() => toggleFacetSection("scope")}
                  className="w-full flex items-center justify-between py-2 text-left group cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F3EB] text-[#1E4738] flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-[14px] font-bold text-gray-900">
                      Cakupan Panduan
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedScopes.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#1E4738] text-white text-[11px] font-bold">
                        {selectedScopes.length}
                      </span>
                    )}
                    <ChevronDown 
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        expandedFacets.scope ? "rotate-180" : ""
                      }`} 
                    />
                  </div>
                </button>

                {expandedFacets.scope && (
                  <div className="mt-2 space-y-1 pl-2">
                    {[
                      { id: "user" as ContentScope, label: "Pengguna & Karyawan", count: facetCounts.scopes.user || 0 },
                      { id: "company" as ContentScope, label: "Perusahaan & Kantor", count: facetCounts.scopes.company || 0 },
                      ...(isPlatformOwner
                        ? [{ id: "platform" as ContentScope, label: "Platform Super Admin", count: facetCounts.scopes.platform || 0 }]
                        : []),
                    ].map((opt) => {
                      const isSelected = selectedScopes.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleScope(opt.id)}
                          className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-[#1E4738] border-[#1E4738] text-white"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className={`text-[13px] ${isSelected ? "font-bold text-gray-900" : "text-gray-700"}`}>
                              {opt.label}
                            </span>
                          </div>
                          <span className="text-[12px] font-medium text-gray-400">
                            ({opt.count})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* FACET 2: Jenis Konten (Content Type) */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => toggleFacetSection("contentType")}
                  className="w-full flex items-center justify-between py-2 text-left group cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[14px] font-bold text-gray-900">
                      Jenis Konten
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedContentTypes.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                        {selectedContentTypes.length}
                      </span>
                    )}
                    <ChevronDown 
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        expandedFacets.contentType ? "rotate-180" : ""
                      }`} 
                    />
                  </div>
                </button>

                {expandedFacets.contentType && (
                  <div className="mt-2 space-y-1 pl-2">
                    {[
                      { id: "sop_guide" as ContentType, label: "SOP & Panduan Teknis", count: facetCounts.contentTypes.sop_guide || 0 },
                      { id: "faq" as ContentType, label: "Pertanyaan Umum (FAQ)", count: facetCounts.contentTypes.faq || 0 },
                      { id: "troubleshooting" as ContentType, label: "Solusi & Kendala", count: facetCounts.contentTypes.troubleshooting || 0 },
                      { id: "tips_best_practice" as ContentType, label: "Tips & Best Practice", count: facetCounts.contentTypes.tips_best_practice || 0 },
                    ].map((opt) => {
                      const isSelected = selectedContentTypes.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleContentType(opt.id)}
                          className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-[#1E4738] border-[#1E4738] text-white"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className={`text-[13px] ${isSelected ? "font-bold text-gray-900" : "text-gray-700"}`}>
                              {opt.label}
                            </span>
                          </div>
                          <span className="text-[12px] font-medium text-gray-400">
                            ({opt.count})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* FACET 3: Topik / Kategori Dinamis */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => toggleFacetSection("category")}
                  className="w-full flex items-center justify-between py-2 text-left group cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                      <Tag className="w-4 h-4" />
                    </div>
                    <span className="text-[14px] font-bold text-gray-900">
                      Topik & Kategori
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCategories.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[11px] font-bold">
                        {selectedCategories.length}
                      </span>
                    )}
                    <ChevronDown 
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        expandedFacets.category ? "rotate-180" : ""
                      }`} 
                    />
                  </div>
                </button>

                {expandedFacets.category && (
                  <div className="mt-2 pl-2 space-y-2">
                    {/* Search Input Kategori */}
                    {availableCategories.length > 4 && (
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          placeholder="Cari topik atau kategori..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1E4738]/30 focus:border-[#1E4738] text-gray-800"
                        />
                        {categorySearchQuery && (
                          <button
                            type="button"
                            onClick={() => setCategorySearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}


                    {/* List Checkbox Kategori */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {filteredCategoryList.length > 0 ? (
                        filteredCategoryList.map((cat) => {
                          const isSelected = selectedCategories.includes(cat);
                          const count = facetCounts.categories[cat] || 0;
                          return (
                            <div
                              key={cat}
                              onClick={() => toggleCategory(cat)}
                              className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <div
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? "bg-[#1E4738] border-[#1E4738] text-white"
                                      : "border-gray-300 bg-white"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <span className={`text-[13px] truncate ${isSelected ? "font-bold text-gray-900" : "text-gray-700"}`}>
                                  {cat}
                                </span>
                              </div>
                              <span className="text-[12px] font-medium text-gray-400 shrink-0">
                                ({count})
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-4 text-center text-[12px] text-gray-400">
                          Tidak ada kategori yang cocok
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* FACET 4: Materi Pendukung (Video / Dokumen SOP) */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => toggleFacetSection("media")}
                  className="w-full flex items-center justify-between py-2 text-left group cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Video className="w-4 h-4" />
                    </div>
                    <span className="text-[14px] font-bold text-gray-900">
                      Materi Pendukung
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedMedia.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[11px] font-bold">
                        {selectedMedia.length}
                      </span>
                    )}
                    <ChevronDown 
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        expandedFacets.media ? "rotate-180" : ""
                      }`} 
                    />
                  </div>
                </button>

                {expandedFacets.media && (
                  <div className="mt-2 space-y-1 pl-2">
                    {[
                      { id: "video" as const, label: "Memiliki Video Tutorial", count: facetCounts.videoCount },
                      { id: "doc" as const, label: "Memiliki Dokumen SOP", count: facetCounts.docCount },
                    ].map((opt) => {
                      const isSelected = selectedMedia.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleMedia(opt.id)}
                          className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-[#1E4738] border-[#1E4738] text-white"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className={`text-[13px] ${isSelected ? "font-bold text-gray-900" : "text-gray-700"}`}>
                              {opt.label}
                            </span>
                          </div>
                          <span className="text-[12px] font-medium text-gray-400">
                            ({opt.count})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Sticky Bottom Apply Action Bar */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#1E4738] hover:bg-[#2A582F] text-white font-extrabold text-[14px] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.99]"
              >
                <span>Terapkan</span>
              </button>
            </div>

          </div>
        </div>
      )}

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
