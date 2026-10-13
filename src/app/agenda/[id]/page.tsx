"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Calendar, Clock, MapPin, ExternalLink, Info, ArrowLeft, Share2, Tag } from "lucide-react";
import { useDialog } from "@/context/DialogContext";
import { useCompany } from "@/context/CompanyContext";
import { formatDateWithDay } from "@/lib/dateUtils";
import { shareContent } from "@/lib/shareUtils";
import { isAgendaUrl, formatAgendaUrl } from "@/app/agenda/page";
import { Badge } from "@/components/Badge";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function AgendaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { activeCompanyId } = useCompany();
  const { showToast } = useDialog();

  const [agenda, setAgenda] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleShare = () => {
    if (!agenda) return;
    shareContent({
      title: agenda.title,
      text: `Agenda: ${agenda.title} (${agenda.time_range || ""})`,
      path: `/agenda/${id}`,
      onToast: showToast,
    });
  };

  useEffect(() => {
    const fetchAgendaDetail = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.replace(`/login?redirect=${encodeURIComponent(`/agenda/${id}`)}`);
          return;
        }

        const headers: Record<string, string> = { Authorization: "Bearer " + token };
        if (activeCompanyId) {
          headers["x-company-id"] = activeCompanyId;
        }

        // Coba GET /agendas/:id
        let res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/agendas/${id}`, { headers });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setAgenda(json.data);
            setLoading(false);
            return;
          }
        }

        // Fallback: cari dari list GET /agendas
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/agendas`, { headers });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const found = json.data.find((a: any) => a.id === id);
            if (found) {
              setAgenda(found);
              setLoading(false);
              return;
            }
          }
        }

        setError("Agenda tidak ditemukan atau telah dihapus.");
      } catch (err: any) {
        console.error("Failed to fetch agenda details", err);
        setError("Gagal memuat agenda. Periksa koneksi internet Anda.");
      } finally {
        setLoading(false);
      }
    };

    fetchAgendaDetail();
  }, [id, activeCompanyId, router]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8]">
        <TopBar title="Detail Agenda" onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Memuat agenda...</p>
        </div>
      </div>
    );
  }

  if (error || !agenda) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8]">
        <TopBar title="Detail Agenda" onBack={() => router.back()} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <Calendar className="w-7 h-7" />
          </div>
          <h2 className="text-[#111827] text-[16px] font-bold">Agenda Tidak Ditemukan</h2>
          <p className="text-gray-500 text-sm max-w-xs">{error || "Agenda yang Anda cari tidak tersedia."}</p>
          <button
            onClick={() => router.push("/agenda")}
            className="mt-2 px-5 py-2.5 rounded-full bg-[#356E3B] text-white text-[13px] font-semibold hover:bg-[#2A582F] transition-colors"
          >
            Buka Kalender Agenda
          </button>
        </div>
      </div>
    );
  }

  const categoryName = agenda.category?.name || agenda.type || "Kegiatan";
  const isCompany = agenda.scope === "COMPANY" || agenda.type === "COMPANY";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8]">
      <TopBar 
        title="Detail Agenda" 
        onBack={() => router.back()} 
        rightAction={
          <button
            onClick={handleShare}
            className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition-all"
            aria-label="Bagikan Agenda"
            title="Bagikan Agenda"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
        }
      />

      <div className="px-6 pt-6 pb-20 flex flex-col gap-6 max-w-xl mx-auto w-full">
        {/* Title Card */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8F3EB] flex flex-col gap-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="success" size="sm" icon={<Tag className="w-3 h-3" />}>
                {categoryName}
              </Badge>
              <Badge variant={isCompany ? "company" : "personal"} size="xs" uppercase>
                {isCompany ? "PERUSAHAAN" : "PRIBADI"}
              </Badge>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E8F3EB] text-[#356E3B] text-[12px] font-bold hover:bg-[#D1E5D5] active:scale-95 transition-all shrink-0"
              aria-label="Bagikan Agenda"
            >
              <Share2 className="w-3.5 h-3.5 text-[#356E3B]" />
              <span>Bagikan</span>
            </button>
          </div>

          <h1 className="text-[20px] font-bold text-[#111827] leading-snug">
            {agenda.title}
          </h1>
        </div>

        {/* Schedule & Location Card */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8F3EB] flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="text-[13px] font-bold text-[#374151] uppercase tracking-wide">
              Jadwal & Waktu
            </h3>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] shrink-0">
                  <Calendar className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[11px] text-[#6B7280] font-medium">Tanggal</p>
                  <p className="text-[14px] font-bold text-[#111827]">
                    {agenda.start_time ? formatDateWithDay(agenda.start_time) : "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] shrink-0">
                  <Clock className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[11px] text-[#6B7280] font-medium">Waktu</p>
                  <p className="text-[14px] font-bold text-[#111827]">
                    {agenda.time_range || agenda.time || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {(agenda.link_or_location || agenda.link) && (
            <>
              <div className="h-[1px] w-full bg-[#E5E7EB]" />
              <div className="flex flex-col gap-3">
                <h3 className="text-[13px] font-bold text-[#374151] uppercase tracking-wide">
                  Lokasi / Tautan
                </h3>

                <div className="flex items-center gap-3 bg-[#F9FAFB] p-3.5 rounded-[16px] border border-[#E5E7EB]">
                  {isAgendaUrl(agenda.link_or_location || agenda.link) ? (
                    <>
                      <ExternalLink className="w-5 h-5 text-[#356E3B] shrink-0" strokeWidth={2} />
                      <a
                        href={formatAgendaUrl(agenda.link_or_location || agenda.link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2563EB] hover:underline text-[14px] font-medium truncate flex-1"
                        title={agenda.link_or_location || agenda.link}
                      >
                        {agenda.link_or_location || agenda.link}
                      </a>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-5 h-5 text-[#356E3B] shrink-0" strokeWidth={2} />
                      <span className="text-[#374151] text-[14px] font-medium truncate flex-1">
                        {agenda.link_or_location || agenda.link}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {agenda.notes && (
            <>
              <div className="h-[1px] w-full bg-[#E5E7EB]" />
              <div className="flex flex-col gap-3">
                <h3 className="text-[13px] font-bold text-[#374151] uppercase tracking-wide">
                  Catatan Tambahan
                </h3>
                <div className="bg-[#F9FAFB] rounded-[16px] p-4 border border-[#E5E7EB]">
                  <p className="text-[14px] text-[#4B5563] whitespace-pre-wrap leading-relaxed">
                    {agenda.notes}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Bottom Navigation */}
          <div className="pt-2 border-t border-[#F0F5F1] flex justify-between items-center">
            <button
              onClick={() => router.push("/agenda")}
              className="flex items-center gap-2 text-[#356E3B] text-[13px] font-semibold hover:underline active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-4 h-4" />
              Buka Kalender Agenda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
