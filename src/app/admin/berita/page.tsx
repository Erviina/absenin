"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Image as ImageIcon, Search, MoreVertical, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { formatDate } from "@/lib/dateUtils";
import { sanitizeText } from "@/lib/sanitize";
import { shareContent } from "@/lib/shareUtils";
import { Pagination } from "@/components/Pagination";
import { CardListSkeleton } from "@/components/CardSkeleton";
import { buildCacheKey, getCachedData, setCachedData, invalidateCache } from "@/lib/clientCache";
import { getActiveCompanyId } from "@/lib/api";

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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Pagination states
  const [totalNews, setTotalNews] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 10;

  useEffect(() => {
    setNews([]);
    setOffset(0);
  }, [activeCompanyId]);

  useEffect(() => {
    setOffset(0);
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuId(null);
    };
    if (activeMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activeMenuId]);

  const fetchNews = useCallback(async () => {
    try {
      const compId = activeCompanyId || getActiveCompanyId();
      const cacheKey = buildCacheKey("admin_news", compId, {
        limit,
        offset,
        searchQuery,
        activeFilter
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
      if (compId) headers["x-company-id"] = compId;

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
              {news.map((item, index) => {
                const isNearBottom = index >= news.length - 2 && news.length > 2;
                return (
                  <div 
                    key={item.id} 
                    onClick={() => router.push(`/berita/${item.id}`)}
                    className={`bg-white rounded-[20px] p-4 flex gap-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:border-[#356E3B]/30 hover:shadow-md cursor-pointer active:scale-[0.99] group relative ${
                      activeMenuId === item.id ? "z-30" : "z-0"
                    }`}
                  >
                    {/* Thumbnail / Cover Image */}
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
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="flex flex-col flex-1 justify-center min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        {item.category?.name ? (
                          <span className="bg-[#eef5f0] text-[#1E4738] text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit">
                            {item.category.name}
                          </span>
                        ) : (
                          <div />
                        )}

                        {/* More Action Menu (Titik Tiga) */}
                        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setActiveMenuId(activeMenuId === item.id ? null : item.id); 
                            }}
                            className="w-8 h-8 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-500 hover:text-[#1E4738] flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Menu Opsi Berita"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === item.id && (
                            <>
                              {/* Backdrop for closing */}
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
                                } w-36 bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.18),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    handleOpenEdit(item);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-[12.5px] font-medium text-gray-700 hover:bg-[#F4F9F6] hover:text-[#356E3B] flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Edit Berita</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    shareContent({
                                      title: item.title,
                                      text: item.title,
                                      path: `/berita/${item.id}`,
                                      onToast: showToast,
                                    });
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-[12.5px] font-medium text-gray-700 hover:bg-[#F4F9F6] hover:text-[#356E3B] flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Bagikan</span>
                                </button>

                                <div className="h-[1px] bg-gray-100 mx-2 my-1" />

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    handleDelete(item.id);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-[12.5px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  <span>Hapus Berita</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                  <h3 className="text-[#1E4738] group-hover:text-[#356E3B] text-[14px] font-bold leading-snug mb-1 line-clamp-2 break-words [overflow-wrap:anywhere] transition-colors">
                    {sanitizeText(item.title)}
                  </h3>

                  <div className="flex items-center mt-auto pt-1">
                    <p className="text-[#7d998c] text-[11px] font-medium line-clamp-1">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

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
