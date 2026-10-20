"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, Calendar, X, Tag, Newspaper, ChevronRight, SlidersHorizontal, RotateCcw, ListFilter } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useCompany } from "@/context/CompanyContext";
import { formatDate } from "@/lib/dateUtils";
import { sanitizeText, truncateText } from "@/lib/sanitize";
import { CustomCalendar } from "@/components/CustomCalendar";
import { InfiniteScrollFooter } from "@/components/InfiniteScrollFooter";
import { CardListSkeleton } from "@/components/CardSkeleton";
import { buildCacheKey, getCachedData, setCachedData, invalidateCache } from "@/lib/clientCache";
import { getActiveCompanyId, getApiUrl } from "@/lib/api";

type NewsItem = {
  id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  author?: {
    id: string;
    name: string;
    avatar_url?: string | null;
  } | null;
  created_at: string;
};

export default function BeritaPage() {
  const router = useRouter();
  const { activeCompanyId } = useCompany();
  
  const [news, setNews] = useState<NewsItem[]>(() => {
    if (typeof window === "undefined") return [];
    const compId = getActiveCompanyId();
    return getCachedData<NewsItem[]>(buildCacheKey("news", compId, { limit: 10, offset: 0, searchQuery: "", selectedCategory: "Semua", selectedDate: "" }))?.data || [];
  });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(() => {
    if (typeof window === "undefined") return [];
    const compId = getActiveCompanyId();
    return getCachedData<{ id: string; name: string }[]>(buildCacheKey("news_categories", compId))?.data || [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const compId = getActiveCompanyId();
    return !getCachedData(buildCacheKey("news", compId, { limit: 10, offset: 0, searchQuery: "", selectedCategory: "Semua", selectedDate: "" }))?.data;
  });

  // Infinite Scroll & Pagination states
  const [totalNews, setTotalNews] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const isFetchingMoreRef = useRef(false);
  const limit = 8;

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const prevCompanyIdRef = useRef<string | null | undefined>(undefined);

  // Reset data HANYA saat active company benar-benar berganti
  useEffect(() => {
    if (prevCompanyIdRef.current !== undefined && prevCompanyIdRef.current !== activeCompanyId) {
      setNews([]);
      setCategories([]);
      setTotalNews(0);
      setLoadMoreError(null);
      setIsLoading(true);
    }
    prevCompanyIdRef.current = activeCompanyId;
  }, [activeCompanyId]);

  // Fetch categories once on mount or company change
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const compId = activeCompanyId || getActiveCompanyId();
        const catCacheKey = buildCacheKey("news_categories", compId);
        const cachedCats = getCachedData<{ id: string; name: string }[]>(catCacheKey);
        if (cachedCats) {
          setCategories(cachedCats.data);
        }

        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        if (compId) headers["x-company-id"] = compId;
        const resCat = await fetch(getApiUrl("/news/categories"), { headers });
        if (resCat.ok) {
          const dataCat = await resCat.json();
          if (dataCat.success && Array.isArray(dataCat.data)) {
            setCategories(dataCat.data);
            setCachedData(catCacheKey, dataCat.data);
          }
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, [activeCompanyId]);

  // Fetch initial news batch from backend
  const fetchInitialNews = useCallback(async () => {
    try {
      setLoadMoreError(null);
      const compId = activeCompanyId || getActiveCompanyId();
      const cacheKey = buildCacheKey("news", compId, {
        limit,
        offset: 0,
        searchQuery,
        selectedCategory,
        selectedDate
      });
      const cachedNews = getCachedData<NewsItem[]>(cacheKey);
      if (cachedNews) {
        setNews(cachedNews.data);
        if (typeof cachedNews.total === "number") setTotalNews(cachedNews.total);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }
      
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (compId) {
        headers["x-company-id"] = compId;
      }

      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", "0");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedCategory && selectedCategory !== "Semua") params.set("category", selectedCategory);
      if (selectedDate) params.set("date", selectedDate);

      const resNews = await fetch(getApiUrl(`/news?${params.toString()}`), { headers });
      const dataNews = await resNews.json();
      if (dataNews.success) {
        const items = dataNews.data || [];
        const total = dataNews.pagination?.total ?? dataNews.meta?.total ?? (dataNews.data?.length || 0);
        setNews(items);
        setTotalNews(total);
        setCachedData(cacheKey, items, total);
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setIsLoading(false);
    }
  }, [router, activeCompanyId, limit, searchQuery, selectedCategory, selectedDate]);

  // Fetch next page automatically on scroll
  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || isFetchingMoreRef.current || news.length >= totalNews) {
      return;
    }

    try {
      isFetchingMoreRef.current = true;
      setIsLoadingMore(true);
      setLoadMoreError(null);

      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const compId = activeCompanyId || getActiveCompanyId();
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (compId) {
        headers["x-company-id"] = compId;
      }

      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(news.length));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedCategory && selectedCategory !== "Semua") params.set("category", selectedCategory);
      if (selectedDate) params.set("date", selectedDate);

      const resNews = await fetch(getApiUrl(`/news?${params.toString()}`), { headers });
      const dataNews = await resNews.json();
      if (dataNews.success) {
        const newItems: NewsItem[] = dataNews.data || [];
        const total = dataNews.pagination?.total ?? dataNews.meta?.total ?? totalNews;
        setTotalNews(total);
        setNews((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const uniqueItems = newItems.filter((item) => !existingIds.has(item.id));
          return [...prev, ...uniqueItems];
        });
      } else {
        setLoadMoreError(dataNews.message || "Gagal memuat berita tambahan.");
      }
    } catch (err: any) {
      console.error("Error loading more news:", err);
      setLoadMoreError("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setIsLoadingMore(false);
      isFetchingMoreRef.current = false;
    }
  }, [isLoading, isLoadingMore, news.length, totalNews, activeCompanyId, limit, searchQuery, selectedCategory, selectedDate]);

  useEffect(() => {
    fetchInitialNews();
  }, [fetchInitialNews]);

  // Category tabs list
  const categoryTabs = useMemo(() => {
    const list = ["Semua"];
    categories.forEach(c => {
      if (c.name && !list.includes(c.name)) list.push(c.name);
    });
    return list;
  }, [categories]);

  const hasActiveFilters = Boolean(searchQuery || selectedCategory !== "Semua" || selectedDate);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("Semua");
    setSelectedDate("");
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      {/* TopBar Header */}
      <TopBar title="Semua Berita" onBack={() => router.push("/dashboard")} />

      <main className="flex-1 px-5 pt-4 flex flex-col gap-4 max-w-xl mx-auto w-full">
        {/* Search & Date Filter Controls */}
        <div className="flex flex-col gap-3">
          {/* Unified Search & Filter Row */}
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Cari judul berita atau isi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 bg-white border border-gray-200 rounded-2xl pl-11 pr-10 text-[13px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors shadow-xs"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Hapus pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Tanggal di pojok kanan (konsisten dengan halaman lain) */}
            <button 
              onClick={() => setIsDatePickerOpen(true)}
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-colors shadow-xs active:scale-95 ${
                selectedDate 
                  ? "bg-[#356E3B] border-[#356E3B] text-white" 
                  : "bg-white border-gray-200 text-[#4B5563] hover:border-[#356E3B] hover:text-[#356E3B]"
              }`}
              title={selectedDate ? `Filter: ${formatDate(selectedDate)}` : "Filter Tanggal"}
              aria-label="Filter Tanggal"
            >
              <ListFilter className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Active Filter Indicators (jika filter tanggal atau pencarian aktif) */}
          {(selectedDate || hasActiveFilters) && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedDate && (
                <div className="inline-flex items-center gap-1.5 bg-[#eef5f0] border border-[#356E3B]/30 text-[#1E4738] text-[12px] font-semibold px-3 py-1 rounded-full shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-[#356E3B]" />
                  <span>{formatDate(selectedDate)}</span>
                  <button 
                    onClick={() => setSelectedDate("")}
                    className="ml-1 text-gray-400 hover:text-red-500 p-0.5 rounded-full transition-colors"
                    title="Hapus filter tanggal"
                    aria-label="Hapus filter tanggal"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="ml-auto text-[11px] font-bold text-[#EF4444] hover:underline flex items-center gap-1 py-1 px-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Filter
                </button>
              )}
            </div>
          )}

          {/* Pill Tabs for Category Filtering */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {categoryTabs.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "font-semibold bg-[#356E3B] text-white shadow-xs"
                    : "font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Date Picker Modal */}
        {isDatePickerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" 
              onClick={() => setIsDatePickerOpen(false)} 
            />
            <div className="relative w-full max-w-[340px] z-10 animate-in zoom-in-95 duration-200 bg-white rounded-[28px] p-5 shadow-2xl border border-gray-100 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="text-[15px] font-bold text-[#1E4738]">Filter Tanggal</h3>
                  <p className="text-[12px] text-gray-500">Pilih tanggal penerbitan berita</p>
                </div>
                <button 
                  onClick={() => setIsDatePickerOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <CustomCalendar 
                selectedDate={selectedDate} 
                onSelect={(date) => {
                  setSelectedDate(date);
                  setIsDatePickerOpen(false);
                }} 
              />

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                {selectedDate ? (
                  <button
                    onClick={() => {
                      setSelectedDate("");
                      setIsDatePickerOpen(false);
                    }}
                    className="text-[12px] font-semibold text-red-500 hover:underline px-2 py-1"
                  >
                    Hapus Filter
                  </button>
                ) : <div />}
                <button
                  onClick={() => setIsDatePickerOpen(false)}
                  className="px-4 py-1.5 rounded-full bg-gray-100 text-[12px] font-semibold text-gray-600 hover:bg-gray-200 transition-colors ml-auto"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* News List */}
        <div className="flex flex-col gap-3.5 mt-1">
          {isLoading && news.length === 0 ? (
            <CardListSkeleton count={3} type="news" />
          ) : news.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <p className="text-sm text-gray-500">
                {hasActiveFilters ? "Tidak ada berita yang cocok." : "Belum ada berita."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="mt-2 text-xs font-bold text-[#356E3B] hover:underline"
                >
                  Reset Filter
                </button>
              )}
            </div>
          ) : (
            <>
              {news.map((item) => (
                <div
                  key={`news-${item.id}`}
                  onClick={() => router.push(`/berita/${item.id}?from=/berita`)}
                  className="bg-white rounded-[20px] p-4 flex gap-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:border-[#dce9df] hover:shadow-md transition-all active:scale-[0.99] group overflow-hidden"
                >
                  {/* Thumbnail / Image */}
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt={sanitizeText(item.title)}
                      loading="lazy"
                      decoding="async"
                      className="w-[84px] h-[84px] rounded-[16px] shrink-0 object-cover"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="w-[84px] h-[84px] bg-[#f4f9f6] rounded-[16px] shrink-0 flex items-center justify-center text-[#7d998c] border border-[#eef5f0]">
                      <Newspaper className="w-7 h-7" />
                    </div>
                  )}

                  {/* Content Details */}
                  <div className="flex flex-col justify-center flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <span className="bg-[#eef5f0] text-[#1E4738] text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit">
                        {item.category?.name || "Pengumuman"}
                      </span>
                      <span className="text-[#7d998c] text-[11px] font-medium shrink-0">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <h3 className="text-[#1E4738] group-hover:text-[#356E3B] transition-colors text-[14px] font-bold leading-snug mb-1 line-clamp-2 break-words [overflow-wrap:anywhere]">
                      {sanitizeText(item.title)}
                    </h3>

                    <p className="text-[#6B7280] text-[12px] leading-relaxed line-clamp-2 break-words [overflow-wrap:anywhere]">
                      {truncateText(item.content, 120)}
                    </p>

                    <div className="flex items-center gap-1 text-[#356E3B] text-[11px] font-bold mt-2 self-end">
                      <span>Baca</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}

              <InfiniteScrollFooter
                hasMore={news.length < totalNews}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMore}
                error={loadMoreError}
                onRetry={loadMore}
                endMessage="Semua berita telah ditampilkan"
                loadingMessage="Memuat berita lainnya..."
                isEmpty={!isLoading && news.length === 0}
                className="mt-4 pb-8"
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
