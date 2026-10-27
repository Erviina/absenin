"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Layers,
  RotateCw,
  X,
  FileCheck,
  Globe,
  Shield,
  MoreVertical,
  ChevronDown,
  Users,
  AlertTriangle,
  Filter,
  Check,
} from "lucide-react";
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
import { useDialog } from "@/context/DialogContext";
import { FaqRichEditor } from "@/components/FaqRichEditor";
import { FaqAnswerContent } from "@/components/FaqAnswerContent";
import { FaqCategoryCombobox } from "@/components/FaqCategoryCombobox";

export default function PlatformAdminFaqPage() {
  const { showConfirm, showAlert } = useDialog();

  const [activeTab, setActiveTab] = useState<"global" | "platform_admin">("global");
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
    scope: "global" | "platform_admin";
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
    category: "Akun",
    scope: "global",
    content_scope: "user",
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

  // Muat kategori
  useEffect(() => {
    getFaqCategories().then((cats) => {
      setCategories(cats);
    });
  }, []);

  // Muat FAQ manajemen
  const fetchFaqs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getManageFaqs({
        scope: activeTab,
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
      console.error("Gagal memuat FAQ:", err);
      showAlert({
        title: "Gagal Memuat FAQ",
        message: err.message || "Terjadi kesalahan saat memuat data FAQ manajemen.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    activeTab,
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
    const initialContentScope: ContentScope = activeTab === "platform_admin" ? "platform" : "user";
    const initialRoles: TargetRole[] =
      activeTab === "platform_admin"
        ? ["platform_admin"]
        : ["company_owner_admin", "manager", "employee"];

    setFormData({
      question: "",
      answer: "",
      category: categories.includes("Akun") ? "Akun" : categories[0] || "Umum",
      scope: activeTab,
      content_scope: initialContentScope,
      target_roles: initialRoles,
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
        : faq.scope === "platform_admin"
        ? ["platform_admin"]
        : ["company_owner_admin", "manager", "employee"];

    const defaultContentScope: ContentScope =
      faq.content_scope || (faq.scope === "platform_admin" ? "platform" : "company");

    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "Umum",
      scope: faq.scope === "platform_admin" ? "platform_admin" : "global",
      content_scope: defaultContentScope,
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

  // Toggle Publikasi
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
        message: err.message || "Gagal mengubah status publikasi FAQ.",
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
          ? "Konten ini berhasil ditandai memerlukan peninjauan Platform Admin."
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
      title: "Hapus FAQ Platform",
      message: `Apakah Anda yakin ingin menghapus pertanyaan "${faq.question}"? Tindakan ini akan menghapus FAQ dari Pusat Bantuan pengguna.`,
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
        message: "FAQ berhasil dihapus.",
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
      scope: formData.scope,
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
          message: "FAQ berhasil diperbarui.",
          type: "success",
        });
      } else {
        const created = await createFaq(payload);
        setFaqs((prev) => [created, ...prev]);
        showAlert({
          title: "Berhasil Dibuat",
          message: "FAQ baru berhasil ditambahkan.",
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
    const allRoles: TargetRole[] = ["platform_admin", "company_owner_admin", "manager", "employee"];
    const allSelected = allRoles.every((r) => formData.target_roles.includes(r));
    setFormData((prev) => ({
      ...prev,
      target_roles: allSelected ? ["employee"] : allRoles,
    }));
  };

  const stats = useMemo(() => {
    const total = faqs.length;
    const published = faqs.filter((f) => f.is_published).length;
    const drafts = total - published;
    const needsReview = faqs.filter((f) => f.needs_review).length;
    const withSop = faqs.filter((f) => f.sop_url).length;
    return { total, published, drafts, needsReview, withSop };
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
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1E3F2B] uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Pusat Bantuan & Knowledge Base</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Pengelolaan FAQ & SOP Platform
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola bank pertanyaan, panduan troubleshooting, dan dokumen SOP global maupun internal platform.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E3F2B] text-white rounded-xl text-sm font-semibold hover:bg-[#163021] active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Tambah Konten FAQ / SOP</span>
        </button>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#1E3F2B] flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total FAQ</p>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Status Terbit</p>
            <p className="text-xl font-bold text-blue-700">{stats.published}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Draft (Tersimpan)</p>
            <p className="text-xl font-bold text-amber-700">{stats.drafts}</p>
          </div>
        </div>

        <div 
          onClick={() => setNeedsReviewFilter((prev) => (prev === "true" ? "all" : "true"))}
          className={`rounded-2xl p-4 border shadow-xs flex items-center gap-3 cursor-pointer transition-all ${
            needsReviewFilter === "true"
              ? "bg-amber-100/70 border-amber-300 ring-2 ring-amber-400"
              : "bg-white border-gray-200/80 hover:bg-amber-50/40"
          }`}
          title="Klik untuk filter konten yang perlu ditinjau"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-800">Perlu Ditinjau</p>
            <p className="text-xl font-bold text-amber-800">{stats.needsReview}</p>
          </div>
        </div>
      </div>

      {/* Main Tabs (Global vs Platform Admin) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-2 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("global")}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "global"
                ? "bg-[#1E3F2B] text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>FAQ Global (Pengguna & Publik)</span>
          </button>

          <button
            onClick={() => setActiveTab("platform_admin")}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "platform_admin"
                ? "bg-[#1E3F2B] text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>FAQ Khusus Platform Admin</span>
          </button>
        </div>

        <button
          onClick={fetchFaqs}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          title="Muat ulang data FAQ"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#1E3F2B]" : ""}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-col gap-3">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pertanyaan, jawaban, atau judul dokumen SOP..."
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 hover:bg-gray-100/60 focus:bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E3F2B]/20 focus:border-[#1E3F2B] transition-all text-gray-900 placeholder:text-gray-400"
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

        {/* Filter Dropdown Controls */}
        <div className="flex items-center justify-between text-xs font-bold text-gray-700 pt-1">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#1E3F2B]" />
            Filter Metadata
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-[#1E3F2B] hover:underline font-semibold cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {/* Category Filter */}
          <div>
            <label className="block text-[10px] text-gray-500 font-medium mb-1">Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#1E3F2B]"
            >
              <option value="Semua">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] text-gray-500 font-medium mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#1E3F2B]"
            >
              <option value="all">Semua Status</option>
              <option value="published">Terbit (Publik)</option>
              <option value="draft">Draft (Tersimpan)</option>
            </select>
          </div>

          {/* Scope Filter */}
          <div>
            <label className="block text-[10px] text-gray-500 font-medium mb-1">Scope Konten</label>
            <select
              value={contentScopeFilter}
              onChange={(e) => setContentScopeFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#1E3F2B]"
            >
              <option value="all">Semua Scope</option>
              <option value="platform">Platform</option>
              <option value="company">Perusahaan</option>
              <option value="user">Pengguna</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-[10px] text-gray-500 font-medium mb-1">Role Target</label>
            <select
              value={targetRoleFilter}
              onChange={(e) => setTargetRoleFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#1E3F2B]"
            >
              <option value="all">Semua Role</option>
              <option value="platform_admin">Platform Admin</option>
              <option value="company_owner_admin">Owner/Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Karyawan</option>
            </select>
          </div>

          {/* Content Type Filter */}
          <div>
            <label className="block text-[10px] text-gray-500 font-medium mb-1">Jenis Konten</label>
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#1E3F2B]"
            >
              <option value="all">Semua Jenis</option>
              <option value="faq">FAQ</option>
              <option value="sop_guide">SOP & Panduan</option>
              <option value="troubleshooting">Troubleshooting</option>
              <option value="tips_best_practice">Tips & Praktik</option>
            </select>
          </div>

          {/* Display Context Filter */}
          <div>
            <label className="block text-[10px] text-gray-500 font-medium mb-1">Display Context</label>
            <select
              value={displayContextFilter}
              onChange={(e) => setDisplayContextFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#1E3F2B]"
            >
              <option value="all">Semua Tampilan</option>
              <option value="help_center">Help Center</option>
              <option value="login">Halaman Login</option>
              <option value="both">Keduanya</option>
            </select>
          </div>
        </div>
      </div>

      {/* FAQ List Content */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-12 flex flex-col items-center justify-center gap-3 text-gray-500 shadow-2xs" role="status" aria-live="polite">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E3F2B]" />
            <p className="text-sm font-medium">Memuat data FAQ...</p>
          </div>
        ) : sortedFaqs.length === 0 ? (
          <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-12 text-center flex flex-col items-center justify-center gap-3 shadow-2xs">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <HelpCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Belum Ada FAQ Ditemukan</h3>
              <p className="text-sm text-gray-500 max-w-sm mt-0.5">
                {hasActiveFilters
                  ? "Tidak ada FAQ yang cocok dengan filter yang dipilih. Coba atur ulang pencarian atau filter metadata."
                  : `Mulai dengan menambahkan FAQ baru untuk scope ${
                      activeTab === "global" ? "Global" : "Platform Admin"
                    }.`}
              </p>
            </div>
            {hasActiveFilters ? (
              <button
                onClick={handleResetFilters}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all cursor-pointer"
              >
                Reset Filter
              </button>
            ) : (
              <button
                onClick={handleOpenAdd}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#1E3F2B] text-white rounded-xl text-sm font-semibold hover:bg-[#163021] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah FAQ Sekarang</span>
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
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                        {faq.category}
                      </span>

                      {/* Scope Konten Badge */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${scopeBadge.className}`}>
                        {scopeBadge.label}
                      </span>

                      {/* Jenis Konten Badge */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeBadge.className}`}>
                        {typeBadge.label}
                      </span>

                      {/* Display Context Badge jika bukan default */}
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
                        className="w-7 h-7 rounded-full hover:bg-gray-100 active:scale-95 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-all cursor-pointer"
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
                    <h3 className="text-[14px] font-bold text-gray-900 group-hover:text-[#1E3F2B] transition-colors leading-snug">
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
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
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
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 px-2.5 py-1 rounded-lg transition-colors border border-blue-200"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span className="truncate max-w-xs">{faq.sop_title || "Lihat Dokumen SOP"}</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </a>
                    </div>
                  )}

                  {/* Jawaban yang Diperluas */}
                  {isExpanded && (
                    <div className="pt-2 mt-1 border-t border-gray-100 text-gray-700 text-xs animate-in fade-in duration-200">
                      <FaqAnswerContent content={faq.answer} className="text-gray-700 text-xs" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tambah / Edit FAQ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[28px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF5F0] text-[#1E3F2B] flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {editingFaq ? "Edit FAQ & SOP Platform" : "Tambah FAQ & SOP Baru"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Konfigurasikan judul pertanyaan, panduan, dan metadata otorisasi
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-130px)] scrollbar-thin">
              {/* Pertanyaan */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Judul Pertanyaan / Topik *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, question: e.target.value }))
                  }
                  placeholder="Contoh: Bagaimana hak akses Platform Admin bekerja dan siapa yang dapat masuk?"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3F2B]/20 focus:border-[#1E3F2B]"
                />
                {formErrors.question && (
                  <p className="text-xs text-rose-600 mt-1">{formErrors.question}</p>
                )}
              </div>

              {/* Kategori Combobox */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Topik / Kategori *
                </label>
                <FaqCategoryCombobox
                  categories={categories}
                  selectedCategory={formData.category}
                  onSelectCategory={(cat) => setFormData((prev) => ({ ...prev, category: cat }))}
                />
                {formErrors.category && (
                  <p className="text-xs text-rose-600 mt-1">{formErrors.category}</p>
                )}
              </div>

              {/* Grid Metadata: Scope, Jenis Konten, Display Context */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50/70 border border-gray-200/80 rounded-2xl">
                {/* Scope */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Scope Konten
                  </label>
                  <select
                    value={formData.content_scope}
                    onChange={(e) => {
                      const newScope = e.target.value as ContentScope;
                      setFormData((prev) => ({
                        ...prev,
                        content_scope: newScope,
                        scope: newScope === "platform" ? "platform_admin" : "global",
                      }));
                    }}
                    className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1E3F2B]"
                  >
                    <option value="platform">Platform (Admin)</option>
                    <option value="company">Perusahaan</option>
                    <option value="user">Pengguna (Aplikasi)</option>
                  </select>
                </div>

                {/* Jenis Konten */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Jenis Konten
                  </label>
                  <select
                    value={formData.content_type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, content_type: e.target.value as ContentType }))
                    }
                    className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1E3F2B]"
                  >
                    {CONTENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Display Context */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Display Context
                  </label>
                  <select
                    value={formData.display_context}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, display_context: e.target.value as DisplayContext }))
                    }
                    className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1E3F2B]"
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
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Role Target Pengguna *
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllRoles}
                    className="text-xs font-semibold text-[#1E3F2B] hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TARGET_ROLE_OPTIONS.map((item) => {
                    const isChecked = formData.target_roles.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleToggleRole(item.value)}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isChecked
                            ? "bg-[#EEF5F0] border-[#1E3F2B] text-[#1E3F2B] shadow-2xs"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border ${
                            isChecked
                              ? "bg-[#1E3F2B] border-[#1E3F2B] text-white"
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
                  <p className="text-xs text-rose-600 mt-1">{formErrors.target_roles}</p>
                )}
              </div>

              {/* Jawaban Lengkap (TipTap Rich-Text Editor) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Jawaban Lengkap / Panduan *
                </label>
                <FaqRichEditor
                  value={formData.answer}
                  onChange={(html) => setFormData((prev) => ({ ...prev, answer: html }))}
                  placeholder="Tuliskan penjelasan dan langkah-langkah solutif di sini..."
                />
                {formErrors.answer && (
                  <p className="text-xs text-rose-600 mt-1">{formErrors.answer}</p>
                )}
              </div>

              {/* SOP Section */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1E3F2B]" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Dokumen SOP Terkait (Opsional)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Judul Dokumen SOP
                    </label>
                    <input
                      type="text"
                      value={formData.sop_title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, sop_title: e.target.value }))
                      }
                      placeholder="Contoh: SOP Presensi Lapangan 2026.pdf"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1E3F2B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      URL Dokumen (PDF / Google Drive)
                    </label>
                    <input
                      type="url"
                      value={formData.sop_url}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, sop_url: e.target.value }))
                      }
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1E3F2B]"
                    />
                  </div>
                </div>
                {formErrors.sop_url && (
                  <p className="text-xs text-rose-600">{formErrors.sop_url}</p>
                )}
              </div>

              {/* Status Publikasi & Review Checkbox */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                {/* Status Publikasi Toggle */}
                <label className="flex-1 flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100/70 transition-colors">
                  <div>
                    <span className="block text-xs font-bold text-gray-800">
                      Terbitkan ke Publik
                    </span>
                    <span className="block text-[11px] text-gray-500">
                      Tampil di Pusat Bantuan
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, is_published: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#1E3F2B] rounded border-gray-300 focus:ring-[#1E3F2B]"
                  />
                </label>

                {/* Status Perlu Ditinjau Checkbox */}
                <label className="flex-1 flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-200 cursor-pointer hover:bg-amber-100/50 transition-colors">
                  <div>
                    <span className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Perlu Ditinjau Ulang
                    </span>
                    <span className="block text-[11px] text-amber-700/80">
                      Tandai butuh review lanjutan
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

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#1E3F2B] text-white text-xs font-semibold hover:bg-[#163021] transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Menyimpan..." : editingFaq ? "Simpan Perubahan" : "Terbitkan FAQ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
