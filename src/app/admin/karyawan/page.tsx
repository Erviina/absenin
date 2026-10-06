"use client";

import { ChevronLeft, Search, Check, ChevronRight, ListFilter, QrCode, Building2, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { TopBar } from "@/components/TopBar";

interface Employee {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export default function KelolaKaryawanPage() {
  const router = useRouter();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<string[]>([]); // Initially empty
  const [selectAll, setSelectAll] = useState(false);

  // Filter state (simulate a role filter)
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  // Filtered data based on search and role
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            emp.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter ? (roleFilter === "Manajemen" ? emp.role === "Manajemen" : emp.role !== "Manajemen") : true;
      return matchesSearch && matchesRole;
    });
  }, [employees, searchQuery, roleFilter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("No token");
      }
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const mapped = data.data.map((r: any) => ({
          id: r.id,
          name: r.full_name || "Tanpa Nama",
          email: r.email || "",
        }));
        setEmployees(mapped);
      } else {
        throw new Error(data.errors?.[0] || data.message || "Gagal");
      }
    } catch (err) {
      console.log("Using dummy data");
      // Use dummy data if failed (e.g. no token or backend down)
      setEmployees([
        { id: "1", name: "Budi Santoso", email: "budi.santoso@email.com" },
        { id: "2", name: "Siti Aminah", email: "siti.aminah@email.com", role: "Manajemen" },
        { id: "3", name: "Andi Wijaya", email: "andi.wijaya@email.com" },
        { id: "4", name: "Rina Permata", email: "rina.permata@email.com", role: "Manajemen" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const toggleSelectAll = () => {
    if (selectAll || (selectedItems.length > 0 && selectedItems.length === filteredEmployees.length)) {
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      setSelectedItems(filteredEmployees.map(e => e.id));
      setSelectAll(true);
    }
  };

  const toggleItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedItems, id];
      setSelectedItems(newSelected);
      if (newSelected.length === filteredEmployees.length) {
        setSelectAll(true);
      }
    }
  };

  const handleTerima = async () => {
    if (selectedItems.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setErrorMsg("");
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        for (const reqId of selectedItems) {
          const res = await fetch(process.env.NEXT_PUBLIC_API_URL + `/company/join-requests/${reqId}/approve`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (!data.success) {
            console.error(`Gagal menyetujui ${reqId}:`, data.message);
          }
        }
      } else {
        // Simulate local removal for dummy data
        setEmployees(employees.filter(e => !selectedItems.includes(e.id)));
      }
      
      setSelectedItems([]);
      setSelectAll(false);
    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan saat memproses");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleFilter = () => {
    // Cycle filters: null -> "Manajemen" -> "Regular" -> null
    if (roleFilter === null) setRoleFilter("Manajemen");
    else if (roleFilter === "Manajemen") setRoleFilter("Regular");
    else setRoleFilter(null);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      
      {/* Header */}
      <TopBar 
        title="Kelola Karyawan" 
        rightAction={
          <button onClick={() => setIsBarcodeModalOpen(true)} className="w-10 h-10 flex items-center justify-center">
            <QrCode className="w-6 h-6 text-white" />
          </button>
        }
      />

      {/* Main Content */}
      <div className="flex-1 px-5 py-5 flex flex-col gap-5 z-10 relative">
        
        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <input 
              type="text" 
              placeholder="Cari nama karyawan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f4f6f5] rounded-[16px] pl-12 pr-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:ring-1 focus:ring-[#356E3B] transition-shadow border-none"
            />
          </div>
          <button 
            onClick={toggleFilter}
            className={`w-[50px] rounded-[16px] flex items-center justify-center transition-colors active:scale-95 ${roleFilter ? 'bg-[#356E3B] text-white' : 'bg-[#f4f6f5] text-[#1E4738]'}`}
          >
            <ListFilter className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Filter Indicator */}
        {roleFilter && (
          <div className="text-[12px] text-[#356E3B] font-medium -mt-2">
            Filter aktif: {roleFilter === "Manajemen" ? "Manajemen" : "Karyawan Reguler"}
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 text-red-500 text-[13px] p-3 rounded-[12px] border border-red-100 -mt-2">
            {errorMsg}
          </div>
        )}

        {/* Select All & Action */}
        <div className="flex justify-between items-center -mt-1">
          <div 
            className="flex items-center gap-3 cursor-pointer active:opacity-70"
            onClick={toggleSelectAll}
          >
            <div className={`w-[20px] h-[20px] rounded-[6px] border-[1.5px] flex items-center justify-center transition-colors ${selectAll || (selectedItems.length > 0 && selectedItems.length === filteredEmployees.length) ? 'bg-[#356E3B] border-[#356E3B]' : selectedItems.length > 0 ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}>
              {selectedItems.length > 0 && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            </div>
            <span className="text-[14px] text-[#1E4738] font-bold">
              Pilih Semua <span className="font-medium text-gray-500">({filteredEmployees.length})</span>
            </span>
          </div>

          <button 
            onClick={handleTerima}
            disabled={selectedItems.length === 0 || isProcessing}
            className={`px-5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${(selectedItems.length > 0 && !isProcessing) ? 'bg-[#356E3B] hover:bg-[#2b5930] text-white active:scale-95 shadow-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {isProcessing ? "Memproses..." : "Terima"}
          </button>
        </div>

        {/* List of Employees */}
        <div className="flex flex-col gap-3.5">
          {isLoading ? (
            <div className="text-center text-gray-400 py-10 text-[14px]">
              Memuat data...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-[14px]">
              Tidak ada data pengajuan pending
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div key={emp.id} className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex items-center gap-4 transition-all hover:border-[#dce9df]">
                
                <div 
                  className="cursor-pointer shrink-0"
                  onClick={() => toggleItem(emp.id)}
                >
                  <div className={`w-[20px] h-[20px] rounded-[6px] border-[1.5px] flex items-center justify-center transition-colors ${selectedItems.includes(emp.id) ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}>
                    {selectedItems.includes(emp.id) && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>
                </div>
                
                <div className="flex flex-col flex-1 gap-0.5 overflow-hidden">
                  <h3 className="text-[#1E4738] text-[15px] font-bold truncate">{emp.name}</h3>
                  <p className="text-[#7d998c] text-[13px] truncate">{emp.email}</p>
                </div>
                
                {emp.role && (
                  <span className="bg-[#fff7ed] text-[#ea580c] text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                    {emp.role}
                  </span>
                )}
                
                <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {isBarcodeModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center sm:bg-black/80">
          <div className="w-full max-w-md h-full flex flex-col bg-[#fbfdfc] relative">
            
            {/* Top Actions */}
            <div className="absolute top-6 left-5 right-6 flex items-center justify-between">
              <button 
                onClick={() => setIsBarcodeModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center -ml-2 active:scale-95 transition-transform"
              >
                <ChevronLeft className="w-8 h-8 text-[#356E3B] hover:text-[#2b5930] transition-colors" />
              </button>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center w-full pt-20 pb-10 px-5">
              
              <div className="bg-[#f0f4fb] flex items-center gap-2 px-4 py-2 rounded-[12px] mb-10 mt-6">
                <Building2 className="w-4 h-4 text-[#356E3B]" />
                <span className="text-[#111827] text-[13px] font-bold">PT Teknologi Nusantara</span>
              </div>

              <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] mb-8">
                <QrCode className="w-[180px] h-[180px] text-[#1a3b28]" strokeWidth={1.5} />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-[#111827] text-[20px] font-bold tracking-wider">ABC123</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("ABC123");
                    alert("Kode berhasil disalin!");
                  }}
                  className="text-gray-400 hover:text-[#356E3B] transition-colors active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <p className="text-gray-500 text-[11px] text-center max-w-[200px] leading-relaxed">
                Scan QR atau Masukan Kode untuk Bergabung ke Perusahaan
              </p>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
