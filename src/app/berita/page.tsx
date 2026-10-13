"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Calendar, X, Tag, Newspaper, ChevronRight, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useCompany } from "@/context/CompanyContext";
import { formatDate } from "@/lib/dateUtils";
import { sanitizeText, truncateText } from "@/lib/sanitize";
import { CustomCalendar } from "@/components/CustomCalendar";

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
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    const fetchNewsAndCategories = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }
        
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        if (activeCompanyId) {
          headers["x-company-id"] = activeCompanyId;
        }

        // Fetch news and categories in parallel
        const [resNews, resCat] = await Promise.all([
          fetch(process.env.NEXT_PUBLIC_API_URL + "/news", { headers }),
          fetch(process.env.NEXT_PUBLIC_API_URL + "/news/categories", { headers }).catch(() => null)
        ]);

        const dataNews = await resNews.json();
        if (dataNews.success) {
          setNews(dataNews.data || []);
        }

        if (resCat && resCat.ok) {
          const dataCat = await resCat.json();
          if (dataCat.success && Array.isArray(dataCat.data)) {
            setCategories(dataCat.data);
          }
        }
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNewsAndCategories();
  }, [router, activeCompanyId]);

  // Extract all categories dynamically if categories endpoint is empty
  const categoryTabs = useMemo(() => {
    const list = ["Semua"];
    if (categories.length > 0) {
      categories.forEach(c => {
        if (c.name && !list.includes(c.name)) list.push(c.name);
      });
    } else {
      news.forEach(item => {
        const catName = item.category?.name;
        if (catName && !list.includes(catName)) {
          list.push(catName);
        }
      });
    }
    return list;
  }, [categories, news]);

  // Filtered news calculation
  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      // 1. Search Query (Title & Content)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cleanedTitle = sanitizeText(item.title).toLowerCase();
        const cleanedContent = sanitizeText(item.content).toLowerCase();
        if (!cleanedTitle.includes(q) && !cleanedContent.includes(q)) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== "Semua") {
        const catName = item.category?.name || "Pengumuman";
        if (catName.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 3. Date Filter (YYYY-MM-DD match)
      if (selectedDate) {
        const itemDateStr = new Date(item.created_at).toISOString().split("T")[0];
        if (itemDateStr !== selectedDate) {
          return false;
        }
      }

      return true;
    });
  }, [news, searchQuery, selectedCategory, selectedDate]);

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
          {/* Search Input Bar */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="Cari judul berita atau isi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-full pl-11 pr-10 py-3 text-[13px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors shadow-xs"
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

          {/* Quick Filter Row: Date Filter Button & Active Indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDatePickerOpen(true)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-medium border transition-colors ${
                selectedDate 
                  ? "bg-[#eef5f0] text-[#1E4738] border-[#356E3B] font-semibold" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{selectedDate ? formatDate(selectedDate) : "Filter Tanggal"}</span>
            </button>

            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                title="Hapus filter tanggal"
                aria-label="Hapus filter tanggal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="ml-auto text-[11px] font-bold text-[#EF4444] hover:underline flex items-center gap-1 py-1 px-2"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filter
              </button>
            )}
          </div>

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
            <div className="relative w-full max-w-[340px] z-10 animate-in zoom-in-95 duration-200">
              <CustomCalendar 
                selectedDate={selectedDate} 
                onSelect={(date) => {
                  setSelectedDate(date);
                  setIsDatePickerOpen(false);
                }} 
              />
            </div>
          </div>
        )}

        {/* News List */}
        <div className="flex flex-col gap-3.5 mt-1">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-[20px] p-4 flex gap-4 border border-[#eef5f0] animate-pulse">
                  <div className="w-[84px] h-[84px] bg-gray-200 rounded-[16px] shrink-0" />
                  <div className="flex flex-col flex-1 gap-2 justify-center">
                    <div className="w-20 h-4 bg-gray-200 rounded-full" />
                    <div className="w-full h-4 bg-gray-200 rounded" />
                    <div className="w-3/4 h-3 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="bg-white rounded-[24px] p-8 text-center border border-[#eef5f0] shadow-sm flex flex-col items-center gap-2 mt-2">
              <div className="w-12 h-12 rounded-full bg-[#f4f9f6] flex items-center justify-center text-[#7d998c] mb-1">
                <Newspaper className="w-6 h-6" />
              </div>
              <h3 className="text-[#1E4738] text-[15px] font-bold">
                {hasActiveFilters ? "Tidak Ada Berita yang Cocok" : "Belum Ada Berita"}
              </h3>
              <p className="text-[#7d998c] text-[12px] max-w-xs">
                {hasActiveFilters
                  ? "Coba ubah kata kunci pencarian, kategori, atau tanggal yang dipilih."
                  : "Belum ada berita atau pengumuman yang diterbitkan oleh perusahaan saat ini."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="mt-3 px-4 py-2 rounded-full bg-[#1E4738] text-white text-[12px] font-semibold hover:bg-[#153428] transition-colors"
                >
                  Tampilkan Semua Berita
                </button>
              )}
            </div>
          ) : (
            filteredNews.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/berita/${item.id}`)}
                className="bg-white rounded-[20px] p-4 flex gap-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:border-[#dce9df] hover:shadow-md transition-all active:scale-[0.99] group overflow-hidden"
              >
                {/* Thumbnail / Image */}
                {item.cover_image_url ? (
                  <img
                    src={item.cover_image_url}
                    alt={sanitizeText(item.title)}
                    className="w-[84px] h-[84px] rounded-[16px] shrink-0 object-cover"
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
            ))
          )}
        </div>
      </main>
    </div>
  );
}
