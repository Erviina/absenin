"use client";

import { ChevronLeft, Building2, Pencil, Clock, ChevronRight, MapPin, X, Save, Target, Calendar, UserPlus, QrCode, AlignLeft, Send, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";

interface Schedule {
  id: string;
  days: string;
  hours: string;
  type?: 'kerja' | 'libur';
  notes?: string;
}

interface SpecialSchedule {
  id: string;
  date: string;
  name: string;
}

export default function KelolaPerusahaanPage() {
  const router = useRouter();

  // State for the modal and data
  const [isUbahLokasiOpen, setIsUbahLokasiOpen] = useState(false);
  
  // Data state
  const [lat, setLat] = useState("-6.9175");
  const [lng, setLng] = useState("107.6191");
  const [radius, setRadius] = useState(100);

  // Temp state for modal inputs
  const [tempLat, setTempLat] = useState(lat);
  const [tempLng, setTempLng] = useState(lng);
  const [tempRadius, setTempRadius] = useState(radius);

  // Jadwal State
  const [isKelolaJadwalOpen, setIsKelolaJadwalOpen] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([
    { id: "1", days: "Senin – Jumat", hours: "08:00 - 17:00" },
    { id: "2", days: "Sabtu", hours: "08:00 - 12:00" }
  ]);
  const [specialSchedules, setSpecialSchedules] = useState<SpecialSchedule[]>([
    { id: "s1", date: "1 Jan 2025", name: "Tahun Baru" },
    { id: "s2", date: "27 Jan 2025", name: "Isra Mi'raj" },
    { id: "s3", date: "29 Mar 2025", name: "Nyepi" }
  ]);

  // Edit Jadwal State
  const [isEditJadwalOpen, setIsEditJadwalOpen] = useState(false);
  const [jadwalForm, setJadwalForm] = useState({
    id: "",
    type: "kerja",
    hari: "Senin",
    jamMulai: "08:00",
    jamSelesai: "17:00",
    keterangan: ""
  });

  // Undang / Tambah Karyawan State
  const [isUndangKaryawanOpen, setIsUndangKaryawanOpen] = useState(false);
  const [isTambahKaryawanOpen, setIsTambahKaryawanOpen] = useState(false);
  const [undangForm, setUndangForm] = useState({
    emails: "",
    jabatan: "",
    divisi: ""
  });

  const handleAddSchedule = () => {
    setJadwalForm({ id: "", type: "kerja", hari: "Senin", jamMulai: "08:00", jamSelesai: "17:00", keterangan: "" });
    setIsEditJadwalOpen(true);
  };

  const handleEditSchedule = (sched: Schedule) => {
    const [start, end] = sched.hours.split(" - ");
    setJadwalForm({
      id: sched.id,
      type: sched.type || "kerja",
      hari: sched.days,
      jamMulai: start || "08:00",
      jamSelesai: end || "17:00",
      keterangan: sched.notes || ""
    });
    setIsEditJadwalOpen(true);
  };

  const handleSaveJadwal = () => {
    const newHours = `${jadwalForm.jamMulai} - ${jadwalForm.jamSelesai}`;
    if (jadwalForm.id) {
      // Edit
      setSchedules(schedules.map(s => s.id === jadwalForm.id ? { ...s, days: jadwalForm.hari, hours: newHours, notes: jadwalForm.keterangan } : s));
    } else {
      // Add
      setSchedules([...schedules, { id: Date.now().toString(), days: jadwalForm.hari, hours: newHours, notes: jadwalForm.keterangan }]);
    }
    setIsEditJadwalOpen(false);
  };

  const openModal = () => {
    setTempLat(lat);
    setTempLng(lng);
    setTempRadius(radius);
    setIsUbahLokasiOpen(true);
  };

  const handleSimpan = () => {
    setLat(tempLat);
    setLng(tempLng);
    setRadius(tempRadius);
    setIsUbahLokasiOpen(false);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative">
      
      {/* Header */}
      <TopBar title="Kelola Perusahaan" />

      {/* Main Content */}
      <div className="flex-1 px-5 py-5 flex flex-col gap-4 z-10">
        
        {/* Ringkasan Lokasi Card */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col">
          <div className="flex justify-between items-start">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-[#e6f0ea] rounded-[12px] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[#356E3B]" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col justify-center">
                <h2 className="text-[#1E4738] text-[15px] font-bold leading-tight mb-1">Ringkasan Lokasi</h2>
                <p className="text-[#7d998c] text-[11px] font-medium">Lat/Long: {lat}, {lng}</p>
              </div>
            </div>
            <span className="bg-[#e6f0ea] text-[#356E3B] text-[11px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap">
              Radius {radius}m
            </span>
          </div>

          {/* Mock Map */}
          <div className="relative w-full h-[140px] bg-[#eef5f0] rounded-[16px] overflow-hidden my-5 border border-[#dce9df]">
            {/* SVG Roads / Paths */}
            <svg className="absolute inset-0 w-full h-full text-[#cce0d4]" preserveAspectRatio="none" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg">
              <path d="M-20,70 Q100,40 180,90 T320,60" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6,6" />
              <path d="M220,-20 Q240,60 200,160" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6,6" />
              <path d="M100,-20 Q120,60 80,160" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6,6" />
            </svg>
            {/* Center Radius */}
            <div className="absolute top-[55%] left-[55%] -translate-x-1/2 -translate-y-1/2 bg-[#356E3B]/15 rounded-full border border-[#356E3B]/30 flex items-center justify-center transition-all duration-300" style={{ width: `${Math.max(40, radius * 0.72)}px`, height: `${Math.max(40, radius * 0.72)}px` }}>
              {/* Pin */}
              <div className="w-[14px] h-[14px] bg-[#1E4738] rounded-full border-2 border-white shadow-sm ring-4 ring-[#1E4738]/20 relative">
                <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-1 h-2 bg-[#1E4738]/40 blur-sm rounded-full"></div>
              </div>
            </div>
          </div>

          <button 
            onClick={openModal}
            className="w-full bg-[#356E3B] hover:bg-[#2b5930] text-white font-semibold text-[13px] py-3.5 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-[0_4px_12px_rgba(53,110,59,0.15)]"
          >
            <Pencil className="w-4 h-4" strokeWidth={2} />
            Ubah Lokasi
          </button>
        </div>

        {/* Jam Kerja, Divisi & Jabatan Card */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <div className="flex gap-3 items-center">
              <div className="w-9 h-9 bg-[#e6f0ea] rounded-full flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
              </div>
              <h2 className="text-[#1E4738] text-[15px] font-bold">Jam Kerja, Divisi & Jabatan</h2>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
          </div>

          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-1.5 text-[#7d998c]">
              <Clock className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="text-[12px] font-semibold">Jam Operasional</span>
            </div>
            
            <div className="flex flex-col gap-2.5 ml-5">
              <div className="flex justify-between items-center text-[13px] text-[#1E4738] font-bold">
                <span>Sen – Jum</span>
                <span>08:00 – 17:00</span>
              </div>
              <div className="flex justify-between items-center text-[13px] text-[#1E4738] font-bold">
                <span>Sab</span>
                <span>08:00 – 12:00</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsKelolaJadwalOpen(true)}
            className="w-full bg-[#356E3B] hover:bg-[#2b5930] text-white font-semibold text-[13px] py-3.5 rounded-full flex items-center justify-center gap-2 mt-2 transition-transform active:scale-[0.98] shadow-[0_4px_12px_rgba(53,110,59,0.15)]"
          >
            <Pencil className="w-4 h-4" strokeWidth={2} />
            Kelola
          </button>
        </div>


        {/* Undang Karyawan Card */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <div className="flex gap-3 items-center">
              <div className="w-9 h-9 bg-[#e6f0ea] rounded-full flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
              </div>
              <h2 className="text-[#1E4738] text-[15px] font-bold">Undang Karyawan</h2>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
          </div>

          <div className="flex flex-col gap-1 py-4">
            <p className="text-[#7d998c] text-[12px] font-medium leading-relaxed">
              Undang karyawan bergabung ke dalam perusahaan Anda via Email massal.
            </p>
          </div>

          <button 
            onClick={() => setIsUndangKaryawanOpen(true)}
            className="w-full bg-[#356E3B] hover:bg-[#2b5930] text-white font-semibold text-[13px] py-3.5 rounded-full flex items-center justify-center gap-2 mt-1 transition-transform active:scale-[0.98] shadow-[0_4px_12px_rgba(53,110,59,0.15)]"
          >
            Undang via Email
          </button>
        </div>

        {/* Tambah Karyawan Card */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <div className="flex gap-3 items-center">
              <div className="w-9 h-9 bg-[#e6f0ea] rounded-full flex items-center justify-center shrink-0">
                <QrCode className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
              </div>
              <h2 className="text-[#1E4738] text-[15px] font-bold">Tambah Karyawan</h2>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
          </div>

          <div className="flex flex-col gap-1 py-4">
            <p className="text-[#7d998c] text-[12px] font-medium leading-relaxed">
              Bagikan kode QR atau salin kode unik untuk dibagikan secara instan.
            </p>
          </div>

          <button 
            onClick={() => setIsTambahKaryawanOpen(true)}
            className="w-full bg-white border border-[#356E3B] text-[#356E3B] hover:bg-[#f4f9f6] font-semibold text-[13px] py-3.5 rounded-full flex items-center justify-center gap-2 mt-1 transition-colors active:scale-[0.98]"
          >
            Tampilkan QR/Kode
          </button>
        </div>

      </div>

      {/* Modal Overlay */}
      {isUbahLokasiOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setIsUbahLokasiOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="relative bg-white w-full max-w-md mx-auto rounded-t-[32px] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Drag handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#e6f0ea] rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
                </div>
                <h2 className="text-[#1E4738] text-[17px] font-bold">Ubah Lokasi</h2>
              </div>
              <button 
                onClick={() => setIsUbahLokasiOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8 flex flex-col gap-5">
              
              {/* Interactive Mock Map */}
              <div className="relative w-full h-[220px] bg-[#f4f6f5] rounded-[24px] overflow-hidden border border-gray-100 flex-shrink-0">
                {/* SVG Roads / Paths */}
                <svg className="absolute inset-0 w-full h-full text-white" preserveAspectRatio="none" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">
                  {/* Thick white lines for roads */}
                  <path d="M-20,110 L420,50" stroke="currentColor" strokeWidth="24" />
                  <path d="M150,-20 L250,240" stroke="currentColor" strokeWidth="20" />
                  <path d="M100,240 L350,-20" stroke="currentColor" strokeWidth="16" />
                </svg>
                
                {/* Univ Text */}
                <div className="absolute right-4 top-[40%] text-[#94a3b8] text-[10px] font-medium leading-tight text-right w-16">
                  Universitas<br/>UPI
                </div>

                {/* Center Radius */}
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#356E3B]/20 rounded-full border border-[#356E3B]/40 flex flex-col items-center justify-center transition-all duration-100"
                  style={{ width: `${Math.max(80, tempRadius * 1.5)}px`, height: `${Math.max(80, tempRadius * 1.5)}px` }}
                >
                </div>
                
                {/* Fixed Pin & Tooltip */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="bg-white px-3 py-1.5 rounded-[10px] text-[#1E4738] text-[9px] font-bold shadow-sm whitespace-nowrap mb-1">
                    Geser pin untuk mengubah lokasi
                  </div>
                  <div className="w-2 h-2 bg-white rotate-45 -mt-2.5 z-10 shadow-sm border-r border-b border-gray-100"></div>
                  <MapPin className="w-8 h-8 text-[#1E4738] mt-1 drop-shadow-md" fill="#1E4738" color="white" strokeWidth={1} />
                </div>

                {/* Badge Bottom Right */}
                <div className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border-[3px] border-[#356E3B]">
                  <span className="text-[10px] font-bold text-[#1E4738]">{tempRadius}m</span>
                </div>
              </div>

              {/* Coordinates Inputs */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[#1E4738]">
                  <MapPin className="w-4 h-4" strokeWidth={2} />
                  <label className="text-[13px] font-bold">
                    Latitude & Longitude <span className="text-gray-400 font-normal">(Otomatis)</span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={tempLat}
                    onChange={(e) => setTempLat(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-[#1E4738] font-medium outline-none focus:border-[#356E3B] transition-colors"
                  />
                  <input 
                    type="text" 
                    value={tempLng}
                    onChange={(e) => setTempLng(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-[#1E4738] font-medium outline-none focus:border-[#356E3B] transition-colors"
                  />
                </div>
              </div>

              {/* Radius Input */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[#1E4738]">
                  <Target className="w-4 h-4" strokeWidth={2} />
                  <label className="text-[13px] font-bold">Radius Lokasi</label>
                </div>
                <div className="text-[14px] font-bold text-[#1E4738] mt-1 pl-6 border-l-2 border-[#356E3B]/30 ml-2">
                  {tempRadius} meter
                </div>
                
                {/* Custom Slider */}
                <div className="flex items-center gap-4 mt-4">
                  <input
                    type="range"
                    min="10"
                    max="500"
                    value={tempRadius}
                    onChange={(e) => setTempRadius(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#356E3B]"
                    style={{
                      background: `linear-gradient(to right, #356E3B 0%, #356E3B ${(tempRadius - 10) / 490 * 100}%, #e5e7eb ${(tempRadius - 10) / 490 * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <span className="text-[12px] font-medium text-gray-400 w-8">{tempRadius}m</span>
                </div>
              </div>

              {/* Save Button */}
              <button 
                onClick={handleSimpan}
                className="w-full bg-[#356E3B] hover:bg-[#2b5930] text-white font-bold text-[14px] py-4 rounded-xl flex items-center justify-center gap-2 mt-2 transition-transform active:scale-[0.98] shadow-[0_4px_12px_rgba(53,110,59,0.2)]"
              >
                <Save className="w-4 h-4" strokeWidth={2} />
                Simpan Lokasi
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Modal Kelola Jadwal Jam Kerja */}
      {isKelolaJadwalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setIsKelolaJadwalOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="relative bg-white w-full max-w-md mx-auto rounded-t-[32px] flex flex-col max-h-[90dvh] animate-in slide-in-from-bottom-full duration-300">
            {/* Drag handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-start px-6 pt-4 pb-2">
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-[#e6f0ea] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-[#1E4738] text-[17px] font-bold leading-none mt-1">Kelola Jadwal Jam Kerja</h2>
                  <p className="text-[#7d998c] text-[12px] leading-[1.4] pr-4">
                    Atur jam operasional perusahaan dan jadwal kerja untuk setiap hari.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsKelolaJadwalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8 flex flex-col gap-5 mt-2">
              
              <button 
                onClick={handleAddSchedule}
                className="w-full bg-white border border-[#356E3B]/30 hover:bg-[#f4f9f6] text-[#356E3B] font-semibold text-[13px] py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
              >
                + Tambah Jadwal
              </button>

              {/* Jam Operasional */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-[#1E4738]">
                  <Clock className="w-4 h-4" strokeWidth={2} />
                  <h3 className="text-[14px] font-bold">Jam Operasional</h3>
                </div>
                
                <div className="flex flex-col gap-2">
                  {schedules.map((sched) => (
                    <div 
                      key={sched.id} 
                      onClick={() => handleEditSchedule(sched)}
                      className="bg-white border border-[#eef5f0] rounded-[16px] p-4 flex justify-between items-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:border-[#356E3B]/30 cursor-pointer transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-[#1E4738] text-[14px] font-bold">{sched.days}</span>
                        <span className="text-[#7d998c] text-[12px]">{sched.hours}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Jadwal Khusus */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[#1E4738]">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <h3 className="text-[14px] font-bold">Jadwal Khusus</h3>
                  </div>
                  <p className="text-[#7d998c] text-[12px]">
                    Atur jadwal khusus seperti libur nasional atau cuti bersama.
                  </p>
                </div>

                <div className="bg-white border border-[#eef5f0] rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
                  {specialSchedules.map((spec, idx) => (
                    <div key={idx} className={`p-4 flex justify-between items-center bg-white hover:bg-gray-50 cursor-pointer transition-colors ${idx !== specialSchedules.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <div className="flex flex-col gap-1">
                        <span className="text-[#1E4738] text-[14px] font-bold">{spec.date}</span>
                        <span className="text-[#7d998c] text-[12px]">{spec.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-[#fff1f2] text-[#e11d48] text-[10px] font-bold px-3 py-1 rounded-full">
                          Libur
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Jadwal */}
      {isEditJadwalOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setIsEditJadwalOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="relative bg-white w-full max-w-md mx-auto rounded-t-[32px] flex flex-col max-h-[90dvh] animate-in slide-in-from-bottom-full duration-300">
            {/* Drag handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#e6f0ea] rounded-full flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
                </div>
                <h2 className="text-[#1E4738] text-[17px] font-bold">Tambah / Edit Jadwal</h2>
              </div>
              <button 
                onClick={() => setIsEditJadwalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8 flex flex-col gap-5">
              
              {/* Type Toggle */}
              <div className="flex bg-[#f4f6f5] rounded-[16px] p-1">
                <button 
                  onClick={() => setJadwalForm({ ...jadwalForm, type: "kerja" })}
                  className={`flex-1 py-2.5 rounded-[12px] text-[13px] font-bold transition-all ${jadwalForm.type === "kerja" ? "bg-[#356E3B] text-white shadow-sm" : "text-gray-500 hover:text-[#1E4738]"}`}
                >
                  Jam Kerja
                </button>
                <button 
                  onClick={() => setJadwalForm({ ...jadwalForm, type: "libur" })}
                  className={`flex-1 py-2.5 rounded-[12px] text-[13px] font-bold transition-all ${jadwalForm.type === "libur" ? "bg-[#356E3B] text-white shadow-sm" : "text-gray-500 hover:text-[#1E4738]"}`}
                >
                  Libur
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Hari */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#1E4738] text-[12px] font-bold">Hari</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                    </div>
                    <select 
                      value={jadwalForm.hari}
                      onChange={(e) => setJadwalForm({ ...jadwalForm, hari: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl pl-11 pr-10 py-3.5 text-[14px] text-[#1E4738] font-semibold appearance-none outline-none focus:border-[#356E3B] bg-white transition-colors"
                    >
                      <option value="Senin">Senin</option>
                      <option value="Selasa">Selasa</option>
                      <option value="Rabu">Rabu</option>
                      <option value="Kamis">Kamis</option>
                      <option value="Jumat">Jumat</option>
                      <option value="Sabtu">Sabtu</option>
                      <option value="Minggu">Minggu</option>
                      <option value="Senin – Jumat">Senin – Jumat</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <polyline points="3 4.5 6 7.5 9 4.5"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Jam Mulai */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#1E4738] text-[12px] font-bold">Jam Mulai</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={jadwalForm.jamMulai}
                      onChange={(e) => setJadwalForm({ ...jadwalForm, jamMulai: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl pl-4 pr-11 py-3.5 text-[14px] text-[#1E4738] font-semibold outline-none focus:border-[#356E3B] transition-colors"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Jam Selesai */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#1E4738] text-[12px] font-bold">Jam Selesai</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={jadwalForm.jamSelesai}
                      onChange={(e) => setJadwalForm({ ...jadwalForm, jamSelesai: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl pl-4 pr-11 py-3.5 text-[14px] text-[#1E4738] font-semibold outline-none focus:border-[#356E3B] transition-colors"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Keterangan */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#1E4738] text-[12px] font-bold">
                    Keterangan <span className="text-gray-400 font-normal">(opsional)</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Shift pagi"
                    value={jadwalForm.keterangan}
                    onChange={(e) => setJadwalForm({ ...jadwalForm, keterangan: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors"
                  />
                </div>
              </div>

              {/* Save Button */}
              <button 
                onClick={handleSaveJadwal}
                className="w-full bg-[#356E3B] hover:bg-[#2b5930] text-white font-bold text-[14px] py-4 rounded-xl flex items-center justify-center gap-2 mt-2 transition-transform active:scale-[0.98] shadow-[0_4px_12px_rgba(53,110,59,0.2)]"
              >
                <Save className="w-4 h-4" strokeWidth={2} />
                Simpan Jadwal
              </button>

            </div>
          </div>
        </div>
      )}
      {/* Modal Undang Karyawan (Email) */}
      {isUndangKaryawanOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setIsUndangKaryawanOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="relative bg-white w-full max-w-md mx-auto rounded-t-[32px] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Drag handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#e6f0ea] rounded-full flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
                </div>
                <h2 className="text-[#1E4738] text-[17px] font-bold">Undang Karyawan</h2>
              </div>
              <button 
                onClick={() => setIsUndangKaryawanOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8 flex flex-col gap-6 mt-2">
              
              {/* Email Massal */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#1E4738] text-[13px] font-bold">
                  Email Massal <span className="text-[#e11d48]">*</span>
                </label>
                <textarea 
                  placeholder="Pisahkan dengan koma (,)"
                  value={undangForm.emails}
                  onChange={(e) => setUndangForm({ ...undangForm, emails: e.target.value })}
                  className="w-full border border-gray-200 rounded-[12px] px-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors resize-none h-[100px]"
                />
                <span className="text-[11px] text-gray-400 font-medium">contoh: user1@email.com, user2@email.com</span>
              </div>

              {/* Pilih Jabatan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#1E4738] text-[13px] font-bold">
                  Pilih Jabatan <span className="text-[#e11d48]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <AlignLeft className="w-4 h-4 text-[#356E3B]" />
                  </div>
                  <select 
                    value={undangForm.jabatan}
                    onChange={(e) => setUndangForm({ ...undangForm, jabatan: e.target.value })}
                    className={`w-full border border-gray-200 rounded-[12px] pl-11 pr-10 py-3.5 text-[14px] font-medium appearance-none outline-none focus:border-[#356E3B] bg-white transition-colors ${undangForm.jabatan ? 'text-[#1E4738]' : 'text-gray-400'}`}
                  >
                    <option value="" disabled hidden>Pilih jabatan</option>
                    <option value="Manager">Manager</option>
                    <option value="Staff">Staff</option>
                    <option value="Intern">Intern</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <polyline points="3 4.5 6 7.5 9 4.5"></polyline>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Pilih Divisi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#1E4738] text-[13px] font-bold">
                  Pilih Divisi <span className="text-[#e11d48]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <AlignLeft className="w-4 h-4 text-[#356E3B]" />
                  </div>
                  <select 
                    value={undangForm.divisi}
                    onChange={(e) => setUndangForm({ ...undangForm, divisi: e.target.value })}
                    className={`w-full border border-gray-200 rounded-[12px] pl-11 pr-10 py-3.5 text-[14px] font-medium appearance-none outline-none focus:border-[#356E3B] bg-white transition-colors ${undangForm.divisi ? 'text-[#1E4738]' : 'text-gray-400'}`}
                  >
                    <option value="" disabled hidden>Pilih divisi</option>
                    <option value="IT">IT</option>
                    <option value="HRD">HRD</option>
                    <option value="Finance">Finance</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <polyline points="3 4.5 6 7.5 9 4.5"></polyline>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Kirim Button */}
              <button 
                onClick={() => {
                  if (undangForm.emails && undangForm.jabatan && undangForm.divisi) {
                    setIsUndangKaryawanOpen(false);
                    setUndangForm({ emails: "", jabatan: "", divisi: "" });
                  }
                }}
                disabled={!undangForm.emails || !undangForm.jabatan || !undangForm.divisi}
                className={`w-full py-4 rounded-[16px] text-[14px] font-bold flex items-center justify-center gap-2 mt-2 transition-all shadow-[0_4px_12px_rgba(53,110,59,0.15)] ${undangForm.emails && undangForm.jabatan && undangForm.divisi ? 'bg-[#356E3B] hover:bg-[#2b5930] text-white active:scale-[0.98]' : 'bg-gray-200 text-gray-400 shadow-none'}`}
              >
                <Send className="w-4 h-4" strokeWidth={2} />
                Kirim Undangan
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Karyawan (QR/Kode) */}
      {isTambahKaryawanOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setIsTambahKaryawanOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="relative bg-white w-full max-w-md mx-auto rounded-t-[32px] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Drag handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#e6f0ea] rounded-full flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
                </div>
                <h2 className="text-[#1E4738] text-[17px] font-bold">Tambah Karyawan</h2>
              </div>
              <button 
                onClick={() => setIsTambahKaryawanOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-10 flex flex-col items-center">
              
              <p className="text-gray-500 text-[13px] text-center max-w-[280px] leading-relaxed mb-6 mt-2">
                Bagikan kode QR ini kepada karyawan untuk bergabung ke perusahaan Anda secara instan.
              </p>

              {/* QR Code Container */}
              <div className="bg-[#f7fbf8] border border-[#eef5f0] w-full max-w-[280px] rounded-[24px] flex flex-col items-center py-8 mb-8 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
                <div className="w-[180px] h-[180px] bg-white rounded-[16px] shadow-sm flex items-center justify-center mb-6">
                  <QrCode className="w-24 h-24 text-[#356E3B]" strokeWidth={1} />
                </div>
                <div className="bg-[#e6f0ea] px-4 py-1.5 rounded-full">
                  <span className="text-[#356E3B] text-[11px] font-bold tracking-wide">PT. Nama Perusahaan</span>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 w-full mb-6">
                <div className="h-[1px] bg-gray-100 flex-1"></div>
                <span className="text-gray-400 text-[11px] font-medium">atau via kode</span>
                <div className="h-[1px] bg-gray-100 flex-1"></div>
              </div>

              {/* Input Salin Kode */}
              <div className="w-full flex items-center justify-between border border-gray-200 rounded-[12px] p-2 bg-white transition-colors focus-within:border-[#356E3B]">
                <span className="text-gray-400 font-mono text-[14px] pl-3 tracking-widest">
                  6XGFDSAKLEFKJ
                </span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("6XGFDSAKLEFKJ");
                    alert("Kode berhasil disalin!");
                  }}
                  className="bg-[#356E3B] hover:bg-[#2b5930] text-white text-[12px] font-bold px-5 py-2.5 rounded-[8px] transition-colors active:scale-95"
                >
                  Salin
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
