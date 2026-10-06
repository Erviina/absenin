"use client";

import { ChevronLeft, Search, Check, ChevronRight, ListFilter, QrCode, Building2, Copy, Users, Clock, UserPlus, Calendar, User, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { TopBar } from "@/components/TopBar";

export default function KelolaKaryawanPage() {
  const [role, setRole] = useState<"manager" | "admin">("admin");

  return (
    <>
      {/* TOMBOL SEMENTARA UNTUK PREVIEW */}
      <div className="fixed bottom-[100px] right-5 z-[999]">
        <button 
          onClick={() => setRole(role === "admin" ? "manager" : "admin")}
          className="bg-[#111827] text-white text-[11px] px-4 py-2.5 rounded-full shadow-lg border border-white/20 flex items-center gap-2 active:scale-95 transition-all"
        >
          Lihat versi: <span className="font-bold text-[#4ADE80]">{role === "admin" ? "Manager" : "Admin"}</span>
        </button>
      </div>

      {role === "admin" ? <AdminKaryawanView /> : <ManagerKaryawanView />}
    </>
  );
}

// ==========================================
// VIEW ADMIN
// ==========================================
function AdminKaryawanView() {
  const router = useRouter();
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedEmployeeForRole, setSelectedEmployeeForRole] = useState<any>(null);

  // State untuk Permintaan Bergabung
  const [joinRequests, setJoinRequests] = useState([
    { id: '1', name: 'Rina Aprilia', email: 'rina@perusahaan.com' },
    { id: '2', name: 'Fajar Nugroho', email: 'fajar@perusahaan.com' },
    { id: '3', name: 'Siti Aisyah', email: 'siti@perusahaan.com' }
  ]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  const toggleSelectAllReq = () => {
    if (selectedRequests.length === joinRequests.length && joinRequests.length > 0) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(joinRequests.map(req => req.id));
    }
  };

  const toggleReqItem = (id: string) => {
    if (selectedRequests.includes(id)) {
      setSelectedRequests(selectedRequests.filter(reqId => reqId !== id));
    } else {
      setSelectedRequests([...selectedRequests, id]);
    }
  };

  const handleTerimaReq = () => {
    if (selectedRequests.length === 0) return;
    alert(`${selectedRequests.length} karyawan berhasil diterima!`);
    setJoinRequests(joinRequests.filter(req => !selectedRequests.includes(req.id)));
    setSelectedRequests([]);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      <TopBar 
        title="Kelola Karyawan" 
        rightAction={
          <button 
            onClick={() => setIsBarcodeModalOpen(true)} 
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-[10px] flex items-center justify-center transition-colors"
          >
            <QrCode className="w-5 h-5 text-white" />
          </button>
        }
      />

      <div className="flex-1 px-5 py-5 flex flex-col gap-4 z-10 relative">
        
        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <input 
              type="text" 
              placeholder="Cari nama karyawan..."
              className="w-full bg-white border border-gray-100 rounded-[16px] pl-12 pr-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
            />
          </div>
          <button className="w-[50px] h-[50px] bg-white border border-gray-100 rounded-[16px] flex items-center justify-center text-gray-500 shadow-[0_2px_12px_rgba(0,0,0,0.02)] active:scale-95 transition-transform">
            <ListFilter className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex-[1.2] bg-white rounded-[20px] p-4 flex items-center gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-50">
            <div className="w-12 h-12 bg-[#f4f9f6] rounded-[14px] flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-[#356E3B]" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-[#111827] text-[20px] font-bold leading-none mb-1">24</span>
              <span className="text-gray-400 text-[11px] font-medium leading-tight">Total Karyawan</span>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-[20px] p-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#fff8ef] rounded-[12px] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-[#f59e0b]" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[#111827] text-[20px] font-bold leading-none mb-1">3</span>
                <span className="text-gray-400 text-[11px] font-medium leading-tight">Persetujuan</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </div>
        </div>

        {/* Permintaan Bergabung */}
        {joinRequests.length > 0 && (
        <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] p-5 flex flex-col gap-4 mt-2">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
               <div className="w-7 h-7 bg-[#f4f9f6] rounded-lg flex items-center justify-center shrink-0">
                 <UserPlus className="w-4 h-4 text-[#356E3B]" />
               </div>
               <span className="text-[#111827] text-[13px] font-bold">Permintaan Bergabung ({joinRequests.length})</span>
            </div>
            <div className="flex justify-between items-center">
               <label className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => e.preventDefault()}>
                 <div 
                   onClick={toggleSelectAllReq}
                   className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors cursor-pointer ${selectedRequests.length > 0 && selectedRequests.length === joinRequests.length ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}
                 >
                   {selectedRequests.length > 0 && selectedRequests.length === joinRequests.length && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                 </div>
                 <span className="text-[12px] text-[#111827] font-medium" onClick={toggleSelectAllReq}>Pilih Semua</span>
               </label>
               <button 
                 onClick={handleTerimaReq}
                 disabled={selectedRequests.length === 0}
                 className={`text-white text-[11px] font-bold px-4 py-1.5 rounded-full transition-all ${selectedRequests.length > 0 ? 'bg-[#356E3B] active:scale-95' : 'bg-gray-300 cursor-not-allowed'}`}
               >
                 Terima ({selectedRequests.length})
               </button>
            </div>
          </div>
          
          {/* Items */}
          <div className="flex flex-col gap-2">
            {joinRequests.map((item) => (
               <div key={item.id} className="flex items-center gap-3 border border-gray-100 p-3 rounded-[16px] cursor-pointer" onClick={() => toggleReqItem(item.id)}>
                 <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors shrink-0 ${selectedRequests.includes(item.id) ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}>
                   {selectedRequests.includes(item.id) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                 </div>
                 <div className="w-10 h-10 bg-[#f4f9f6] text-[#356E3B] border border-[#eef5f0] rounded-full flex items-center justify-center shrink-0">
                   <User className="w-5 h-5" strokeWidth={2.5} />
                 </div>
                 <div className="flex flex-col flex-1 overflow-hidden">
                   <span className="text-[#111827] text-[13px] font-bold truncate">{item.name}</span>
                   <span className="text-gray-400 text-[11px] truncate">{item.email}</span>
                 </div>
                 <span className="text-[#f59e0b] border border-[#f59e0b]/30 bg-[#fff8ef] text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
                   Pending
                 </span>
                 <ChevronRight className="w-4 h-4 text-gray-300 ml-1 shrink-0" />
               </div>
            ))}
          </div>
        </div>
        )}

        {/* Daftar Karyawan */}
        <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2.5">
               <div className="w-7 h-7 bg-[#f4f9f6] rounded-lg flex items-center justify-center shrink-0">
                 <Users className="w-4 h-4 text-[#356E3B]" />
               </div>
               <span className="text-[#111827] text-[13px] font-bold">Daftar Karyawan</span>
            </div>
            <span className="text-[#356E3B] text-[11px] font-bold cursor-pointer hover:underline">
               Lihat Semua &gt;
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { name: 'Ayu Lestari', email: 'ayu@perusahaan.com', role: 'Manajemen', attend: '18/20' },
              { name: 'Budi Santoso', email: 'budi@perusahaan.com', role: 'Karyawan', attend: '16/20' },
              { name: 'Citra Dewi', email: 'citra@perusahaan.com', role: 'Karyawan', attend: '17/20' },
              { name: 'Dika Pratama', email: 'dika@perusahaan.com', role: 'Karyawan', attend: '15/20' }
            ].map((item, i) => (
               <div 
                 key={i} 
                 className="flex items-center gap-3 border border-gray-100 p-3 rounded-[16px] cursor-pointer hover:border-[#dce9df] transition-colors"
                 onClick={() => setSelectedEmployeeForRole(item)}
               >
                 <div className="w-[46px] h-[46px] border border-[#eef5f0] bg-[#f4f9f6] rounded-full flex items-center justify-center text-[#356E3B] shrink-0">
                   <User className="w-5 h-5" strokeWidth={2.5} />
                 </div>
                 <div className="flex flex-col flex-1 gap-1 overflow-hidden">
                   <span className="text-[#111827] text-[14px] font-bold leading-none truncate">{item.name}</span>
                   <span className="text-gray-400 text-[11px] leading-none mb-1 truncate">{item.email}</span>
                   <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-[6px] ${item.role === 'Manajemen' ? 'bg-[#eef5f0] text-[#356E3B]' : 'bg-gray-100 text-gray-500'}`}>
                        {item.role}
                      </span>
                   </div>
                 </div>
                 <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
               </div>
            ))}
          </div>
        </div>

      </div>

      {/* QR Code Modal (Hanya untuk Admin) */}
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

      {/* Modal Edit Role Karyawan */}
      {selectedEmployeeForRole && (
        <div className="fixed inset-0 z-[100] flex justify-end flex-col sm:justify-center sm:items-center bg-black/60">
          <div className="w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-[16px] font-bold text-[#111827]">Pengaturan Akses Karyawan</h2>
              <button onClick={() => setSelectedEmployeeForRole(null)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 active:scale-95 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-[#fbfdfc] border border-gray-100 rounded-[16px] mb-2">
               <div className="w-[46px] h-[46px] border border-[#eef5f0] bg-[#f4f9f6] rounded-full flex items-center justify-center text-[#356E3B] shrink-0">
                 <User className="w-5 h-5" strokeWidth={2.5} />
               </div>
               <div className="flex flex-col">
                 <span className="text-[#111827] text-[14px] font-bold">{selectedEmployeeForRole.name}</span>
                 <span className="text-gray-500 text-[12px]">{selectedEmployeeForRole.email}</span>
               </div>
            </div>

            <div className="flex flex-col gap-3">
               <span className="text-[13px] font-bold text-[#111827]">Hak Akses Dimiliki</span>
               
               {/* Base Role: Karyawan (Locked) */}
               <div className="flex items-center justify-between p-4 border border-[#356E3B]/20 bg-[#f4f9f6] rounded-[16px]">
                 <div className="flex flex-col gap-0.5 opacity-80">
                   <span className="text-[#111827] text-[14px] font-bold">Karyawan (Dasar)</span>
                   <span className="text-gray-500 text-[11px] leading-relaxed max-w-[220px]">
                     Akses fitur presensi, pengajuan izin, dan melihat berita. (Wajib dimiliki)
                   </span>
                 </div>
                 <div className="w-5 h-5 rounded-full bg-[#356E3B] flex items-center justify-center">
                   <Check className="w-3 h-3 text-white" strokeWidth={3} />
                 </div>
               </div>

               {/* Additional Role: Manajemen */}
               <label className={`flex items-center justify-between p-4 border rounded-[16px] cursor-pointer transition-colors group ${selectedEmployeeForRole.role === 'Manajemen' ? 'border-[#356E3B] bg-white' : 'border-gray-100 hover:border-gray-300'}`}>
                 <div className="flex flex-col gap-0.5">
                   <span className="text-[#111827] text-[14px] font-bold">Akses Manajemen</span>
                   <span className="text-gray-400 text-[11px] leading-relaxed max-w-[220px]">
                     Dapat mengelola bawahan, menyetujui/menolak izin, dan menambah berita.
                   </span>
                 </div>
                 <input 
                   type="checkbox" 
                   name="aksesTambahan" 
                   value="Manajemen" 
                   defaultChecked={selectedEmployeeForRole.role === 'Manajemen'}
                   className="w-4 h-4 text-[#356E3B] focus:ring-[#356E3B] rounded border-gray-300"
                   onChange={(e) => {
                     // Simulasi radio behavior (karena max 2 role: Karyawan + Manajemen ATAU Karyawan + Admin)
                     if (e.target.checked) {
                       const adminCheck = document.getElementById('check-admin') as HTMLInputElement;
                       if (adminCheck) adminCheck.checked = false;
                     }
                   }}
                 />
               </label>

               {/* Additional Role: Admin */}
               <label className={`flex items-center justify-between p-4 border rounded-[16px] cursor-pointer transition-colors group ${selectedEmployeeForRole.role === 'Admin' ? 'border-[#356E3B] bg-white' : 'border-gray-100 hover:border-gray-300'}`}>
                 <div className="flex flex-col gap-0.5">
                   <span className="text-[#111827] text-[14px] font-bold">Akses Admin</span>
                   <span className="text-gray-400 text-[11px] leading-relaxed max-w-[220px]">
                     Akses penuh mengatur perusahaan, role karyawan, absensi, dll.
                   </span>
                 </div>
                 <input 
                   id="check-admin"
                   type="checkbox" 
                   name="aksesTambahan" 
                   value="Admin" 
                   defaultChecked={selectedEmployeeForRole.role === 'Admin'}
                   className="w-4 h-4 text-[#356E3B] focus:ring-[#356E3B] rounded border-gray-300"
                   onChange={(e) => {
                     if (e.target.checked) {
                       const manCheck = document.querySelector('input[value="Manajemen"]') as HTMLInputElement;
                       if (manCheck) manCheck.checked = false;
                     }
                   }}
                 />
               </label>
            </div>
            
            <button 
              onClick={() => {
                alert(`Hak akses untuk ${selectedEmployeeForRole.name} berhasil diperbarui!`);
                setSelectedEmployeeForRole(null);
              }}
              className="w-full py-3.5 bg-[#356E3B] text-white rounded-[16px] font-bold text-[14px] mt-4 active:scale-95 transition-transform shadow-md shadow-[#356E3B]/20"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIEW MANAGER (Original)
// ==========================================
function ManagerKaryawanView() {
  const router = useRouter();
  
  const [employees, setEmployees] = useState<{id: string, name: string, email: string, role?: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

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
      if (!token) throw new Error("No token");
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data.map((r: any) => ({
          id: r.id, name: r.full_name || "Tanpa Nama", email: r.email || ""
        })));
      } else {
        throw new Error(data.message || "Gagal");
      }
    } catch (err) {
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

  useEffect(() => { fetchRequests(); }, []);

  const toggleSelectAll = () => {
    if (selectAll || (selectedItems.length > 0 && selectedItems.length === filteredEmployees.length)) {
      setSelectedItems([]); setSelectAll(false);
    } else {
      setSelectedItems(filteredEmployees.map(e => e.id)); setSelectAll(true);
    }
  };

  const toggleItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id)); setSelectAll(false);
    } else {
      const newSelected = [...selectedItems, id];
      setSelectedItems(newSelected);
      if (newSelected.length === filteredEmployees.length) setSelectAll(true);
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
          await fetch(process.env.NEXT_PUBLIC_API_URL + `/company/join-requests/${reqId}/approve`, {
            method: "POST", headers: { Authorization: `Bearer ${token}` }
          });
        }
      } else {
        setEmployees(employees.filter(e => !selectedItems.includes(e.id)));
      }
      setSelectedItems([]); setSelectAll(false);
    } catch (err) {
      setErrorMsg("Terjadi kesalahan saat memproses");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper untuk mendapatkan inisial nama
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      <TopBar 
        title="Kelola Karyawan" 
        rightAction={
          <button 
            onClick={() => setIsBarcodeModalOpen(true)} 
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-[10px] flex items-center justify-center transition-colors"
          >
            <QrCode className="w-5 h-5 text-white" />
          </button>
        }
      />
      
      <div className="flex-1 px-5 py-5 flex flex-col gap-5 z-10 relative">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <input 
              type="text" placeholder="Cari nama karyawan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f4f6f5] rounded-[16px] pl-12 pr-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:ring-1 focus:ring-[#356E3B] transition-shadow border-none"
            />
          </div>
          <button onClick={() => setRoleFilter(roleFilter === null ? "Manajemen" : roleFilter === "Manajemen" ? "Regular" : null)} className={`w-[50px] rounded-[16px] flex items-center justify-center transition-colors active:scale-95 ${roleFilter ? 'bg-[#356E3B] text-white' : 'bg-[#f4f6f5] text-[#1E4738]'}`}>
            <ListFilter className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {roleFilter && <div className="text-[12px] text-[#356E3B] font-medium -mt-2">Filter aktif: {roleFilter === "Manajemen" ? "Manajemen" : "Karyawan Reguler"}</div>}
        {errorMsg && <div className="bg-red-50 text-red-500 text-[13px] p-3 rounded-[12px] border border-red-100 -mt-2">{errorMsg}</div>}

        <div className="flex justify-between items-center -mt-1">
          <div className="flex items-center gap-3 cursor-pointer active:opacity-70" onClick={toggleSelectAll}>
            <div className={`w-[20px] h-[20px] rounded-[6px] border-[1.5px] flex items-center justify-center transition-colors ${selectAll || (selectedItems.length > 0 && selectedItems.length === filteredEmployees.length) ? 'bg-[#356E3B] border-[#356E3B]' : selectedItems.length > 0 ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}>
              {selectedItems.length > 0 && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            </div>
            <span className="text-[14px] text-[#1E4738] font-bold">Pilih Semua <span className="font-medium text-gray-500">({filteredEmployees.length})</span></span>
          </div>

          <button onClick={handleTerima} disabled={selectedItems.length === 0 || isProcessing} className={`px-5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${(selectedItems.length > 0 && !isProcessing) ? 'bg-[#356E3B] hover:bg-[#2b5930] text-white active:scale-95 shadow-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            {isProcessing ? "Memproses..." : "Terima"}
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          {isLoading ? <div className="text-center text-gray-400 py-10 text-[14px]">Memuat data...</div> : filteredEmployees.length === 0 ? <div className="text-center text-gray-400 py-10 text-[14px]">Tidak ada data pengajuan pending</div> : (
            filteredEmployees.map((emp) => (
              <div key={emp.id} className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex items-center gap-4 transition-all hover:border-[#dce9df]">
                <div className="cursor-pointer shrink-0" onClick={() => toggleItem(emp.id)}>
                  <div className={`w-[20px] h-[20px] rounded-[6px] border-[1.5px] flex items-center justify-center transition-colors ${selectedItems.includes(emp.id) ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}>
                    {selectedItems.includes(emp.id) && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>
                </div>
                
                {/* Default Avatar (Ikon) */}
                <div className="w-[38px] h-[38px] rounded-full bg-[#f4f9f6] text-[#356E3B] border border-[#eef5f0] flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" strokeWidth={2.5} />
                </div>

                <div className="flex flex-col flex-1 gap-0.5 overflow-hidden">
                  <h3 className="text-[#1E4738] text-[15px] font-bold truncate">{emp.name}</h3>
                  <p className="text-[#7d998c] text-[13px] truncate">{emp.email}</p>
                </div>
                {emp.role && <span className="bg-[#fff7ed] text-[#ea580c] text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">{emp.role}</span>}
                <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* QR Code Modal untuk Manager */}
      {isBarcodeModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center sm:bg-black/80">
          <div className="w-full max-w-md h-full flex flex-col bg-[#fbfdfc] relative">
            <div className="absolute top-6 left-5 right-6 flex items-center justify-between">
              <button 
                onClick={() => setIsBarcodeModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center -ml-2 active:scale-95 transition-transform"
              >
                <ChevronLeft className="w-8 h-8 text-[#356E3B] hover:text-[#2b5930] transition-colors" />
              </button>
            </div>
            
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
