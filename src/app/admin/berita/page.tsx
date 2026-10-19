"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Image as ImageIcon, Search, Loader2, MoreVertical, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { formatDate } from "@/lib/dateUtils";
import { sanitizeText } from "@/lib/sanitize";
import { Pagination } from "@/components/Pagination";

type NewsItem = {
  id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  created_at: string;
};

export default function KelolaBeritaPage() {
  const router = useRouter();
  const { activeCompanyId, canCreate } = useCompany();
  const { showConfirm, showToast } = useDialog();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Semua");

  // Close dropdown menu when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    if (activeMenuId) {
      window.addEventListener("click", handleOutsideClick);
      return () => window.removeEventListener("click", handleOutsideClick);
    }
  }, [activeMenuId]);

  // Pagination states
  const [offset, setOffset] = useState(0);
  const [totalNews, setTotalNews] = useState(0);
  const limit = 10;

  // Reset offset when filter or search changes
  useEffect(() => {
    setOffset(0);
  }, [searchQuery, activeFilter]);

  const fetchNews = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      
      const headers: Record<string, string> = { "Authorization": `Bearer ${token}` };
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (activeFilter && activeFilter !== "Semua") params.set("category", activeFilter);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/news?${params.toString()}`, {
        headers
      });
      const data = await res.json();
      if (data.success) {
        setNews(data.data || []);
        const total = data.pagination?.total ?? data.meta?.total ?? (data.data?.length || 0);
        setTotalNews(total);
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, limit, offset, searchQuery, activeFilter]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleOpenCreate = () => {
    router.push("/admin/buat-berita");
  };

  const handleOpenEdit = (item: NewsItem) => {
    router.push(`/admin/buat-berita?id=${item.id}`);
  };

  const handleDelete = async (id: string) => {
    if (isDeletingId) return;
    const confirmed = await showConfirm({
      title: "Hapus Berita?",
      message: "Apakah Anda yakin ingin menghapus berita ini? Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      type: "danger",
      icon: "trash",
    });
    if (!confirmed) return;

    setIsDeletingId(id);
    try {
      const token = localStorage.getItem("accessToken");
      const headers: Record<string, string> = { "Authorization": `Bearer ${token}` };
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + `/news/${id}`, {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        setNews(news.filter(n => n.id !== id));
        showToast("Berita berhasil dihapus", "success");
      } else {
        showToast("Gagal menghapus berita", "error");
      }
    } catch (error) {
      showToast("Error jaringan saat menghapus berita", "error");
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-8">
      <TopBar 
        title="Manajemen Berita" 
        onBack={() => router.push("/admin/dashboard")}
        rightAction={
          <button 
            onClick={handleOpenCreate}
            className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition-all z-10"
            aria-label="Tambah Berita"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        }
      />

      <div className="flex-1 px-5 py-5 flex flex-col gap-4 z-10 relative">
        <h2 className="text-[18px] font-bold text-[#1E4738]">Daftar Berita</h2>
        
        {/* Search */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Cari berita atau pengumuman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-full pl-11 pr-4 py-3 text-[13px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors shadow-sm"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
        </div>

        {/* Tabs / Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {["Semua", "Pengumuman", "Berita", "Artikel"].map((filter) => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-5 py-1.5 rounded-full text-[13px] whitespace-nowrap transition-colors ${
                activeFilter === filter 
                  ? "font-semibold bg-[#356E3B] text-white" 
                  : "font-medium bg-white border border-gray-200 text-gray-500"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 mt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2.5">
              <div className="w-7 h-7 border-2 border-[#356E3B] border-t-transparent rounded-full animate-spin" />
              <span className="text-[13px] font-medium text-[#7d998c]">Memuat berita...</span>
            </div>
          ) : news.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Belum ada berita yang diterbitkan.
            </p>
          ) : (
            <>
              {news.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => router.push(`/berita/${item.id}?from=/admin/berita`)}
                  className="bg-white rounded-[22px] p-4 flex gap-3.5 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:border-[#356E3B]/40 hover:shadow-md active:scale-[0.99] cursor-pointer relative group"
                  title="Klik untuk langsung melihat pratinjau berita"
                >
                  {/* Thumbnail / Image */}
                  <div className="shrink-0">
                    {item.cover_image_url ? (
                      <img 
                        src={item.cover_image_url} 
                        alt={item.title} 
                        className="w-[84px] h-[84px] rounded-[16px] object-cover group-hover:opacity-95 transition-opacity" 
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="w-[84px] h-[84px] bg-[#f4f9f6] rounded-[16px] flex items-center justify-center border border-[#eef5f0] text-[#7d998c]">
                        <ImageIcon className="w-7 h-7" />
                      </div>
                    )}
                  </div>
                  
                  {/* News Info */}
                  <div className="flex flex-col flex-1 justify-between min-w-0 pr-1">
                    <div>
                      {item.category?.name && (
                        <span className="bg-[#eef5f0] text-[#1E4738] text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit inline-block mb-1.5">
                          {item.category.name}
                        </span>
                      )}
                      <h3 className="text-[#1E4738] group-hover:text-[#356E3B] text-[14px] font-bold leading-snug line-clamp-2 break-words [overflow-wrap:anywhere] transition-colors">
                        {sanitizeText(item.title)}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between text-[#7d998c] text-[11px] font-medium pt-2 mt-auto">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#356E3B] opacity-0 group-hover:opacity-100 transition-opacity">
                        Pratinjau &rarr;
                      </span>
                    </div>
                  </div>

                  {/* More Action Menu (Titik Tiga) */}
                  <div 
                    className="relative shrink-0 self-start -mr-1 -mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === item.id ? null : item.id);
                      }}
                      disabled={isDeletingId === item.id}
                      className="w-8 h-8 rounded-full hover:bg-gray-100 active:scale-95 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-all cursor-pointer"
                      aria-label="Menu Aksi"
                      title="Opsi Berita"
                    >
                      {isDeletingId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#e11d48]" />
                      ) : (
                        <MoreVertical className="w-4 h-4" />
                      )}
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === item.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-9 w-36 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(null);
                            handleOpenEdit(item);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:bg-[#F4F9F6] hover:text-[#356E3B] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                          <span>Edit</span>
                        </button>

                        <div className="h-[1px] bg-gray-100 mx-2" />

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(null);
                            handleDelete(item.id);
                          }}
                          disabled={isDeletingId === item.id}
                          className="w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-[#e11d48] hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[#e11d48]" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <Pagination
                total={totalNews}
                limit={limit}
                offset={offset}
                onPageChange={setOffset}
                isLoading={isLoading}
                label="berita"
                className="mt-2"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
