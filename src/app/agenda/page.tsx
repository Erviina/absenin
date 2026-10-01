"use client";

import { useState } from "react";
import { ChevronLeft, Plus, Calendar as CalendarIcon, Clock, MapPin, ChevronDown, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/TopBar";

// Tipe Data untuk Agenda
type AgendaItem = {
  id: string;
  title: string;
  time: string;
  location: string;
  type: "meeting" | "event" | "task";
};

// Data Dummy Awal
const INITIAL_AGENDAS: Record<string, AgendaItem[]> = {
  "2026-09-18": [
    { id: "1", title: "Meeting Project A", time: "09:00 - 10:30 WIB", location: "Ruang Rapat 1", type: "meeting" },
    { id: "2", title: "Review Desain Absenin", time: "13:00 - 14:00 WIB", location: "Online (Google Meet)", type: "meeting" }
  ],
  "2026-09-20": [
    { id: "3", title: "Team Building", time: "08:00 - 15:00 WIB", location: "Taman Kota", type: "event" }
  ]
};

export default function AgendaPage() {
  const router = useRouter();
  
  // State Navigasi
  const [isAddingAgenda, setIsAddingAgenda] = useState(false);
  
  // State Data
  const [agendasMap, setAgendasMap] = useState<Record<string, AgendaItem[]>>(INITIAL_AGENDAS);
  
  // State Kalender
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 18)); // September 2026
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // State Form Tambah Agenda
  const [formKegiatan, setFormKegiatan] = useState("Meeting Internal");
  const [formTanggal, setFormTanggal] = useState("");
  const [formWaktuMulai, setFormWaktuMulai] = useState("");
  const [formWaktuSelesai, setFormWaktuSelesai] = useState("");
  const [formCatatan, setFormCatatan] = useState("");

  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);

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
    setFormKegiatan("Meeting Internal");
    setFormTanggal(selectedDateStr || "");
    setFormWaktuMulai("");
    setFormWaktuSelesai("");
    setFormCatatan("");
    setIsAddingAgenda(true);
  };

  const handleEditAgenda = (agenda: AgendaItem, dateStr: string) => {
    setEditingAgendaId(agenda.id);
    setFormKegiatan(agenda.title);
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
    if (!formTanggal || !formWaktuMulai || !formWaktuSelesai) return;

    const newAgenda: AgendaItem = {
      id: editingAgendaId || Date.now().toString(),
      title: formKegiatan,
      time: `${formWaktuMulai} - ${formWaktuSelesai} WIB`,
      location: formCatatan || "Tanpa Keterangan",
      type: "meeting"
    };

    setAgendasMap(prev => {
      // First, if editing, remove the old one from all dates to be safe (or just the old date)
      // For simplicity, let's just remove it from everywhere first
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
    setFormKegiatan("Meeting Internal");
    setFormTanggal("");
    setFormWaktuMulai("");
    setFormWaktuSelesai("");
    setFormCatatan("");
    setIsAddingAgenda(false);
    setEditingAgendaId(null);
  };

  // Logika Menampilkan Agenda
  let displayedAgendas: { agenda: AgendaItem, dateStr: string }[] = [];
  if (selectedDateStr) {
    const list = agendasMap[selectedDateStr] || [];
    displayedAgendas = list.map(a => ({ agenda: a, dateStr: selectedDateStr }));
  } else {
    // Tampilkan semua agenda di bulan ini
    Object.keys(agendasMap).forEach(dateStr => {
      const [y, m] = dateStr.split('-');
      if (parseInt(y) === currentDate.getFullYear() && parseInt(m) === currentDate.getMonth() + 1) {
        agendasMap[dateStr].forEach(a => {
          displayedAgendas.push({ agenda: a, dateStr });
        });
      }
    });
    // Sort by date roughly
    displayedAgendas.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8] relative pb-32">
      {/* Header */}
      <TopBar 
        title={isAddingAgenda ? (editingAgendaId ? "Ubah Agenda" : "Tambah Agenda") : "Agenda & Jadwal"}
        onBack={() => isAddingAgenda ? setIsAddingAgenda(false) : router.back()}
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
        {isAddingAgenda ? (
          /* FORM TAMBAH AGENDA */
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8F3EB] flex flex-col gap-6">
              
              {/* Kategori / Nama Kegiatan */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#374151]">
                  Nama Kegiatan / Agenda <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <select 
                    value={formKegiatan}
                    onChange={(e) => setFormKegiatan(e.target.value)}
                    className="w-full border border-[#E5E7EB] rounded-[14px] pl-4 pr-10 py-3.5 text-[14px] text-[#111827] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all appearance-none bg-white font-medium cursor-pointer"
                  >
                    <option>Meeting Internal</option>
                    <option>Meeting Klien</option>
                    <option>Acara Kantor</option>
                  </select>
                  <ChevronDown className="w-5 h-5 text-[#4B5563] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Tanggal Agenda */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#374151]">
                  Tanggal Agenda <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <CalendarIcon className="w-[18px] h-[18px] text-[#356E3B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.5} />
                  <input 
                    type="date" 
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                    className="w-full border border-[#E5E7EB] rounded-[14px] pl-10 pr-4 py-3.5 text-[14px] font-medium text-[#111827] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all bg-white [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                  />
                </div>
              </div>

              {/* Waktu Pelaksanaan */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#374151]">
                  Waktu Pelaksanaan <span className="text-[#EF4444]">*</span>
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Clock className="w-[18px] h-[18px] text-[#356E3B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.5} />
                    <input 
                      type="time" 
                      value={formWaktuMulai}
                      onChange={(e) => setFormWaktuMulai(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                      className="w-full border border-[#E5E7EB] rounded-[14px] pl-10 pr-4 py-3.5 text-[14px] font-medium text-[#111827] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all bg-white [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <Clock className="w-[18px] h-[18px] text-[#356E3B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.5} />
                    <input 
                      type="time" 
                      value={formWaktuSelesai}
                      onChange={(e) => setFormWaktuSelesai(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                      className="w-full border border-[#E5E7EB] rounded-[14px] pl-10 pr-4 py-3.5 text-[14px] font-medium text-[#111827] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all bg-white [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Catatan Tambahan */}
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
              {editingAgendaId ? "Simpan Perubahan" : "Simpan Agenda"}
            </button>
          </div>
        ) : (
          /* MAIN CONTENT (KALENDER & LIST) */
          <>
            {/* Kalender Card */}
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E5E7EB] mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[16px] font-bold text-[#111827]">
                  {currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                  <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB] rotate-180">
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

              {displayedAgendas.length > 0 ? (
                displayedAgendas.map(({ agenda, dateStr }) => (
                  <div key={agenda.id} className="bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] p-5 flex flex-col gap-3 hover:border-[#356E3B] transition-colors group relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#356E3B] rounded-l-[20px]" />
                    
                    <div className="flex justify-between items-start pl-2">
                      <div className="flex flex-col gap-1">
                        <div className={`px-2.5 py-1 w-fit rounded-full flex items-center border ${
                          agenda.type === "meeting" ? "bg-[#E8F3EB] border-[#D1E5D5] text-[#356E3B]" :
                          agenda.type === "event" ? "bg-[#FFFBEB] border-[#FEF3C7] text-[#D97706]" :
                          "bg-[#F3F4F6] border-[#E5E7EB] text-[#4B5563]"
                        }`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider">{agenda.type}</span>
                        </div>
                        <h3 className="text-[#111827] text-[16px] font-bold leading-tight pr-4 mt-1">{agenda.title}</h3>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 opacity-100">
                        <button 
                          onClick={() => handleEditAgenda(agenda, dateStr)}
                          className="w-8 h-8 rounded-full bg-[#F3F4F6] text-[#4B5563] flex items-center justify-center hover:bg-[#E5E7EB] transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteAgenda(agenda.id, dateStr)}
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

      {!isAddingAgenda && <BottomNav activeTab="agenda" />}
    </div>
  );
}
