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
import { useState, useEffect } from "react";

export default function AdminDashboardPage() {
  const router = useRouter();
  
  const [company, setCompany] = useState<{ name: string; address: string; memberCount: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [attendanceStats, setAttendanceStats] = useState<{ hadir: number; terlambat: number; izin: number; belum: number; total: number } | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  
  const [leaveStats, setLeaveStats] = useState<{ total: number; sakit: number; cuti: number; izin: number } | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLeaveStatsLoading, setIsLeaveStatsLoading] = useState(true);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);

  const formatRelativeTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return `Baru saja`;
    if (minutes < 60) return `${minutes} menit yang lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari yang lalu`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }

        const resCompany = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/me", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const dataCompany = await resCompany.json();
        if (dataCompany.success) {
          setCompany({
            name: dataCompany.data.name,
            address: dataCompany.data.address,
            memberCount: dataCompany.data.memberCount,
          });
        }
        setIsLoading(false);

        const resStats = await fetch(process.env.NEXT_PUBLIC_API_URL + "/dashboard/attendance-stats", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const dataStats = await resStats.json();
        if (dataStats.success) {
          setAttendanceStats(dataStats.data);
        }
        setIsStatsLoading(false);

        const resLeave = await fetch(process.env.NEXT_PUBLIC_API_URL + "/dashboard/leave-stats", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const dataLeave = await resLeave.json();
        if (dataLeave.success) {
          setLeaveStats(dataLeave.data);
        }
        setIsLeaveStatsLoading(false);

        const resAct = await fetch(process.env.NEXT_PUBLIC_API_URL + "/dashboard/activities", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const dataAct = await resAct.json();
        if (dataAct.success) {
          setActivities(dataAct.data);
        }
        setIsActivitiesLoading(false);

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        setIsStatsLoading(false);
        setIsLeaveStatsLoading(false);
        setIsActivitiesLoading(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [router]);

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
          <div className="flex flex-col flex-1 overflow-hidden">
            {isLoading ? (
              <div className="animate-pulse flex flex-col gap-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : company ? (
              <>
                <h2 className="text-[#1E4738] text-[15px] font-bold truncate">{company.name}</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1.5 text-[#5C786C] text-[12px] font-medium min-w-0">
                    <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                    <span className="truncate max-w-[90px]">{company.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#5C786C] text-[12px] font-medium whitespace-nowrap">
                    <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                    <span>{company.memberCount} anggota</span>
                  </div>
                </div>
              </>
            ) : (
              <h2 className="text-[#1E4738] text-[15px] font-bold">Belum ada data</h2>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
        </div>

        {/* Stats Row */}
        <div className="flex gap-3">
          {/* Kehadiran Stats */}
          <div className="flex-[1.2] bg-white rounded-[20px] p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#eef5f0] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5 text-[#356E3B]" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col flex-1 gap-1.5 justify-center">
              {isStatsLoading ? (
                <div className="animate-pulse flex flex-col gap-2">
                  <div className="h-[5px] bg-gray-200 rounded-full w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              ) : attendanceStats ? (
                <>
                  <div className="h-[5px] w-full bg-gray-100 rounded-full flex overflow-hidden">
                    <div className="h-full bg-[#1E4738]" style={{ width: attendanceStats.total > 0 ? `${(attendanceStats.hadir / attendanceStats.total) * 100}%` : '0%' }}></div>
                    <div className="h-full bg-[#F59E0B]" style={{ width: attendanceStats.total > 0 ? `${(attendanceStats.terlambat / attendanceStats.total) * 100}%` : '0%' }}></div>
                    <div className="h-full bg-[#EF4444]" style={{ width: attendanceStats.total > 0 ? `${(attendanceStats.izin / attendanceStats.total) * 100}%` : '0%' }}></div>
                    <div className="h-full bg-[#9CA3AF]" style={{ width: attendanceStats.total > 0 ? `${(attendanceStats.belum / attendanceStats.total) * 100}%` : '0%' }}></div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] text-gray-500 font-medium mb-0.5">Hadir</span>
                      <span className="text-[10px] font-bold text-[#1E4738]">{attendanceStats.hadir}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] text-gray-500 font-medium mb-0.5">Terlambat</span>
                      <span className="text-[10px] font-bold text-[#F59E0B]">{attendanceStats.terlambat}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] text-gray-500 font-medium mb-0.5">Izin</span>
                      <span className="text-[10px] font-bold text-[#EF4444]">{attendanceStats.izin}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] text-gray-500 font-medium mb-0.5">Belum</span>
                      <span className="text-[10px] font-bold text-[#9CA3AF]">{attendanceStats.belum}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Perizinan Stats */}
          <div className="flex-1 bg-white rounded-[20px] p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#eef5f0] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#356E3B]" strokeWidth={1.5} />
            </div>
            {isLeaveStatsLoading ? (
              <div className="animate-pulse flex flex-col flex-1 gap-2">
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                <div className="h-[5px] bg-gray-200 rounded-full w-full"></div>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center shrink-0">
                  <span className="text-[15px] font-bold text-[#1E4738] leading-none">{leaveStats?.total || 0}</span>
                  <span className="text-[9px] text-gray-500 font-medium mt-0.5">Izin</span>
                </div>
                <div className="flex flex-col flex-1 gap-1.5 justify-center">
                  <div className="h-[5px] w-full bg-gray-100 rounded-full flex overflow-hidden">
                    <div className="h-full bg-[#1E4738]" style={{ width: (leaveStats?.total || 0) > 0 ? `${((leaveStats?.sakit || 0) / (leaveStats?.total || 1)) * 100}%` : '0%' }}></div>
                    <div className="h-full bg-[#4ADE80]" style={{ width: (leaveStats?.total || 0) > 0 ? `${((leaveStats?.cuti || 0) / (leaveStats?.total || 1)) * 100}%` : '0%' }}></div>
                    <div className="h-full bg-[#F59E0B]" style={{ width: (leaveStats?.total || 0) > 0 ? `${((leaveStats?.izin || 0) / (leaveStats?.total || 1)) * 100}%` : '0%' }}></div>
                  </div>
                  <div className="flex justify-around items-end">
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] text-gray-500 font-medium mb-0.5">Sakit</span>
                      <span className="text-[10px] font-bold text-[#1E4738]">{leaveStats?.sakit || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] text-gray-500 font-medium mb-0.5">Cuti</span>
                      <span className="text-[10px] font-bold text-[#4ADE80]">{leaveStats?.cuti || 0}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
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
          <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col overflow-hidden min-h-[120px]">
            
            {isActivitiesLoading ? (
              <div className="p-8 text-center text-[#7d998c] text-[13px] font-medium animate-pulse flex items-center justify-center h-full">Memuat aktivitas...</div>
            ) : activities.length === 0 ? (
              <div className="p-8 text-center text-[#7d998c] text-[13px] font-medium flex items-center justify-center h-full">Belum ada aktivitas terbaru.</div>
            ) : (
              activities.map((act, idx) => {
                let icon = <ClipboardList className="w-[22px] h-[22px] text-[#D97706]" strokeWidth={1.5} />;
                let bgIcon = "bg-[#fdf5e6]";
                let title = "";
                let desc = "";

                if (act.type === 'leave') {
                  title = "Pengajuan cuti baru";
                  const start = new Date(act.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                  const end = new Date(act.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                  desc = `${act.author} mengajukan cuti pada ${start} - ${end}`;
                } else if (act.type === 'join') {
                  icon = <User className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />;
                  bgIcon = "bg-[#e6f0ea]";
                  title = "Karyawan baru bergabung";
                  desc = `${act.author} telah diterima sebagai karyawan.`;
                } else if (act.type === 'news') {
                  icon = <Megaphone className="w-[22px] h-[22px] text-[#9333EA]" strokeWidth={1.5} />;
                  bgIcon = "bg-[#f3e8ff]";
                  title = "Pengumuman perusahaan";
                  desc = act.title || "Ada pengumuman baru.";
                }

                return (
                  <div key={idx} className={`p-4 flex gap-3.5 items-center active:bg-gray-50 transition-colors ${idx !== activities.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className={`w-[42px] h-[42px] rounded-xl ${bgIcon} flex items-center justify-center shrink-0`}>
                      {icon}
                    </div>
                    <div className="flex flex-col flex-1 gap-1">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-[#1E4738] text-[14px] font-bold leading-tight">{title}</h3>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">{formatRelativeTime(act.created_at)}</span>
                      </div>
                      <p className="text-[#7d998c] text-[12px] leading-[1.35] pr-2 line-clamp-2">{desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </div>
                );
              })
            )}

          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <AdminBottomNav activeTab="beranda" />

    </div>
  );
}
