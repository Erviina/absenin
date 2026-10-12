"use client";

import { ChevronLeft, Search, Check, ChevronRight, ListFilter, QrCode, Building2, Copy, Users, Clock, UserPlus, Calendar, User, X, Trash2, AlertTriangle, LogOut, MessageSquare, CheckCircle2, XCircle, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { QRCodeSVG } from "qrcode.react";
import { useCompany } from "@/context/CompanyContext";

export default function KelolaKaryawanPage() {
  const router = useRouter();
  const { activeCompanyId, activeCompany, activeRole, isLoading: isCompanyLoading } = useCompany();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isCompanyLoading) return;

    if (activeRole) {
      if (["owner", "admin", "manager"].includes(activeRole)) {
        setIsAuthorized(true);
      } else {
        router.replace("/dashboard");
      }
      return;
    }

    const checkAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/auth/me", {
          headers
        });
        
        if (!res.ok) {
          router.push("/login");
          return;
        }

        const data = await res.json();
        const userActiveRole = data.data?.user?.activeRole;
        const isMgmt = userActiveRole 
          ? ["owner", "admin", "manager"].includes(userActiveRole) 
          : (data.data?.user?.isManagement || false);

        if (data.success && isMgmt) {
          setIsAuthorized(true);
        } else {
          router.replace("/dashboard");
        }
      } catch (err) {
        router.push("/login");
      }
    };
    
    checkAuth();
  }, [router, activeRole, activeCompanyId, isCompanyLoading]);

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
  const { activeCompanyId, activeCompany, activeRole } = useCompany();

  // If user switches to a company where they are just a member, redirect back to dashboard
  useEffect(() => {
    if (activeRole && !["owner", "admin", "manager"].includes(activeRole)) {
      router.replace("/dashboard");
    }
  }, [activeRole, router]);

  const [activeTab, setActiveTab] = useState<"semua" | "karyawan" | "keluar" | "masuk">("semua");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setCurrentUserId(payload.sub || payload.id || payload.userId || null);
    } catch {}
  }, []);

  const canRemoveEmployee = (emp: any) => {
    if (!emp || emp.id === currentUserId) return false;
    const targetRole = (emp.role || "").toLowerCase();
    if (targetRole === "owner") return false;
    if (activeRole === "owner") return true;
    if (activeRole === "admin") return targetRole !== "owner" && targetRole !== "admin";
    if (activeRole === "manager") return targetRole === "member";
    return false;
  };

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedEmployeeForRole, setSelectedEmployeeForRole] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<"Admin" | "Manager" | "Employee">("Employee");

  // Soft Delete Member State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [deleteMemberError, setDeleteMemberError] = useState("");

  // Exit Requests State
  const [exitRequests, setExitRequests] = useState<any[]>([]);
  const [isLoadingExitRequests, setIsLoadingExitRequests] = useState(true);
  const [exitRequestsError, setExitRequestsError] = useState("");

  // Exit Request Modal State (Approve / Reject)
  const [selectedExitReqForAction, setSelectedExitReqForAction] = useState<any>(null);
  const [exitActionType, setExitActionType] = useState<"approve" | "reject">("approve");
  const [isProcessingExitReq, setIsProcessingExitReq] = useState(false);
  const [exitActionError, setExitActionError] = useState("");

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
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/employees", {
        headers: { 
          "Authorization": `Bearer ${token}`,
          ...(activeCompanyId ? { "x-company-id": activeCompanyId } : {})
        }
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

  const fetchExitRequestsData = async (token: string) => {
    setIsLoadingExitRequests(true);
    setExitRequestsError("");
    try {
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      const headers: Record<string, string> = { "Authorization": `Bearer ${token}` };
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/exit-requests", {
        headers
      });
      const data = await res.json();
      if (data.success) {
        setExitRequests(data.data || []);
      } else {
        setExitRequestsError(data.message || "Gagal memuat permohonan keluar");
      }
    } catch (err) {
      setExitRequestsError("Terjadi kesalahan jaringan");
    } finally {
      setIsLoadingExitRequests(false);
    }
  };

  const handleConfirmExitRequest = async () => {
    if (!selectedExitReqForAction || isProcessingExitReq) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setIsProcessingExitReq(true);
    setExitActionError("");
    try {
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      const headers: Record<string, string> = { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const endpoint = exitActionType === "approve"
        ? `/company/exit-requests/${selectedExitReqForAction.id}/approve`
        : `/company/exit-requests/${selectedExitReqForAction.id}/reject`;

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + endpoint, {
        method: "POST",
        headers
      });
      const data = await res.json();

      if (data.success) {
        setSelectedExitReqForAction(null);
        fetchExitRequestsData(token);
        if (exitActionType === "approve") {
          fetchEmployeesData(token);
        }
      } else {
        setExitActionError(data.message || `Gagal ${exitActionType === 'approve' ? 'mengeluarkan' : 'menolak'} anggota`);
      }
    } catch (err) {
      setExitActionError("Terjadi kesalahan koneksi");
    } finally {
      setIsProcessingExitReq(false);
    }
  };

  const handleSoftDeleteMember = async () => {
    if (!selectedEmployeeForRole || isDeletingMember) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setIsDeletingMember(true);
    setDeleteMemberError("");
    try {
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + `/companies/employees/${selectedEmployeeForRole.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          ...(activeCompanyId ? { "x-company-id": activeCompanyId } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        setIsDeleteConfirmOpen(false);
        setSelectedEmployeeForRole(null);
        fetchEmployeesData(token);
      } else {
        setDeleteMemberError(data.message || "Gagal mengeluarkan anggota");
      }
    } catch (err) {
      setDeleteMemberError("Terjadi kesalahan jaringan");
    } finally {
      setIsDeletingMember(false);
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
      const compHeaders: Record<string, string> = { "Authorization": `Bearer ${token}` };
      if (activeCompanyId) compHeaders["x-company-id"] = activeCompanyId;

      fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/me", {
        headers: compHeaders
      }).then(res => res.json()).then(data => {
        if (data.success) {
          setCompanyData(data.data);
        }
      }).catch(console.error)
        .finally(() => setIsLoadingCompany(false));

      // Fetch Join Requests
      fetchRequestsData(token);

      // Fetch Exit Requests
      fetchExitRequestsData(token);
    };
    fetchData();
  }, [activeCompanyId]);

  const fetchRequestsData = async (token: string) => {
    setIsLoadingRequests(true);
    setRequestsError("");
    try {
      const headers: Record<string, string> = { "Authorization": `Bearer ${token}` };
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/company/join-requests", {
        headers
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
      const approveHeaders: Record<string, string> = { "Authorization": `Bearer ${token}` };
      if (activeCompanyId) approveHeaders["x-company-id"] = activeCompanyId;

      for (const reqId of selectedRequests) {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + `/company/join-requests/${reqId}/approve`, {
          method: "POST",
          headers: approveHeaders
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.message || "Gagal menyetujui permintaan");
        }
      }
      setSelectedRequests([]);
      fetchRequestsData(token);
      
      // Refetch employees to update list
      fetchEmployeesData(token);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal menyetujui permintaan");
    } finally {
      setIsProcessingReq(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      <TopBar 
        title="Kelola Karyawan" 
        showCompanySwitcher={true}
        rightAction={
          <button 
            onClick={() => setIsBarcodeModalOpen(true)} 
            className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition-all z-10"
            aria-label="Kode QR Perusahaan"
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
        <div className="grid grid-cols-3 gap-2.5">
          {/* Total Karyawan */}
          <div 
            onClick={() => setActiveTab("karyawan")}
            className={`bg-white rounded-[20px] p-3.5 flex flex-col items-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] border cursor-pointer transition-all active:scale-95 ${
              activeTab === "karyawan" ? "border-[#356E3B] bg-[#f4f9f6]/40" : "border-gray-50 hover:border-gray-200"
            }`}
          >
            <div className="w-9 h-9 bg-[#f4f9f6] rounded-[12px] flex items-center justify-center shrink-0 mb-1.5">
              <Users className="w-5 h-5 text-[#356E3B]" strokeWidth={1.5} />
            </div>
            <span className="text-[#111827] text-[18px] font-bold leading-none mb-1">{totalEmployees}</span>
            <span className="text-gray-400 text-[10px] font-medium leading-tight">Total Karyawan</span>
          </div>

          {/* Permintaan Keluar */}
          <div 
            onClick={() => setActiveTab("keluar")}
            className={`bg-white rounded-[20px] p-3.5 flex flex-col items-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] border cursor-pointer transition-all active:scale-95 relative ${
              activeTab === "keluar" 
                ? "border-red-500 bg-red-50/20" 
                : (exitRequests.length > 0 ? "border-red-200 bg-[#fffdfd] hover:border-red-300" : "border-gray-50 hover:border-gray-200")
            }`}
          >
            {exitRequests.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <div className="w-9 h-9 bg-red-50 rounded-[12px] flex items-center justify-center shrink-0 mb-1.5">
              <LogOut className="w-4 h-4 text-red-600" strokeWidth={2} />
            </div>
            <span className="text-[#111827] text-[18px] font-bold leading-none mb-1">{exitRequests.length}</span>
            <span className="text-gray-400 text-[10px] font-medium leading-tight">Minta Keluar</span>
          </div>

          {/* Permintaan Bergabung */}
          <div 
            onClick={() => setActiveTab("masuk")}
            className={`bg-white rounded-[20px] p-3.5 flex flex-col items-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] border cursor-pointer transition-all active:scale-95 ${
              activeTab === "masuk" ? "border-amber-500 bg-amber-50/20" : "border-gray-50 hover:border-gray-200"
            }`}
          >
            <div className="w-9 h-9 bg-[#fff8ef] rounded-[12px] flex items-center justify-center shrink-0 mb-1.5">
              <Clock className="w-4 h-4 text-[#f59e0b]" strokeWidth={2} />
            </div>
            <span className="text-[#111827] text-[18px] font-bold leading-none mb-1">{joinRequests.length}</span>
            <span className="text-gray-400 text-[10px] font-medium leading-tight">Minta Gabung</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveTab("semua")}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all shrink-0 ${
              activeTab === "semua"
                ? "bg-[#1E4738] text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setActiveTab("karyawan")}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "karyawan"
                ? "bg-[#1E4738] text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50"
            }`}
          >
            <span>Karyawan</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === "karyawan" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            }`}>
              {filteredEmployees.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("keluar")}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "keluar"
                ? "bg-[#1E4738] text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50"
            }`}
          >
            <span>Permintaan Keluar</span>
            {exitRequests.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "keluar" ? "bg-red-500 text-white" : "bg-red-100 text-red-600"
              }`}>
                {exitRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("masuk")}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "masuk"
                ? "bg-[#1E4738] text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50"
            }`}
          >
            <span>Permintaan Gabung</span>
            {joinRequests.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "masuk" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700"
              }`}>
                {joinRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Permintaan Keluar Section */}
        {(activeTab === "keluar" || (activeTab === "semua" && (isLoadingExitRequests || exitRequestsError || exitRequests.length > 0))) && (
          <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-red-100 p-5 flex flex-col gap-4 mt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0 border border-red-100">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[#111827] text-[13px] font-bold leading-tight">
                    Permintaan Keluar ({exitRequests.length})
                  </h3>
                  <p className="text-gray-400 text-[11px] leading-tight">
                    Karyawan yang mengajukan keluar dan menunggu konfirmasi Admin/Manager.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {isLoadingExitRequests ? (
                <div className="text-center py-5 text-gray-400 text-[13px]">Memuat permohonan keluar...</div>
              ) : exitRequestsError ? (
                <div className="text-center py-5 text-red-500 text-[13px]">{exitRequestsError}</div>
              ) : exitRequests.length === 0 ? (
                <div className="text-center py-5 text-gray-400 text-[13px]">Tidak ada permohonan keluar saat ini.</div>
              ) : (
                exitRequests.map((item) => (
                  <div key={item.id} className="border border-red-100/80 bg-[#fffdfd] p-3.5 rounded-[18px] flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#f4f9f6] text-[#356E3B] border border-gray-100 rounded-full flex items-center justify-center shrink-0 overflow-hidden relative">
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
                      <span className="text-amber-700 border border-amber-300 bg-[#fff8ef] text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
                        Menunggu Konfirmasi
                      </span>
                    </div>

                    {item.reason && (
                      <div className="bg-white border border-gray-100 rounded-[12px] p-2.5 text-[12px] text-gray-600 flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="italic leading-relaxed">"{item.reason}"</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400">
                        Diajukan: {new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedExitReqForAction(item);
                            setExitActionType("reject");
                            setExitActionError("");
                          }}
                          className="px-3 py-1.5 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-full text-[11px] font-bold transition-all active:scale-95"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => {
                            setSelectedExitReqForAction(item);
                            setExitActionType("approve");
                            setExitActionError("");
                          }}
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-[11px] font-bold transition-all active:scale-95 shadow-sm shadow-red-600/20 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Konfirmasi Keluarkan</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Permintaan Bergabung */}
        {(activeTab === "masuk" || (activeTab === "semua" && (isLoadingRequests || requestsError || joinRequests.length > 0))) && (
        <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] p-5 flex flex-col gap-4 mt-1">
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
            ) : joinRequests.length === 0 ? (
              <div className="text-center py-5 text-gray-400 text-[13px]">Tidak ada permintaan bergabung saat ini.</div>
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
        {(activeTab === "semua" || activeTab === "karyawan") && (
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

                const isSelf = item.id === currentUserId;
                const canRemove = canRemoveEmployee(item);

                return (
                 <div 
                   key={item.id} 
                   className="flex items-center gap-3 border border-gray-100 p-3 rounded-[16px] cursor-pointer hover:border-[#dce9df] transition-colors bg-white hover:bg-gray-50/50"
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
                     <div className="flex items-center gap-1.5 overflow-hidden">
                       <span className="text-[#111827] text-[14px] font-bold leading-none truncate">{item.full_name}</span>
                       {isSelf && (
                         <span className="text-[10px] font-bold text-[#356E3B] bg-[#eef5f0] px-1.5 py-0.5 rounded-[6px] shrink-0">
                           (Anda)
                         </span>
                       )}
                     </div>
                     <span className="text-gray-400 text-[11px] leading-none mb-1 truncate">{item.email}</span>
                     <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-[6px] ${roleColorClass}`}>
                          {roleText}
                        </span>
                     </div>
                   </div>

                   {/* Direct Action Buttons */}
                   <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                     {canRemove && (
                       <button
                         type="button"
                         onClick={() => {
                           setSelectedEmployeeForRole(item);
                           setDeleteMemberError("");
                           setIsDeleteConfirmOpen(true);
                         }}
                         className="px-2.5 py-1.5 rounded-[10px] bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/70 text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                         title="Keluarkan dari perusahaan"
                       >
                         <UserMinus className="w-3.5 h-3.5" />
                         <span>Keluarkan</span>
                       </button>
                     )}
                     <button
                       type="button"
                       onClick={() => {
                         setSelectedEmployeeForRole(item);
                         if (item.roles?.includes('Admin')) setSelectedRole('Admin');
                         else if (item.roles?.includes('Manager')) setSelectedRole('Manager');
                         else setSelectedRole('Employee');
                       }}
                       className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-[#356E3B] hover:bg-gray-100 transition-colors"
                       title="Pengaturan akses"
                     >
                       <ChevronRight className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
                );
              })
            )}
          </div>
        </div>
        )}

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
              <h2 className="text-[16px] font-bold text-[#111827]">Kelola Karyawan</h2>
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
            
            <div className="flex flex-col gap-2 mt-4">
              <button 
                onClick={handleSimpanRole}
                disabled={isSavingRole}
                className="w-full py-3.5 bg-[#356E3B] text-white rounded-[16px] font-bold text-[14px] active:scale-95 transition-transform shadow-md shadow-[#356E3B]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingRole ? "Menyimpan..." : "Simpan Perubahan Role"}
              </button>

              {/* Opsi Keluarkan Karyawan */}
              {canRemoveEmployee(selectedEmployeeForRole) && (
                <div className="pt-2 border-t border-gray-100 flex flex-col gap-2 mt-1">
                  <button 
                    onClick={() => {
                      setDeleteMemberError("");
                      setIsDeleteConfirmOpen(true);
                    }}
                    type="button"
                    className="w-full py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-[16px] font-bold text-[13px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>Keluarkan dari Perusahaan</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Soft Delete Member */}
      {isDeleteConfirmOpen && selectedEmployeeForRole && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-5">
          <div className="w-full max-w-sm bg-white rounded-[24px] p-6 flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
              <UserMinus className="w-7 h-7" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[17px] font-bold text-[#111827]">Keluarkan Karyawan?</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed px-2">
                Apakah Anda yakin ingin mengeluarkan <span className="font-semibold text-gray-800">{selectedEmployeeForRole.full_name}</span> dari <span className="font-semibold text-gray-800">{activeCompany?.name || "perusahaan"}</span>? Akses karyawan ini akan dinonaktifkan.
              </p>
            </div>

            {deleteMemberError && (
              <div className="w-full text-red-600 text-[12px] bg-red-50 p-2.5 rounded-[12px] border border-red-200 text-center font-medium">
                {deleteMemberError}
              </div>
            )}

            <div className="flex gap-3 w-full mt-2">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeletingMember}
                className="flex-1 py-3 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-[13px] transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleSoftDeleteMember}
                disabled={isDeletingMember}
                className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-[13px] active:scale-95 transition-all shadow-md shadow-red-600/20 disabled:opacity-50"
              >
                {isDeletingMember ? "Mengeluarkan..." : "Ya, Keluarkan Karyawan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Exit Request (Approve / Reject) */}
      {selectedExitReqForAction && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-5">
          <div className="w-full max-w-sm bg-white rounded-[24px] p-6 flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
              exitActionType === 'approve' 
                ? 'bg-red-50 border border-red-100 text-red-600' 
                : 'bg-gray-100 border border-gray-200 text-gray-600'
            }`}>
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[17px] font-bold text-[#111827]">
                {exitActionType === "approve" ? "Konfirmasi Keluarkan Karyawan?" : "Tolak Permintaan Keluar?"}
              </h3>
              <p className="text-[13px] text-gray-500 leading-relaxed px-1">
                {exitActionType === "approve" ? (
                  <>
                    Apakah Anda yakin ingin menyetujui permohonan keluar dari <span className="font-semibold text-gray-800">{selectedExitReqForAction.full_name}</span>? Karyawan ini akan resmi dikeluarkan dari <span className="font-semibold text-gray-800">{activeCompany?.name || 'organisasi'}</span>.
                  </>
                ) : (
                  <>
                    Apakah Anda yakin ingin menolak permohonan keluar dari <span className="font-semibold text-gray-800">{selectedExitReqForAction.full_name}</span>? Karyawan tetap berstatus sebagai anggota aktif.
                  </>
                )}
              </p>

              {selectedExitReqForAction.reason && (
                <div className="mt-2 bg-gray-50 border border-gray-100 p-2.5 rounded-[12px] text-left text-[12px] text-gray-600 w-full">
                  <span className="font-semibold text-gray-700 block mb-0.5">Alasan pengajuan:</span>
                  <span className="italic leading-relaxed">"{selectedExitReqForAction.reason}"</span>
                </div>
              )}
            </div>

            {exitActionError && (
              <div className="w-full text-red-600 text-[12px] bg-red-50 p-2.5 rounded-[12px] border border-red-200 text-center font-medium">
                {exitActionError}
              </div>
            )}

            <div className="flex gap-3 w-full mt-2">
              <button 
                onClick={() => setSelectedExitReqForAction(null)}
                disabled={isProcessingExitReq}
                className="flex-1 py-3 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-[13px] transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmExitRequest}
                disabled={isProcessingExitReq}
                className={`flex-1 py-3 rounded-full text-white font-semibold text-[13px] active:scale-95 transition-all shadow-md disabled:opacity-50 ${
                  exitActionType === 'approve' 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' 
                    : 'bg-gray-800 hover:bg-gray-900 shadow-gray-800/20'
                }`}
              >
                {isProcessingExitReq 
                  ? "Memproses..." 
                  : (exitActionType === "approve" ? "Ya, Keluarkan" : "Tolak Permohonan")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


