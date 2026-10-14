"use client";

import { TopBar } from "@/components/TopBar";
import { Bell, Clock, Calendar, Users, Megaphone, Info, UserCheck, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { formatDateTime } from "@/lib/dateUtils";
import { parseMembershipNotification } from "@/lib/membershipNotificationUtils";

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
  const membershipInfo = parseMembershipNotification(notif.message, notif.type);

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

          {/* Kartu Informasi Keanggotaan (Siapa yang bergabung & siapa yang meng-approve) */}
          {membershipInfo && (membershipInfo.memberName || membershipInfo.approverName) && (
            <div className="w-full mt-6 bg-[#f7faf8] border border-[#d2e4d7] rounded-2xl p-4 text-left flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#356E3B] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#356E3B]" />
                  Informasi Keanggotaan
                </span>
                <span className="text-[11px] font-bold bg-[#eef5f0] text-[#356E3B] px-2.5 py-0.5 rounded-full border border-[#356E3B]/20">
                  {membershipInfo.statusText}
                </span>
              </div>
              
              <div className="flex flex-col gap-2.5 pt-1">
                {membershipInfo.memberName && (
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-[#6B7280] flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[#6B7280]" />
                      Anggota Bergabung:
                    </span>
                    <span className="font-bold text-[#111827]">{membershipInfo.memberName}</span>
                  </div>
                )}
                {membershipInfo.memberName && membershipInfo.approverName && (
                  <div className="w-full h-[1px] bg-[#e4ede7]" />
                )}
                {membershipInfo.approverName && (
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-[#6B7280] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#356E3B]" />
                      Disetujui Oleh:
                    </span>
                    <span className="font-bold text-[#356E3B]">{membershipInfo.approverName}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
