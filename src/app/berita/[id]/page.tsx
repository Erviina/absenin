"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { formatDateWithDay } from "@/lib/dateUtils";
import { sanitizeText } from "@/lib/sanitize";
import { shareContent } from "@/lib/shareUtils";
import { Badge } from "@/components/Badge";
import { Calendar, User, Newspaper, ArrowLeft, Tag, Share2 } from "lucide-react";

interface NewsDetail {
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
}

export default function BeritaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { activeCompanyId } = useCompany();
  const { showToast } = useDialog();

  const [news, setNews] = useState<NewsDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleShare = () => {
    if (!news) return;
    shareContent({
      title: news.title,
      text: news.title,
      path: `/berita/${id}`,
      onToast: showToast,
    });
  };

  useEffect(() => {
    const fetchNewsDetail = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.replace(`/login?redirect=${encodeURIComponent(`/berita/${id}`)}`);
          return;
        }

        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        if (activeCompanyId) {
          headers["x-company-id"] = activeCompanyId;
        }

        // Coba endpoint GET /news/:id
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/news/${id}`, {
          headers,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setNews(data.data);
            setIsLoading(false);
            return;
          }
        }

        // Fallback: jika GET /news/:id belum tersedia, ambil dari list GET /news
        const fallbackRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/news`, {
          headers,
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success && Array.isArray(fallbackData.data)) {
          const found = fallbackData.data.find((item: any) => item.id === id);
          if (found) {
            setNews(found);
            setIsLoading(false);
            return;
          }
        }

        setError("Berita tidak ditemukan atau telah dihapus.");
      } catch (err: any) {
        console.error("Error fetching news detail:", err);
        setError("Gagal memuat berita. Periksa koneksi internet Anda.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNewsDetail();
  }, [id, activeCompanyId, router]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      <TopBar 
        title="Baca Berita" 
        onBack={() => router.back()} 
        rightAction={
          news ? (
            <button
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition-all"
              aria-label="Bagikan Berita"
              title="Bagikan Berita"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          ) : null
        }
      />

      <main className="flex-1 px-5 pt-4 flex flex-col gap-4 max-w-xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="w-full h-48 bg-gray-200 rounded-[20px]" />
            <div className="h-6 bg-gray-200 rounded-md w-3/4" />
            <div className="h-4 bg-gray-200 rounded-md w-1/2" />
            <div className="h-32 bg-gray-200 rounded-xl w-full mt-2" />
          </div>
        ) : error || !news ? (
          <div className="bg-white rounded-[24px] p-8 text-center border border-[#eef5f0] shadow-sm flex flex-col items-center gap-3 mt-6">
            <div className="w-14 h-14 rounded-full bg-[#f4f9f6] flex items-center justify-center text-[#7d998c]">
              <Newspaper className="w-7 h-7" />
            </div>
            <h2 className="text-[#1E4738] text-[16px] font-bold">Berita Tidak Tersedia</h2>
            <p className="text-[#7d998c] text-[13px]">{error || "Berita yang Anda cari tidak dapat ditemukan."}</p>
            <button
              onClick={() => router.push("/berita")}
              className="mt-2 px-5 py-2.5 rounded-full bg-[#1E4738] text-white text-[13px] font-semibold hover:bg-[#153428] transition-colors"
            >
              Kembali ke Semua Berita
            </button>
          </div>
        ) : (
          <article className="bg-white rounded-[24px] p-5 sm:p-6 border border-[#eef5f0] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-5 overflow-hidden">
            {/* Cover Image */}
            {news.cover_image_url && (
              <div className="w-full rounded-[18px] overflow-hidden bg-gray-100 max-h-[300px] shadow-xs">
                <img
                  src={news.cover_image_url}
                  alt={sanitizeText(news.title)}
                  className="w-full h-full max-h-[300px] object-cover"
                />
              </div>
            )}

            {/* Header: Kategori & Tanggal & Author */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Badge variant="success" size="sm" icon={<Tag className="w-3 h-3" />}>
                  {news.category?.name || "Pengumuman"}
                </Badge>

                <div className="flex items-center gap-1.5 text-[#7d998c] text-[12px] font-medium">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatDateWithDay(news.created_at)}</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-[#1E4738] text-[20px] sm:text-[22px] font-bold leading-snug break-words [overflow-wrap:anywhere]">
                {sanitizeText(news.title)}
              </h1>

              {/* Author / Publisher Information */}
              <div className="flex items-center gap-2.5 pt-1 text-[13px] text-[#5C786C] border-t border-[#f0f6f2] mt-1">
                <div className="w-7 h-7 rounded-full bg-[#eef5f0] text-[#1E4738] flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden">
                  {news.author?.avatar_url ? (
                    <img
                      src={news.author.avatar_url}
                      alt={news.author.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[#9CA3AF] text-[12px]">Diterbitkan oleh:</span>
                  <span className="font-semibold text-[#1E4738]">
                    {news.author?.name || "Admin Perusahaan"}
                  </span>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="h-[1px] w-full bg-[#f0f6f2]" />

            {/* News Content Body */}
            <div className="text-[#374151] text-[15px] sm:text-[16px] leading-[1.8] flex flex-col gap-4 break-words [overflow-wrap:anywhere]">
              {sanitizeText(news.content)
                .split(/\n{2,}/)
                .map((paragraph, idx) => (
                  <p key={idx} className="whitespace-pre-wrap leading-relaxed">
                    {paragraph}
                  </p>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#f0f6f2] flex justify-between items-center gap-3">
              <button
                onClick={() => router.push("/berita")}
                className="flex items-center gap-2 text-[#356E3B] text-[13px] font-semibold hover:underline active:scale-95 transition-transform"
              >
                <ArrowLeft className="w-4 h-4" />
                Lihat Berita Lainnya
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#eef5f0] text-[#1E4738] text-[12px] font-bold hover:bg-[#e2ede5] active:scale-95 transition-all shadow-xs"
                aria-label="Bagikan Berita"
              >
                <Share2 className="w-3.5 h-3.5 text-[#1E4738]" />
                <span>Bagikan</span>
              </button>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
