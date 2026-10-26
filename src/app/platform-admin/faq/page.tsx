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
} from "lucide-react";
import {
  FaqItem,
  FaqPayload,
  getManageFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  getFaqCategories,
} from "@/lib/faqApi";
import { useDialog } from "@/context/DialogContext";
import { FaqRichEditor } from "@/components/FaqRichEditor";
import { FaqAnswerContent } from "@/components/FaqAnswerContent";

export default function PlatformAdminFaqPage() {
  const { showConfirm, showAlert } = useDialog();

  const [activeTab, setActiveTab] = useState<"global" | "platform_admin">("global");
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [search, setSearch] = useState("");
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
    customCategory: string;
    scope: "global" | "platform_admin";
    sop_title: string;
    sop_url: string;
    is_published: boolean;
    order_index: number;
  }>({
    question: "",
    answer: "",
    category: "Umum",
    customCategory: "",
    scope: "global",
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
  }, [activeTab, statusFilter, search, selectedCategory, showAlert]);

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
      category: categories[0] || "Umum",
      customCategory: "",
      scope: activeTab,
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
    const isStandardCat = categories.includes(faq.category);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: isStandardCat ? faq.category : "Lainnya",
      customCategory: isStandardCat ? "" : faq.category,
      scope: faq.scope as "global" | "platform_admin",
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

  // Hapus FAQ
  const handleDelete = async (faq: FaqItem) => {
    const confirmed = await showConfirm({
      title: "Hapus FAQ",
      message: `Apakah Anda yakin ingin menghapus FAQ "${faq.question}"? FAQ ini akan dinonaktifkan dari Pusat Bantuan.`,
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
        message: "FAQ telah berhasil dihapus dari sistem.",
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

  // Submit Modal Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.question.trim() || formData.question.trim().length < 3) {
      errors.question = "Pertanyaan wajib diisi minimal 3 karakter";
    }
    if (!formData.answer.trim() || formData.answer.trim().length < 5) {
      errors.answer = "Jawaban wajib diisi minimal 5 karakter";
    }

    const effectiveCategory =
      formData.category === "Lainnya"
        ? formData.customCategory.trim()
        : formData.category.trim();

    if (!effectiveCategory) {
      errors.category = "Kategori wajib diisi atau dipilih";
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
      category: effectiveCategory,
      scope: formData.scope,
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
          message: "FAQ berhasil disimpan dan diperbarui.",
          type: "success",
        });
      } else {
        const created = await createFaq(payload);
        setFaqs((prev) => [created, ...prev]);
        showAlert({
          title: "Berhasil Ditambahkan",
          message: "FAQ baru berhasil dibuat dan disimpan.",
          type: "success",
        });
      }
      setIsModalOpen(false);
      // Refresh daftar kategori jika ada kategori baru
      getFaqCategories().then(setCategories);
    } catch (err: any) {
      showAlert({
        title: "Gagal Menyimpan FAQ",
        message: err.message || "Terjadi kesalahan saat memproses data FAQ.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const total = faqs.length;
    const published = faqs.filter((f) => f.is_published).length;
    const drafts = total - published;
    const withSop = faqs.filter((f) => Boolean(f.sop_url)).length;
    return { total, published, drafts, withSop };
  }, [faqs]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#1E3F2B]/10 flex items-center justify-center text-[#1E3F2B]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Manajemen FAQ & Pusat Bantuan
              </h1>
              <p className="text-sm text-gray-500">
                Kelola panduan resmi, tanya-jawab, dan dokumen SOP untuk seluruh platform AbsenIn.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F2B] text-white text-sm font-semibold hover:bg-[#163021] transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Tambah FAQ Baru</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
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

        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Lampiran SOP</p>
            <p className="text-xl font-bold text-purple-700">{stats.withSop}</p>
          </div>
        </div>
      </div>

      {/* Main Tabs (Global vs Platform Admin) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-2 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("global")}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
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
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
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
      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pertanyaan, jawaban, atau dokumen SOP..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/60 focus:bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E3F2B]/20 focus:border-[#1E3F2B] transition-all text-gray-900 placeholder:text-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-48 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3F2B]/20 focus:border-[#1E3F2B]"
          >
            <option value="Semua">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full md:w-36 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3F2B]/20 focus:border-[#1E3F2B]"
          >
            <option value="all">Semua Status</option>
            <option value="published">Terbit Saja</option>
            <option value="draft">Draft Saja</option>
          </select>
        </div>
      </div>

      {/* FAQ List Content */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-12 flex flex-col items-center justify-center gap-3 text-gray-500 shadow-2xs">
            <div className="w-8 h-8 border-3 border-[#1E3F2B] border-t-transparent rounded-full animate-spin" />
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
                {search || selectedCategory !== "Semua" || statusFilter !== "all"
                  ? "Tidak ada FAQ yang cocok dengan filter yang dipilih. Coba atur ulang pencarian."
                  : `Mulai dengan menambahkan FAQ baru untuk scope ${
                      activeTab === "global" ? "Global" : "Platform Admin"
                    }.`}
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#1E3F2B] text-white rounded-xl text-sm font-semibold hover:bg-[#163021] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah FAQ Sekarang</span>
            </button>
          </div>
        ) : (
          sortedFaqs.map((faq, index) => {
            const isExpanded = expandedId === faq.id;
            const isNearBottom = index >= sortedFaqs.length - 2 && sortedFaqs.length > 2;

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
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                        {faq.category}
                      </span>

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

                      {faq.scope === "platform_admin" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          Platform Admin
                        </span>
                      )}

                      {faq.sop_url && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                          <FileCheck className="w-2.5 h-2.5" />
                          <span>SOP</span>
                        </span>
                      )}

                      {faq.author_name && (
                        <span className="text-[10px] text-gray-400">
                          Oleh: {faq.author_name}
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
                        className="w-7 h-7 rounded-full hover:bg-gray-100 active:scale-95 text-gray-500 hover:text-[#1E3F2B] flex items-center justify-center transition-all cursor-pointer"
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
                            } w-44 bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.18),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-[#E5E7EB] py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                handleTogglePublish(faq);
                              }}
                              className="w-full px-3.5 py-2 text-left text-[12.5px] font-medium text-gray-700 hover:bg-[#F4F9F6] hover:text-[#1E3F2B] flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              {faq.is_published ? (
                                <>
                                  <EyeOff className="w-4 h-4 text-amber-600" />
                                  <span>Jadikan Draft</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 text-emerald-600" />
                                  <span>Terbitkan FAQ</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                handleOpenEdit(faq);
                              }}
                              className="w-full px-3.5 py-2 text-left text-[12.5px] font-medium text-gray-700 hover:bg-[#F4F9F6] hover:text-[#1E3F2B] flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4 text-gray-500" />
                              <span>Edit FAQ</span>
                            </button>

                            <div className="h-[1px] bg-gray-100 mx-3 my-0.5" />

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                handleDelete(faq);
                              }}
                              className="w-full px-3.5 py-2 text-left text-[12.5px] font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                              <span>Hapus FAQ</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Question Title & Accordion Toggle */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                    className="cursor-pointer flex items-start justify-between gap-2 select-none group"
                  >
                    <h3 className="text-gray-900 group-hover:text-[#1E3F2B] text-[13.5px] font-bold leading-snug transition-colors">
                      {faq.question}
                    </h3>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform mt-0.5 ${
                        isExpanded ? "rotate-180 text-[#1E3F2B]" : ""
                      }`}
                    />
                  </div>

                  {/* Expanded Detail (Answer & SOP Document) - Hanya tampil saat dibuka */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-[#F3F4F6] flex flex-col gap-2.5 animate-in fade-in duration-150">
                      <FaqAnswerContent content={faq.answer} className="text-gray-600 text-[12.5px]" />

                      {faq.sop_url && (
                        <div className="pt-1">
                          <a
                            href={faq.sop_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-colors"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Dokumen SOP: {faq.sop_title || "Lihat Dokumen Panduan"}</span>
                            <ExternalLink className="w-3 h-3 text-emerald-600 ml-0.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL TAMBAH / EDIT FAQ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 my-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1E3F2B]/10 text-[#1E3F2B] flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingFaq ? "Edit FAQ" : "Tambah FAQ Baru"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {editingFaq
                      ? "Perbarui konten pertanyaan, jawaban, atau lampiran SOP"
                      : "Buat pertanyaan baru untuk panduan Pusat Bantuan"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Scope & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Target Scope Wewenang
                  </label>
                  <select
                    value={formData.scope}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, scope: e.target.value as any }))
                    }
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3F2B]/20 focus:border-[#1E3F2B]"
                  >
                    <option value="global">FAQ Global (Seluruh Pengguna AbsenIn)</option>
                    <option value="platform_admin">FAQ Khusus Platform Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Kategori Pertanyaan *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3F2B]/20 focus:border-[#1E3F2B]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="Lainnya">+ Kategori Kustom Baru</option>
                  </select>
                </div>
              </div>

              {formData.category === "Lainnya" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Nama Kategori Kustom Baru *
                  </label>
                  <input
                    type="text"
                    value={formData.customCategory}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, customCategory: e.target.value }))
                    }
                    placeholder="Contoh: Integrasi WhatsApp, Billing, Payroll"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3F2B]/20 focus:border-[#1E3F2B]"
                  />
                  {formErrors.category && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.category}</p>
                  )}
                </div>
              )}

              {/* Pertanyaan */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Pertanyaan *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, question: e.target.value }))
                  }
                  placeholder="Contoh: Bagaimana cara mengatur toleransi keterlambatan kantor?"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3F2B]/20 focus:border-[#1E3F2B]"
                />
                {formErrors.question && (
                  <p className="text-xs text-rose-600 mt-1">{formErrors.question}</p>
                )}
              </div>

              {/* Jawaban Lengkap (TipTap Rich-Text Editor) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Jawaban Lengkap *
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
                <p className="text-xs text-gray-500">
                  Sediakan judul berkas panduan dan tautan PDF atau Google Drive publik jika pertanyaan membutuhkan dokumen acuan kerja.
                </p>

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

              {/* Status Publikasi & Order */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, is_published: !prev.is_published }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.is_published ? "bg-[#1E3F2B]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        formData.is_published ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900">
                      {formData.is_published ? "Status: Terbit" : "Status: Draft"}
                    </span>
                    <p className="text-xs text-gray-500">
                      {formData.is_published
                        ? "FAQ langsung dapat dibaca oleh pengguna"
                        : "FAQ hanya tersimpan dan tidak tampil di Pusat Bantuan"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                    Urutan Indeks:
                  </label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        order_index: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-20 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white text-center"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#1E3F2B] text-white text-sm font-semibold hover:bg-[#163021] transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Menyimpan..." : editingFaq ? "Simpan Perubahan" : "Buat FAQ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
