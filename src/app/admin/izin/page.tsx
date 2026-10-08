"use client";

import { ChevronLeft, Search, Check } from "lucide-react";
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
};

export default function KelolaIzinPage() {
  const router = useRouter();
  
  const [data, setData] = useState<IzinRequest[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]); 
  const [activeFilter, setFilter] = useState<string>("Semua");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Leaves
  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/leaves/admin", {
        headers: { Authorization: `Bearer ${token}` }
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
          attachment_url: item.attachment_url || undefined
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
      if (newSelected.length === filteredData.length) {
        setSelectAll(true);
      }
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leaves/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (res.ok) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating status:", error);
      return false;
    }
  };

  const handleApprove = async (id: string) => {
    const success = await updateStatus(id, "Disetujui");
    if (success) {
      setData(data.map(item => item.id === id ? { ...item, status: "Disetujui" } : item));
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      alert("Gagal memperbarui status.");
    }
  };

  const handleReject = async (id: string) => {
    const success = await updateStatus(id, "Ditolak");
    if (success) {
      setData(data.map(item => item.id === id ? { ...item, status: "Ditolak" } : item));
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      alert("Gagal memperbarui status.");
    }
  };

  const handleApproveSelected = async () => {
    if (selectedItems.length === 0) return;
    
    let successCount = 0;
    for (const id of selectedItems) {
      const success = await updateStatus(id, "Disetujui");
      if (success) successCount++;
    }
    
    if (successCount > 0) {
      setData(data.map(item => selectedItems.includes(item.id) ? { ...item, status: "Disetujui" } : item));
      setSelectedItems([]);
      setSelectAll(false);
      alert(`${successCount} pengajuan berhasil disetujui.`);
    } else {
      alert("Gagal menyetujui pengajuan.");
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
                   onClick={handleApproveSelected}
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
                      onClick={() => handleReject(item.id)}
                      className="px-6 py-2 rounded-full text-[#e11d48] bg-[#ffe4e6] text-[13px] font-bold active:scale-95 transition-transform"
                    >
                      Tolak
                    </button>
                    <button 
                      onClick={() => handleApprove(item.id)}
                      className="px-6 py-2 rounded-full text-white bg-[#356E3B] text-[13px] font-bold active:scale-95 transition-transform"
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
    </div>
  );
}
