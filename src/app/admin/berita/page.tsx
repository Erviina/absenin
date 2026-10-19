"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Image as ImageIcon, Search, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { formatDate } from "@/lib/dateUtils";
import { sanitizeText } from "@/lib/sanitize";
import { Pagination } from "@/components/Pagination";
import { getActiveCompanyId } from "@/lib/api";
import { CardListSkeleton } from "@/components/CardSkeleton";
import { buildCacheKey, getCachedData, setCachedData, invalidateCache } from "@/lib/clientCache";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Semua");

  // Pagination states
  const [offset, setOffset] = useState(0);
  const [totalNews, setTotalNews] = useState(0);
  const limit = 10;

  // Reset offset and data on company change
  useEffect(() => {
    setNews([]);
    setOffset(0);
  }, [activeCompanyId]);

  // Reset offset when filter or search changes
  useEffect(() => {
    setOffset(0);
  }, [searchQuery, activeFilter]);

  const fetchNews = useCallback(async () => {
    try {
      const companyId = activeCompanyId || getActiveCompanyId();
      const cacheKey = buildCacheKey("admin_news", companyId, {
        limit,
        offset,
        searchQuery,
        activeFilter,
      });

      const cached = getCachedData<NewsItem[]>(cacheKey);
      if (cached) {
        setNews(cached.data);
        if (typeof cached.total === "number") setTotalNews(cached.total);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      const token = localStorage.getItem("accessToken");
      if (!token) return;
      
      const headers: Record<string, string> = { "Authorization": `Bearer ${token}` };
      if (companyId) headers["x-company-id"] = companyId;

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
        const items = data.data || [];
        const total = data.pagination?.total ?? data.meta?.total ?? (data.data?.length || 0);
        setNews(items);
        setTotalNews(total);
        setCachedData(cacheKey, items, total);
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
      const companyId = activeCompanyId || getActiveCompanyId();
      if (companyId) headers["x-company-id"] = companyId;

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + `/news/${id}`, {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        invalidateCache("news");
        invalidateCache("admin_news");
        invalidateCache("dashboard_news");
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
          {isLoading && news.length === 0 ? (
            <CardListSkeleton count={3} type="news" />
          ) : news.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Belum ada berita yang diterbitkan.
            </p>
          ) : (
            <>
              {news.map(item => (
                <div key={`news-${item.id}`} className="bg-white rounded-[20px] p-4 flex gap-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors hover:border-[#dce9df]">
                  <div 
                    onClick={() => router.push(`/berita/${item.id}?from=/admin/berita`)}
                    className="cursor-pointer shrink-0 group/img"
                    title="Klik untuk langsung melihat berita"
                  >
                    {item.cover_image_url ? (
                      <img 
                        src={item.cover_image_url} 
                        alt={item.title} 
                        loading="lazy"
                        decoding="async"
                        className="w-[80px] h-[80px] rounded-[16px] object-cover group-hover/img:opacity-90 transition-opacity" 
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="w-[80px] h-[80px] bg-[#f4f9f6] rounded-[16px] flex items-center justify-center border border-[#eef5f0]">
                        <ImageIcon className="w-6 h-6 text-[#7d998c]" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col flex-1 justify-center min-w-0">
                    {item.category?.name && (
                      <span className="bg-[#eef5f0] text-[#1E4738] text-[10px] font-bold px-2.5 py-1 rounded-full w-fit mb-1.5">
                        {item.category.name}
                      </span>
                    )}
                    <h3 
                      onClick={() => router.push(`/berita/${item.id}?from=/admin/berita`)}
                      className="text-[#1E4738] hover:text-[#356E3B] hover:underline cursor-pointer text-[14px] font-bold leading-snug mb-1 line-clamp-2 break-words [overflow-wrap:anywhere] transition-colors"
                      title="Klik untuk langsung melihat berita"
                    >
                      {sanitizeText(item.title)}
                    </h3>
                    <p className="text-[#7d998c] text-[11px] font-medium line-clamp-1 mb-2">
                      {formatDate(item.created_at)}
                    </p>
                    
                    <div className="flex gap-2 mt-auto flex-wrap">
                      <button 
                        onClick={() => router.push(`/berita/${item.id}?from=/admin/berita`)}
                        className="text-[#1E4738] text-[11px] font-bold bg-[#eef5f0] hover:bg-[#e2ece5] px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-all"
                        title="Lihat Berita"
                      >
                        <Eye className="w-3 h-3 text-[#1E4738]" /> Lihat
                      </button>
                      <button 
                        onClick={() => handleOpenEdit(item)}
                        className="text-[#356E3B] text-[11px] font-bold bg-[#eef5f0] hover:bg-[#e2ece5] px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        disabled={isDeletingId === item.id}
                        className="text-[#e11d48] text-[11px] font-bold bg-[#ffe4e6] hover:bg-[#fecdd3] px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeletingId === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        {isDeletingId === item.id ? "Menghapus..." : "Hapus"}
                      </button>
                    </div>
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
