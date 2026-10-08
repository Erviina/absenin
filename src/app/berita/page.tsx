"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";

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

export default function BeritaPage() {
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }
        
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
    
    fetchNews();
  }, [router]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 sticky top-0 bg-[#fbfdfc] z-20">
        <button 
          onClick={() => router.push("/dashboard")}
          className="w-10 h-10 flex items-center justify-center -ml-2 active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-8 h-8 text-[#1E4738] hover:text-[#356E3B] transition-colors" />
        </button>
        <h1 className="text-[#1E4738] text-[20px] font-bold">Semua Berita</h1>
      </div>

      <div className="flex-1 px-5 pt-2 flex flex-col gap-4 z-10 relative">
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <div className="text-center py-10 text-gray-400 text-[13px]">Memuat berita...</div>
          ) : news.length === 0 ? (
            <div className="bg-white rounded-[24px] p-8 text-center border border-[#eef5f0] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <p className="text-[#7d998c] text-[13px] font-medium">Belum ada berita yang diterbitkan.</p>
            </div>
          ) : (
            news.map(item => (
              <div key={item.id} className="bg-white rounded-[20px] p-5 flex flex-col gap-3 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors hover:border-[#dce9df]">
                {item.cover_image_url ? (
                  <img src={item.cover_image_url} alt={item.title} className="w-full h-40 rounded-[16px] object-cover" />
                ) : null}
                
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-[#eef5f0] text-[#1E4738] text-[10px] font-bold px-2.5 py-1 rounded-full">
                      {item.category?.name || "Pengumuman"}
                    </span>
                    <span className="text-[#7d998c] text-[11px] font-medium">
                      {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  
                  <h3 className="text-[#1E4738] text-[16px] font-bold leading-snug mb-2">
                    {item.title}
                  </h3>
                  <p className="text-[#4B5563] text-[13px] leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
