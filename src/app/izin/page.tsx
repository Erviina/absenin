"use client";

import { useState } from "react";
import { ChevronLeft, Plus, Calendar, ChevronDown, Clock, Trash2, FileText, Send, UploadCloud, Paperclip, ExternalLink, XCircle, CheckCircle2, CircleDot, Circle } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/bottom-nav";
import { CustomDatePicker } from "@/components/CustomDatePicker";

// Tipe Data untuk Pengajuan Izin
type IzinRequest = {
  id: string;
  type: string;
  desc: string;
  dateStr: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
};

export default function IzinPage() {
  const router = useRouter();
  
  // State untuk form
  const [isAddingIzin, setIsAddingIzin] = useState(false);
  const [selectedIzinId, setSelectedIzinId] = useState<string | null>(null);

  const [kategori, setKategori] = useState("Izin Sakit");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [noteText, setNoteText] = useState("");
  const [attachment, setAttachment] = useState<{name: string, size: string} | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterCategory, setFilterCategory] = useState("Semua Kategori");

  // State untuk list pengajuan
  const [pengajuanList, setPengajuanList] = useState<IzinRequest[]>([
    { id: "1", type: "Izin Sakit", desc: "Pemeriksaan Dokter", dateStr: "19 Sep 2026", status: "Menunggu" },
    { id: "2", type: "Cuti", desc: "3 Hari Kerja", dateStr: "25 - 27 Sep 2026", status: "Disetujui" },
    { id: "3", type: "Cuti", desc: "Keperluan Bank & Dokumen", dateStr: "15 Sep 2026", status: "Ditolak" }
  ]);

  // Handler hitung durasi kasaran
  const calculateDuration = () => {
    if (!startDate || !endDate) return "-";
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return "0 Hari";
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return `${diffDays} Hari`;
  };

  // Handler form submit
  const handleSubmit = () => {
    if (!startDate) return;
    
    let dateStr = startDate;
    if (endDate && endDate !== startDate) {
      dateStr = `${startDate} - ${endDate}`;
    }

    const newReq: IzinRequest = {
      id: Date.now().toString(),
      type: kategori,
      desc: noteText || "Tanpa Keterangan",
      dateStr: dateStr,
      status: "Menunggu"
    };

    setPengajuanList([newReq, ...pengajuanList]);
    
    // Reset Form
    setIsAddingIzin(false);
    setKategori("Izin Sakit");
    setStartDate("");
    setEndDate("");
    setNoteText("");
    setAttachment(null);
  };

  const handleUpload = () => {
    setAttachment({ name: "Surat_Dokter_Klinik.pdf", size: "1.2 MB" });
  };

  const handleBack = () => {
    if (isAddingIzin) {
      setIsAddingIzin(false);
    } else if (selectedIzinId) {
      setSelectedIzinId(null);
    } else {
      router.back();
    }
  };

  const selectedIzin = pengajuanList.find(req => req.id === selectedIzinId);

  const filteredList = pengajuanList.filter(req => {
    let matchCat = true;
    if (filterCategory !== "Semua Kategori") {
      matchCat = req.type.toLowerCase().includes(filterCategory.toLowerCase());
    }
    
    let matchDate = true;
    if (filterDate) {
      const fd = new Date(filterDate);
      if (!isNaN(fd.getTime())) {
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        const formattedFilterDate = `${fd.getDate()} ${months[fd.getMonth()]} ${fd.getFullYear()}`;
        const formattedFilterDateWithZero = `${String(fd.getDate()).padStart(2, '0')} ${months[fd.getMonth()]} ${fd.getFullYear()}`;
        
        matchDate = req.dateStr.includes(filterDate) || 
                    req.dateStr.includes(formattedFilterDate) || 
                    req.dateStr.includes(formattedFilterDateWithZero);
      }
    }
    
    return matchCat && matchDate;
  });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8] relative pb-32">
      {/* Header */}
      <TopBar 
        title="Pengajuan Izin"
        onBack={handleBack}
        rightAction={
          (!isAddingIzin && !selectedIzinId) ? (
            <button 
              onClick={() => setIsAddingIzin(true)}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white transition-colors hover:bg-white/30"
            >
              <Plus className="w-6 h-6" />
            </button>
          ) : null
        }
      />

      <div className="px-6 pt-6 flex flex-col flex-1">
        
        {isAddingIzin ? (
          /* FORM PENGAJUAN IZIN */
          <div className="flex flex-col gap-4">
            
            {/* Card 1: Kategori */}
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#E8F3EB] flex flex-col gap-2">
              <label className="text-[13px] font-bold text-[#374151]">
                Kategori Izin <span className="text-[#EF4444]">*</span>
              </label>
              <div className="relative mt-1">
                <select 
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-[14px] pl-4 pr-10 py-3.5 text-[14px] text-[#111827] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all appearance-none bg-white font-medium"
                >
                  <option>Izin Sakit</option>
                  <option>Cuti</option>
                  <option>Izin Keperluan Pribadi</option>
                </select>
                <ChevronDown className="w-4 h-4 text-[#4B5563] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.5} />
              </div>
            </div>

            {/* Card 2: Tanggal */}
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#E8F3EB] flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[13px] font-bold text-[#374151]">
                    Mulai <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="flex w-full">
                    <CustomDatePicker 
                      value={startDate}
                      onChange={setStartDate}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[13px] font-bold text-[#374151]">
                    Sampai <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="flex w-full">
                    <CustomDatePicker 
                      value={endDate}
                      onChange={setEndDate}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-[14px] px-4 py-3 flex items-center gap-2">
                <Clock className="w-[18px] h-[18px] text-[#356E3B]" strokeWidth={2.5} />
                <span className="text-[#6B7280] text-[13px] font-medium">
                  Total Durasi: <span className="text-[#356E3B] font-bold">{calculateDuration()}</span>
                </span>
              </div>
            </div>

            {/* Card 3: Keterangan */}
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#E8F3EB] flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[13px] font-bold text-[#374151]">
                  Keterangan <span className="text-[#EF4444]">*</span>
                </label>
                <span className="text-[11px] font-bold text-[#6B7280]">
                  {noteText.length} / 500 karakter
                </span>
              </div>
              <textarea 
                rows={3}
                maxLength={500}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Tuliskan keterangan..." 
                className="w-full border border-[#E5E7EB] rounded-[14px] px-4 py-3.5 text-[14px] text-[#4B5563] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all resize-none"
              />
            </div>

            {/* Card 4: Lampiran */}
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#E8F3EB] flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <label className="text-[13px] font-bold text-[#374151]">
                  Lampiran Bukti <span className="text-[#EF4444]">*</span>
                </label>
                <p className="text-[11px] font-medium text-[#6B7280] leading-snug pr-4">
                  Wajib menyertakan surat dokter untuk Izin Sakit
                </p>
              </div>
              
              {attachment ? (
                <div className="border border-[#E5E7EB] rounded-[14px] p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#E8F3EB] flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#356E3B]" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#111827]">{attachment.name}</span>
                      <span className="text-[11px] font-medium text-[#6B7280]">{attachment.size} • Telah diverifikasi</span>
                    </div>
                  </div>
                  <button onClick={() => setAttachment(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-[#EF4444] transition-colors">
                    <Trash2 className="w-[18px] h-[18px]" strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleUpload}
                  className="w-full border-2 border-dashed border-[#E5E7EB] rounded-[14px] p-6 flex flex-col items-center justify-center gap-2 hover:bg-[#F9FAFB] hover:border-[#356E3B] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                    <UploadCloud className="w-5 h-5 text-[#6B7280]" />
                  </div>
                  <span className="text-[13px] font-bold text-[#374151]">Unggah Dokumen</span>
                  <span className="text-[11px] text-[#6B7280]">Format PDF, JPG, atau PNG (Maks. 5MB)</span>
                </button>
              )}
            </div>

            <button 
              onClick={handleSubmit}
              disabled={!startDate || !noteText}
              className="w-full bg-[#356E3B] hover:bg-[#2A582F] disabled:bg-[#A3B8A8] text-white rounded-full py-4 mt-2 flex items-center justify-center gap-2 font-bold text-[15px] shadow-sm transition-colors active:scale-[0.98]"
            >
              <Send className="w-[18px] h-[18px]" strokeWidth={2.5} />
              Kirim Pengajuan
            </button>

          </div>
        ) : selectedIzinId && selectedIzin ? (
          /* DETAIL PENGAJUAN IZIN */
          <div className="flex flex-col gap-5">
            {/* Top Card */}
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E8F3EB] flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Jenis Pengajuan</span>
                <h2 className="text-[#111827] text-[18px] font-bold">{selectedIzin.type}</h2>
              </div>
              
              <div className="w-full h-[1px] bg-[#F3F4F6]" />
              
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#D1E5D5] flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-[#356E3B]" strokeWidth={2} />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-[#6B7280] mb-0.5">Periode Izin</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[#111827] text-[14px] font-bold">{selectedIzin.dateStr}</span>
                    <span className="text-[#6B7280] text-[11px]">(1 Hari Kerja)</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#D1E5D5] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#356E3B]" strokeWidth={2} />
                </div>
                <div className="flex flex-col justify-center pr-2">
                  <span className="text-[11px] font-bold text-[#6B7280] mb-0.5">Keterangan</span>
                  <span className="text-[#374151] text-[13px] leading-relaxed">{selectedIzin.desc}</span>
                </div>
              </div>

              {selectedIzin.type.toLowerCase().includes("sakit") && (
                <div className="bg-[#F8FAFC] rounded-[16px] p-3 flex items-center justify-between mt-1 border border-[#F1F5F9]">
                  <div className="flex items-center gap-3">
                    <Paperclip className="w-5 h-5 text-[#356E3B]" strokeWidth={2.5} />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#111827]">Surat_Klinik_Medika.pdf</span>
                      <span className="text-[11px] font-medium text-[#6B7280]">248 KB • Dokumen Medis</span>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 text-[#356E3B] font-bold text-[12px] hover:underline pr-1">
                    Lihat <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>

            {/* Tracking Status Card */}
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8F3EB]">
              <h3 className="text-[#111827] text-[16px] font-bold mb-6">Tracking Status</h3>
              
              <div className="flex flex-col gap-6 relative ml-1 pb-2">
                
                {/* Timeline Vertical Line */}
                <div className="absolute top-[12px] bottom-[-8px] left-[11px] w-[2px] bg-[#E5E7EB] z-0" />
                
                {selectedIzin.status === "Menunggu" && (
                  <>
                    <div className="flex gap-4 relative z-10">
                      <div className="w-6 flex justify-center shrink-0">
                        <div className="w-[10px] h-[10px] rounded-full bg-[#9CA3AF] ring-[6px] ring-white mt-1.5" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[#111827] text-[15px] font-bold leading-tight">Izin Disetujui</span>
                        <span className="text-[#6B7280] text-[12px]">Persetujuan final.</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 relative z-10">
                      <div className="w-6 flex justify-center shrink-0">
                        <div className="w-[18px] h-[18px] rounded-full border-[2px] border-[#1F2937] bg-white flex items-center justify-center ring-[4px] ring-white mt-0.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#1F2937]" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[#1F2937] text-[15px] font-bold leading-tight">Menunggu Verifikasi</span>
                        <span className="text-[#6B7280] text-[12px]">Sedang dalam peninjauan.</span>
                      </div>
                    </div>

                    <div className="flex gap-4 relative z-10">
                      <div className="w-6 flex justify-center shrink-0">
                        <div className="w-6 h-6 rounded-full bg-[#356E3B] text-white flex items-center justify-center ring-[4px] ring-white">
                          <CheckCircle2 className="w-[14px] h-[14px]" strokeWidth={3} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <span className="text-[#111827] text-[15px] font-bold leading-tight">Pengajuan Izin Terkirim</span>
                        <span className="text-[#6B7280] text-[12px]">Formulir izin telah berhasil dikirim.</span>
                      </div>
                    </div>
                  </>
                )}

                {selectedIzin.status === "Disetujui" && (
                  <>
                    <div className="flex gap-4 relative z-10">
                      <div className="w-6 flex justify-center shrink-0">
                        <div className="w-6 h-6 rounded-full bg-[#356E3B] text-white flex items-center justify-center ring-[4px] ring-white">
                          <CheckCircle2 className="w-[14px] h-[14px]" strokeWidth={3} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <span className="text-[#356E3B] text-[15px] font-bold leading-tight">Izin Disetujui</span>
                        <span className="text-[#6B7280] text-[12px]">Persetujuan final.</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 relative z-10">
                      <div className="w-6 flex justify-center shrink-0">
                        <div className="w-6 h-6 rounded-full bg-[#356E3B] text-white flex items-center justify-center ring-[4px] ring-white">
                          <CheckCircle2 className="w-[14px] h-[14px]" strokeWidth={3} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <span className="text-[#111827] text-[15px] font-bold leading-tight">Verifikasi Selesai</span>
                        <span className="text-[#6B7280] text-[12px]">Telah ditinjau.</span>
                      </div>
                    </div>

                    <div className="flex gap-4 relative z-10">
                      <div className="w-6 flex justify-center shrink-0">
                        <div className="w-6 h-6 rounded-full bg-[#356E3B] text-white flex items-center justify-center ring-[4px] ring-white">
                          <CheckCircle2 className="w-[14px] h-[14px]" strokeWidth={3} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <span className="text-[#111827] text-[15px] font-bold leading-tight">Pengajuan Izin Terkirim</span>
                        <span className="text-[#6B7280] text-[12px]">Formulir izin telah berhasil dikirim.</span>
                      </div>
                    </div>
                  </>
                )}

                {selectedIzin.status === "Ditolak" && (
                  <>
                    <div className="flex gap-4 relative z-10">
                      <div className="w-6 flex justify-center shrink-0">
                        <div className="w-6 h-6 rounded-full bg-[#EF4444] text-white flex items-center justify-center ring-[4px] ring-white">
                          <XCircle className="w-[14px] h-[14px]" strokeWidth={3} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <span className="text-[#EF4444] text-[15px] font-bold leading-tight">Izin Ditolak</span>
                        <span className="text-[#6B7280] text-[12px]">Persetujuan final (Ditolak).</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 relative z-10">
                      <div className="w-6 flex justify-center shrink-0">
                        <div className="w-6 h-6 rounded-full bg-[#356E3B] text-white flex items-center justify-center ring-[4px] ring-white">
                          <CheckCircle2 className="w-[14px] h-[14px]" strokeWidth={3} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <span className="text-[#111827] text-[15px] font-bold leading-tight">Verifikasi Selesai</span>
                        <span className="text-[#6B7280] text-[12px]">Telah ditinjau.</span>
                      </div>
                    </div>

                    <div className="flex gap-4 relative z-10">
                      <div className="w-6 flex justify-center shrink-0">
                        <div className="w-6 h-6 rounded-full bg-[#356E3B] text-white flex items-center justify-center ring-[4px] ring-white">
                          <CheckCircle2 className="w-[14px] h-[14px]" strokeWidth={3} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <span className="text-[#111827] text-[15px] font-bold leading-tight">Pengajuan Izin Terkirim</span>
                        <span className="text-[#6B7280] text-[12px]">Formulir izin telah berhasil dikirim.</span>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>
            
            {/* Action Button (Cancel) - Only if pending */}
            {selectedIzin.status === "Menunggu" && (
              <button 
                onClick={() => {
                  setPengajuanList(pengajuanList.filter(req => req.id !== selectedIzin.id));
                  setSelectedIzinId(null);
                }}
                className="w-full bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#EF4444] border border-[#FEE2E2] rounded-full py-4 mt-2 flex items-center justify-center gap-2 font-bold text-[14px] shadow-sm transition-colors active:scale-[0.98]"
              >
                <XCircle className="w-5 h-5" strokeWidth={2.5} />
                Batalkan Pengajuan
              </button>
            )}

          </div>
        ) : (
          /* MAIN CONTENT */
          <div className="flex flex-col gap-6">
            {/* Sisa Cuti Card */}
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E5E7EB] flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <h2 className="text-[#111827] text-[16px] font-bold">
                  Sisa Cuti Tahunan
                </h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-[#356E3B] text-[24px] font-bold leading-none">10</span>
                  <span className="text-[#6B7280] text-[12px] font-bold">/ 12 Hari</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                <div className="h-full bg-[#356E3B] rounded-full" style={{ width: "83.33%" }} />
              </div>

              <div className="flex gap-10 mt-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[#6B7280] text-[12px] font-bold">Tersisa</span>
                  <span className="text-[#356E3B] text-[14px] font-bold">10 Hari</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#6B7280] text-[12px] font-bold">Izin Terpakai</span>
                  <span className="text-[#111827] text-[14px] font-bold">2 Hari</span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-[16px] pl-4 pr-10 py-3 text-[14px] text-[#374151] font-medium focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all appearance-none bg-white cursor-pointer"
                >
                  <option value="Semua Kategori">Semua Kategori</option>
                  <option value="Izin Sakit">Izin Sakit</option>
                  <option value="Cuti">Cuti</option>
                </select>
                <ChevronDown className="w-4 h-4 text-[#6B7280] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.5} />
              </div>
              
              <div className="flex-1 flex">
                <CustomDatePicker 
                  value={filterDate}
                  onChange={setFilterDate}
                />
              </div>
            </div>

            {/* Daftar Pengajuan */}
            <div className="flex flex-col gap-4 mt-2">
              
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-[#111827] text-[16px] font-bold">
                  Daftar Pengajuan
                </h2>
                <div className="bg-[#E8F3EB] px-3 py-1.5 rounded-full border border-[#D1E5D5]">
                  <span className="text-[#356E3B] text-[11px] font-bold">{filteredList.length} Pengajuan</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                
                {filteredList.map((req) => (
                  <div 
                    key={req.id} 
                    onClick={() => setSelectedIzinId(req.id)}
                    className="bg-white rounded-[20px] shadow-sm border border-[#F3F4F6] p-5 flex flex-col gap-3 cursor-pointer hover:border-[#356E3B] transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-[#111827] text-[16px] font-bold">{req.type}</h3>
                        <span className="text-[#6B7280] text-[13px]">{req.desc}</span>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${
                        req.status === "Menunggu" ? "bg-[#FFFBEB] border-[#FEF3C7]" :
                        req.status === "Disetujui" ? "bg-[#E8F3EB] border-[#D1E5D5]" :
                        "bg-[#FEF2F2] border-[#FEE2E2]"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          req.status === "Menunggu" ? "bg-[#F59E0B]" :
                          req.status === "Disetujui" ? "bg-[#356E3B]" :
                          "bg-[#EF4444]"
                        }`} />
                        <span className={`text-[11px] font-bold ${
                          req.status === "Menunggu" ? "text-[#D97706]" :
                          req.status === "Disetujui" ? "text-[#356E3B]" :
                          "text-[#EF4444]"
                        }`}>{req.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-[#6EA874]" strokeWidth={2.5} />
                      <span className="text-[#6B7280] text-[13px] font-medium">{req.dateStr}</span>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          </div>
        )}
      </div>

      {(!isAddingIzin && !selectedIzinId) && <BottomNav activeTab="izin" />}
    </div>
  );
}
