"use client";

import { ChevronLeft, Search, Check, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AdminBottomNav } from "@/components/admin-bottom-nav";
import { TopBar } from "@/components/TopBar";

// Types mapped from backend
type IzinRequest = {
  id: string;
  name: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  reason: string;
  attachment_url?: string;
  rejection_reason?: string;
};

export default function KelolaIzinPage() {
  const router = useRouter();
  
  const [data, setData] = useState<IzinRequest[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]); 
  const [activeFilter, setFilter] = useState<string>("Semua");
  const [isLoading, setIsLoading] = useState(true);

  // Modal and action states
  const [confirmApproveItem, setConfirmApproveItem] = useState<IzinRequest | null>(null);
  const [confirmBatchApproveOpen, setConfirmBatchApproveOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState<IzinRequest | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  const [rejectionErrorText, setRejectionErrorText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Fetch Leaves
  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/leaves/admin", {
        headers
      });
      const resData = await res.json();
      if (resData.success) {
        const mappedData = resData.data.map((item: any) => ({
          id: item.id,
          name: item.employee_name || "Unknown",
          type: item.category_name || "Lainnya",
          status: item.status,
          start_date: item.start_date,
          end_date: item.end_date,
          reason: item.description || "-",
          attachment_url: item.attachment_url || undefined,
          rejection_reason: item.rejection_reason || undefined
        }));
        setData(mappedData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const baseFilteredData = data.filter(item => {
    if (activeFilter === "Semua") return true;
    if (activeFilter === "Cuti") return item.type.toLowerCase().includes("cuti");
    if (activeFilter === "Izin Sakit") return item.type.toLowerCase().includes("sakit");
    return true;
  });

  const pendingLeaves = baseFilteredData.filter(item => item.status === "Menunggu");
  const historyLeaves = baseFilteredData.filter(item => item.status !== "Menunggu");

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(pendingLeaves.map(d => d.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedItems, id];
      setSelectedItems(newSelected);
      if (newSelected.length === pendingLeaves.length) {
        setSelectAll(true);
      }
    }
  };

  const updateStatus = async (id: string, status: string, rejectionReason?: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return { success: false, message: "Sesi login telah berakhir. Silakan login kembali." };
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;
      
      const payload: Record<string, any> = { status };
      if (status === "Ditolak" && rejectionReason) {
        payload.rejection_reason = rejectionReason;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leaves/${id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      
      const resData = await res.json().catch(() => ({}));
      return {
        success: res.ok && resData.success,
        message: resData.message || (res.ok ? "Berhasil" : "Gagal memperbarui status."),
        data: resData.data
      };
    } catch (error: any) {
      console.error("Error updating status:", error);
      return { success: false, message: error?.message || "Terjadi kesalahan jaringan." };
    }
  };

  const handleConfirmApprove = async () => {
    if (!confirmApproveItem || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await updateStatus(confirmApproveItem.id, "Disetujui");
      if (res.success) {
        setData(prev => prev.map(item => item.id === confirmApproveItem.id ? { ...item, status: "Disetujui" } : item));
        setSelectedItems(prev => prev.filter(itemId => itemId !== confirmApproveItem.id));
        setConfirmApproveItem(null);
        setFeedbackModal({
          isOpen: true,
          title: "Berhasil Disetujui",
          message: `Pengajuan izin untuk ${confirmApproveItem.name} berhasil disetujui.`,
          type: "success"
        });
      } else {
        setConfirmApproveItem(null);
        setFeedbackModal({
          isOpen: true,
          title: "Gagal Menyetujui",
          message: res.message || "Gagal memperbarui status pengajuan.",
          type: "error"
        });
        await fetchLeaves();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReject = (item: IzinRequest) => {
    setRejectItem(item);
    setRejectionReasonText("");
    setRejectionErrorText("");
  };

  const handleConfirmReject = async () => {
    if (!rejectItem || isSubmitting) return;
    
    const trimmed = rejectionReasonText.trim();
    if (!trimmed) {
      setRejectionErrorText("Alasan penolakan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateStatus(rejectItem.id, "Ditolak", trimmed);
      if (res.success) {
        setData(prev => prev.map(item => item.id === rejectItem.id ? {
          ...item,
          status: "Ditolak",
          rejection_reason: trimmed
        } : item));
        setSelectedItems(prev => prev.filter(itemId => itemId !== rejectItem.id));
        setRejectItem(null);
        setFeedbackModal({
          isOpen: true,
          title: "Pengajuan Ditolak",
          message: `Pengajuan izin untuk ${rejectItem.name} telah ditolak.`,
          type: "success"
        });
      } else {
        setRejectItem(null);
        setFeedbackModal({
          isOpen: true,
          title: "Gagal Menolak",
          message: res.message || "Gagal menolak pengajuan.",
          type: "error"
        });
        await fetchLeaves();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBatchApprove = async () => {
    if (selectedItems.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let successCount = 0;
      let failedCount = 0;
      for (const id of selectedItems) {
        const res = await updateStatus(id, "Disetujui");
        if (res.success) {
          successCount++;
        } else {
          failedCount++;
        }
      }

      await fetchLeaves();
      setSelectedItems([]);
      setSelectAll(false);
      setConfirmBatchApproveOpen(false);

      if (failedCount === 0) {
        setFeedbackModal({
          isOpen: true,
          title: "Berhasil Disetujui",
          message: `${successCount} pengajuan izin terpilih berhasil disetujui.`,
          type: "success"
        });
      } else {
        setFeedbackModal({
          isOpen: true,
          title: "Proses Selesai",
          message: `${successCount} pengajuan berhasil disetujui, ${failedCount} pengajuan gagal diproses.`,
          type: successCount > 0 ? "success" : "error"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      
      {/* Header */}
      <TopBar title="Kelola Izin & Cuti" />

      {/* Main Content */}
      <div className="flex-1 px-5 py-5 flex flex-col gap-4 z-10 relative">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
          <input 
            type="text" 
            placeholder="Cari nama karyawan..."
            className="w-full bg-[#f4f6f5] rounded-[14px] pl-12 pr-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:ring-1 focus:ring-[#356E3B] transition-shadow border-none"
          />
        </div>

        {/* Tabs / Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {["Semua", "Cuti", "Izin Sakit"].map((filter) => (
            <button 
              key={filter}
              onClick={() => {
                setFilter(filter);
                setSelectAll(false);
                setSelectedItems([]);
              }}
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

        {/* Section: Permintaan Persetujuan */}
        {pendingLeaves.length > 0 && (
          <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] p-5 flex flex-col gap-4 mt-2">
            
            {/* Header */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                 <div className="w-7 h-7 bg-[#f4f9f6] rounded-lg flex items-center justify-center shrink-0">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#356E3B]"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                 </div>
                 <span className="text-[#111827] text-[13px] font-bold">Permintaan Persetujuan ({pendingLeaves.length})</span>
              </div>
              <div className="flex justify-between items-center">
                 <label className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => { e.preventDefault(); toggleSelectAll(); }}>
                   <div 
                     className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors cursor-pointer ${selectAll || (selectedItems.length > 0 && selectedItems.length === pendingLeaves.length) ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}
                   >
                     {selectedItems.length > 0 && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                   </div>
                   <span className="text-[12px] text-[#111827] font-medium">Pilih Semua</span>
                 </label>
                 <button 
                   onClick={() => setConfirmBatchApproveOpen(true)}
                   disabled={selectedItems.length === 0}
                   className={`text-white text-[11px] font-bold px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${selectedItems.length > 0 ? 'bg-[#356E3B] active:scale-95' : 'bg-gray-300 cursor-not-allowed'}`}
                 >
                   <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Setujui Terpilih
                 </button>
              </div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-3">
              {pendingLeaves.map((item) => (
                <div key={item.id} className="border border-gray-100 p-3.5 rounded-[16px] flex flex-col gap-3 transition-colors hover:border-[#dce9df]">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div 
                        className="mt-0.5 cursor-pointer"
                        onClick={() => toggleItem(item.id)}
                      >
                        <div className={`w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center transition-colors ${selectedItems.includes(item.id) ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}>
                          {selectedItems.includes(item.id) && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <h3 className="text-[#1E4738] text-[15px] font-bold leading-none">{item.name}</h3>
                        {item.type.toLowerCase().includes("cuti") ? (
                          <span className="bg-[#e0f2fe] text-[#0ea5e9] text-[10px] font-semibold px-2 py-0.5 rounded-md w-fit">Cuti</span>
                        ) : item.type.toLowerCase().includes("sakit") ? (
                          <span className="bg-[#fff7ed] text-[#ea580c] text-[10px] font-semibold px-2 py-0.5 rounded-md w-fit border border-[#ffedd5]">Izin Sakit</span>
                        ) : (
                          <span className="bg-[#f3f4f6] text-[#4b5563] text-[10px] font-semibold px-2 py-0.5 rounded-md w-fit">{item.type}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#f8faf9] rounded-xl p-3 flex flex-col gap-1 mt-1 ml-7">
                    <div className="text-[13px] text-[#1E4738] font-semibold">
                      {(() => {
                        const start = new Date(item.start_date);
                        const end = new Date(item.end_date);
                        const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        return <>{start.getDate()} {start.toLocaleDateString('id-ID', { month: 'short' })} {start.getFullYear()} <span className="text-[#94a3b8] font-medium">({diffDays} Hari)</span></>;
                      })()}
                    </div>
                    <div className="text-[12px] text-[#64748b] leading-snug">
                      <span className="font-semibold text-[#1E4738]">Alasan:</span> {item.reason}
                    </div>
                    {item.attachment_url && (
                      <div className="mt-1 pt-2 border-t border-[#dce9df]">
                        <a href={item.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#356E3B] hover:underline">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          Lihat Lampiran Dokumen
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-1 pl-7">
                    <button 
                      onClick={() => handleOpenReject(item)}
                      disabled={isSubmitting}
                      className="px-6 py-2 rounded-full text-[#e11d48] bg-[#ffe4e6] hover:bg-[#fecdd3] text-[13px] font-bold active:scale-95 transition-all disabled:opacity-50"
                    >
                      Tolak
                    </button>
                    <button 
                      onClick={() => setConfirmApproveItem(item)}
                      disabled={isSubmitting}
                      className="px-6 py-2 rounded-full text-white bg-[#356E3B] hover:bg-[#2A582F] text-[13px] font-bold active:scale-95 transition-all disabled:opacity-50"
                    >
                      Setujui
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Riwayat Izin & Cuti */}
        <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 mb-1">
             <div className="w-7 h-7 bg-[#f4f9f6] rounded-lg flex items-center justify-center shrink-0">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#356E3B]"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
             </div>
             <span className="text-[#111827] text-[13px] font-bold">Riwayat Izin & Cuti</span>
          </div>

          <div className="flex flex-col gap-3">
            {historyLeaves.map((item) => (
              <div key={item.id} className="border border-gray-100 p-3.5 rounded-[16px] flex flex-col gap-3 transition-colors hover:border-[#dce9df]">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-[#1E4738] text-[15px] font-bold leading-none">{item.name}</h3>
                      {item.type.toLowerCase().includes("cuti") ? (
                        <span className="bg-[#e0f2fe] text-[#0ea5e9] text-[10px] font-semibold px-2 py-0.5 rounded-md w-fit">Cuti</span>
                      ) : item.type.toLowerCase().includes("sakit") ? (
                        <span className="bg-[#fff7ed] text-[#ea580c] text-[10px] font-semibold px-2 py-0.5 rounded-md w-fit border border-[#ffedd5]">Izin Sakit</span>
                      ) : (
                        <span className="bg-[#f3f4f6] text-[#4b5563] text-[10px] font-semibold px-2 py-0.5 rounded-md w-fit">{item.type}</span>
                      )}
                    </div>
                  </div>
                  
                  {item.status === "Disetujui" && (
                    <span className="bg-[#ecfdf5] border border-[#d1fae5] text-[#10b981] text-[11px] font-semibold px-3 py-1 rounded-full shrink-0">Disetujui</span>
                  )}
                  {item.status === "Ditolak" && (
                    <span className="bg-[#fef2f2] border border-[#fee2e2] text-[#ef4444] text-[11px] font-semibold px-3 py-1 rounded-full shrink-0">Ditolak</span>
                  )}
                </div>

                <div className="bg-[#f8faf9] rounded-xl p-3 flex flex-col gap-1 mt-1">
                  <div className="text-[13px] text-[#1E4738] font-semibold">
                    {(() => {
                      const start = new Date(item.start_date);
                      const end = new Date(item.end_date);
                      const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      return <>{start.getDate()} {start.toLocaleDateString('id-ID', { month: 'short' })} {start.getFullYear()} <span className="text-[#94a3b8] font-medium">({diffDays} Hari)</span></>;
                    })()}
                  </div>
                  <div className="text-[12px] text-[#64748b] leading-snug">
                    <span className="font-semibold text-[#1E4738]">Alasan:</span> {item.reason}
                  </div>
                  {item.attachment_url && (
                    <div className="mt-1 pt-2 border-t border-[#dce9df]">
                      <a href={item.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#356E3B] hover:underline">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        Lihat Lampiran Dokumen
                      </a>
                    </div>
                  )}

                  {/* Alasan Penolakan dari Admin/Manager */}
                  {item.status === "Ditolak" && item.rejection_reason && (
                    <div className="mt-2 bg-[#fef2f2] border border-[#fee2e2] rounded-[12px] p-2.5 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-[#b91c1c] text-[11px] font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-[#ef4444]" strokeWidth={2.5} />
                        <span>Alasan Penolakan:</span>
                      </div>
                      <span className="text-[12px] text-[#7f1d1d] leading-relaxed pl-5">{item.rejection_reason}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {historyLeaves.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-[13px] font-medium">Belum ada riwayat izin atau cuti.</div>
            )}
          </div>
        </div>
      </div>

      <AdminBottomNav activeTab="izin" />

      {/* Modal Konfirmasi Persetujuan Satuan */}
      {confirmApproveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#E8F3EB] border border-[#D1E5D5] flex items-center justify-center mb-4 text-[#356E3B]">
              <Check className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <h3 className="text-[18px] font-bold text-[#111827] mb-2">
              Setujui Pengajuan Izin?
            </h3>
            <p className="text-[13px] text-[#4B5563] leading-relaxed mb-6">
              Apakah kamu yakin ingin menyetujui pengajuan izin ini?
            </p>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => !isSubmitting && setConfirmApproveItem(null)}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#4B5563] font-bold text-[14px] transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-full bg-[#356E3B] hover:bg-[#2A582F] text-white font-bold text-[14px] shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  "Ya, Setujui"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Persetujuan Terpilih */}
      {confirmBatchApproveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#E8F3EB] border border-[#D1E5D5] flex items-center justify-center mb-4 text-[#356E3B]">
              <Check className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <h3 className="text-[18px] font-bold text-[#111827] mb-2">
              Setujui Pengajuan Terpilih?
            </h3>
            <p className="text-[13px] text-[#4B5563] leading-relaxed mb-6">
              Apakah kamu yakin ingin menyetujui {selectedItems.length} pengajuan izin terpilih?
            </p>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => !isSubmitting && setConfirmBatchApproveOpen(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#4B5563] font-bold text-[14px] transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchApprove}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-full bg-[#356E3B] hover:bg-[#2A582F] text-white font-bold text-[14px] shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  "Ya, Setujui"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Penolakan dengan Input Alasan Wajib */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl flex flex-col">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#FFF1F2] border border-[#FFE4E6] flex items-center justify-center mb-3 text-[#E11D48]">
                <XCircle className="w-7 h-7" strokeWidth={2.2} />
              </div>
              <h3 className="text-[18px] font-bold text-[#111827]">
                Tolak Pengajuan Izin
              </h3>
              <p className="text-[12px] text-[#6B7280] mt-1">
                Pengajuan izin untuk <span className="font-semibold text-[#111827]">{rejectItem.name}</span>
              </p>
            </div>

            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-[13px] font-bold text-[#374151]">
                Alasan Penolakan <span className="text-[#E11D48]">*</span>
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={rejectionReasonText}
                disabled={isSubmitting}
                onChange={(e) => {
                  setRejectionReasonText(e.target.value);
                  if (rejectionErrorText) setRejectionErrorText("");
                }}
                placeholder="Tuliskan alasan penolakan..."
                className={`w-full border rounded-[14px] px-3.5 py-3 text-[13px] text-[#111827] placeholder-gray-400 focus:outline-none transition-all resize-none ${
                  rejectionErrorText 
                    ? 'border-[#E11D48] focus:ring-1 focus:ring-[#E11D48]' 
                    : 'border-[#E5E7EB] focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B]'
                }`}
              />
              {rejectionErrorText && (
                <span className="text-[11px] text-[#E11D48] font-medium mt-0.5">
                  {rejectionErrorText}
                </span>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => !isSubmitting && setRejectItem(null)}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#4B5563] font-bold text-[14px] transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-full bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold text-[14px] shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  "Konfirmasi Penolakan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Feedback Kustom (Menggantikan Alert) */}
      {feedbackModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              feedbackModal.type === "success" 
                ? "bg-[#E8F3EB] border border-[#D1E5D5] text-[#356E3B]"
                : "bg-[#FFF1F2] border border-[#FFE4E6] text-[#E11D48]"
            }`}>
              {feedbackModal.type === "success" ? (
                <Check className="w-7 h-7" strokeWidth={2.5} />
              ) : (
                <AlertCircle className="w-7 h-7" strokeWidth={2.2} />
              )}
            </div>
            <h3 className="text-[18px] font-bold text-[#111827] mb-2">
              {feedbackModal.title}
            </h3>
            <p className="text-[13px] text-[#4B5563] leading-relaxed mb-6">
              {feedbackModal.message}
            </p>
            <button
              type="button"
              onClick={() => setFeedbackModal(null)}
              className="w-full py-3.5 px-4 rounded-full bg-[#356E3B] hover:bg-[#2A582F] text-white font-bold text-[14px] shadow-sm transition-colors active:scale-[0.98]"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
