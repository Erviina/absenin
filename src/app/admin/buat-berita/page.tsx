"use client";

import { ChevronLeft, PlusCircle, Image as ImageIcon, CheckCircle2, Eye, X, Calendar, User, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { TopBar } from "@/components/TopBar";
import { PrimaryButton } from "@/components/PrimaryButton";
import { CustomSelect } from "@/components/CustomSelect";
import { createClient } from "@supabase/supabase-js";
import { formatDate } from "@/lib/dateUtils";
import { sanitizeText } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/clientCache";
import { getActiveCompanyId, getApiUrl } from "@/lib/api";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

type Category = {
  id: string;
  name: string;
};

import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";

const DEFAULT_CATEGORIES: Category[] = [
  { id: "a2000000-0000-4000-8000-000000000001", name: "Pengumuman" },
  { id: "a2000000-0000-4000-8000-000000000002", name: "Berita" },
  { id: "7a2d4238-2d08-4cac-a1c8-0ae326a00937", name: "Artikel" },
];

function BuatBeritaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");
  const { activeCompanyId, canCreate, activeRole } = useCompany();
  const { showToast } = useDialog();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!editingId);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const compId = activeCompanyId || getActiveCompanyId();
        const headers: Record<string, string> = { "Authorization": `Bearer ${token}` };
        if (compId) headers["x-company-id"] = compId;

        const res = await fetch(getApiUrl("/news/categories"), {
          headers
        });
        const data = await res.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error("Error fetching categories", error);
      }
    };

    fetchCategories();
  }, [activeCompanyId]);

  useEffect(() => {
    if (editingId) {
      const fetchNewsItem = async () => {
        try {
          const token = localStorage.getItem("accessToken");
          const compId = activeCompanyId || getActiveCompanyId();
          const headers: Record<string, string> = { "Authorization": `Bearer ${token}` };
          if (compId) headers["x-company-id"] = compId;

          let item: any = null;
          // 1. Coba endpoint langsung /news/:id
          const directRes = await fetch(getApiUrl(`/news/${editingId}`), {
            headers
          });
          if (directRes.ok) {
            const directData = await directRes.json();
            if (directData.success && directData.data) {
              item = directData.data;
            }
          }

          // 2. Fallback jika /news/:id tidak ditemukan
          if (!item) {
            const fallbackRes = await fetch(getApiUrl("/news"), {
              headers
            });
            const fallbackData = await fallbackRes.json();
            if (fallbackData.success && Array.isArray(fallbackData.data)) {
              item = fallbackData.data.find((n: any) => n.id === editingId);
            }
          }

          if (item) {
            setTitle(item.title || "");
            setContent(sanitizeText(item.content || ""));
            setCategoryId(item.category?.id || item.news_category_id || "");
            setPreviewUrl(item.cover_image_url || null);
          }
        } catch (error) {
          console.error("Error fetching news item", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchNewsItem();
    }
  }, [editingId, activeCompanyId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileObj(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!title.trim() || !content.trim()) {
      showToast("Judul dan Isi Berita wajib diisi", "warning");
      return;
    }

    if (!categoryId) {
      showToast("Kategori berita wajib dipilih", "warning");
      return;
    }

    if (!fileObj && !previewUrl) {
      showToast("Sampul Berita wajib diunggah", "warning");
      return;
    }

    if (!canCreate("news")) {
      showToast("Hanya Owner/Admin/Manager yang berwenang mempublikasikan berita", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      let finalImageUrl = previewUrl;

      // Upload image to Supabase if there's a new file
      if (fileObj) {
        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Supabase credentials missing. Gagal upload gambar.");
        }
        const supabase = createClient(supabaseUrl, supabaseKey);
        const fileExt = fileObj.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `news/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, fileObj);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);
          
        finalImageUrl = publicUrlData.publicUrl;
      }

      const token = localStorage.getItem("accessToken");
      const url = getApiUrl(editingId ? `/news/${editingId}` : "/news");
      const method = editingId ? "PUT" : "POST";
      
      const normalizedContent = sanitizeText(content);

      const compId = activeCompanyId || getActiveCompanyId();

      const payload: any = {
        title: title.trim(),
        content: normalizedContent,
        news_category_id: categoryId || null,
        cover_image_url: finalImageUrl || null,
        company_id: compId,
      };

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };
      if (compId) headers["x-company-id"] = compId;

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        invalidateCache("news");
        invalidateCache("admin_news");
        invalidateCache("dashboard_news");
        router.push("/admin/berita");
      } else {
        showToast(data.message || "Gagal menyimpan berita", "error");
      }
    } catch (error: any) {
      showToast(error?.message || "Terjadi kesalahan jaringan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#f4f9f6] relative">
        <TopBar title="Edit Berita" onBack={() => router.push("/admin/berita")} />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[#7d998c] text-[14px]">Memuat data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f4f9f6] relative">
      <TopBar 
        title={editingId ? "Edit Berita" : "Buat Berita"} 
        onBack={() => router.push("/admin/berita")}
      />

      <div className="flex-1 px-5 py-5 flex flex-col z-10 pb-32">
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col gap-5">
          
          <div className="flex flex-col gap-2">
            <label className="text-[#1E4738] text-[13px] font-bold">
              Judul Berita <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Berita Hari ini"
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2 relative">
            <label className="text-[#1E4738] text-[13px] font-bold">
              Kategori <span className="text-red-500">*</span>
            </label>
            <CustomSelect
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
              value={categoryId}
              onChange={(val) => setCategoryId(val)}
              placeholder="Pilih Kategori..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <label className="text-[#1E4738] text-[13px] font-bold">
                Isi Pengumuman <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-[#7d998c] font-medium">
                Gunakan Enter untuk baris/paragraf baru
              </span>
            </div>
            <textarea 
              placeholder="Tulis informasi atau pengumuman di sini... Tekan Enter untuk baris atau paragraf baru."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors resize-y min-h-[160px] leading-relaxed"
            ></textarea>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[#1E4738] text-[13px] font-bold">
              Sampul Berita <span className="text-red-500">*</span>
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 bg-[#f8faf9] border-2 border-dashed border-[#dce9df] rounded-[20px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#f4f9f6] transition-colors relative overflow-hidden"
            >
              {previewUrl ? (
                <>
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="absolute inset-0 w-full h-full object-cover" 
                    style={{ objectFit: 'cover' }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-[12px] font-bold">Ubah Gambar</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-[#356E3B]">
                    <ImageIcon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <span className="text-[12px] font-bold text-[#64748b]">Upload Gambar</span>
                </>
              )}
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          </div>

        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 mx-auto w-full sm:max-w-md p-5 bg-gradient-to-t from-[#f4f9f6] via-[#f4f9f6] to-transparent pb-8 z-20 flex gap-3">
        <button 
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="flex-1 py-3.5 rounded-full border border-[#356E3B] bg-white text-[#356E3B] font-bold text-[13px] flex items-center justify-center gap-1.5 hover:bg-[#eef5f0] active:scale-[0.98] transition-all shadow-xs"
        >
          <Eye className="w-4 h-4" />
          Pratinjau
        </button>
        <PrimaryButton 
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim() || !content.trim() || !categoryId || (!fileObj && !previewUrl)}
          isLoading={isSubmitting}
          loadingText={editingId ? "Menyimpan Perubahan..." : "Mengunggah..."}
          icon={<CheckCircle2 className="w-5 h-5" />}
          className="flex-[1.5]"
        >
          {editingId ? "Simpan Perubahan" : "Unggah Sekarang"}
        </PrimaryButton>
      </div>

      {/* Live Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="fixed inset-0"
            onClick={() => setIsPreviewOpen(false)}
          />
          <div className="bg-[#fbfdfc] w-full sm:max-w-md rounded-t-[32px] sm:rounded-[28px] max-h-[88vh] flex flex-col shadow-2xl relative z-10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 border border-[#eef5f0] overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5f0] bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#eef5f0] flex items-center justify-center text-[#356E3B]">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#1E4738]">Pratinjau Berita</h3>
                  <p className="text-[11px] text-[#7d998c]">Tampilan langsung bagi pembaca</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                aria-label="Tutup Pratinjau"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body Preview */}
            <div className="p-4 overflow-y-auto flex-1">
              <article className="bg-white rounded-[24px] p-5 border border-[#eef5f0] shadow-xs flex flex-col gap-4">
                {/* Header: Kategori & Tanggal */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="bg-[#eef5f0] text-[#1E4738] text-[11px] font-bold px-2.5 py-0.5 rounded-full w-fit">
                      {categories.find(c => c.id === categoryId)?.name || "Pengumuman"}
                    </span>
                    <div className="flex items-center gap-1.5 text-[#7d998c] text-[11px] font-medium">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatDate(new Date().toISOString())}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-[#1E4738] text-[18px] sm:text-[20px] font-bold leading-snug break-words">
                    {title.trim() ? sanitizeText(title) : "Judul Berita Akan Tampil di Sini"}
                  </h1>

                  {/* Author (Avatar dengan nama, tanpa 'diterbitkan oleh') */}
                  <div className="flex items-center gap-2 pt-0.5 text-[12px] text-[#5C786C]">
                    <div className="w-7 h-7 rounded-full bg-[#eef5f0] text-[#1E4738] flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden border border-[#dce9df]">
                      <User className="w-3.5 h-3.5 text-[#356E3B]" />
                    </div>
                    <span className="font-semibold text-[#1E4738]">
                      Admin Perusahaan
                    </span>
                  </div>
                </div>

                {/* Cover Image - Auto cropping berdasarkan width dengan height fix */}
                {previewUrl && (
                  <div className="w-full h-[210px] sm:h-[260px] rounded-[16px] overflow-hidden bg-gray-50/70 shadow-2xs border border-[#eef5f0]">
                    <img
                      src={previewUrl}
                      alt="Pratinjau Sampul"
                      className="w-full h-full object-cover rounded-[16px]"
                    />
                  </div>
                )}

                {/* Separator */}
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#e4eee7] to-transparent my-0.5" />

                {/* News Content - Rapi per paragraf */}
                <div className="space-y-3.5 text-[#2C3E35] text-[14px] sm:text-[15px] leading-[1.8] tracking-[0.01em]">
                  {content.trim() ? (
                    sanitizeText(content)
                      .split(/\n\s*\n/)
                      .map(p => p.trim())
                      .filter(Boolean)
                      .map((paragraph, idx) => (
                        <p key={idx} className="whitespace-pre-line break-words">
                          {paragraph}
                        </p>
                      ))
                  ) : (
                    <p className="text-gray-400 italic">Isi pengumuman atau berita akan ditampilkan di sini...</p>
                  )}
                </div>
              </article>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-[#eef5f0] bg-white flex justify-end">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="w-full py-2.5 rounded-full bg-[#356E3B] text-white text-[13px] font-semibold hover:bg-[#2A582F] transition-colors"
              >
                Kembali Mengedit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BuatBeritaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] w-full bg-[#FAFCF9] flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
      </div>
    }>
      <BuatBeritaForm />
    </Suspense>
  );
}
