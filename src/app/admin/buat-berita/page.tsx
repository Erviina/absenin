"use client";

import { ChevronLeft, PlusCircle, Image as ImageIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { TopBar } from "@/components/TopBar";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

type Category = {
  id: string;
  name: string;
};

function BuatBeritaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!editingId);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/news/categories", {
          headers: { "Authorization": `Bearer ${token}` }
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
  }, []);

  useEffect(() => {
    if (editingId) {
      const fetchNewsItem = async () => {
        try {
          const token = localStorage.getItem("accessToken");
          const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/news", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            const item = data.data.find((n: any) => n.id === editingId);
            if (item) {
              setTitle(item.title);
              setContent(item.content);
              setCategoryId(item.category?.id || "");
              setPreviewUrl(item.cover_image_url);
            }
          }
        } catch (error) {
          console.error("Error fetching news item", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchNewsItem();
    }
  }, [editingId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileObj(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleSubmit = async () => {
    if (!title || !content) {
      alert("Judul dan Isi Berita wajib diisi");
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
      const url = process.env.NEXT_PUBLIC_API_URL + (editingId ? `/news/${editingId}` : "/news");
      const method = editingId ? "PUT" : "POST";
      
      const payload = {
        title,
        content,
        news_category_id: categoryId || null,
        cover_image_url: finalImageUrl || null
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        router.push("/admin/berita");
      } else {
        alert(data.message || "Gagal menyimpan berita");
      }
    } catch (error: any) {
      alert(error?.message || "Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#f4f9f6] relative">
        <TopBar title="Edit Berita" />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[#7d998c] text-[14px]">Memuat data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f4f9f6] relative">
      <TopBar title={editingId ? "Edit Berita" : "Buat Berita"} />

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
            <label className="text-[#1E4738] text-[13px] font-bold">Kategori</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-200 rounded-[16px] px-4 py-3.5 text-[14px] text-[#1E4738] focus:border-[#356E3B] outline-none bg-white appearance-none"
            >
              <option value="">Pilih Kategori...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <label className="text-[#1E4738] text-[13px] font-bold">
                Isi Pengumuman <span className="text-red-500">*</span>
              </label>
            </div>
            <textarea 
              placeholder="Informasi terkait pengumuman......"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors resize-none h-[150px]"
            ></textarea>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[#1E4738] text-[13px] font-bold">
              Sampul Berita
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 bg-[#f8faf9] border-2 border-dashed border-[#dce9df] rounded-[20px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#f4f9f6] transition-colors relative overflow-hidden"
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
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

      <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md p-5 bg-gradient-to-t from-[#f4f9f6] via-[#f4f9f6] to-transparent pb-8 z-20">
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || !title || !content}
          className={`w-full py-4 rounded-full font-bold text-[15px] shadow-[0_4px_12px_rgba(53,110,59,0.2)] transition-all ${isSubmitting || !title || !content ? 'bg-gray-300 text-gray-500 shadow-none' : 'bg-[#356E3B] hover:bg-[#2b5930] text-white active:scale-[0.98]'}`}
        >
          {isSubmitting ? "Menyimpan..." : (editingId ? "Simpan Perubahan" : "Unggah Sekarang")}
        </button>
      </div>
    </div>
  );
}

export default function BuatBeritaPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuatBeritaForm />
    </Suspense>
  );
}
