"use client";

import { ChevronLeft, Search, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminBottomNav } from "@/components/admin-bottom-nav";
import { TopBar } from "@/components/TopBar";

type IzinStatus = "Menunggu" | "Disetujui" | "Ditolak";
type IzinType = "Cuti" | "Izin Sakit";

interface IzinRequest {
  id: string;
  name: string;
  type: IzinType;
  status: IzinStatus;
  date: string;
  duration: string;
  reason: string;
}

const initialData: IzinRequest[] = [
  {
    id: "1",
    name: "Ayu Lestari",
    type: "Cuti",
    status: "Menunggu",
    date: "12 – 16 Sep 2025",
    duration: "5 Hari Kerja",
    reason: "Libur tahunan bersama keluarga keluar kota."
  },
  {
    id: "2",
    name: "Citra Dewi",
    type: "Izin Sakit",
    status: "Disetujui",
    date: "8 – 12 Sep 2025",
    duration: "5 Hari",
    reason: "Sakit demam"
  }
];

export default function KelolaIzinPage() {
  const router = useRouter();
  
  const [data, setData] = useState<IzinRequest[]>(initialData);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]); 
  const [activeFilter, setActiveFilter] = useState<string>("Semua");

  const filteredData = data.filter(item => {
    if (activeFilter === "Semua") return true;
    if (activeFilter === "Menunggu") return item.status === "Menunggu";
    if (activeFilter === "Cuti Tahunan") return item.type === "Cuti";
    if (activeFilter === "Izin Sakit") return item.type === "Izin Sakit";
    return true;
  });

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredData.map(d => d.id));
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

  const handleApprove = (id: string) => {
    setData(data.map(item => item.id === id ? { ...item, status: "Disetujui" } : item));
    setSelectedItems(selectedItems.filter(itemId => itemId !== id));
  };

  const handleReject = (id: string) => {
    setData(data.map(item => item.id === id ? { ...item, status: "Ditolak" } : item));
    setSelectedItems(selectedItems.filter(itemId => itemId !== id));
  };

  const handleApproveSelected = () => {
    if (selectedItems.length === 0) return;
    setData(data.map(item => selectedItems.includes(item.id) ? { ...item, status: "Disetujui" } : item));
    setSelectedItems([]);
    setSelectAll(false);
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
          {["Semua", "Menunggu", "Cuti Tahunan", "Izin Sakit"].map((filter) => (
            <button 
              key={filter}
              onClick={() => {
                setActiveFilter(filter);
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

        {/* Select All & Action */}
        <div className="flex justify-between items-center mt-2">
          <div 
            className="flex items-center gap-2.5 cursor-pointer active:opacity-70"
            onClick={toggleSelectAll}
          >
            <div className={`w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center transition-colors ${selectAll || (selectedItems.length > 0 && selectedItems.length === filteredData.length) ? 'bg-[#356E3B] border-[#356E3B]' : selectedItems.length > 0 ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}>
              {selectedItems.length > 0 && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </div>
            <span className="text-[13px] text-[#1E4738] font-bold">
              Pilih Semua <span className="font-medium text-gray-500">({filteredData.length})</span>
            </span>
          </div>

          <button 
            onClick={handleApproveSelected}
            disabled={selectedItems.length === 0}
            className={`px-4 py-2 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all ${selectedItems.length > 0 ? 'bg-[#356E3B] hover:bg-[#2b5930] text-white active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Setujui Terpilih
          </button>
        </div>

        {/* List of Requests */}
        <div className="flex flex-col gap-4 mt-2">
          {filteredData.map((item) => (
            <div key={item.id} className="bg-white rounded-[20px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col gap-3 transition-all">
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
                    {item.type === "Cuti" ? (
                      <span className="bg-[#e0f2fe] text-[#0ea5e9] text-[10px] font-semibold px-2 py-0.5 rounded-md w-fit">Cuti</span>
                    ) : (
                      <span className="bg-[#fff7ed] text-[#ea580c] text-[10px] font-semibold px-2 py-0.5 rounded-md w-fit border border-[#ffedd5]">Izin Sakit</span>
                    )}
                  </div>
                </div>
                
                {item.status === "Menunggu" && (
                  <span className="bg-[#fffbeb] border border-[#fef3c7] text-[#d97706] text-[11px] font-semibold px-3 py-1 rounded-full">Menunggu</span>
                )}
                {item.status === "Disetujui" && (
                  <span className="bg-[#ecfdf5] border border-[#d1fae5] text-[#10b981] text-[11px] font-semibold px-3 py-1 rounded-full">Disetujui</span>
                )}
                {item.status === "Ditolak" && (
                  <span className="bg-[#fef2f2] border border-[#fee2e2] text-[#ef4444] text-[11px] font-semibold px-3 py-1 rounded-full">Ditolak</span>
                )}
              </div>

              <div className="bg-[#f8faf9] rounded-xl p-3.5 flex flex-col gap-1.5 mt-1 ml-7">
                <div className="text-[13px] text-[#1E4738] font-semibold">
                  {item.date} <span className="text-[#94a3b8] font-medium">({item.duration})</span>
                </div>
                <div className="text-[12px] text-[#64748b] leading-snug">
                  <span className="font-semibold text-[#1E4738]">Alasan:</span> {item.reason}
                </div>
              </div>

              {item.status === "Menunggu" && (
                <div className="flex justify-end gap-3 mt-1">
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
              )}
            </div>
          ))}
        </div>
      </div>

      <AdminBottomNav activeTab="izin" />
    </div>
  );
}
