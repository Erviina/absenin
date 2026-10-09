"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Calendar as CalendarIcon, Clock, MapPin, Info, Plus, Edit2, Trash2, X, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/TopBar";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomTimePicker } from "@/components/CustomTimePicker";

// Tipe Data untuk Agenda
type AgendaItem = {
  id: string;
  title: string;
  time: string;
  location: string;
  type: string;
  category_id?: string | null;
  link?: string;
  scope: "COMPANY" | "PERSONAL";
  start_time: string;
  end_time: string;
};

export default function AgendaPage() {
  const router = useRouter();
  
  // State Data
  const [agendasMap, setAgendasMap] = useState<Record<string, AgendaItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [categories, setCategories] = useState<any[]>([]);

  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/agendas/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
    }
  }, []);
  
  // State Kalender
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // State Modal
  const [selectedAgendaDetail, setSelectedAgendaDetail] = useState<AgendaItem | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Form Tambah/Edit Agenda
  const [formId, setFormId] = useState("");
  const [formKegiatan, setFormKegiatan] = useState("");
  const [formKategoriId, setFormKategoriId] = useState("");
  const [formTanggal, setFormTanggal] = useState("");
  const [formWaktuMulai, setFormWaktuMulai] = useState("");
  const [formWaktuSelesai, setFormWaktuSelesai] = useState("");
  const [formCatatan, setFormCatatan] = useState("");
  const [formLink, setFormLink] = useState("");
  const [submitError, setSubmitError] = useState("");

  const fetchAgendas = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg("");
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("API URL tidak ditemukan");

      const res = await fetch(`${apiUrl}/agendas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengambil data agenda");
      }

      const newMap: Record<string, AgendaItem[]> = {};
      
      data.data.forEach((item: any) => {
        const startDate = new Date(item.start_time);
        const endDate = new Date(item.end_time);
        
        const dateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        
        const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
        const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
        
        if (!newMap[dateStr]) {
          newMap[dateStr] = [];
        }
        
        newMap[dateStr].push({
          id: item.id,
          title: item.title,
          time: `${startTimeStr} - ${endTimeStr} WIB`,
          location: item.notes || "Tanpa Keterangan",
          type: item.category?.name || "Lainnya",
          category_id: item.category?.id || null,
          scope: item.type === "COMPANY" ? "COMPANY" : "PERSONAL",
          start_time: item.start_time,
          end_time: item.end_time,
        });
      });
      
      setAgendasMap(newMap);
    } catch (err: any) {
      console.error("Fetch agendas error:", err);
      setErrorMsg(err.message || "Terjadi kesalahan sistem");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

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

  const handleOpenAddModal = () => {
    setFormId("");
    setFormKegiatan("");
    if (categories.length > 0) {
      setFormKategoriId(categories[0].id);
    } else {
      setFormKategoriId("");
    }
    setFormTanggal(selectedDateStr || "");
    setFormWaktuMulai("");
    setFormWaktuSelesai("");
    setFormCatatan("");
    setFormLink("");
    setSubmitError("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (agenda: AgendaItem) => {
    setFormId(agenda.id);
    setFormKegiatan(agenda.title);
    setFormKategoriId(agenda.category_id || (categories.length > 0 ? categories[0].id : ""));
    
    const timeMatch = agenda.time.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (timeMatch) {
      setFormWaktuMulai(timeMatch[1]);
      setFormWaktuSelesai(timeMatch[2]);
    } else {
      setFormWaktuMulai("");
      setFormWaktuSelesai("");
    }
    
    const d = new Date(agenda.start_time);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setFormTanggal(dateStr);
    
    setFormCatatan(agenda.location !== "Tanpa Keterangan" ? agenda.location : "");
    setFormLink(agenda.link || "");
    setSubmitError("");
    
    setSelectedAgendaDetail(null);
    setIsFormModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (!formKegiatan.trim()) {
      setSubmitError("Judul agenda wajib diisi");
      return;
    }
    if (!formTanggal || !formWaktuMulai || !formWaktuSelesai) {
      setSubmitError("Waktu pelaksanaan wajib diisi lengkap");
      return;
    }

    const startDateTime = new Date(`${formTanggal}T${formWaktuMulai}:00`);
    const endDateTime = new Date(`${formTanggal}T${formWaktuSelesai}:00`);

    if (endDateTime <= startDateTime) {
      setSubmitError("Waktu selesai harus setelah waktu mulai");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      const payload: any = {
        title: formKegiatan,
        notes: formCatatan || "",
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        agenda_category_id: formKategoriId || null,
      };

      let url = `${apiUrl}/agendas`;
      let method = "POST";

      if (formId) {
        url = `${apiUrl}/agendas/${formId}`;
        method = "PATCH";
      } else {
        payload.type = "PERSONAL"; // Wajib untuk POST di frontend ini
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Gagal menyimpan agenda");

      setIsFormModalOpen(false);
      fetchAgendas();
    } catch (err: any) {
      setSubmitError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAgendaDetail) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      const res = await fetch(`${apiUrl}/agendas/${selectedAgendaDetail.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Gagal menghapus agenda");

      setIsDeleteModalOpen(false);
      setSelectedAgendaDetail(null);
      fetchAgendas();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Logika Menampilkan Agenda
  let displayedAgendas: { agenda: AgendaItem, dateStr: string }[] = [];
  if (selectedDateStr) {
    const list = agendasMap[selectedDateStr] || [];
    displayedAgendas = list.map(a => ({ agenda: a, dateStr: selectedDateStr }));
  } else {
    Object.keys(agendasMap).forEach(dateStr => {
      const [y, m] = dateStr.split('-');
      if (parseInt(y) === currentDate.getFullYear() && parseInt(m) === currentDate.getMonth() + 1) {
        agendasMap[dateStr].forEach(a => {
          displayedAgendas.push({ agenda: a, dateStr });
        });
      }
    });
    displayedAgendas.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }

  if (activeFilter !== "Semua") {
    displayedAgendas = displayedAgendas.filter(a => a.agenda.type === activeFilter);
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8] relative pb-32">
      {/* Header */}
      <TopBar 
        title="Agenda"
        onBack={() => router.push("/dashboard")}
        rightAction={
          <button 
            onClick={handleOpenAddModal}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white transition-colors hover:bg-white/30"
          >
            <Plus className="w-6 h-6" />
          </button>
        }
      />

      <div className="px-6 pt-6 flex flex-col flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center flex-1 py-12">
            <div className="w-8 h-8 border-4 border-[#356E3B] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#6B7280] text-[14px] font-medium">Memuat data agenda...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center flex-1 py-12 px-4 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
              <Info className="w-6 h-6" />
            </div>
            <p className="text-[#EF4444] text-[14px] font-bold mb-2">Gagal Memuat Agenda</p>
            <p className="text-[#6B7280] text-[13px]">{errorMsg}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-[#356E3B] text-white text-[13px] font-bold rounded-full hover:bg-[#2A582F] transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 bg-[#E8F3EB] border border-[#D1E5D5] rounded-xl p-3 flex items-start gap-2 shadow-sm">
              <Info className="w-5 h-5 text-[#356E3B] shrink-0 mt-0.5" />
              <p className="text-[#2D5A3F] text-[12px] font-medium leading-tight">
                Ini adalah halaman agenda. Anda dapat melihat agenda perusahaan dan mengelola agenda pribadi Anda.
              </p>
            </div>

            {/* Kalender Card */}
            <div className="mb-6 px-1">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[16px] font-bold text-[#111827]">
                  {currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                  <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[#4B5563] shadow-sm hover:bg-gray-50 border border-[#E5E7EB]">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[#4B5563] shadow-sm hover:bg-gray-50 border border-[#E5E7EB] rotate-180">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                  <div key={day} className="text-[12px] font-bold text-[#6B7280]">
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

                  return (
                    <div 
                      key={day} 
                      onClick={() => handleDateClick(day)}
                      className={`h-9 flex flex-col items-center justify-center relative cursor-pointer rounded-full transition-all ${
                        isSelected ? "bg-[#356E3B] text-white font-bold shadow-md" : "text-[#374151] hover:bg-[#F3F4F6] font-medium"
                      }`}
                    >
                      <span className="text-[14px]">{day}</span>
                      {hasAgenda && (
                        <div className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? 'bg-white' : 'bg-[#EF4444]'}`} />
                      )}
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
                <div className="bg-[#E8F3EB] px-3 py-1.5 rounded-full border border-[#D1E5D5]">
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
                      activeFilter === kat.name 
                        ? "bg-[#356E3B] text-white border-[#356E3B] shadow-md" 
                        : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-gray-50"
                    }`}
                  >
                    {kat.name}
                  </button>
                ))}
              </div>

              {displayedAgendas.length > 0 ? (
                displayedAgendas.map(({ agenda, dateStr }) => (
                  <div 
                    key={agenda.id} 
                    onClick={() => setSelectedAgendaDetail(agenda)}
                    className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] p-5 flex flex-col gap-3 hover:border-[#356E3B] transition-colors group relative overflow-hidden cursor-pointer"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[20px] ${agenda.scope === 'COMPANY' ? 'bg-[#356E3B]' : 'bg-[#F59E0B]'}`} />
                    
                    <div className="flex justify-between items-start pl-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className={`px-2.5 py-1 w-fit rounded-full flex items-center border ${
                            agenda.type === "Rapat" ? "bg-[#E8F3EB] border-[#D1E5D5] text-[#356E3B]" :
                            agenda.type === "Acara" ? "bg-[#FFFBEB] border-[#FEF3C7] text-[#D97706]" :
                            agenda.type === "Review" ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]" :
                            agenda.type === "Tenggat" ? "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]" :
                            "bg-[#F3F4F6] border-[#E5E7EB] text-[#4B5563]"
                          }`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{agenda.type}</span>
                          </div>
                          {agenda.scope === "COMPANY" ? (
                            <span className="bg-[#E0E7FF] text-[#4338CA] px-2 py-0.5 rounded text-[10px] font-bold border border-[#C7D2FE]">PERUSAHAAN</span>
                          ) : (
                            <span className="bg-[#FEF3C7] text-[#D97706] px-2 py-0.5 rounded text-[10px] font-bold border border-[#FDE68A]">PRIBADI</span>
                          )}
                        </div>
                        <h3 className="text-[#111827] text-[16px] font-bold leading-tight pr-4 mt-1">{agenda.title}</h3>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 pl-2">
                      {!selectedDateStr && (
                         <div className="flex items-center gap-2">
                           <CalendarIcon className="w-[14px] h-[14px] text-[#6B7280]" strokeWidth={2.5} />
                           <span className="text-[#4B5563] text-[12px] font-medium">{dateStr}</span>
                         </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-[14px] h-[14px] text-[#6B7280]" strokeWidth={2.5} />
                        <span className="text-[#4B5563] text-[12px] font-medium">{agenda.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-[14px] h-[14px] text-[#6B7280]" strokeWidth={2.5} />
                        <span className="text-[#4B5563] text-[12px] font-medium">{agenda.location}</span>
                      </div>
                    </div>
                  </div>
                ))
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

      <BottomNav activeTab="agenda" />



      {/* Modal Detail Agenda */}
      {selectedAgendaDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={() => setSelectedAgendaDetail(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-[24px] shadow-xl z-10 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 w-fit rounded-full flex items-center border ${
                  selectedAgendaDetail.type === "Rapat" ? "bg-[#E8F3EB] border-[#D1E5D5] text-[#356E3B]" :
                  selectedAgendaDetail.type === "Acara" ? "bg-[#FFFBEB] border-[#FEF3C7] text-[#D97706]" :
                  selectedAgendaDetail.type === "Review" ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]" :
                  selectedAgendaDetail.type === "Tenggat" ? "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]" :
                  "bg-[#F3F4F6] border-[#E5E7EB] text-[#4B5563]"
                }`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider">{selectedAgendaDetail.type}</span>
                </div>
                {selectedAgendaDetail.scope === "COMPANY" ? (
                  <span className="bg-[#E0E7FF] text-[#4338CA] px-2 py-1 rounded text-[10px] font-bold border border-[#C7D2FE]">PERUSAHAAN</span>
                ) : (
                  <span className="bg-[#FEF3C7] text-[#D97706] px-2 py-1 rounded text-[10px] font-bold border border-[#FDE68A]">PRIBADI</span>
                )}
              </div>
              <button onClick={() => setSelectedAgendaDetail(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <h2 className="text-[20px] font-bold text-[#111827] mb-4 leading-tight">{selectedAgendaDetail.title}</h2>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-[#F9FAFB] p-3 rounded-[14px]">
                <Clock className="w-5 h-5 text-[#356E3B]" strokeWidth={2} />
                <span className="text-[#374151] text-[14px] font-medium">{selectedAgendaDetail.time}</span>
              </div>
              
              <div className="flex flex-col gap-2 bg-[#F9FAFB] p-4 rounded-[14px]">
                <h3 className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">Catatan Tambahan / Lokasi</h3>
                <p className="text-[#374151] text-[14px] leading-relaxed whitespace-pre-wrap">
                  {selectedAgendaDetail.location}
                </p>
              </div>
            </div>

            {/* Action Buttons - Only for PERSONAL */}
            {selectedAgendaDetail.scope === "PERSONAL" && (
              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-100">
                <button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex-1 py-3 text-[#EF4444] bg-red-50 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </button>
                <button 
                  onClick={() => handleOpenEditModal(selectedAgendaDetail)}
                  className="flex-1 py-3 text-white bg-[#356E3B] rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-[#2A582F] transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={() => !isSubmitting && setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[24px] shadow-xl z-10 p-6 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-[18px] font-bold text-[#111827] mb-2">Hapus Agenda?</h3>
            <p className="text-[#6B7280] text-[14px] mb-6">Agenda ini akan dihapus secara permanen dan tidak dapat dikembalikan.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 text-[#4B5563] bg-gray-100 rounded-xl font-bold text-[14px] hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 py-3 text-white bg-red-500 rounded-xl font-bold text-[14px] hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Hapus"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Tambah/Edit dengan UI Identik Admin */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={() => !isSubmitting && setIsFormModalOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-xl z-10 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
              <h2 className="text-[18px] font-bold text-[#111827]">
                {formId ? "Edit Agenda Pribadi" : "Tambah Agenda Pribadi"}
              </h2>
              <button onClick={() => setIsFormModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex flex-col gap-5">
              
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

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#374151]">
                  Tanggal Agenda <span className="text-[#EF4444]">*</span>
                </label>
                <div className="flex w-full">
                  <CustomDatePicker 
                    value={formTanggal}
                    onChange={setFormTanggal}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#374151]">
                  Waktu Pelaksanaan <span className="text-[#EF4444]">*</span>
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <CustomTimePicker 
                      value={formWaktuMulai}
                      onChange={setFormWaktuMulai}
                      placeholder="Mulai"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <CustomTimePicker 
                      value={formWaktuSelesai}
                      onChange={setFormWaktuSelesai}
                      placeholder="Selesai"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#374151]">
                  Link Tautan / Lokasi (Opsional)
                </label>
                <input 
                  type="url"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="Misal: https://meet.google.com/..."
                  className="w-full border border-[#E5E7EB] rounded-[14px] px-4 py-3.5 text-[14px] text-[#111827] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all bg-white font-medium"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[13px] font-bold text-[#374151]">
                    Catatan Tambahan
                  </label>
                  <span className="text-[11px] font-bold text-[#6B7280]">
                    {formCatatan.length} / 200 karakter
                  </span>
                </div>
                <textarea 
                  rows={3}
                  maxLength={200}
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Misal: Bawa dokumen presentasi..." 
                  className="w-full border border-[#E5E7EB] rounded-[14px] px-4 py-3.5 text-[14px] text-[#4B5563] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all resize-none"
                />
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-[13px] font-medium flex items-center gap-2 mt-2">
                  <Info className="w-4 h-4 shrink-0" />
                  {submitError}
                </div>
              )}

              <div className="pt-2 pb-4">
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formTanggal || !formWaktuMulai || !formWaktuSelesai}
                  className="w-full bg-[#356E3B] hover:bg-[#2A582F] disabled:bg-[#A3B8A8] text-white rounded-full py-4 flex items-center justify-center gap-2 font-bold text-[15px] shadow-sm transition-colors active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
                      {formId ? "Simpan Perubahan" : "Simpan Agenda Pribadi"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
