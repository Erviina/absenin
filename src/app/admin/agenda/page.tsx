"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  ChevronLeft, 
  ChevronRight,
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Info, 
  ChevronsUpDown,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  MoreVertical,
  FileText,
  Share2,
  Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { CustomSelect } from "@/components/CustomSelect";
import { DateTimeRollerPicker } from "@/components/DateTimeRollerPicker";
import { useDialog } from "@/context/DialogContext";
import { Badge } from "@/components/Badge";
import { getAgendaCategoryColor, sortAgendaCategories, countWords, LocationPinIcon } from "@/app/agenda/page";
import { shareContent } from "@/lib/shareUtils";
import { AgendaCardSchedule, AgendaDetailSchedule } from "@/components/AgendaScheduleDisplay";
import { useCompany } from "@/context/CompanyContext";
import { getActiveCompanyId } from "@/lib/api";
import { CardListSkeleton } from "@/components/CardSkeleton";
import { buildCacheKey, getCachedData, setCachedData, invalidateCache } from "@/lib/clientCache";

// Tipe Data untuk Agenda
type AgendaItem = {
  id: string;
  title: string;
  time: string;
  location: string;
  link_or_location?: string | null;
  notes?: string | null;
  type: string;
  category_id?: string | null;
  link?: string | null;
  scope?: "COMPANY" | "PERSONAL";
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
};

const FULL_DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const FULL_MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

