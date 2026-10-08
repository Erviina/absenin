"use client";

import { ChevronLeft, Search, Check, ChevronRight, ListFilter, QrCode, Building2, Copy, Users, Clock, UserPlus, Calendar, User, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { QRCodeSVG } from "qrcode.react";

export default function KelolaKaryawanPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          router.push("/login");
          return;
        }

        const data = await res.json();
        if (data.success && data.data?.user?.roles?.includes("Admin")) {
          setIsAuthorized(true);
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        router.push("/login");
      }
    };
    
    checkAuth();
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] items-center justify-center">
        <div className="text-gray-400 text-[14px]">Memverifikasi akses...</div>
      </div>
    );
  }

  return <AdminKaryawanView />;
}

// ==========================================
// VIEW ADMIN
// ==========================================
function AdminKaryawanView() {
  const router = useRouter();
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedEmployeeForRole, setSelectedEmployeeForRole] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<"Admin" | "Manager" | "Employee">("Employee");

  // Karyawan State
  const [employees, setEmployees] = useState<any[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [employeeError, setEmployeeError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [isSavingRole, setIsSavingRole] = useState(false);
  const [saveRoleError, setSaveRoleError] = useState("");
  const [roleFilter, setRoleFilter] = useState<"Semua" | "Karyawan" | "Manajemen" | "Admin">("Semua");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const fetchEmployeesData = async (token: string) => {
    setIsLoadingEmployees(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/employees", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
        setTotalEmployees(data.meta?.total || data.data.length);
      } else {
        setEmployeeError(data.message || "Gagal mengambil daftar karyawan");
      }
    } catch (err) {
      setEmployeeError("Terjadi kesalahan koneksi");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleSimpanRole = async () => {
    if (!selectedEmployeeForRole || isSavingRole) return;
    
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const newRoles = ["Employee"];
    if (selectedRole === "Manager") newRoles.push("Manager");
    if (selectedRole === "Admin") newRoles.push("Admin");

    setIsSavingRole(true);
    setSaveRoleError("");

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + `/companies/employees/${selectedEmployeeForRole.id}/roles`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ roles: newRoles })
      });

      const data = await res.json();
      if (data.success) {
        setSelectedEmployeeForRole(null);
        fetchEmployeesData(token);
      } else {
        setSaveRoleError(data.message || "Gagal menyimpan hak akses");
      }
    } catch (err) {
      setSaveRoleError("Terjadi kesalahan pada server");
    } finally {
      setIsSavingRole(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    let result = employees;

    if (roleFilter !== "Semua") {
      result = result.filter(e => {
        const roles = e.roles || [];
        if (roleFilter === "Admin") return roles.includes("Admin");
        if (roleFilter === "Manajemen") return roles.includes("Manager");
        if (roleFilter === "Karyawan") return roles.includes("Employee") && !roles.includes("Manager") && !roles.includes("Admin");
        return true;
      });
    }

    if (!searchQuery) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(e => 
      (e.full_name && e.full_name.toLowerCase().includes(q)) || 
      (e.email && e.email.toLowerCase().includes(q))
    );
  }, [employees, searchQuery, roleFilter]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      setIsLoadingCompany(true);

      // Fetch Employees
      fetchEmployeesData(token);

      // Fetch Company
      fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/me", {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(res => res.json()).then(data => {
        if (data.success) {
          setCompanyData(data.data);
        }
      }).catch(console.error)
        .finally(() => setIsLoadingCompany(false));

      // Fetch Join Requests
      fetchRequestsData(token);
    };
    fetchData();
  }, []);

  const fetchRequestsData = async (token: string) => {
    setIsLoadingRequests(true);
    setRequestsError("");
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setJoinRequests(data.data);
      } else {
        setRequestsError(data.message || "Gagal");
      }
    } catch (err) {
      setRequestsError("Terjadi kesalahan");
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // State untuk Permintaan Bergabung
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [isProcessingReq, setIsProcessingReq] = useState(false);
  
  const [companyData, setCompanyData] = useState<any>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
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

  const handleTerimaReq = async () => {
    if (selectedRequests.length === 0 || isProcessingReq) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setIsProcessingReq(true);
    try {
      for (const reqId of selectedRequests) {
        await fetch(process.env.NEXT_PUBLIC_API_URL + `/company/join-requests/${reqId}/approve`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
      }
      setSelectedRequests([]);
      fetchRequestsData(token);
      
      // Refetch employees to update list
      fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/employees", {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(res => res.json()).then(data => {
        if (data.success) {
          setEmployees(data.data);
          setTotalEmployees(data.meta?.total || data.data.length);
        }
      }).catch(console.error);

    } catch (err) {
      console.error(err);
      alert("Gagal menyetujui permintaan");
    } finally {
      setIsProcessingReq(false);
    }
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama karyawan..."
              className="w-full bg-white border border-gray-100 rounded-[16px] pl-12 pr-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="w-[50px] h-[50px] bg-white border border-gray-100 rounded-[16px] flex items-center justify-center text-gray-500 shadow-[0_2px_12px_rgba(0,0,0,0.02)] active:scale-95 transition-transform"
            >
              <ListFilter className="w-5 h-5" strokeWidth={2} />
            </button>

            {isFilterDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsFilterDropdownOpen(false)}
                />
                <div className="absolute right-0 top-[60px] w-[140px] bg-white rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 py-2 z-50 overflow-hidden">
                  {["Semua", "Karyawan", "Manajemen", "Admin"].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setRoleFilter(item as any);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-[14px] transition-colors hover:bg-gray-50 flex items-center justify-between ${
                        roleFilter === item ? "text-[#356E3B] font-medium bg-[#f4f9f6]/50" : "text-gray-600"
                      }`}
                    >
                      {item}
                      {roleFilter === item && <Check className="w-4 h-4 text-[#356E3B]" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex-[1.2] bg-white rounded-[20px] p-4 flex items-center gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-50">
            <div className="w-12 h-12 bg-[#f4f9f6] rounded-[14px] flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-[#356E3B]" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-[#111827] text-[20px] font-bold leading-none mb-1">{totalEmployees}</span>
              <span className="text-gray-400 text-[11px] font-medium leading-tight">Total Karyawan</span>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-[20px] p-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#fff8ef] rounded-[12px] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-[#f59e0b]" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[#111827] text-[20px] font-bold leading-none mb-1">{joinRequests.length}</span>
                <span className="text-gray-400 text-[11px] font-medium leading-tight">Persetujuan</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </div>
        </div>

        {/* Permintaan Bergabung */}
        {(isLoadingRequests || requestsError || joinRequests.length > 0) && (
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
                 disabled={selectedRequests.length === 0 || isProcessingReq}
                 className={`text-white text-[11px] font-bold px-4 py-1.5 rounded-full transition-all ${selectedRequests.length > 0 && !isProcessingReq ? 'bg-[#356E3B] active:scale-95' : 'bg-gray-300 cursor-not-allowed'}`}
               >
                 {isProcessingReq ? "Memproses..." : `Terima (${selectedRequests.length})`}
               </button>
            </div>
          </div>
          
          {/* Items */}
          <div className="flex flex-col gap-2">
            {isLoadingRequests ? (
              <div className="text-center py-5 text-[#7d998c] text-[13px]">Memuat permintaan bergabung...</div>
            ) : requestsError ? (
              <div className="text-center py-5 text-red-500 text-[13px]">{requestsError}</div>
            ) : (
              joinRequests.map((item) => (
               <div key={item.id} className="flex items-center gap-3 border border-gray-100 p-3 rounded-[16px] cursor-pointer" onClick={() => toggleReqItem(item.id)}>
                 <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors shrink-0 ${selectedRequests.includes(item.id) ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}>
                   {selectedRequests.includes(item.id) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                 </div>
                 <div className="w-10 h-10 bg-[#f4f9f6] text-[#356E3B] border border-[#eef5f0] rounded-full flex items-center justify-center shrink-0 overflow-hidden relative">
                   {item.avatar_url && (
                     <img 
                       src={item.avatar_url} 
                       alt={item.full_name} 
                       className="w-full h-full object-cover"
                       onError={(e) => {
                         (e.target as HTMLImageElement).style.display = 'none';
                         (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                       }}
                     />
                   )}
                   <User className={`w-5 h-5 absolute ${item.avatar_url ? 'hidden' : ''}`} strokeWidth={2.5} />
                 </div>
                 <div className="flex flex-col flex-1 overflow-hidden">
                   <span className="text-[#111827] text-[13px] font-bold truncate">{item.full_name}</span>
                   <span className="text-gray-400 text-[11px] truncate">{item.email}</span>
                 </div>
                 <span className="text-[#f59e0b] border border-[#f59e0b]/30 bg-[#fff8ef] text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
                   Pending
                 </span>
                 <ChevronRight className="w-4 h-4 text-gray-300 ml-1 shrink-0" />
               </div>
              ))
            )}
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
            {isLoadingEmployees ? (
              <div className="text-center py-5 text-[#7d998c] text-[13px]">Memuat daftar karyawan...</div>
            ) : employeeError ? (
              <div className="text-center py-5 text-red-500 text-[13px]">{employeeError}</div>
            ) : employees.length === 0 ? (
              <div className="text-center py-5 text-[#7d998c] text-[13px]">Belum ada karyawan.</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-5 text-[#7d998c] text-[13px]">Karyawan tidak ditemukan</div>
            ) : (
              filteredEmployees.map((item) => {
                let roleText = 'Karyawan';
                let roleColorClass = 'bg-gray-100 text-gray-500';
                if (item.roles?.includes('Admin')) {
                  roleText = 'Admin';
                  roleColorClass = 'bg-[#eef5f0] text-[#356E3B]';
                } else if (item.roles?.includes('Manager')) {
                  roleText = 'Manajemen';
                  roleColorClass = 'bg-[#eef5f0] text-[#356E3B]';
                }

                return (
                 <div 
                   key={item.id} 
                   className="flex items-center gap-3 border border-gray-100 p-3 rounded-[16px] cursor-pointer hover:border-[#dce9df] transition-colors"
                   onClick={() => {
                     setSelectedEmployeeForRole(item);
                     if (item.roles?.includes('Admin')) setSelectedRole('Admin');
                     else if (item.roles?.includes('Manager')) setSelectedRole('Manager');
                     else setSelectedRole('Employee');
                   }}
                 >
                   <div className="w-[46px] h-[46px] border border-[#eef5f0] bg-[#f4f9f6] rounded-full flex items-center justify-center text-[#356E3B] shrink-0 overflow-hidden relative">
                     {item.avatar_url && (
                       <img 
                         src={item.avatar_url} 
                         alt={item.full_name} 
                         className="w-full h-full object-cover"
                         onError={(e) => {
                           (e.target as HTMLImageElement).style.display = 'none';
                           (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                         }}
                       />
                     )}
                     <User className={`w-5 h-5 absolute ${item.avatar_url ? 'hidden' : ''}`} strokeWidth={2.5} />
                   </div>
                   <div className="flex flex-col flex-1 gap-1 overflow-hidden">
                     <span className="text-[#111827] text-[14px] font-bold leading-none truncate">{item.full_name}</span>
                     <span className="text-gray-400 text-[11px] leading-none mb-1 truncate">{item.email}</span>
                     <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-[6px] ${roleColorClass}`}>
                          {roleText}
                        </span>
                     </div>
                   </div>

                   <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                 </div>
                );
              })
            )}
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
              
              {isLoadingCompany ? (
                <div className="text-center py-10 text-gray-500 text-[14px]">Memuat data perusahaan...</div>
              ) : companyData ? (
                <>
                  <div className="bg-[#f0f4fb] flex items-center gap-2 px-4 py-2 rounded-[12px] mb-10 mt-6">
                    <Building2 className="w-4 h-4 text-[#356E3B]" />
                    <span className="text-[#111827] text-[13px] font-bold">{companyData.name}</span>
                  </div>

                  <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] mb-8">
                    <QRCodeSVG
                      value={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/gabung-perusahaan?code=${companyData.join_code}`}
                      size={180}
                      level="H"
                      includeMargin={false}
                      fgColor="#1a3b28"
                    />
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[#111827] text-[20px] font-bold tracking-wider">{companyData.join_code}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(companyData.join_code);
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
                </>
              ) : (
                <div className="text-center py-10 text-red-500 text-[14px]">Gagal memuat data perusahaan.</div>
              )}
              
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
              <button onClick={() => { setSelectedEmployeeForRole(null); setSaveRoleError(""); }} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 active:scale-95 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-[#fbfdfc] border border-gray-100 rounded-[16px] mb-2">
               <div className="w-[46px] h-[46px] border border-[#eef5f0] bg-[#f4f9f6] rounded-full flex items-center justify-center text-[#356E3B] shrink-0 overflow-hidden relative">
                 {selectedEmployeeForRole.avatar_url && (
                   <img 
                     src={selectedEmployeeForRole.avatar_url} 
                     alt={selectedEmployeeForRole.full_name} 
                     className="w-full h-full object-cover"
                     onError={(e) => {
                       (e.target as HTMLImageElement).style.display = 'none';
                       (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                     }}
                   />
                 )}
                 <User className={`w-5 h-5 absolute ${selectedEmployeeForRole.avatar_url ? 'hidden' : ''}`} strokeWidth={2.5} />
               </div>
               <div className="flex flex-col">
                 <span className="text-[#111827] text-[14px] font-bold">{selectedEmployeeForRole.full_name}</span>
                 <span className="text-gray-500 text-[12px]">{selectedEmployeeForRole.email}</span>
               </div>
            </div>

            <div className="flex flex-col gap-3">
               <span className="text-[13px] font-bold text-[#111827]">Hak Akses Dimiliki</span>
               
               {/* Base Role: Karyawan */}
               <div 
                 onClick={() => setSelectedRole("Employee")}
                 className={`flex items-center justify-between p-4 border rounded-[16px] cursor-pointer transition-colors group ${selectedRole === 'Employee' ? 'border-[#356E3B] bg-[#f4f9f6]' : 'border-gray-100 hover:border-gray-300 bg-[#fbfdfc]'}`}
               >
                 <div className="flex flex-col gap-0.5">
                   <span className="text-[#111827] text-[14px] font-bold">Karyawan (Dasar)</span>
                   <span className="text-gray-500 text-[11px] leading-relaxed max-w-[220px]">
                     Akses fitur presensi, pengajuan izin, dan melihat berita.
                   </span>
                 </div>
                 <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${selectedRole === 'Employee' ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}>
                   {selectedRole === 'Employee' && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                 </div>
               </div>

               {/* Additional Role: Manajemen */}
               <div 
                 onClick={() => setSelectedRole("Manager")}
                 className={`flex items-center justify-between p-4 border rounded-[16px] cursor-pointer transition-colors group ${selectedRole === 'Manager' ? 'border-[#356E3B] bg-[#f4f9f6]' : 'border-gray-100 hover:border-gray-300 bg-[#fbfdfc]'}`}
               >
                 <div className="flex flex-col gap-0.5">
                   <span className="text-[#111827] text-[14px] font-bold">Akses Manajemen</span>
                   <span className="text-gray-400 text-[11px] leading-relaxed max-w-[220px]">
                     Dapat mengelola bawahan, menyetujui/menolak izin, dan menambah berita.
                   </span>
                 </div>
                 <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${selectedRole === 'Manager' ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}>
                   {selectedRole === 'Manager' && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                 </div>
               </div>

               {/* Additional Role: Admin */}
               <div 
                 onClick={() => setSelectedRole("Admin")}
                 className={`flex items-center justify-between p-4 border rounded-[16px] cursor-pointer transition-colors group ${selectedRole === 'Admin' ? 'border-[#356E3B] bg-[#f4f9f6]' : 'border-gray-100 hover:border-gray-300 bg-[#fbfdfc]'}`}
               >
                 <div className="flex flex-col gap-0.5">
                   <span className="text-[#111827] text-[14px] font-bold">Akses Admin</span>
                   <span className="text-gray-400 text-[11px] leading-relaxed max-w-[220px]">
                     Akses penuh mengatur perusahaan, role karyawan, absensi, dll.
                   </span>
                 </div>
                 <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${selectedRole === 'Admin' ? 'bg-[#356E3B] border-[#356E3B]' : 'bg-white border-gray-300'}`}>
                   {selectedRole === 'Admin' && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                 </div>
               </div>
            </div>
            
            {saveRoleError && (
              <div className="text-red-500 text-[12px] bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                {saveRoleError}
              </div>
            )}
            
            <button 
              onClick={handleSimpanRole}
              disabled={isSavingRole}
              className="w-full py-3.5 bg-[#356E3B] text-white rounded-[16px] font-bold text-[14px] mt-4 active:scale-95 transition-transform shadow-md shadow-[#356E3B]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingRole ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


