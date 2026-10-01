"use client";

import { 
  ChevronLeft, 
  Building2, 
  MapPin, 
  Users, 
  CalendarCheck, 
  FileText, 
  Calendar, 
  FileCheck, 
  Users as Users2, 
  Megaphone, 
  ClipboardList, 
  User, 
  ChevronRight 
} from "lucide-react";
import { AdminBottomNav } from "@/components/admin-bottom-nav";
import { TopBar } from "@/components/TopBar";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-24">
      
      {/* Header */}
      <TopBar title="Kelola Perusahaan" />

      {/* Main Content */}
      <div className="flex-1 px-5 py-5 flex flex-col gap-4 z-10 relative">
        
        {/* Company Card */}
        <div 
          onClick={() => router.push("/admin/perusahaan")}
          className="bg-white rounded-[20px] p-4 flex gap-4 items-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="w-[52px] h-[52px] bg-[#e6f0ea] rounded-[16px] flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-[#1E4738]" />
          </div>
          <div className="flex flex-col flex-1">
            <h2 className="text-[#1E4738] text-[15px] font-bold">PT Teknologi Nusantara</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5 text-[#5C786C] text-[12px] font-medium">
                <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>Bandung</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#5C786C] text-[12px] font-medium">
                <Users className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>24 anggota</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </div>

        {/* Stats Row */}
        <div className="flex gap-3">
          {/* Kehadiran Stats */}
          <div className="flex-[1.2] bg-white rounded-[20px] p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#eef5f0] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5 text-[#356E3B]" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col flex-1 gap-1.5 justify-center">
              <div className="h-[5px] w-full bg-gray-100 rounded-full flex overflow-hidden">
                <div className="h-full bg-[#1E4738]" style={{ width: '55%' }}></div>
                <div className="h-full bg-[#F59E0B]" style={{ width: '25%' }}></div>
                <div className="h-full bg-[#EF4444]" style={{ width: '15%' }}></div>
                <div className="h-full bg-[#9CA3AF]" style={{ width: '5%' }}></div>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-gray-500 font-medium mb-0.5">Hadir</span>
                  <span className="text-[10px] font-bold text-[#1E4738]">18</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-gray-500 font-medium mb-0.5">Terlambat</span>
                  <span className="text-[10px] font-bold text-[#F59E0B]">3</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-gray-500 font-medium mb-0.5">Izin</span>
                  <span className="text-[10px] font-bold text-[#EF4444]">2</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-gray-500 font-medium mb-0.5">Belum</span>
                  <span className="text-[10px] font-bold text-[#9CA3AF]">1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Perizinan Stats */}
          <div className="flex-1 bg-white rounded-[20px] p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#eef5f0] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#356E3B]" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col items-center justify-center shrink-0">
              <span className="text-[15px] font-bold text-[#1E4738] leading-none">3</span>
              <span className="text-[9px] text-gray-500 font-medium mt-0.5">Izin</span>
            </div>
            <div className="flex flex-col flex-1 gap-1.5 justify-center">
              <div className="h-[5px] w-full bg-gray-100 rounded-full flex overflow-hidden">
                <div className="h-full bg-[#1E4738]" style={{ width: '33%' }}></div>
                <div className="h-full bg-[#4ADE80]" style={{ width: '67%' }}></div>
              </div>
              <div className="flex justify-around items-end">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-gray-500 font-medium mb-0.5">Sakit</span>
                  <span className="text-[10px] font-bold text-[#1E4738]">1</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-gray-500 font-medium mb-0.5">Cuti</span>
                  <span className="text-[10px] font-bold text-[#4ADE80]">2</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex justify-between mt-1">
          {[
            { icon: Calendar, label: "Jadwal\nAgenda", path: "/admin/agenda" },
            { icon: FileCheck, label: "Kelola\nPerizinan", path: "/admin/izin" },
            { icon: Users2, label: "Kelola\nKaryawan", path: "/admin/karyawan" },
            { icon: Megaphone, label: "Buat\nBerita", path: "/admin/buat-berita" }
          ].map((item, i) => (
            <button 
              key={i} 
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-2.5 text-center w-[60px] active:scale-95 transition-transform"
            >
              <div className="w-[52px] h-[52px] bg-[#f0f6f2] rounded-[16px] flex items-center justify-center">
                <item.icon className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-semibold text-[#1E4738] leading-[1.2] whitespace-pre-line">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Aktivitas Terbaru */}
        <div className="flex flex-col gap-4 mt-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[16px] font-bold text-[#1E4738]">Aktivitas Terbaru</h2>
            <button className="text-[#356E3B] text-[12px] font-semibold flex items-center gap-0.5 hover:underline active:opacity-70">
              Lihat Semua
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
            <button className="px-4 py-1.5 rounded-full text-[12px] font-semibold bg-[#e6f0ea] text-[#356E3B] whitespace-nowrap">Semua</button>
            <button className="px-4 py-1.5 rounded-full text-[12px] font-medium bg-white border border-gray-200 text-gray-500 whitespace-nowrap">Perizinan</button>
            <button className="px-4 py-1.5 rounded-full text-[12px] font-medium bg-white border border-gray-200 text-gray-500 whitespace-nowrap">Karyawan</button>
            <button className="px-4 py-1.5 rounded-full text-[12px] font-medium bg-white border border-gray-200 text-gray-500 whitespace-nowrap">Pengumuman</button>
          </div>

          {/* Activity List */}
          <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col overflow-hidden">
            
            {/* Activity 1 */}
            <div className="p-4 flex gap-3.5 items-center border-b border-gray-100 active:bg-gray-50 transition-colors">
              <div className="w-[42px] h-[42px] rounded-xl bg-[#fdf5e6] flex items-center justify-center shrink-0">
                <ClipboardList className="w-[22px] h-[22px] text-[#D97706]" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col flex-1 gap-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-[#1E4738] text-[14px] font-bold leading-tight">Pengajuan cuti baru</h3>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">2 jam yang lalu</span>
                </div>
                <p className="text-[#7d998c] text-[12px] leading-[1.35] pr-2">Dewi Lestari mengajukan cuti pada 12-14 Sep 2025</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </div>

            {/* Activity 2 */}
            <div className="p-4 flex gap-3.5 items-center border-b border-gray-100 active:bg-gray-50 transition-colors">
              <div className="w-[42px] h-[42px] rounded-xl bg-[#e6f0ea] flex items-center justify-center shrink-0">
                <User className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col flex-1 gap-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-[#1E4738] text-[14px] font-bold leading-tight">Karyawan baru<br/>bergabung</h3>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">1 hari yang lalu</span>
                </div>
                <p className="text-[#7d998c] text-[12px] leading-[1.35] pr-2">Siti Nurhaliza telah diterima sebagai karyawan.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </div>

            {/* Activity 3 */}
            <div className="p-4 flex gap-3.5 items-center active:bg-gray-50 transition-colors">
              <div className="w-[42px] h-[42px] rounded-xl bg-[#f3e8ff] flex items-center justify-center shrink-0">
                <Megaphone className="w-[22px] h-[22px] text-[#9333EA]" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col flex-1 gap-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-[#1E4738] text-[14px] font-bold leading-tight">Pengumuman<br/>perusahaan</h3>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">1 hari yang lalu</span>
                </div>
                <p className="text-[#7d998c] text-[12px] leading-[1.35] pr-2">Jadwal kerja tim marketing berubah mulai 15 Sept 2025.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <AdminBottomNav activeTab="beranda" />

    </div>
  );
}
