"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import {
  HelpCircle,
  Search,
  Plus,
  Edit3,
  Trash2,
  FileText,
  ExternalLink,
  CheckCircle2,
  Eye,
  EyeOff,
  Building2,
  X,
  FileCheck,
  ChevronDown,
  RotateCw,
  MoreVertical,
  Users,
  AlertTriangle,
  Filter,
  Check,
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import {
  FaqItem,
  FaqPayload,
  ContentScope,
  TargetRole,
  ContentType,
  DisplayContext,
  getManageFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  getFaqCategories,
  CONTENT_SCOPE_OPTIONS,
  TARGET_ROLE_OPTIONS,
  CONTENT_TYPE_OPTIONS,
  DISPLAY_CONTEXT_OPTIONS,
  getContentScopeBadge,
  getContentTypeBadge,
  getDisplayContextBadge,
} from "@/lib/faqApi";
import { FaqRichEditor } from "@/components/FaqRichEditor";
import { FaqAnswerContent } from "@/components/FaqAnswerContent";
import { FaqCategoryCombobox } from "@/components/FaqCategoryCombobox";

export default function AdminCompanyFaqPage() {
  const router = useRouter();
  const { activeCompany } = useCompany();
  const { showConfirm, showAlert } = useDialog();

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Filter States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [contentScopeFilter, setContentScopeFilter] = useState<ContentScope | "all">("all");
  const [targetRoleFilter, setTargetRoleFilter] = useState<TargetRole | "all">("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | "all">("all");
  const [displayContextFilter, setDisplayContextFilter] = useState<DisplayContext | "all">("all");
  const [needsReviewFilter, setNeedsReviewFilter] = useState<"all" | "true" | "false">("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Click outside to close more option menu
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuId(null);
    };
    if (activeMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activeMenuId]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    question: string;
    answer: string;
    category: string;
    content_scope: ContentScope;
    target_roles: TargetRole[];
    content_type: ContentType;
    display_context: DisplayContext;
    needs_review: boolean;
    sop_title: string;
    sop_url: string;
    is_published: boolean;
    order_index: number;
  }>({
    question: "",
    answer: "",
    category: "Absensi",
    content_scope: "company",
    target_roles: ["company_owner_admin", "manager", "employee"],
    content_type: "faq",
    display_context: "help_center",
    needs_review: false,
    sop_title: "",
    sop_url: "",
    is_published: true,
    order_index: 0,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Muat daftar kategori
  useEffect(() => {
    getFaqCategories().then((cats) => {
      setCategories(cats);
    });
  }, []);

  // Muat data FAQ perusahaan
  const fetchFaqs = useCallback(async () => {
    if (!activeCompany?.id) return;
    setIsLoading(true);
    try {
      const data = await getManageFaqs({
        scope: "company",
        status: statusFilter,
        search: search.trim() || undefined,
        category: selectedCategory !== "Semua" ? selectedCategory : undefined,
        content_scope: contentScopeFilter !== "all" ? contentScopeFilter : undefined,
        target_role: targetRoleFilter !== "all" ? targetRoleFilter : undefined,
        content_type: contentTypeFilter !== "all" ? contentTypeFilter : undefined,
        display_context: displayContextFilter !== "all" ? displayContextFilter : undefined,
        needs_review: needsReviewFilter !== "all" ? needsReviewFilter : undefined,
      });
      setFaqs(data);
    } catch (err: any) {
      console.error("Gagal memuat FAQ perusahaan:", err);
      showAlert({
        title: "Gagal Memuat FAQ",
        message: err.message || "Terjadi kesalahan saat memuat data FAQ perusahaan.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    activeCompany?.id,
    statusFilter,
    search,
    selectedCategory,
    contentScopeFilter,
    targetRoleFilter,
    contentTypeFilter,
    displayContextFilter,
    needsReviewFilter,
    showAlert,
  ]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Urutkan FAQ secara alfabetis (A-Z) berdasarkan judul pertanyaan
  const sortedFaqs = useMemo(() => {
    return [...faqs].sort((a, b) => {
      const cmp = a.question.localeCompare(b.question, "id", { sensitivity: "base" });
      if (cmp !== 0) return cmp;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [faqs]);

  // Buka Modal Tambah
  const handleOpenAdd = () => {
    setEditingFaq(null);
    setFormData({
      question: "",
      answer: "",
      category: categories.includes("Absensi") ? "Absensi" : categories[0] || "Umum",
      content_scope: "company",
      target_roles: ["company_owner_admin", "manager", "employee"],
      content_type: "faq",
      display_context: "help_center",
      needs_review: false,
      sop_title: "",
      sop_url: "",
      is_published: true,
      order_index: faqs.length,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Buka Modal Edit
  const handleOpenEdit = (faq: FaqItem) => {
    setEditingFaq(faq);
    
    // Fallback konservatif untuk data lama yang belum terklasifikasi
    const defaultRoles: TargetRole[] =
      faq.target_roles && faq.target_roles.length > 0
        ? faq.target_roles
        : ["company_owner_admin", "manager", "employee"];

    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "Umum",
      content_scope: faq.content_scope || "company",
      target_roles: defaultRoles,
      content_type: faq.content_type || (faq.sop_url ? "sop_guide" : "faq"),
      display_context: faq.display_context || "help_center",
      needs_review: faq.needs_review ?? false,
      sop_title: faq.sop_title || "",
      sop_url: faq.sop_url || "",
      is_published: faq.is_published,
      order_index: faq.order_index || 0,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Toggle Publikasi Cepat
  const handleTogglePublish = async (faq: FaqItem) => {
    const newStatus = !faq.is_published;
    try {
      await updateFaq(faq.id, { is_published: newStatus });
      setFaqs((prev) =>
        prev.map((item) => (item.id === faq.id ? { ...item, is_published: newStatus } : item))
      );
    } catch (err: any) {
      showAlert({
        title: "Gagal Mengubah Status",
        message: err.message || "Gagal memperbarui status publikasi FAQ.",
        type: "error",
      });
    }
  };

  // Toggle Status Perlu Ditinjau
  const handleToggleNeedsReview = async (faq: FaqItem) => {
    const newReview = !faq.needs_review;
    try {
      await updateFaq(faq.id, { needs_review: newReview });
      setFaqs((prev) =>
        prev.map((item) => (item.id === faq.id ? { ...item, needs_review: newReview } : item))
      );
      showAlert({
        title: newReview ? "Ditandai Perlu Ditinjau" : "Selesai Ditinjau",
        message: newReview
          ? "Konten ini berhasil ditandai memerlukan peninjauan admin."
          : "Status peninjauan konten berhasil diselesaikan.",
        type: "success",
      });
    } catch (err: any) {
      showAlert({
        title: "Gagal Memperbarui",
        message: err.message || "Gagal mengubah status peninjauan.",
        type: "error",
      });
    }
  };

  // Hapus FAQ
  const handleDelete = async (faq: FaqItem) => {
    const confirmed = await showConfirm({
      title: "Hapus FAQ Perusahaan",
      message: `Apakah Anda yakin ingin menghapus pertanyaan "${faq.question}"? Karyawan perusahaan tidak akan dapat melihat FAQ ini lagi.`,
      confirmText: "Hapus",
      cancelText: "Batal",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      await deleteFaq(faq.id);
      setFaqs((prev) => prev.filter((item) => item.id !== faq.id));
      showAlert({
        title: "Berhasil Dihapus",
        message: "FAQ perusahaan telah berhasil dihapus.",
        type: "success",
      });
    } catch (err: any) {
      showAlert({
        title: "Gagal Menghapus",
        message: err.message || "Terjadi kesalahan saat menghapus FAQ.",
        type: "error",
      });
    }
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.question.trim() || formData.question.trim().length < 3) {
      errors.question = "Pertanyaan wajib diisi minimal 3 karakter";
    }
    if (!formData.answer.trim() || formData.answer.trim().length < 5) {
      errors.answer = "Jawaban wajib diisi minimal 5 karakter";
    }
    if (!formData.category.trim()) {
      errors.category = "Kategori / Topik wajib dipilih";
    }
    if (formData.target_roles.length === 0) {
      errors.target_roles = "Pilih minimal satu role target";
    }

    if (formData.sop_url && formData.sop_url.trim()) {
      try {
        const parsed = new URL(formData.sop_url.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) {
          errors.sop_url = "URL harus diawali dengan http:// atau https://";
        }
      } catch {
        errors.sop_url = "Format URL SOP tidak valid (contoh: https://drive.google.com/...)";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    const payload: FaqPayload = {
      question: formData.question.trim(),
      answer: formData.answer.trim(),
      category: formData.category.trim(),
      scope: "company",
      content_scope: formData.content_scope,
      target_roles: formData.target_roles,
      content_type: formData.content_type,
      display_context: formData.display_context,
      needs_review: formData.needs_review,
      sop_title: formData.sop_title.trim() || null,
      sop_url: formData.sop_url.trim() || null,
      is_published: formData.is_published,
      order_index: Number(formData.order_index) || 0,
    };

    try {
      if (editingFaq) {
        const updated = await updateFaq(editingFaq.id, payload);
        setFaqs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        showAlert({
          title: "Berhasil Diperbarui",
          message: "FAQ perusahaan berhasil diperbarui.",
          type: "success",
        });
      } else {
        const created = await createFaq(payload);
        setFaqs((prev) => [created, ...prev]);
        showAlert({
          title: "Berhasil Ditambahkan",
          message: "FAQ perusahaan baru berhasil disimpan.",
          type: "success",
        });
      }
      setIsModalOpen(false);
      getFaqCategories().then(setCategories);
    } catch (err: any) {
      showAlert({
        title: "Gagal Menyimpan FAQ",
        message: err.message || "Terjadi kesalahan saat menyimpan FAQ.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle role helper
  const handleToggleRole = (role: TargetRole) => {
    setFormData((prev) => {
      const exists = prev.target_roles.includes(role);
      const nextRoles = exists
        ? prev.target_roles.filter((r) => r !== role)
        : [...prev.target_roles, role];
      return { ...prev, target_roles: nextRoles };
    });
  };

  const handleSelectAllRoles = () => {
    const companyRoles: TargetRole[] = ["company_owner_admin", "manager", "employee"];
    const allSelected = companyRoles.every((r) => formData.target_roles.includes(r));
    setFormData((prev) => ({
      ...prev,
      target_roles: allSelected ? ["employee"] : companyRoles,
    }));
  };

  const stats = useMemo(() => {
    const total = faqs.length;
    const published = faqs.filter((f) => f.is_published).length;
    const drafts = total - published;
    const needsReview = faqs.filter((f) => f.needs_review).length;
    return { total, published, drafts, needsReview };
  }, [faqs]);

  const hasActiveFilters =
    search !== "" ||
    selectedCategory !== "Semua" ||
    statusFilter !== "all" ||
    contentScopeFilter !== "all" ||
    targetRoleFilter !== "all" ||
    contentTypeFilter !== "all" ||
    displayContextFilter !== "all" ||
    needsReviewFilter !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("Semua");
    setStatusFilter("all");
    setContentScopeFilter("all");
    setTargetRoleFilter("all");
    setContentTypeFilter("all");
    setDisplayContextFilter("all");
    setNeedsReviewFilter("all");
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-20">
      {/* TopBar Header */}
      <TopBar
        title="FAQ & SOP Perusahaan"
        onBack={() => router.push("/admin/dashboard")}
      />

      <div className="px-5 py-5 flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Banner Info Perusahaan */}
        <div className="bg-gradient-to-br from-[#1E4738] via-[#245241] to-[#2D5A3F] rounded-[24px] p-5 text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-semibold text-white/90 w-fit">
              <Building2 className="w-3.5 h-3.5 text-[#7FAF8B]" />
              {activeCompany?.name || "Perusahaan"}
            </div>
            <h1 className="text-[19px] font-extrabold tracking-tight mt-1">
              Pusat Panduan & FAQ
            </h1>
            <p className="text-white/80 text-[12px] leading-relaxed">
              Kelola tata tertib, solusi troubleshooting, dan dokumen SOP operasional untuk anggota perusahaan Anda.
            </p>

            <button
              onClick={handleOpenAdd}
              className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-[#1E4738] font-bold text-[13px] rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-sm w-full cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Konten FAQ / SOP</span>
            </button>
          </div>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full pointer-events-none blur-sm" />
        </div>

        {/* Ringkasan Status */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-[16px] p-2.5 border border-[#E5E7EB] text-center shadow-2xs">
            <span className="text-[10px] text-[#6B7280] font-medium block">Total</span>
            <span className="text-[16px] font-extrabold text-[#111827]">{stats.total}</span>
          </div>
          <div className="bg-white rounded-[16px] p-2.5 border border-[#E5E7EB] text-center shadow-2xs">
            <span className="text-[10px] text-[#166534] font-medium block">Terbit</span>
            <span className="text-[16px] font-extrabold text-[#166534]">{stats.published}</span>
          </div>
          <div className="bg-white rounded-[16px] p-2.5 border border-[#E5E7EB] text-center shadow-2xs">
            <span className="text-[10px] text-[#B45309] font-medium block">Draft</span>
            <span className="text-[16px] font-extrabold text-[#B45309]">{stats.drafts}</span>
          </div>
          <div 
            onClick={() => setNeedsReviewFilter((prev) => (prev === "true" ? "all" : "true"))}
            className={`rounded-[16px] p-2.5 border text-center shadow-2xs cursor-pointer transition-all ${
              needsReviewFilter === "true"
                ? "bg-amber-100 border-amber-300 ring-2 ring-amber-400"
                : "bg-white border-[#E5E7EB] hover:bg-amber-50/50"
            }`}
            title="Klik untuk filter konten yang perlu ditinjau"
          >
            <span className="text-[10px] text-amber-700 font-semibold block flex items-center justify-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>Tinjau</span>
            </span>
            <span className="text-[16px] font-extrabold text-amber-700">{stats.needsReview}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#7d998c] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pertanyaan, isi panduan, atau SOP..."
            className="w-full bg-white rounded-2xl pl-10 pr-10 py-3 text-[13px] border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#356E3B]/30 focus:border-[#356E3B] transition-all text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.02)] placeholder:text-[#9CA3AF]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col gap-2 bg-white p-3 rounded-2xl border border-[#E5E7EB] shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#356E3B]" />
              Filter Metadata
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-[#356E3B] hover:underline font-semibold cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Filter Kategori */}
            <div>
              <label className="block text-[10px] text-gray-500 font-medium mb-1">Kategori / Topik</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[11.5px] font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
              >
                <option value="Semua">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-[10px] text-gray-500 font-medium mb-1">Status Publikasi</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[11.5px] font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
              >
                <option value="all">Semua Status</option>
                <option value="published">Terbit (Publik)</option>
                <option value="draft">Draft (Tersimpan)</option>
              </select>
            </div>

            {/* Filter Jenis Konten */}
            <div>
              <label className="block text-[10px] text-gray-500 font-medium mb-1">Jenis Konten</label>
              <select
                value={contentTypeFilter}
                onChange={(e) => setContentTypeFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[11.5px] font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
              >
                <option value="all">Semua Jenis</option>
                <option value="faq">FAQ</option>
                <option value="sop_guide">SOP & Panduan</option>
                <option value="troubleshooting">Troubleshooting</option>
                <option value="tips_best_practice">Tips & Praktik</option>
              </select>
            </div>

            {/* Filter Role Target */}
            <div>
              <label className="block text-[10px] text-gray-500 font-medium mb-1">Role Target</label>
              <select
                value={targetRoleFilter}
                onChange={(e) => setTargetRoleFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[11.5px] font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
              >
                <option value="all">Semua Role</option>
                <option value="employee">Karyawan</option>
                <option value="manager">Manager</option>
                <option value="company_owner_admin">Owner / Admin</option>
              </select>
            </div>

            {/* Filter Display Context */}
            <div>
              <label className="block text-[10px] text-gray-500 font-medium mb-1">Display Context</label>
              <select
                value={displayContextFilter}
                onChange={(e) => setDisplayContextFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[11.5px] font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
              >
                <option value="all">Semua Tampilan</option>
                <option value="help_center">Help Center</option>
                <option value="login">Halaman Login</option>
                <option value="both">Keduanya (Login & Help)</option>
              </select>
            </div>

            {/* Filter Scope */}
            <div>
              <label className="block text-[10px] text-gray-500 font-medium mb-1">Scope Konten</label>
              <select
                value={contentScopeFilter}
                onChange={(e) => setContentScopeFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[11.5px] font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
              >
                <option value="all">Semua Scope</option>
                <option value="company">Perusahaan</option>
                <option value="user">Pengguna</option>
              </select>
            </div>
          </div>
        </div>

        {/* Daftar FAQ Cards */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-8 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-7 h-7 border-3 border-[#356E3B] border-t-transparent rounded-full animate-spin" />
              <span className="text-[12px] text-gray-500 font-medium">Memuat FAQ perusahaan...</span>
            </div>
          ) : sortedFaqs.length === 0 ? (
            <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-8 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#356E3B] flex items-center justify-center">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-[#111827]">Tidak Ada Konten FAQ yang Cocok</h3>
                <p className="text-[12px] text-gray-500 max-w-[240px] mt-1">
                  {hasActiveFilters
                    ? "Coba ubah kata pencarian atau atur ulang filter metadata Anda."
                    : "Tambahkan pertanyaan umum dan panduan SOP untuk membantu karyawan Anda bekerja lebih teratur."}
                </p>
              </div>
              {hasActiveFilters ? (
                <button
                  onClick={handleResetFilters}
                  className="mt-1 px-4 py-2 bg-gray-100 text-gray-700 text-[12px] font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Reset Filter
                </button>
              ) : (
                <button
                  onClick={handleOpenAdd}
                  className="mt-1 px-4 py-2 bg-[#356E3B] text-white text-[12px] font-bold rounded-xl hover:bg-[#2A582F] transition-colors cursor-pointer"
                >
                  Tambah FAQ Sekarang
                </button>
              )}
            </div>
          ) : (
            sortedFaqs.map((faq, index) => {
              const isExpanded = expandedId === faq.id;
              const isNearBottom = index >= sortedFaqs.length - 2 && sortedFaqs.length > 2;
              const typeBadge = getContentTypeBadge(faq.content_type);
              const scopeBadge = getContentScopeBadge(faq.content_scope);
              const dcBadge = getDisplayContextBadge(faq.display_context);

              return (
                <div
                  key={faq.id}
                  className={`bg-white rounded-[20px] border border-[#E5E7EB] shadow-2xs transition-all relative ${
                    activeMenuId === faq.id ? "z-30" : "z-0"
                  }`}
                >
                  <div className="p-4 flex flex-col gap-2.5">
                    {/* Header Badges & MoreVertical */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Kategori Badge */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF5F0] text-[#1E4738] border border-[#1E4738]/10">
                          {faq.category}
                        </span>

                        {/* Jenis Konten Badge */}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeBadge.className}`}>
                          {typeBadge.label}
                        </span>

                        {/* Display Context Badge jika login atau both */}
                        {faq.display_context && faq.display_context !== "help_center" && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${dcBadge.className}`}>
                            {dcBadge.label}
                          </span>
                        )}

                        {/* Status Terbit/Draft */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                            faq.is_published
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {faq.is_published ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Terbit</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-2.5 h-2.5" />
                              <span>Draft</span>
                            </>
                          )}
                        </span>

                        {/* Needs Review Badge */}
                        {faq.needs_review && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Perlu Ditinjau</span>
                          </span>
                        )}

                        {faq.sop_url && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                            <FileCheck className="w-2.5 h-2.5" />
                            <span>SOP</span>
                          </span>
                        )}
                      </div>

                      {/* More Action Menu (Titik Tiga Vertikal) */}
                      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === faq.id ? null : faq.id);
                          }}
                          className="w-7 h-7 rounded-full hover:bg-gray-100 active:scale-95 text-gray-500 hover:text-[#1E4738] flex items-center justify-center transition-all cursor-pointer"
                          aria-label="Opsi FAQ"
                          title="Opsi FAQ"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === faq.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                              }} 
                            />
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute right-0 ${
                                isNearBottom ? "bottom-full mb-1" : "top-full mt-1"
                              } w-48 bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.18),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-[#E5E7EB] py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150`}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleTogglePublish(faq);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                              >
                                {faq.is_published ? (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Jadikan Draft</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Terbitkan ke Publik</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleToggleNeedsReview(faq);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                <span>{faq.needs_review ? "Tandai Selesai Ditinjau" : "Tandai Perlu Ditinjau"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleOpenEdit(faq);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Edit Konten & Metadata</span>
                              </button>

                              <div className="h-[1px] bg-gray-100 my-1" />

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleDelete(faq);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus FAQ</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Judul Pertanyaan (Elemen Utama) */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                      className="cursor-pointer group flex items-start justify-between gap-2"
                    >
                      <h3 className="text-[14px] font-bold text-[#111827] group-hover:text-[#1E4738] transition-colors leading-snug">
                        {faq.question}
                      </h3>
                      <button
                        type="button"
                        className="text-gray-400 group-hover:text-gray-600 p-0.5 shrink-0 mt-0.5"
                        aria-label="Lihat detail jawaban"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    {/* Target Roles Mini Info */}
                    {faq.target_roles && faq.target_roles.length > 0 && (
                      <div className="flex items-center gap-1 text-[10.5px] text-gray-500">
                        <Users className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">
                          Target: {faq.target_roles.map((r) => TARGET_ROLE_OPTIONS.find((opt) => opt.value === r)?.label || r).join(", ")}
                        </span>
                      </div>
                    )}

                    {/* Dokumen SOP Link */}
                    {faq.sop_url && (
                      <div className="pt-0.5">
                        <a
                          href={faq.sop_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E4738] bg-[#EEF5F0] hover:bg-[#1E4738]/10 px-2.5 py-1 rounded-lg transition-colors border border-[#1E4738]/15"
                        >
                          <FileText className="w-3 h-3 text-[#356E3B]" />
                          <span className="truncate max-w-[200px]">{faq.sop_title || "Lihat Dokumen SOP"}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      </div>
                    )}

                    {/* Jawaban yang Diperluas */}
                    {isExpanded && (
                      <div className="pt-2 mt-1 border-t border-gray-100 text-[#4B5563] text-[12.5px] animate-in fade-in duration-200">
                        <FaqAnswerContent content={faq.answer} className="text-[#4B5563] text-[12.5px]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Tambah / Edit FAQ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[28px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EEF5F0] text-[#1E4738] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900">
                    {editingFaq ? "Edit FAQ & SOP Perusahaan" : "Tambah FAQ & SOP Perusahaan"}
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    {activeCompany?.name || "Perusahaan"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-130px)] scrollbar-thin">
              {/* Pertanyaan */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Judul Pertanyaan / Topik *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, question: e.target.value }))
                  }
                  placeholder="Contoh: Apa yang harus dilakukan jika GPS di luar radius kantor?"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#356E3B]/20 focus:border-[#356E3B]"
                />
                {formErrors.question && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.question}</p>
                )}
              </div>

              {/* Kategori / Topik Combobox dengan Pencarian & Tambah Baru */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Topik / Kategori *
                </label>
                <FaqCategoryCombobox
                  categories={categories}
                  selectedCategory={formData.category}
                  onSelectCategory={(cat) => setFormData((prev) => ({ ...prev, category: cat }))}
                />
                {formErrors.category && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.category}</p>
                )}
              </div>

              {/* Grid Metadata: Scope, Jenis Konten, Display Context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl">
                {/* Scope */}
                <div>
                  <label className="block text-[10.5px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Scope Konten
                  </label>
                  <select
                    value={formData.content_scope}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, content_scope: e.target.value as ContentScope }))
                    }
                    className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
                  >
                    <option value="company">Perusahaan (Internal)</option>
                    <option value="user">Pengguna (Aplikasi)</option>
                  </select>
                </div>

                {/* Jenis Konten */}
                <div>
                  <label className="block text-[10.5px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Jenis Konten
                  </label>
                  <select
                    value={formData.content_type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, content_type: e.target.value as ContentType }))
                    }
                    className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
                  >
                    {CONTENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Display Context */}
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Konteks Tampilan (Display Context)
                  </label>
                  <select
                    value={formData.display_context}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, display_context: e.target.value as DisplayContext }))
                    }
                    className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
                  >
                    {DISPLAY_CONTEXT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role Target (Multi-Select) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Role Target Anggota *
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllRoles}
                    className="text-[11px] font-semibold text-[#356E3B] hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { role: "company_owner_admin" as TargetRole, label: "Owner / Admin" },
                    { role: "manager" as TargetRole, label: "Manager" },
                    { role: "employee" as TargetRole, label: "Karyawan" },
                  ].map((item) => {
                    const isChecked = formData.target_roles.includes(item.role);
                    return (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => handleToggleRole(item.role)}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isChecked
                            ? "bg-[#EEF5F0] border-[#356E3B] text-[#1E4738] shadow-2xs"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border ${
                            isChecked
                              ? "bg-[#356E3B] border-[#356E3B] text-white"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                {formErrors.target_roles && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.target_roles}</p>
                )}
              </div>

              {/* Jawaban Lengkap (TipTap Rich-Text Editor) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Isi Jawaban / Panduan Lengkap *
                </label>
                <FaqRichEditor
                  value={formData.answer}
                  onChange={(html) => setFormData((prev) => ({ ...prev, answer: html }))}
                  placeholder="Tuliskan petunjuk operasional atau jawaban resmi di sini..."
                />
                {formErrors.answer && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.answer}</p>
                )}
              </div>

              {/* Dokumen SOP Box */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#1E4738]" />
                  <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">
                    Tautan Dokumen SOP (Opsional)
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                    Judul Dokumen SOP
                  </label>
                  <input
                    type="text"
                    value={formData.sop_title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sop_title: e.target.value }))
                    }
                    placeholder="Contoh: SOP Dinas Lapangan.pdf"
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                    URL Dokumen (Google Drive / Cloud PDF)
                  </label>
                  <input
                    type="url"
                    value={formData.sop_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sop_url: e.target.value }))
                    }
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
                  />
                  {formErrors.sop_url && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{formErrors.sop_url}</p>
                  )}
                </div>
              </div>

              {/* Status Publikasi & Review Checkbox */}
              <div className="flex flex-col gap-2 pt-1">
                {/* Status Publikasi Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100/70 transition-colors">
                  <div>
                    <span className="block text-xs font-bold text-gray-800">
                      Terbitkan Langsung ke Publik
                    </span>
                    <span className="block text-[11px] text-gray-500">
                      Jika aktif, FAQ akan langsung dapat dibaca oleh karyawan perusahaan.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, is_published: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#356E3B] rounded border-gray-300 focus:ring-[#356E3B]"
                  />
                </label>

                {/* Status Perlu Ditinjau Checkbox */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-200 cursor-pointer hover:bg-amber-100/50 transition-colors">
                  <div>
                    <span className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Tandai Perlu Ditinjau Ulang (Review)
                    </span>
                    <span className="block text-[11px] text-amber-700/80">
                      Beri tanda khusus jika konten atau metadata masih memerlukan peninjauan lanjutan oleh admin.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.needs_review}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, needs_review: e.target.checked }))
                    }
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                  />
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#356E3B] text-white hover:bg-[#2A582F] active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingFaq ? "Simpan Perubahan" : "Terbitkan FAQ"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
