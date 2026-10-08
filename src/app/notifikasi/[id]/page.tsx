"use client";

import { TopBar } from "@/components/TopBar";
import { Bell, Clock, Calendar, Users, Megaphone, Info } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function NotifikasiDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [notif, setNotif] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNotification = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          const found = json.data.find((n: any) => n.id === id);
          if (found) {
            setNotif(found);
          } else {
            setError("Aktivitas tidak ditemukan.");
          }
        } else {
          setError(json.message || "Gagal mengambil data");
        }
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan sistem");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) {
      fetchNotification();
    }
  }, [id]);

  const getIconAndCategory = (type: string) => {
    switch(type) {
      case "LEAVE_PENDING":
      case "LEAVE_APPROVED":
      case "LEAVE_REJECTED":
        return { category: "Izin & Cuti", icon: <Bell className="w-8 h-8 text-[#356E3B]" />, bgIcon: "bg-[#eef5f0]" };
      case "ATTENDANCE_REMINDER":
        return { category: "Absensi", icon: <Clock className="w-8 h-8 text-[#3B82F6]" />, bgIcon: "bg-[#eff6ff]" };
      case "AGENDA_UPCOMING":
        return { category: "Absensi", icon: <Calendar className="w-8 h-8 text-[#F59E0B]" />, bgIcon: "bg-[#fffbeb]" };
      case "JOIN_REQUEST_PENDING":
      case "JOIN_REQUEST_APPROVED":
      case "JOIN_REQUEST_REJECTED":
        return { category: "Sistem", icon: <Users className="w-8 h-8 text-[#0D9488]" />, bgIcon: "bg-[#f0fdfa]" };
      case "NEW_ANNOUNCEMENT":
        return { category: "Sistem", icon: <Megaphone className="w-8 h-8 text-[#8B5CF6]" />, bgIcon: "bg-[#f5f3ff]" };
      default:
        return { category: "Sistem", icon: <Info className="w-8 h-8 text-[#0EA5E9]" />, bgIcon: "bg-[#f0f9ff]" };
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fbfdfc]">
        <TopBar title="Detail Aktivitas" onBack={() => router.back()} />
        <div className="flex justify-center mt-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#356E3B]"></div>
        </div>
      </div>
    );
  }

  if (error || !notif) {
    return (
      <div className="min-h-screen bg-[#fbfdfc]">
        <TopBar title="Detail Aktivitas" onBack={() => router.back()} />
        <div className="flex flex-col items-center justify-center mt-20 text-[#6B7280]">
          <p>{error || "Aktivitas tidak ditemukan."}</p>
          <button onClick={() => router.back()} className="mt-4 text-[#356E3B] font-bold">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const { icon, bgIcon, category } = getIconAndCategory(notif.type);

  return (
    <div className="min-h-screen bg-[#fbfdfc]">
      <TopBar title="Detail Aktivitas" onBack={() => router.back()} />
      
      <div className="p-6">
        <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] p-6 flex flex-col items-center text-center">
          <div className={`w-[80px] h-[80px] rounded-full flex items-center justify-center mb-5 ${bgIcon}`}>
            {icon}
          </div>
          
          <span className="text-[#356E3B] text-[12px] font-bold px-3 py-1 bg-[#eef5f0] rounded-full mb-3 uppercase tracking-wider">
            {category}
          </span>
          
          <h1 className="text-[#111827] text-[20px] font-bold leading-tight mb-2">
            {notif.title}
          </h1>
          
          <p className="text-[#9CA3AF] text-[13px] mb-6">
            {formatDateTime(notif.created_at)}
          </p>

          <div className="w-full h-[1px] bg-[#E5E7EB] mb-6"></div>

          <p className="text-[#4B5563] text-[15px] leading-relaxed text-left w-full">
            {notif.message}
          </p>
        </div>
      </div>
    </div>
  );
}
