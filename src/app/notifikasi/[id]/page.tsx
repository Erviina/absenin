"use client";

import { TopBar } from "@/components/TopBar";
import { Bell, Clock, Calendar, Users, Megaphone, Info } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function NotifikasiDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  // Mock data yang sama dengan di halaman list
  const notifications = [
    {
      id: 1,
      type: "izin",
      category: "Izin & Cuti",
      title: "Permintaan Izin Disetujui",
      description: "Permintaan izin kamu pada 12 Sep 2025 sudah disetujui. Silakan cek detailnya di menu Izin & Cuti. Terima kasih.",
      time: "2 jam yang lalu",
      icon: <Bell className="w-8 h-8 text-[#356E3B]" />,
      bgIcon: "bg-[#eef5f0]",
      date: "12 September 2025, 08:30 WIB",
    },
    {
      id: 2,
      type: "pengingat",
      category: "Absensi",
      title: "Pengingat Check Out",
      description: "Jangan lupa untuk melakukan check out hari ini sebelum pulang kerja agar kehadiranmu tercatat dengan benar di sistem.",
      time: "3 jam yang lalu",
      icon: <Clock className="w-8 h-8 text-[#3B82F6]" />,
      bgIcon: "bg-[#eff6ff]",
      date: "12 September 2025, 17:00 WIB",
    },
    {
      id: 3,
      type: "jadwal",
      category: "Absensi",
      title: "Jadwal Masuk Kerja",
      description: "Hari ini kamu memiliki jadwal masuk kerja pada pukul 08:00 WIB. Pastikan kamu sudah check-in tepat waktu.",
      time: "5 jam yang lalu",
      icon: <Calendar className="w-8 h-8 text-[#F59E0B]" />,
      bgIcon: "bg-[#fffbeb]",
      date: "12 September 2025, 07:00 WIB",
    },
    {
      id: 4,
      type: "permintaan",
      category: "Sistem",
      title: "Permintaan Bergabung ke PT Teknologi Nusantara",
      description: "Permintaan kamu untuk bergabung ke PT Teknologi Nusantara sedang diproses oleh admin. Kami akan segera memberi tahu jika ada update.",
      time: "1 hari yang lalu",
      icon: <Users className="w-8 h-8 text-[#0D9488]" />,
      bgIcon: "bg-[#f0fdfa]",
      date: "11 September 2025, 14:20 WIB",
    },
    {
      id: 5,
      type: "pengumuman",
      category: "Sistem",
      title: "Pengumuman Perusahaan",
      description: "Hari Jumat, 13 Sep 2025 akan diadakan kegiatan gathering perusahaan. Seluruh karyawan diharapkan hadir pada pukul 08.00 pagi di aula utama.",
      time: "1 hari yang lalu",
      icon: <Megaphone className="w-8 h-8 text-[#8B5CF6]" />,
      bgIcon: "bg-[#f5f3ff]",
      date: "11 September 2025, 10:00 WIB",
    },
    {
      id: 6,
      type: "info",
      category: "Sistem",
      title: "Update Fitur Terbaru",
      description: "Sekarang kamu bisa mengajukan cuti langsung melalui aplikasi ini dengan mudah. Cek menu Izin & Cuti untuk mencoba fitur baru kami!",
      time: "2 hari yang lalu",
      icon: <Info className="w-8 h-8 text-[#0EA5E9]" />,
      bgIcon: "bg-[#f0f9ff]",
      date: "10 September 2025, 09:15 WIB",
    },
  ];

  const notif = notifications.find((n) => n.id === id);

  if (!notif) {
    return (
      <div className="min-h-screen bg-[#fbfdfc]">
        <TopBar title="Detail Aktivitas" onBack={() => router.back()} />
        <div className="flex flex-col items-center justify-center mt-20 text-[#6B7280]">
          <p>Aktivitas tidak ditemukan.</p>
          <button onClick={() => router.back()} className="mt-4 text-[#356E3B] font-bold">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfdfc]">
      <TopBar title="Detail Aktivitas" onBack={() => router.back()} />
      
      <div className="p-6">
        <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] p-6 flex flex-col items-center text-center">
          <div className={`w-[80px] h-[80px] rounded-full flex items-center justify-center mb-5 ${notif.bgIcon}`}>
            {notif.icon}
          </div>
          
          <span className="text-[#356E3B] text-[12px] font-bold px-3 py-1 bg-[#eef5f0] rounded-full mb-3 uppercase tracking-wider">
            {notif.category}
          </span>
          
          <h1 className="text-[#111827] text-[20px] font-bold leading-tight mb-2">
            {notif.title}
          </h1>
          
          <p className="text-[#9CA3AF] text-[13px] mb-6">
            {notif.date}
          </p>

          <div className="w-full h-[1px] bg-[#E5E7EB] mb-6"></div>

          <p className="text-[#4B5563] text-[15px] leading-relaxed text-left w-full">
            {notif.description}
          </p>
        </div>
      </div>
    </div>
  );
}
