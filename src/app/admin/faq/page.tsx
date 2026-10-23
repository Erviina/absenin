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
  Layers,
  RotateCw,
  FolderPlus,
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import {
  FaqItem,
  FaqPayload,
  getManageFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  getFaqCategories,
} from "@/lib/faqApi";

export default function AdminCompanyFaqPage() {
  const router = useRouter();
  const { activeCompany, isManagement, isLoading: isCompanyLoading } = useCompany();
  const { showConfirm, showAlert } = useDialog();

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    question: string;
    answer: string;
    category: string;
    customCategory: string;
    sop_title: string;
    sop_url: string;
    is_published: boolean;
    order_index: number;
  }>({
    question: "",
    answer: "",
    category: "Kebijakan Kantor",
    customCategory: "",
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
  }, [activeCompany?.id, statusFilter, search, selectedCategory, showAlert]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Buka Modal Tambah
  const handleOpenAdd = () => {
    setEditingFaq(null);
    setFormData({
      question: "",
      answer: "",
      category: categories.includes("Kebijakan Kantor") ? "Kebijakan Kantor" : categories[0] || "Umum",
      customCategory: "",
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
      scope: "company",
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

  const stats = useMemo(() => {
    const total = faqs.length;
    const published = faqs.filter((f) => f.is_published).length;
    const drafts = total - published;
    return { total, published, drafts };
  }, [faqs]);

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
              Pusat Panduan Internal
            </h1>
            <p className="text-white/80 text-[12px] leading-relaxed">
              Buat panduan khusus, tata tertib kantor, serta tautan dokumen SOP untuk seluruh anggota perusahaan Anda.
            </p>

            <button
              onClick={handleOpenAdd}
              className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-[#1E4738] font-bold text-[13px] rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-sm w-full cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah FAQ / SOP Perusahaan</span>
            </button>
          </div>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full pointer-events-none blur-sm" />
        </div>

        {/* Ringkasan Status */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white rounded-[18px] p-3 border border-[#E5E7EB] text-center shadow-2xs">
            <span className="text-[11px] text-[#6B7280] font-medium block">Total FAQ</span>
            <span className="text-[17px] font-extrabold text-[#111827]">{stats.total}</span>
          </div>
          <div className="bg-white rounded-[18px] p-3 border border-[#E5E7EB] text-center shadow-2xs">
            <span className="text-[11px] text-[#166534] font-medium block">Terbit</span>
            <span className="text-[17px] font-extrabold text-[#166534]">{stats.published}</span>
          </div>
          <div className="bg-white rounded-[18px] p-3 border border-[#E5E7EB] text-center shadow-2xs">
            <span className="text-[11px] text-[#B45309] font-medium block">Draft</span>
            <span className="text-[17px] font-extrabold text-[#B45309]">{stats.drafts}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#7d998c] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari FAQ atau judul dokumen SOP..."
            className="w-full bg-white rounded-2xl pl-10 pr-10 py-3 text-[13px] border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#356E3B]/30 focus:border-[#356E3B] transition-all text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.02)] placeholder:text-[#9CA3AF]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category & Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-xl text-[12px] font-bold text-[#374151] focus:outline-none"
          >
            <option value="Semua">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-xl text-[12px] font-bold text-[#374151] focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="published">Terbit (Publik)</option>
            <option value="draft">Draft (Tersimpan)</option>
          </select>

          <button
            onClick={fetchFaqs}
            disabled={isLoading}
            className="p-2 bg-white border border-[#E5E7EB] rounded-xl text-[#374151] hover:bg-gray-50 shrink-0"
            title="Muat ulang FAQ"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#356E3B]" : ""}`} />
          </button>
        </div>

        {/* Daftar FAQ List */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-8 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-7 h-7 border-3 border-[#356E3B] border-t-transparent rounded-full animate-spin" />
              <span className="text-[12px] text-gray-500 font-medium">Memuat FAQ perusahaan...</span>
            </div>
          ) : faqs.length === 0 ? (
            <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-8 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#356E3B] flex items-center justify-center">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-[#111827]">Belum Ada FAQ Perusahaan</h3>
                <p className="text-[12px] text-gray-500 max-w-[240px] mt-1">
                  Tambahkan pertanyaan umum dan panduan SOP untuk membantu karyawan Anda bekerja lebih teratur.
                </p>
              </div>
              <button
                onClick={handleOpenAdd}
                className="mt-1 px-4 py-2 bg-[#356E3B] text-white text-[12px] font-bold rounded-xl hover:bg-[#2A582F] transition-colors"
              >
                Tambah FAQ Sekarang
              </button>
            </div>
          ) : (
            faqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-2xs overflow-hidden transition-all"
                >
                  <div className="p-4 flex flex-col gap-2.5">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF5F0] text-[#1E4738] border border-[#1E4738]/10">
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
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePublish(faq)}
                          title={faq.is_published ? "Jadikan Draft" : "Terbitkan ke Karyawan"}
                          className={`p-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                            faq.is_published
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {faq.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(faq)}
                          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          title="Edit FAQ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(faq)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                          title="Hapus FAQ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Title */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                      className="cursor-pointer flex items-start justify-between gap-2 select-none"
                    >
                      <h3 className="text-[#111827] text-[13.5px] font-bold leading-snug">
                        {faq.question}
                      </h3>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                          isExpanded ? "rotate-180 text-[#1E4738]" : ""
                        }`}
                      />
                    </div>

                    {/* Answer Preview / Full */}
                    <p
                      className={`text-[#4B5563] text-[12.5px] leading-relaxed whitespace-pre-line ${
                        !isExpanded ? "line-clamp-2" : ""
                      }`}
                    >
                      {faq.answer}
                    </p>

                    {/* SOP Document Badge */}
                    {faq.sop_url && (
                      <div className="pt-1">
                        <a
                          href={faq.sop_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[11px] font-bold border border-emerald-200 transition-colors"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Dokumen SOP: {faq.sop_title || "Lihat SOP"}</span>
                          <ExternalLink className="w-3 h-3 text-emerald-600" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT FAQ PERUSAHAAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EEF5F0] text-[#1E4738] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900">
                    {editingFaq ? "Edit FAQ Perusahaan" : "Tambah FAQ Perusahaan"}
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    {activeCompany?.name || "Perusahaan"}
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
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Kategori */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Kategori FAQ *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="Lainnya">+ Kategori Kustom Baru</option>
                </select>
              </div>

              {formData.category === "Lainnya" && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Nama Kategori Baru *
                  </label>
                  <input
                    type="text"
                    value={formData.customCategory}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, customCategory: e.target.value }))
                    }
                    placeholder="Contoh: Shift Lapangan, Perlengkapan Kerja"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
                  />
                  {formErrors.category && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.category}</p>
                  )}
                </div>
              )}

              {/* Pertanyaan */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Pertanyaan *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, question: e.target.value }))
                  }
                  placeholder="Contoh: Apa yang harus dilakukan bila dinas di luar kantor?"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
                />
                {formErrors.question && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.question}</p>
                )}
              </div>

              {/* Jawaban */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Jawaban Lengkap *
                </label>
                <textarea
                  rows={4}
                  value={formData.answer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, answer: e.target.value }))}
                  placeholder="Tuliskan petunjuk operasional atau jawaban resmi di sini..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 leading-relaxed focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
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
                    Dokumen SOP (Opsional)
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
                    URL PDF / Google Drive
                  </label>
                  <input
                    type="url"
                    value={formData.sop_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sop_url: e.target.value }))
                    }
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#356E3B]"
                  />
                  {formErrors.sop_url && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{formErrors.sop_url}</p>
                  )}
                </div>
              </div>

              {/* Status Publikasi */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, is_published: !prev.is_published }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.is_published ? "bg-[#356E3B]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        formData.is_published ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <div className="text-xs">
                    <span className="font-bold text-gray-900">
                      {formData.is_published ? "Status: Terbit" : "Status: Draft"}
                    </span>
                    <p className="text-[10px] text-gray-500">
                      {formData.is_published ? "Tampil di Pusat Bantuan" : "Hanya disimpan"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#356E3B] text-white text-xs font-bold hover:bg-[#2A582F] transition-all disabled:opacity-50"
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
