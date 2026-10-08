"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Image as ImageIcon, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { AdminBottomNav } from "@/components/admin-bottom-nav";

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
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Semua");

  const fetchNews = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/news", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNews(data.data);
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleOpenCreate = () => {
    router.push("/admin/buat-berita");
  };

  const handleOpenEdit = (item: NewsItem) => {
    router.push(`/admin/buat-berita?id=${item.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus berita ini?")) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + `/news/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setNews(news.filter(n => n.id !== id));
      } else {
        alert("Gagal menghapus berita");
      }
    } catch (error) {
      alert("Error jaringan saat menghapus berita");
    }
  };

  const filteredNews = news.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === "Semua") return matchesSearch;
    return matchesSearch && item.category?.name.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      <TopBar 
        title="Manajemen Berita" 
        rightAction={
          <button 
            onClick={handleOpenCreate}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10 active:scale-95"
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
            <div className="text-center py-10 text-gray-400 text-[13px]">Memuat berita...</div>
          ) : filteredNews.length === 0 ? (
            <div className="bg-white rounded-[24px] p-8 text-center border border-[#eef5f0] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <p className="text-[#7d998c] text-[13px] font-medium">Belum ada berita yang diterbitkan.</p>
            </div>
          ) : (
            filteredNews.map(item => (
              <div key={item.id} className="bg-white rounded-[20px] p-4 flex gap-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors hover:border-[#dce9df]">
                {item.cover_image_url ? (
                  <img src={item.cover_image_url} alt={item.title} className="w-[80px] h-[80px] rounded-[16px] shrink-0 object-cover" />
                ) : (
                  <div className="w-[80px] h-[80px] bg-[#f4f9f6] rounded-[16px] shrink-0 flex items-center justify-center border border-[#eef5f0]">
                    <ImageIcon className="w-6 h-6 text-[#7d998c]" />
                  </div>
                )}
                
                <div className="flex flex-col flex-1 justify-center">
                  {item.category?.name && (
                    <span className="bg-[#eef5f0] text-[#1E4738] text-[10px] font-bold px-2.5 py-1 rounded-full w-fit mb-1.5">
                      {item.category.name}
                    </span>
                  )}
                  <h3 className="text-[#1E4738] text-[14px] font-bold leading-snug mb-1 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-[#7d998c] text-[11px] font-medium line-clamp-1 mb-2">
                    {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  
                  <div className="flex gap-2 mt-auto">
                    <button 
                      onClick={() => handleOpenEdit(item)}
                      className="text-[#356E3B] text-[11px] font-bold bg-[#eef5f0] px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="text-[#e11d48] text-[11px] font-bold bg-[#ffe4e6] px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AdminBottomNav activeTab="berita" />
    </div>
  );
}
