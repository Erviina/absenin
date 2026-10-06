"use client";

import { useState } from "react";
import { ChevronLeft, Plus, Calendar as CalendarIcon, Clock, MapPin, CheckCircle2, Info } from "lucide-react";
import { useRouter } from "next/navigation";
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
  type: "Rapat" | "Acara" | "Review" | "Tenggat" | "Lainnya";
  link?: string;
};

// Data Dummy Awal
const INITIAL_AGENDAS: Record<string, AgendaItem[]> = {
  "2026-09-18": [
    { id: "1", title: "Meeting Project A", time: "09:00 - 10:30 WIB", location: "Ruang Rapat 1", type: "Rapat", link: "https://meet.google.com/abc" },
    { id: "2", title: "Review Desain Absenin", time: "13:00 - 14:00 WIB", location: "Online", type: "Review", link: "https://meet.google.com/xyz" }
  ],
  "2026-09-20": [
    { id: "3", title: "Team Building", time: "08:00 - 15:00 WIB", location: "Taman Kota", type: "Acara" }
  ]
};

export default function AdminAgendaPage() {
  const router = useRouter();
  
  // State Navigasi
  const [isAddingAgenda, setIsAddingAgenda] = useState(false);
  
  // State Data
  const [agendasMap, setAgendasMap] = useState<Record<string, AgendaItem[]>>(INITIAL_AGENDAS);
  
  // State Kalender
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 18)); // September 2026
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // State Form Tambah Agenda
  const [formKegiatan, setFormKegiatan] = useState("");
  const [formKategori, setFormKategori] = useState<AgendaItem["type"]>("Rapat");
  const [formTanggal, setFormTanggal] = useState("");
  const [formWaktuMulai, setFormWaktuMulai] = useState("");
  const [formWaktuSelesai, setFormWaktuSelesai] = useState("");
  const [formCatatan, setFormCatatan] = useState("");
  const [formLink, setFormLink] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("Semua");

  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [selectedAgendaDetail, setSelectedAgendaDetail] = useState<AgendaItem | null>(null);

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

  const handleOpenAdd = () => {
    setEditingAgendaId(null);
    setFormKegiatan("");
    setFormKategori("Rapat");
    setFormTanggal(selectedDateStr || "");
    setFormWaktuMulai("");
    setFormWaktuSelesai("");
    setFormCatatan("");
    setFormLink("");
    setIsAddingAgenda(true);
  };

  const handleEditAgenda = (agenda: AgendaItem, dateStr: string) => {
    setEditingAgendaId(agenda.id);
    setFormKegiatan(agenda.title);
    setFormKategori(agenda.type);
    setFormTanggal(dateStr);
    
    // Parse time if it matches "HH:mm - HH:mm WIB"
    const timeMatch = agenda.time.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (timeMatch) {
      setFormWaktuMulai(timeMatch[1]);
      setFormWaktuSelesai(timeMatch[2]);
    } else {
      setFormWaktuMulai("");
      setFormWaktuSelesai("");
    }
    
    setFormCatatan(agenda.location !== "Tanpa Keterangan" ? agenda.location : "");
    setFormLink(agenda.link || "");
    setIsAddingAgenda(true);
  };

  const handleDeleteAgenda = (id: string, dateStr: string) => {
    setAgendasMap(prev => {
      const existing = prev[dateStr] || [];
      return {
        ...prev,
        [dateStr]: existing.filter(a => a.id !== id)
      };
    });
  };

  const handleSubmitAgenda = () => {
    if (!formTanggal || !formWaktuMulai || !formWaktuSelesai || !formKegiatan) return;

    const newAgenda: AgendaItem = {
      id: editingAgendaId || Date.now().toString(),
      title: formKegiatan,
      time: `${formWaktuMulai} - ${formWaktuSelesai} WIB`,
      location: formCatatan || "Tanpa Keterangan",
      type: formKategori,
      link: formLink
    };

    setAgendasMap(prev => {
      const cleanedMap = { ...prev };
      if (editingAgendaId) {
        Object.keys(cleanedMap).forEach(key => {
          cleanedMap[key] = cleanedMap[key].filter(a => a.id !== editingAgendaId);
        });
      }

      const existing = cleanedMap[formTanggal] || [];
      return {
        ...cleanedMap,
        [formTanggal]: [...existing, newAgenda]
      };
    });

    // Reset Form
    setFormKegiatan("");
    setFormKategori("Rapat");
    setFormTanggal("");
    setFormWaktuMulai("");
    setFormWaktuSelesai("");
    setFormCatatan("");
    setFormLink("");
    setIsAddingAgenda(false);
    setEditingAgendaId(null);
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
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8] relative pb-8">
      {/* Header */}
      <TopBar 
        title={isAddingAgenda ? (editingAgendaId ? "Ubah Agenda Karyawan" : "Tambah Agenda Karyawan") : "Kelola Agenda (Admin)"}
        onBack={() => isAddingAgenda ? setIsAddingAgenda(false) : router.push("/admin/dashboard")}
        rightAction={
          !isAddingAgenda ? (
            <button 
              onClick={handleOpenAdd}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white transition-colors hover:bg-white/30"
            >
              <Plus className="w-6 h-6" />
            </button>
          ) : null
        }
      />

      <div className="px-6 pt-6 flex flex-col flex-1">
        
        {/* Info Banner for Admin */}
        {!isAddingAgenda && (
          <div className="mb-4 bg-[#E8F3EB] border border-[#D1E5D5] rounded-xl p-3 flex items-start gap-2 shadow-sm">
            <Info className="w-5 h-5 text-[#356E3B] shrink-0 mt-0.5" />
            <p className="text-[#2D5A3F] text-[12px] font-medium leading-tight">
              Agenda yang Anda buat di sini akan otomatis disiarkan dan terlihat pada jadwal <b>seluruh karyawan</b>.
            </p>
          </div>
        )}

        {isAddingAgenda ? (
          /* FORM TAMBAH AGENDA */
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
                    value={formKategori}
                    onChange={(val) => setFormKategori(val as AgendaItem["type"])}
                    options={[
                      { value: "Rapat", label: "Rapat" },
                      { value: "Acara", label: "Acara" },
                      { value: "Review", label: "Review" },
                      { value: "Tenggat", label: "Tenggat (Deadline)" },
                      { value: "Lainnya", label: "Lainnya" }
                    ]}
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
                  rows={4}
                  maxLength={200}
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Misal: Bawa dokumen presentasi..." 
                  className="w-full border border-[#E5E7EB] rounded-[14px] px-4 py-3.5 text-[14px] text-[#4B5563] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all resize-none"
                />
              </div>

            </div>

            <button 
              onClick={handleSubmitAgenda}
              disabled={!formTanggal || !formWaktuMulai || !formWaktuSelesai}
              className="w-full bg-[#356E3B] hover:bg-[#2A582F] disabled:bg-[#A3B8A8] text-white rounded-full py-4 mt-2 flex items-center justify-center gap-2 font-bold text-[15px] shadow-sm transition-colors active:scale-[0.98]"
            >
              <CheckCircle2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
              {editingAgendaId ? "Simpan Perubahan" : "Simpan Agenda ke Semua"}
            </button>
          </div>
        ) : (
          /* MAIN CONTENT (KALENDER & LIST) */
          <>
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
                {["Semua", "Rapat", "Acara", "Review", "Tenggat", "Lainnya"].map(kat => (
                  <button 
                    key={kat}
                    onClick={() => setActiveFilter(kat)}
                    className={`px-4 py-2 shrink-0 snap-start rounded-full whitespace-nowrap text-[13px] font-bold transition-all border ${
                      activeFilter === kat 
                        ? "bg-[#356E3B] text-white border-[#356E3B] shadow-md" 
                        : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-gray-50"
                    }`}
                  >
                    {kat}
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
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#356E3B] rounded-l-[20px]" />
                    
                    <div className="flex justify-between items-start pl-2">
                      <div className="flex flex-col gap-1">
                        <div className={`px-2.5 py-1 w-fit rounded-full flex items-center border ${
                          agenda.type === "Rapat" ? "bg-[#E8F3EB] border-[#D1E5D5] text-[#356E3B]" :
                          agenda.type === "Acara" ? "bg-[#FFFBEB] border-[#FEF3C7] text-[#D97706]" :
                          agenda.type === "Review" ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]" :
                          agenda.type === "Tenggat" ? "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]" :
                          "bg-[#F3F4F6] border-[#E5E7EB] text-[#4B5563]"
                        }`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider">{agenda.type}</span>
                        </div>
                        <h3 className="text-[#111827] text-[16px] font-bold leading-tight pr-4 mt-1">{agenda.title}</h3>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 opacity-100">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditAgenda(agenda, dateStr); }}
                          className="w-8 h-8 rounded-full bg-[#F3F4F6] text-[#4B5563] flex items-center justify-center hover:bg-[#E5E7EB] transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteAgenda(agenda.id, dateStr); }}
                          className="w-8 h-8 rounded-full bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center hover:bg-[#FEE2E2] transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
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
                      {agenda.link && (
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#356E3B]"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                          <a href={agenda.link} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="text-[#356E3B] text-[12px] font-bold hover:underline truncate max-w-[200px]">
                            {agenda.link}
                          </a>
                        </div>
                      )}
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

      {/* Modal Detail Agenda */}
      {selectedAgendaDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={() => setSelectedAgendaDetail(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-[24px] shadow-xl z-10 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className={`px-3 py-1 w-fit rounded-full flex items-center border ${
                selectedAgendaDetail.type === "Rapat" ? "bg-[#E8F3EB] border-[#D1E5D5] text-[#356E3B]" :
                selectedAgendaDetail.type === "Acara" ? "bg-[#FFFBEB] border-[#FEF3C7] text-[#D97706]" :
                selectedAgendaDetail.type === "Review" ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]" :
                selectedAgendaDetail.type === "Tenggat" ? "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]" :
                "bg-[#F3F4F6] border-[#E5E7EB] text-[#4B5563]"
              }`}>
                <span className="text-[11px] font-bold uppercase tracking-wider">{selectedAgendaDetail.type}</span>
              </div>
              <button onClick={() => setSelectedAgendaDetail(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <h2 className="text-[20px] font-bold text-[#111827] mb-4 leading-tight">{selectedAgendaDetail.title}</h2>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-[#F9FAFB] p-3 rounded-[14px]">
                <Clock className="w-5 h-5 text-[#356E3B]" strokeWidth={2} />
                <span className="text-[#374151] text-[14px] font-medium">{selectedAgendaDetail.time}</span>
              </div>
              
              {selectedAgendaDetail.link && (
                <div className="flex items-center gap-3 bg-[#F9FAFB] p-3 rounded-[14px]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#356E3B]"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  <a href={selectedAgendaDetail.link} target="_blank" rel="noreferrer" className="text-[#356E3B] text-[14px] font-bold hover:underline truncate">
                    {selectedAgendaDetail.link}
                  </a>
                </div>
              )}
              
              <div className="flex flex-col gap-2 bg-[#F9FAFB] p-4 rounded-[14px]">
                <h3 className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">Catatan Tambahan / Lokasi</h3>
                <p className="text-[#374151] text-[14px] leading-relaxed whitespace-pre-wrap">
                  {selectedAgendaDetail.location}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
