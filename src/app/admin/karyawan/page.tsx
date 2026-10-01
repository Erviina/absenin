"use client";

import { ChevronLeft, Search, Check, ChevronRight, ListFilter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { AdminBottomNav } from "@/components/admin-bottom-nav";
import { TopBar } from "@/components/TopBar";

interface Employee {
  id: string;
  name: string;
  email: string;
  role?: string;
}

const initialEmployees: Employee[] = [
  { id: "1", name: "Ayu Lestari", email: "ayu@perusahaan.com" },
  { id: "2", name: "Budi Santoso", email: "budi@perusahaan.com" },
  { id: "3", name: "Citra Dewi", email: "citra@perusahaan.com", role: "Manajemen" },
  { id: "4", name: "Dika Pratama", email: "dika@perusahaan.com" },
  { id: "5", name: "Eka Rahma", email: "eka@perusahaan.com" },
];

export default function KelolaKaryawanPage() {
  const router = useRouter();
  
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [searchQuery, setSearchQuery] = useState("");
  
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
      const matchesRole = roleFilter ? (roleFilter === "Manajemen" ? emp.role === "Manajemen" : !emp.role) : true;
      return matchesSearch && matchesRole;
    });
  }, [employees, searchQuery, roleFilter]);

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

  const handleTerima = () => {
    if (selectedItems.length === 0) return;
    // Remove accepted employees from this view
    setEmployees(employees.filter(emp => !selectedItems.includes(emp.id)));
    setSelectedItems([]);
    setSelectAll(false);
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
      <TopBar title="Kelola Karyawan" />

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
            disabled={selectedItems.length === 0}
            className={`px-5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${selectedItems.length > 0 ? 'bg-[#356E3B] hover:bg-[#2b5930] text-white active:scale-95 shadow-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            Terima
          </button>
        </div>

        {/* List of Employees */}
        <div className="flex flex-col gap-3.5">
          {filteredEmployees.length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-[14px]">
              Tidak ada data ditemukan
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

      {/* Since we don't have a specific requirement for the bottom nav on this page in the prompt, I'll omit it or include the admin bottom nav without active selection. Actually let's just leave it out or put AdminBottomNav without active if it's not a root page, wait, I will include it to be consistent with admin layout. */}
      {/* Wait, the image doesn't show a bottom nav. I'll omit it for cleaner look, or maybe include it. I'll include it because it's part of the dashboard navigation flow. */}
      {/* Wait, the previous page had it because it's part of the bottom nav. Kelola Karyawan is not in the bottom nav. Inner pages usually don't have bottom nav in mobile. I'll omit it here to exactly match the edge-to-edge look if it's not a main tab. */}
    </div>
  );
}