function formatAgendaDateTime(d: Date, isAllDay: boolean = false): string {
  const dayName = FULL_DAY_NAMES[d.getDay()];
  const dayNum = d.getDate();
  const monthName = FULL_MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  if (isAllDay) {
    return `${dayName}, ${dayNum} ${monthName} ${year}`;
  }
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${dayName}, ${dayNum} ${monthName} ${year}, ${hours}:${minutes} WIB`;
}

export function isAgendaUrl(str?: string | null): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^www\./i.test(trimmed)) return true;
  if (/^(meet\.google\.com|zoom\.us|teams\.microsoft\.com|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(trimmed)) return true;
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?$/i.test(trimmed)) return true;
  return false;
}

export function formatAgendaUrl(str: string): string {
  const trimmed = str.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export default function AdminAgendaPage() {
  const router = useRouter();
  const { showConfirm, showToast } = useDialog();
  const { activeCompanyId, isCompanyLoading } = useCompany();
  
  // State Navigasi Form Tambah/Ubah
  const [isAddingAgenda, setIsAddingAgenda] = useState(false);
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  
  // State Data
  const [agendasMap, setAgendasMap] = useState<Record<string, AgendaItem[]>>(() => {
    if (typeof window === "undefined") return {};
    const compId = getActiveCompanyId();
    return getCachedData<Record<string, AgendaItem[]>>(buildCacheKey("agendas", compId))?.data || {};
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const compId = getActiveCompanyId();
    return !getCachedData(buildCacheKey("agendas", compId))?.data;
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
  // State Kalender
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedAgendaDetail, setSelectedAgendaDetail] = useState<AgendaItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isDetailMenuOpen, setIsDetailMenuOpen] = useState(false);

  const [categories, setCategories] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    const compId = getActiveCompanyId();
    return getCachedData<any[]>(buildCacheKey("agenda_categories", compId))?.data || [];
  });

  const prevCompanyIdRef = useRef<string | null | undefined>(undefined);

  // Reset HANYA saat active company benar-benar berganti
  useEffect(() => {
    if (prevCompanyIdRef.current !== undefined && prevCompanyIdRef.current !== activeCompanyId) {
      setAgendasMap({});
      setCategories([]);
      setIsLoading(true);
    }
    prevCompanyIdRef.current = activeCompanyId;
  }, [activeCompanyId]);

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuId(null);
      setIsDetailMenuOpen(false);
    };
    if (activeMenuId || isDetailMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activeMenuId, isDetailMenuOpen]);

  // State Form Tambah/Edit Agenda
  const [formKegiatan, setFormKegiatan] = useState("");
  const [formKategoriId, setFormKategoriId] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState<Date>(() => new Date());
  const [endTime, setEndTime] = useState<Date>(() => new Date(Date.now() + 3600000));
  const [expandedPicker, setExpandedPicker] = useState<"start" | "end" | null>(null);
  const [formCatatan, setFormCatatan] = useState("");
  const [formLink, setFormLink] = useState("");

  const fetchCategories = useCallback(async () => {
    if (isCompanyLoading) return;
    const compId = activeCompanyId || getActiveCompanyId();
    try {
      if (!compId) {
        setCategories([]);
        return;
      }

      const catCacheKey = buildCacheKey("agenda_categories", compId);
      const cachedCats = getCachedData<any[]>(catCacheKey);
      if (cachedCats) {
        setCategories(cachedCats.data);
      }

      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (compId) headers["x-company-id"] = compId;

      const res = await fetch(`${apiUrl}/agendas/categories`, { headers });
      const data = await res.json();
      if (data.success) {
        const sorted = sortAgendaCategories(data.data);
        setCategories(sorted);
        setCachedData(catCacheKey, sorted);
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
    }
  }, [activeCompanyId, isCompanyLoading]);

  const fetchAgendas = useCallback(async () => {
    if (isCompanyLoading) return;
    const compId = activeCompanyId || getActiveCompanyId();
    try {
      if (!compId) {
        setAgendasMap({});
        setIsLoading(false);
        setErrorMsg("");
        return;
      }

      const cacheKey = buildCacheKey("agendas", compId);
      const cached = getCachedData<Record<string, AgendaItem[]>>(cacheKey);
      if (cached) {
        setAgendasMap(cached.data);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      setErrorMsg("");

      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("API URL tidak ditemukan");

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (compId) headers["x-company-id"] = compId;

      const res = await fetch(`${apiUrl}/agendas`, { headers });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengambil data agenda");
      }

      const newMap: Record<string, AgendaItem[]> = {};
      
      data.data.forEach((item: any) => {
        const startDate = new Date(item.start_time);
        const endDate = new Date(item.end_time);
        
        const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}.${String(startDate.getMinutes()).padStart(2, '0')}`;
        const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}.${String(endDate.getMinutes()).padStart(2, '0')}`;
        
        const isSameDay = startDate.getFullYear() === endDate.getFullYear() &&
                          startDate.getMonth() === endDate.getMonth() &&
                          startDate.getDate() === endDate.getDate();

        const sDay = startDate.getDate();
        const sMonth = FULL_MONTH_NAMES[startDate.getMonth()];
        const sYear = startDate.getFullYear();
        const eDay = endDate.getDate();
        const eMonth = FULL_MONTH_NAMES[endDate.getMonth()];
        const eYear = endDate.getFullYear();

        const isAllDay = Boolean(item.is_all_day);
        const timeDisplay = isAllDay
          ? isSameDay
            ? "Seharian"
            : sYear === eYear
              ? `${sDay} ${sMonth} - ${eDay} ${eMonth} ${eYear} (Seharian)`
              : `${sDay} ${sMonth} ${sYear} - ${eDay} ${eMonth} ${eYear} (Seharian)`
          : isSameDay 
            ? `${startTimeStr} - ${endTimeStr} WIB`
            : sYear === eYear
              ? `${sDay} ${sMonth} ${startTimeStr} - ${eDay} ${eMonth} ${eYear} ${endTimeStr} WIB`
              : `${sDay} ${sMonth} ${sYear} ${startTimeStr} - ${eDay} ${eMonth} ${eYear} ${endTimeStr} WIB`;

        const linkOrLoc = item.link_or_location || item.link || null;
        const agendaNotes = item.notes || null;

        const agendaObj: AgendaItem = {
          id: item.id,
          title: item.title,
          time: timeDisplay,
          location: linkOrLoc || agendaNotes || "Tanpa Keterangan",
          link_or_location: linkOrLoc,
          notes: agendaNotes,
          type: item.category?.name || "Acara",
          category_id: item.category?.id || null,
          scope: item.type === "COMPANY" ? "COMPANY" : "PERSONAL",
          start_time: item.start_time,
          end_time: item.end_time,
          link: linkOrLoc,
          is_all_day: isAllDay,
        };

        // Populate every single day in the date range
        const curr = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        while (curr <= endLimit) {
          const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
          if (!newMap[dateStr]) {
            newMap[dateStr] = [];
          }
          newMap[dateStr].push(agendaObj);
          curr.setDate(curr.getDate() + 1);
        }
      });
      
      setAgendasMap(newMap);
      setCachedData(cacheKey, newMap);
    } catch (err: any) {
      console.error("Fetch agendas error:", err);
      setErrorMsg(err.message || "Terjadi kesalahan sistem");
    } finally {
      setIsLoading(false);
    }
  }, [router, activeCompanyId, isCompanyLoading]);

  useEffect(() => {
    fetchCategories();
    fetchAgendas();
  }, [fetchCategories, fetchAgendas]);

  // Filter State
  const [activeFilter, setActiveFilter] = useState<string>("Semua");

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDateClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (selectedDateStr === dateStr) {
      setSelectedDateStr(null);
    } else {
      setSelectedDateStr(dateStr);
    }
  };

  const handleToggleAllDay = () => {
    const nextVal = !isAllDay;
    setIsAllDay(nextVal);
    if (nextVal) {
      const s = new Date(startTime);
      s.setHours(0, 0, 0, 0);
      setStartTime(s);
      const e = new Date(endTime);
      e.setHours(23, 59, 59, 999);
      if (e < s) {
        e.setDate(s.getDate());
      }
      setEndTime(e);
    }
  };

  const handleCatatanChange = (val: string) => {
    const words = val.trim() ? val.trim().split(/\s+/) : [];
    if (words.length <= 200 || val.length < formCatatan.length) {
      setFormCatatan(val);
    } else {
      const limited = words.slice(0, 200).join(" ");
      setFormCatatan(limited);
    }
  };

  const handleOpenAdd = () => {
    setEditingAgendaId(null);
    setFormKegiatan("");
    setFormKategoriId(categories.length > 0 ? categories[0].id : "");
    setIsAllDay(false);
    
    const now = new Date();
    if (selectedDateStr) {
      const [y, m, d] = selectedDateStr.split("-").map(Number);
      now.setFullYear(y, m - 1, d);
    }
    now.setSeconds(0, 0);

    const start = new Date(now);
    const end = new Date(now);
    end.setHours(end.getHours() + 1);

    setStartTime(start);
    setEndTime(end);
    setExpandedPicker("start"); // Langsung buka roller waktu mulai
    setFormCatatan("");
    setFormLink("");
    setSubmitError("");
    setIsAddingAgenda(true);
  };

  const handleEditAgenda = (agenda: AgendaItem, _dateStr?: string) => {
    setEditingAgendaId(agenda.id);
    setFormKegiatan(agenda.title);
    setFormKategoriId(agenda.category_id || (categories.length > 0 ? categories[0].id : ""));
    
    const start = new Date(agenda.start_time);
    const end = new Date(agenda.end_time);
    setStartTime(start);
    setEndTime(end);
    setIsAllDay(Boolean(agenda.is_all_day));
    setExpandedPicker(null);
    setFormCatatan(agenda.notes || "");
    setFormLink(agenda.link_or_location || agenda.link || "");
    setSubmitError("");
    setSelectedAgendaDetail(null);
    setIsAddingAgenda(true);
  };

  const handleDeleteAgenda = async (id: string) => {
    if (isDeletingId) return;
    const confirmed = await showConfirm({
      title: "Hapus Agenda?",
      message: "Apakah Anda yakin ingin menghapus agenda ini? Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      type: "danger",
      icon: "trash",
    });
    if (!confirmed) return;

    try {
      setIsDeletingId(id);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("API URL tidak ditemukan");

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const compId = activeCompanyId || getActiveCompanyId();
      if (compId) headers["x-company-id"] = compId;

      const res = await fetch(`${apiUrl}/agendas/${id}`, {
        method: "DELETE",
        headers
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menghapus agenda");
      }

      invalidateCache("agendas");
      invalidateCache("dashboard_agendas");
      showToast("Agenda berhasil dihapus", "success");
      await fetchAgendas();
    } catch (err: any) {
      showToast(err.message || "Terjadi kesalahan sistem", "error");
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleShareAgenda = async (item: AgendaItem) => {
    await shareContent({
      title: item.title,
      text: `Agenda: ${item.title} (${item.time})`,
      path: `/agenda/${item.id}`,
      onToast: showToast,
    });
  };

  const handleSubmitAgenda = async () => {
    if (isSubmitting) return;
    setSubmitError("");
    if (!formKegiatan.trim()) {
      setSubmitError("Judul agenda wajib diisi");
      return;
    }

    if (endTime <= startTime) {
      setSubmitError("Waktu selesai harus setelah waktu mulai");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("API URL tidak ditemukan");

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };
      const compId = activeCompanyId || getActiveCompanyId();
      if (compId) headers["x-company-id"] = compId;

      const payload: any = {
        title: formKegiatan,
        notes: formCatatan || "",
        link_or_location: formLink.trim() || null,
        link: formLink.trim() || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        agenda_category_id: formKategoriId || null,
        is_all_day: isAllDay,
      };

      let url = `${apiUrl}/agendas`;
      let method = "POST";

      if (editingAgendaId) {
        url = `${apiUrl}/agendas/${editingAgendaId}`;
        method = "PATCH";
      } else {
        payload.type = "COMPANY";
      }

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menyimpan agenda");
      }

      invalidateCache("agendas");
      invalidateCache("dashboard_agendas");
      await fetchAgendas();

      showToast(editingAgendaId ? "Agenda berhasil diperbarui" : "Agenda baru berhasil ditambahkan", "success");
      setIsAddingAgenda(false);
      setEditingAgendaId(null);
    } catch (err: any) {
      setSubmitError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  // List of unique agendas to compute range display
  const uniqueAgendas = useMemo(() => {
    const map = new Map<string, AgendaItem>();
    Object.values(agendasMap).forEach(arr => {
      arr.forEach(a => {
        if (!map.has(a.id)) map.set(a.id, a);
      });
    });
    return Array.from(map.values());
  }, [agendasMap]);

  // Check if a day is part of a multi-day range
  const getRangeInfo = (day: number) => {
    const currentDayTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getTime();
    
    let inRange = false;
    let isStart = false;
    let isEnd = false;

    for (const agenda of uniqueAgendas) {
      const s = new Date(agenda.start_time);
      const sTime = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
      const e = new Date(agenda.end_time);
      const eTime = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();

      // Only multi-day ranges show the connected visual strip
      if (sTime < eTime && currentDayTime >= sTime && currentDayTime <= eTime) {
        inRange = true;
        if (currentDayTime === sTime) isStart = true;
        if (currentDayTime === eTime) isEnd = true;
      }
    }

    return { inRange, isStart, isEnd };
  };

  // Logika Menampilkan Agenda
  let displayedAgendas: { agenda: AgendaItem, dateStr: string }[] = [];
  if (selectedDateStr) {
    const list = agendasMap[selectedDateStr] || [];
    displayedAgendas = list.map(a => ({ agenda: a, dateStr: selectedDateStr }));
  } else {
    const seen = new Set<string>();
    Object.keys(agendasMap).forEach(dateStr => {
      const [y, m] = dateStr.split('-');
      if (parseInt(y) === currentDate.getFullYear() && parseInt(m) === currentDate.getMonth() + 1) {
        agendasMap[dateStr].forEach(a => {
          if (!seen.has(a.id)) {
            seen.add(a.id);
            displayedAgendas.push({ agenda: a, dateStr });
          }
        });
      }
    });
    displayedAgendas.sort((a, b) => new Date(a.agenda.start_time).getTime() - new Date(b.agenda.start_time).getTime());
  }

  if (activeFilter !== "Semua") {
    displayedAgendas = displayedAgendas.filter(a => a.agenda.type.toLowerCase() === activeFilter.toLowerCase());
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8] relative pb-8">
      <TopBar 
        title={isAddingAgenda ? (editingAgendaId ? "Ubah Agenda Karyawan" : "Tambah Agenda Karyawan") : "Kelola Agenda"}
        onBack={() => {
          if (isAddingAgenda) {
            setIsAddingAgenda(false);
          } else if (selectedAgendaDetail) {
            setSelectedAgendaDetail(null);
            setIsDetailMenuOpen(false);
          } else {
            router.push("/admin/dashboard");
          }
        }}
        rightAction={
          !isAddingAgenda ? (
            <button 
              onClick={handleOpenAdd}
              className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition-all z-10"
              aria-label="Tambah Agenda"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
          ) : null
        }
      />

      <div className="px-6 pt-6 flex flex-col flex-1">
        {isAddingAgenda ? (
          /* FORM TAMBAH/UBAH AGENDA - TATA LETAK ASLI DENGAN ROLLER PICKER WAKTU SESUAI GAMBAR */
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8F3EB] flex flex-col gap-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#374151]">
                  Nama Agenda <span className="text-[#EF4444]">*</span>
                </label>
                <input 
                  type="text"
                  value={formKegiatan}
                  onChange={(e) => setFormKegiatan(e.target.value)}
                  placeholder="Misal: Rapat Evaluasi Mingguan"
                  className="w-full border border-[#E5E7EB] rounded-[14px] px-4 py-3.5 text-[14px] text-[#111827] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all bg-white font-medium"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#374151]">
                  Kategori <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <CustomSelect 
                    value={formKategoriId}
                    onChange={(val) => setFormKategoriId(val)}
                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                  />
                </div>
              </div>

              {/* KONSEP WAKTU MULAI & WAKTU BERAKHIR SESUAI GAMBAR */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#374151]">
                  Waktu Pelaksanaan <span className="text-[#EF4444]">*</span>
                </label>
                <div className="bg-[#F9FAFB] rounded-[20px] p-4 border border-[#E5E7EB] flex flex-col">
                  {/* Seharian Toggle */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[14px] font-medium text-gray-900">Seharian</span>
                    <button
                      type="button"
                      onClick={handleToggleAllDay}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
                        isAllDay ? "bg-[#356E3B]" : "bg-[#D1D5DB]"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                          isAllDay ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="h-[1px] bg-gray-200 my-2.5" />

                  {/* Waktu Mulai Row */}
                  <div 
                    onClick={() => setExpandedPicker(expandedPicker === "start" ? null : "start")}
                    className="flex items-center justify-between py-1 cursor-pointer select-none group"
                  >
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-gray-900">Waktu Mulai</span>
                      <span className="text-[12px] text-gray-500 font-medium mt-0.5">
                        {formatAgendaDateTime(startTime, isAllDay)}
                      </span>
                    </div>
                    <ChevronsUpDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>

                  {/* Roller Picker for Start Time */}
                  {expandedPicker === "start" && (
                    <DateTimeRollerPicker 
                      value={startTime}
                      isAllDay={isAllDay}
                      agendasMap={agendasMap}
                      onChange={(newDate) => {
                        if (isAllDay) {
                          newDate.setHours(0, 0, 0, 0);
                        }
                        setStartTime(newDate);
                        if (newDate > endTime) {
                          const nextEnd = new Date(newDate);
                          if (isAllDay) {
                            nextEnd.setHours(23, 59, 59, 999);
                          } else {
                            nextEnd.setHours(nextEnd.getHours() + 1);
                          }
                          setEndTime(nextEnd);
                        }
                      }}
                    />
                  )}

                  <div className="h-[1px] bg-gray-200 my-2.5" />

                  {/* Waktu Berakhir Row */}
                  <div 
                    onClick={() => setExpandedPicker(expandedPicker === "end" ? null : "end")}
                    className="flex items-center justify-between py-1 cursor-pointer select-none group"
                  >
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-gray-900">Waktu Berakhir</span>
                      <span className="text-[12px] text-gray-500 font-medium mt-0.5">
                        {formatAgendaDateTime(endTime, isAllDay)}
                      </span>
                    </div>
                    <ChevronsUpDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>

                  {/* Roller Picker for End Time */}
                  {expandedPicker === "end" && (
                    <DateTimeRollerPicker 
                      value={endTime}
                      isAllDay={isAllDay}
                      agendasMap={agendasMap}
                      onChange={(newDate) => {
                        if (isAllDay) {
                          newDate.setHours(23, 59, 59, 999);
                        }
                        setEndTime(newDate);
                        if (newDate < startTime) {
                          const nextStart = new Date(newDate);
                          if (isAllDay) {
                            nextStart.setHours(0, 0, 0, 0);
                          }
                          setStartTime(nextStart);
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#374151]">
                  Link Tautan / Lokasi (Opsional)
                </label>
                <input 
                  type="text"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="Misal: https://meet.google.com/... atau Ruang Rapat Lt. 2"
                  className="w-full border border-[#E5E7EB] rounded-[14px] px-4 py-3.5 text-[14px] text-[#111827] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all bg-white font-medium"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[13px] font-bold text-[#374151]">
                    Catatan Tambahan
                  </label>
                  <span className="text-[11px] font-bold text-[#6B7280]">
                    {countWords(formCatatan)} / 200 kata
                  </span>
                </div>
                <textarea 
                  rows={4}
                  value={formCatatan}
                  onChange={(e) => handleCatatanChange(e.target.value)}
                  placeholder="Misal: Bawa dokumen presentasi..." 
                  className="w-full border border-[#E5E7EB] rounded-[14px] px-4 py-3 text-[14px] text-[#4B5563] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all resize-none min-h-[96px]"
                />
              </div>

            </div>

            {submitError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-[13px] font-medium flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                {submitError}
              </div>
            )}

            <button 
              onClick={handleSubmitAgenda}
              disabled={isSubmitting || !formKegiatan.trim()}
              className={`w-full text-white rounded-full py-4 mt-2 flex items-center justify-center gap-2 font-bold text-[15px] shadow-sm transition-colors active:scale-[0.98] ${
                isSubmitting
                  ? "bg-gray-400 cursor-wait pointer-events-none shadow-none"
                  : !formKegiatan.trim()
                  ? "bg-gray-300 cursor-not-allowed shadow-none"
                  : "bg-[#356E3B] hover:bg-[#2A582F]"
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" />
              ) : (
                <CheckCircle2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
              )}
              {isSubmitting ? "Menyimpan..." : editingAgendaId ? "Simpan Perubahan" : "Simpan Agenda ke Semua"}
            </button>
          </div>
        ) : isLoading && Object.keys(agendasMap).length === 0 ? (
          <div className="py-6 flex flex-col gap-4">
            <CardListSkeleton count={3} type="agenda" />
          </div>
        ) : errorMsg && Object.keys(agendasMap).length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-12 px-4 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
              <Info className="w-6 h-6" />
            </div>
            <p className="text-[#EF4444] text-[14px] font-bold mb-2">Gagal Memuat Agenda</p>
            <p className="text-[#6B7280] text-[13px]">{errorMsg}</p>
            <button 
              onClick={() => fetchAgendas()}
              className="mt-4 px-6 py-2 bg-[#356E3B] text-white text-[13px] font-bold rounded-full hover:bg-[#2A582F] transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          /* MAIN CONTENT (KALENDER & LIST) */
          <>
            {/* Kalender Card dengan Rentang Waktu (Date Range) */}
            <div className="mb-6 px-1">
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={handlePrevMonth} 
                  className="w-9 h-9 flex items-center justify-center rounded-full text-[#4B5563] hover:text-[#111827] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                  aria-label="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2]" />
                </button>
                <h2 className="text-[14px] sm:text-[15px] font-bold text-[#111827] uppercase tracking-wider text-center select-none">
                  {currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                </h2>
                <button 
                  onClick={handleNextMonth} 
                  className="w-9 h-9 flex items-center justify-center rounded-full text-[#4B5563] hover:text-[#111827] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                  aria-label="Bulan Berikutnya"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2]" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-y-2 text-center select-none">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                  <div key={day} className="text-[12px] font-bold text-[#6B7280] pb-2">
                    {day}
                  </div>
                ))}
                
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const hasAgenda = agendasMap[dateStr] && agendasMap[dateStr].length > 0;
                  const isSelected = selectedDateStr === dateStr;
                  const { inRange, isStart, isEnd } = getRangeInfo(day);
                  const dayOfWeek = (firstDayOfMonth + i) % 7; // 0 = Min, 6 = Sab

                  let rangeStripClass = "";
                  if (inRange) {
                    if (isStart && isEnd) {
                      rangeStripClass = "rounded-full bg-[#E8F3EB]";
                    } else if (isStart) {
                      rangeStripClass = "rounded-l-full bg-[#E8F3EB]";
                    } else if (isEnd) {
                      rangeStripClass = "rounded-r-full bg-[#E8F3EB]";
                    } else {
                      const roundL = dayOfWeek === 0 ? "rounded-l-full" : "";
                      const roundR = dayOfWeek === 6 ? "rounded-r-full" : "";
                      rangeStripClass = `bg-[#E8F3EB] ${roundL} ${roundR}`;
                    }
                  }

                  return (
                    <div 
                      key={day} 
                      onClick={() => handleDateClick(day)}
                      className="h-10 flex flex-col items-center justify-center relative cursor-pointer"
                    >
                      {/* Visual Strip Rentang Waktu */}
                      {inRange && (
                        <div className={`absolute inset-y-1.5 inset-x-0 ${rangeStripClass} transition-all pointer-events-none`} />
                      )}

                      {/* Bulatan Tanggal */}
                      <div className={`w-8 h-8 flex flex-col items-center justify-center rounded-full relative z-10 transition-all ${
                        isSelected 
                          ? "bg-[#356E3B] text-white font-bold shadow-md scale-105" 
                          : inRange 
                            ? "text-[#1E4738] font-bold" 
                            : "text-[#374151] hover:bg-gray-100 font-medium"
                      }`}>
                        <span className="text-[13px]">{day}</span>
                        {hasAgenda && !inRange && (
                          <div className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? 'bg-white' : 'bg-[#EF4444]'}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List Agenda */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-[16px] font-bold text-[#111827]">
                  {selectedDateStr ? `Agenda: ${selectedDateStr}` : "Semua Agenda Bulan Ini"}
                </h2>
                <div className="bg-[#E8F3EB] px-3 py-1.5 rounded-full">
                  <span className="text-[#356E3B] text-[11px] font-bold">{displayedAgendas.length} Agenda</span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden snap-x">
                <button 
                  onClick={() => setActiveFilter("Semua")}
                  className={`px-4 py-2 shrink-0 snap-start rounded-full whitespace-nowrap text-[13px] font-bold transition-all border ${
                    activeFilter === "Semua" 
                      ? "bg-[#356E3B] text-white border-[#356E3B] shadow-md" 
                      : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-gray-50"
                  }`}
                >
                  Semua
                </button>
                {categories.map(kat => (
                  <button 
                    key={kat.id}
                    onClick={() => setActiveFilter(kat.name)}
                    className={`px-4 py-2 shrink-0 snap-start rounded-full whitespace-nowrap text-[13px] font-bold transition-all border ${
                      activeFilter.toLowerCase() === kat.name.toLowerCase()
                        ? "bg-[#356E3B] text-white border-[#356E3B] shadow-md" 
                        : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-gray-50"
                    }`}
                  >
                    {kat.name}
                  </button>
                ))}
              </div>

              {displayedAgendas.length > 0 ? (
                displayedAgendas.map(({ agenda, dateStr }) => {
                  const catColor = getAgendaCategoryColor(agenda.type);
                  return (
                    <div 
                      key={agenda.id} 
                      className={`relative ${activeMenuId === agenda.id ? 'z-30' : ''}`}
                    >
                      <div
                        onClick={() => setSelectedAgendaDetail(agenda)}
                        className={`bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] p-5 flex flex-col gap-3 ${catColor.hoverBorder} transition-colors group relative overflow-hidden cursor-pointer`}
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[20px] ${catColor.stripeBg}`} />
                        
                        <div className="flex justify-between items-start pl-2 pr-10">
                          <div className="flex flex-col gap-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge 
                                variant={catColor.variant}
                                size="xs"
                                uppercase
                              >
                                {agenda.type}
                              </Badge>
                              <Badge variant="company" size="xs" uppercase>
                                PERUSAHAAN
                              </Badge>
                            </div>
                            <h3 className="text-[#111827] text-[16px] font-bold leading-tight mt-1">{agenda.title}</h3>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 pl-2">
                          <AgendaCardSchedule
                            startTime={agenda.start_time}
                            endTime={agenda.end_time}
                            isAllDay={agenda.is_all_day}
                            fallbackTime={agenda.time}
                          />
                          {agenda.link_or_location ? (
                            isAgendaUrl(agenda.link_or_location) ? (
                              <div className="flex items-center gap-2 min-w-0">
                                <ExternalLink className="w-[14px] h-[14px] text-[#2563EB] shrink-0" strokeWidth={2.5} />
                                <a
                                  href={formatAgendaUrl(agenda.link_or_location)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline text-[12px] font-medium truncate max-w-[240px]"
                                  title={agenda.link_or_location}
                                >
                                  {agenda.link_or_location}
                                </a>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 min-w-0">
                                <LocationPinIcon className="w-[14px] h-[14px] text-[#6B7280] shrink-0" />
                                <span className="text-[#4B5563] text-[12px] font-medium truncate" title={agenda.link_or_location}>
                                  {agenda.link_or_location}
                                </span>
                              </div>
                            )
                          ) : null}
                        </div>
                      </div>

                      {/* More Action Menu (Titik Tiga) — outside overflow-hidden card */}
                      <div className="absolute top-3 right-3">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setActiveMenuId(activeMenuId === agenda.id ? null : agenda.id); 
                          }}
                          disabled={isDeletingId === agenda.id}
                          className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-50"
                          aria-label="Menu Aksi"
                        >
                          {isDeletingId === agenda.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-[#EF4444] border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <MoreVertical className="w-4 h-4" />
                          )}
                        </button>

                        {activeMenuId === agenda.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-9 w-36 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                handleShareAgenda(agenda);
                              }}
                              className="w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:bg-[#F4F9F6] hover:text-[#356E3B] flex items-center gap-2.5 transition-colors"
                            >
                              <Share2 className="w-3.5 h-3.5 text-gray-500" />
                              <span>Bagikan</span>
                            </button>
                            <div className="h-[1px] bg-gray-100 mx-2" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                handleEditAgenda(agenda, dateStr);
                              }}
                              className="w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:bg-[#F4F9F6] hover:text-[#356E3B] flex items-center gap-2.5 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                              <span>Edit</span>
                            </button>
                            <div className="h-[1px] bg-gray-100 mx-2" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                handleDeleteAgenda(agenda.id);
                              }}
                              disabled={isDeletingId === agenda.id}
                              className="w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors disabled:opacity-50"
                            >
                              {isDeletingId === agenda.id ? (
                                <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              )}
                              <span>{isDeletingId === agenda.id ? "Menghapus..." : "Hapus"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                );
              })
              ) : isLoading ? (
                <CardListSkeleton count={2} type="agenda" />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 opacity-60">
                  <CalendarIcon className="w-12 h-12 text-[#9CA3AF] mb-3" strokeWidth={1.5} />
                  <p className="text-[#6B7280] font-medium">Tidak ada agenda.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Detail Agenda */}
      {selectedAgendaDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={() => setSelectedAgendaDetail(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-[24px] shadow-xl z-10 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge 
                  variant={getAgendaCategoryColor(selectedAgendaDetail.type).variant}
                  size="sm"
                  uppercase
                >
                  {selectedAgendaDetail.type}
                </Badge>
                <Badge variant="company" size="sm" uppercase>
                  PERUSAHAAN
                </Badge>
              </div>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDetailMenuOpen(!isDetailMenuOpen);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                  aria-label="Menu Aksi"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {isDetailMenuOpen && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-9 w-36 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <button
                      onClick={() => {
                        setIsDetailMenuOpen(false);
                        handleShareAgenda(selectedAgendaDetail);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:bg-[#F4F9F6] hover:text-[#356E3B] flex items-center gap-2.5 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 text-gray-500" />
                      <span>Bagikan</span>
                    </button>
                    <div className="h-[1px] bg-gray-100 mx-2" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDetailMenuOpen(false);
                        const item = selectedAgendaDetail;
                        setSelectedAgendaDetail(null);
                        handleEditAgenda(item);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:bg-[#F4F9F6] hover:text-[#356E3B] flex items-center gap-2.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                      <span>Edit</span>
                    </button>
                    <div className="h-[1px] bg-gray-100 mx-2" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDetailMenuOpen(false);
                        const id = selectedAgendaDetail.id;
                        setSelectedAgendaDetail(null);
                        handleDeleteAgenda(id);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Hapus</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <h2 className="text-[20px] font-bold text-[#111827] mb-4 leading-tight">{selectedAgendaDetail.title}</h2>
            
            <div className="flex flex-col gap-3">
              <AgendaDetailSchedule
                startTime={selectedAgendaDetail.start_time}
                endTime={selectedAgendaDetail.end_time}
                isAllDay={selectedAgendaDetail.is_all_day}
                fallbackTime={selectedAgendaDetail.time}
              />
              
              {selectedAgendaDetail.link_or_location && (
                <div className="flex items-center gap-3 bg-[#F9FAFB] p-3 rounded-[14px]">
                  {isAgendaUrl(selectedAgendaDetail.link_or_location) ? (
                    <>
                      <ExternalLink className="w-5 h-5 text-[#356E3B] shrink-0" strokeWidth={2} />
                      <a
                        href={formatAgendaUrl(selectedAgendaDetail.link_or_location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2563EB] hover:underline text-[14px] font-medium truncate flex-1"
                        title={selectedAgendaDetail.link_or_location}
                      >
                        {selectedAgendaDetail.link_or_location}
                      </a>
                    </>
                  ) : (
                    <>
                      <LocationPinIcon className="w-5 h-5 text-[#356E3B] shrink-0" />
                      <span className="text-[#374151] text-[14px] font-medium truncate flex-1">
                        {selectedAgendaDetail.link_or_location}
                      </span>
                    </>
                  )}
                </div>
              )}

              {selectedAgendaDetail.notes && (
                <div className="flex flex-col gap-1.5 bg-[#F9FAFB] p-4 rounded-[14px]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#356E3B] shrink-0" strokeWidth={2} />
                    <h3 className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">
                      Catatan Tambahan
                    </h3>
                  </div>
                  <p className="text-[#374151] text-[14px] leading-relaxed whitespace-pre-wrap">
                    {selectedAgendaDetail.notes}
                  </p>
                </div>
              )}

              {!selectedAgendaDetail.link_or_location && !selectedAgendaDetail.notes && (
                <div className="flex items-center gap-2 text-[#9CA3AF] text-[13px] italic bg-[#F9FAFB] p-3 rounded-[14px]">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Tidak ada catatan atau lokasi tambahan</span>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedAgendaDetail(null);
                  setIsDetailMenuOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-bold active:scale-95 transition-all text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
