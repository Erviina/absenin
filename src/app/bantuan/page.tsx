"use client";

import React, { Suspense, useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { 
  Search, 
  X, 
  ChevronDown, 
  HelpCircle, 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  Sparkles,
  MapPin,
  Clock,
  FileText,
  QrCode,
  Users,
  Lock,
  Compass,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PhoneCall,
  Mail,
  ThumbsUp,
  ThumbsDown,
  Navigation,
  Smartphone,
  ExternalLink
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";

export type FAQCategory = "karyawan" | "perusahaan" | "admin";
export type TopicFilter = "semua" | "gps" | "presensi" | "izin" | "tugas" | "akun";

interface FAQItem {
  id: string;
  category: FAQCategory;
  topic: TopicFilter;
  question: string;
  answer: string;
  tags: string[];
  icon: any;
}

const FAQ_DATA: FAQItem[] = [
  // ================= 1. KARYAWAN =================
  {
    id: "absen-checkin",
    category: "karyawan",
    topic: "presensi",
    icon: UserCheck,
    question: "Bagaimana cara melakukan absensi masuk (Check-in) dan pulang (Check-out)?",
    answer: "1. Buka halaman Beranda atau menu Kehadiran di AbsenIn.\n2. Klik tombol 'Masuk' atau 'Check In Sekarang'.\n3. Berikan izin akses lokasi jika diminta oleh browser ponsel Anda.\n4. Sistem akan memverifikasi koordinat GPS Anda secara otomatis terhadap radius kantor.\n5. Setelah sukses, status Anda menjadi 'Masuk'. Ketika jam kerja selesai, tombol akan otomatis beralih menjadi 'Keluar' untuk presensi pulang.",
    tags: ["absen", "checkin", "checkout", "kehadiran", "karyawan", "masuk", "pulang", "cara absen"]
  },
  {
    id: "gps-radius-error",
    category: "karyawan",
    topic: "gps",
    icon: MapPin,
    question: "Mengapa muncul notifikasi 'Di Luar Radius Kantor' saat ingin absen?",
    answer: "Notifikasi ini muncul karena titik koordinat GPS perangkat Anda berada di luar batas jarak (misalnya > 50 meter) dari titik kantor yang ditentukan perusahaan.\n\nTips mengatasi:\n• Pastikan Anda sudah berada di area kantor fisik perusahaan.\n• Aktifkan fitur 'Akurasi Tinggi' (Google Location Accuracy) di pengaturan ponsel Anda.\n• Nyalakan Wi-Fi ponsel (tidak perlu tersambung ke jaringan), karena pemindaian sinyal Wi-Fi di sekitar sangat membantu GPS menentukan lokasi secara presisi hingga ±5-10 meter di dalam ruangan.\n• Gunakan alat 'Uji Akurasi GPS' pada bagian atas halaman bantuan ini untuk memeriksa koordinat perangkat Anda.",
    tags: ["gps", "radius", "jarak", "lokasi", "gagal absen", "luar radius", "akurasi", "sinyal"]
  },
  {
    id: "gps-izin-browser",
    category: "karyawan",
    topic: "gps",
    icon: Navigation,
    question: "Bagaimana cara mengaktifkan izin lokasi/GPS di Google Chrome atau Safari?",
    answer: "Jika browser tidak sengaja memblokir akses lokasi:\n• Di Google Chrome Android: Ketuk ikon gembok / setelan di bilah alamat atas -> pilih 'Izin' (Permissions) -> pilih 'Lokasi' (Location) -> ubah ke 'Izinkan' (Allow).\n• Di Safari iOS (iPhone): Buka Pengaturan iPhone -> Privasi & Keamanan -> Layanan Lokasi -> Safari Websites -> ubah menjadi 'Saat Menggunakan App' dan aktifkan 'Lokasi Tepat'.\n• Muat ulang (Refresh) halaman AbsenIn setelah mengubah izin.",
    tags: ["izin browser", "chrome", "safari", "iphone", "android", "aktifkan gps", "blokir lokasi"]
  },
  {
    id: "fake-gps-detection",
    category: "karyawan",
    topic: "gps",
    icon: AlertTriangle,
    question: "Apakah aplikasi dapat mendeteksi aplikasi Fake GPS atau Mock Location?",
    answer: "Ya. AbsenIn dilengkapi sistem keamanan deteksi Mock Location dan integritas perangkat. Jika terdeteksi penggunaan aplikasi pihak ketiga pengubah lokasi (Fake GPS / VPN Spoofing), sistem akan menolak transaksi absensi dan mencatat insiden keamanan tersebut pada log audit organisasi demi menjaga validitas data.",
    tags: ["fake gps", "mock location", "kecurangan", "spoofing", "keamanan", "vpn"]
  },
  {
    id: "lupa-checkout",
    category: "karyawan",
    topic: "presensi",
    icon: Clock,
    question: "Bagaimana jika saya lupa melakukan Check-out saat pulang kerja?",
    answer: "Jika Anda lupa melakukan check-out hingga pergantian hari, status kehadiran hari tersebut akan tetap mencatat jam masuk Anda. Namun, untuk melengkapi jam pulang Anda dapat menghubungi Admin/HR perusahaan Anda agar mereka dapat memperbarui catatan kehadiran Anda secara manual melalui Dashboard Manajemen.",
    tags: ["lupa checkout", "pulang", "lupa absen", "revisi kehadiran", "admin"]
  },
  {
    id: "toleransi-keterlambatan",
    category: "karyawan",
    topic: "presensi",
    icon: Clock,
    question: "Berapa menit toleransi keterlambatan dan kapan status menjadi 'Terlambat'?",
    answer: "Toleransi keterlambatan ditentukan oleh masing-masing perusahaan (umumnya 10 hingga 15 menit). Misalnya, jika jam masuk pukul 08:00 WIB dengan toleransi 15 menit, Anda masih dihitung 'Tepat Waktu' jika check-in sebelum pukul 08:15 WIB. Check-in pukul 08:16 WIB ke atas akan otomatis tercatat 'Terlambat'.",
    tags: ["toleransi", "terlambat", "jam masuk", "jam kerja", "dispensasi", "tepat waktu"]
  },
  {
    id: "pengajuan-izin-cuti",
    category: "karyawan",
    topic: "izin",
    icon: FileText,
    question: "Bagaimana alur pengajuan Izin, Cuti, atau Sakit?",
    answer: "1. Buka menu 'Izin' dari navigasi bawah.\n2. Klik tombol 'Ajukan Izin Baru'.\n3. Pilih jenis pengajuan: Sakit, Cuti Tahunan, Keperluan Mendesak, atau Izin Khusus.\n4. Tentukan rentang tanggal awal dan tanggal akhir pengajuan.\n5. Tuliskan keterangan alasan dengan jelas.\n6. Unggah lampiran foto/dokumen pendukung (wajib melampirkan Surat Keterangan Dokter jika memilih izin Sakit).\n7. Klik 'Kirim Pengajuan'. Permohonan Anda akan diproses oleh HR/Admin.",
    tags: ["izin", "cuti", "sakit", "surat dokter", "form izin", "pengajuan", "lampiran"]
  },
  {
    id: "batal-revisi-izin",
    category: "karyawan",
    topic: "izin",
    icon: FileText,
    question: "Bisakah saya membatalkan atau merevisi permohonan izin yang sudah dikirim?",
    answer: "Permohonan izin yang masih berstatus 'Menunggu Persetujuan' (Pending) dapat dibatalkan melalui menu riwayat izin Anda. Namun, jika izin sudah disetujui (Approved) oleh Admin, Anda perlu menginformasikan langsung kepada HR/Admin kantor untuk melakukan pembatalan dari panel manajemen.",
    tags: ["batal izin", "revisi", "salah tanggal", "pending", "hapus izin"]
  },
  {
    id: "pantau-tugas-agenda",
    category: "karyawan",
    topic: "tugas",
    icon: Clock,
    question: "Di mana saya bisa melihat tugas kerja dan jadwal agenda kantor?",
    answer: "• Menu 'Tugas': Menampilkan daftar pekerjaan harian, tenggat waktu (deadline), checklist sub-tugas, dan tombol tandai selesai.\n• Menu 'Agenda': Berisi kalender kegiatan perusahaan, rapat internal, agenda evaluasi, serta jadwal hari libur bersama.",
    tags: ["tugas", "agenda", "jadwal", "kegiatan", "rapat", "deadline", "checklist"]
  },
  {
    id: "multi-perusahaan",
    category: "karyawan",
    topic: "akun",
    icon: Building2,
    question: "Bisakah satu akun email bergabung di lebih dari satu perusahaan?",
    answer: "Bisa. Satu akun Google/Email dapat terdaftar pada beberapa organisasi atau cabang perusahaan berbeda. Anda dapat berpindah konteks organisasi secara mudah melalui 'Company Switcher' di bilah atas Beranda atau melalui menu 'Akses & Perusahaan' di halaman Profil.",
    tags: ["ganti perusahaan", "multi perusahaan", "cabang", "pindah organisasi", "akun", "company switcher"]
  },
  {
    id: "privasi-pelacakan-gps",
    category: "karyawan",
    topic: "akun",
    icon: Lock,
    question: "Apakah AbsenIn melacak lokasi GPS pengguna sepanjang hari (24 jam)?",
    answer: "TIDAK SAMA SEKALI. Demi melindungi privasi data pribadi pengguna dan menghemat daya baterai ponsel, AbsenIn HANYA meminta koordinat lokasi pada detik Anda menekan tombol absensi (Check-in atau Check-out). Aplikasi tidak melakukan pemantauan lokasi latar belakang (background tracking) di luar sesi absensi.",
    tags: ["privasi", "pelacakan", "gps 24 jam", "keamanan", "baterai", "pii", "kebijakan privasi"]
  },
  {
    id: "lupa-kata-sandi",
    category: "karyawan",
    topic: "akun",
    icon: Lock,
    question: "Bagaimana cara mengganti foto profil atau mengamankan akun?",
    answer: "Buka menu 'Profil' dari navigasi bawah:\n• Untuk foto profil: Ketuk ikon kamera pada avatar profil Anda untuk mengunggah foto baru.\n• Untuk keamanan akun: Di bagian Informasi Akun, Anda dapat memeriksa status email Google Anda dan opsi keamanan terkait.",
    tags: ["password", "kata sandi", "foto profil", "ganti password", "profil", "avatar"]
  },

  // ================= 2. PERUSAHAAN =================
  {
    id: "atur-lokasi-radius",
    category: "perusahaan",
    topic: "gps",
    icon: MapPin,
    question: "Bagaimana cara mengatur titik lokasi kantor dan radius absensi di peta?",
    answer: "1. Masuk ke Dashboard Admin -> pilih menu 'Kelola Perusahaan'.\n2. Pada bagian 'Lokasi Kantor & Radius Geofencing', Anda akan melihat peta interaktif.\n3. Geser penanda (marker) pin ke lokasi tepat kantor Anda, atau gunakan tombol 'Gunakan Lokasi Saya Saat Ini'.\n4. Tentukan batas radius kehadiran (misalnya 50 meter atau 100 meter).\n5. Klik 'Simpan Lokasi Kantor'. Karyawan yang absen di luar lingkaran radius ini otomatis tertolak.",
    tags: ["lokasi kantor", "koordinat", "geofencing", "radius", "peta", "leaflet", "perusahaan", "kelola lokasi"]
  },
  {
    id: "atur-jam-kerja",
    category: "perusahaan",
    topic: "presensi",
    icon: Clock,
    question: "Bagaimana cara menyetel hari kerja, jam operasional, dan toleransi keterlambatan?",
    answer: "Di halaman Kelola Perusahaan, buka bagian 'Jadwal & Jam Kerja Kantor':\n• Tentukan hari aktif kantor (misal: Senin s.d. Jumat).\n• Atur Jam Masuk (contoh: 08:00) dan Jam Pulang (contoh: 17:00).\n• Atur Toleransi Keterlambatan (misal: 15 menit).\nSistem akan otomatis menghitung status absensi karyawan secara real-time.",
    tags: ["jam kerja", "jadwal", "shift", "toleransi", "terlambat", "jam masuk", "hari kerja", "perusahaan"]
  },
  {
    id: "qr-code-karyawan",
    category: "perusahaan",
    topic: "akun",
    icon: QrCode,
    question: "Bagaimana cara membagikan QR Code dan Kode Bergabung Perusahaan?",
    answer: "Setiap perusahaan yang terdaftar memiliki Kode Organisasi dan QR Code unik. Di halaman Kelola Perusahaan, buka bagian 'Kode & QR Perusahaan'. Anda dapat mengunduh gambar QR Code untuk dicetak dan ditempel di papan pengumuman kantor, atau menyalin kode perusahaan untuk dibagikan via grup WhatsApp karyawan.",
    tags: ["undang", "tambah karyawan", "qr code", "kode perusahaan", "gabung", "perusahaan"]
  },
  {
    id: "ubah-profil-kantor",
    category: "perusahaan",
    topic: "akun",
    icon: Building2,
    question: "Bagaimana cara memperbarui logo, nama resmi, atau alamat kantor?",
    answer: "Di halaman Kelola Perusahaan, klik tombol 'Ubah Informasi Perusahaan' di bagian profil atas. Anda dapat memperbarui foto logo organisasi, nama perusahaan, serta alamat lengkap resmi.",
    tags: ["logo perusahaan", "nama kantor", "alamat", "ubah profil perusahaan"]
  },

  // ================= 3. ADMIN =================
  {
    id: "approval-izin-admin",
    category: "admin",
    topic: "izin",
    icon: FileText,
    question: "Bagaimana alur persetujuan (Approval) atau penolakan izin karyawan oleh HR/Admin?",
    answer: "1. Buka Dashboard Admin -> pilih tab 'Izin & Cuti'.\n2. Anda akan melihat daftar permohonan berstatus 'Menunggu'.\n3. Klik permohonan untuk meninjau alasan, tanggal cuti, dan berkas lampiran (surat dokter).\n4. Klik 'Setujui' untuk mengonfirmasi atau 'Tolak' dengan mencantumkan catatan alasan penolakan bagi karyawan.",
    tags: ["approve", "approval", "persetujuan", "tolak izin", "verifikasi izin", "admin", "surat dokter"]
  },
  {
    id: "rekap-laporan-kehadiran",
    category: "admin",
    topic: "presensi",
    icon: Users,
    question: "Bagaimana cara mengunduh laporan rekapitulasi kehadiran ke Excel (.xlsx) atau PDF?",
    answer: "Di Dashboard Admin, pilih menu 'Laporan Kehadiran'. Tentukan filter periode (bulan atau rentang tanggal kustom) dan departemen. Klik tombol 'Ekspor Data' lalu pilih format yang diinginkan (Excel untuk analisis data payroll atau PDF untuk format laporan cetak resmi).",
    tags: ["laporan", "rekap", "export", "excel", "pdf", "kehadiran", "unduh data", "admin", "payroll"]
  },
  {
    id: "peran-role-hirarki",
    category: "admin",
    topic: "akun",
    icon: ShieldCheck,
    question: "Apa perbedaan hak wewenang antara Owner, Admin, Manager, dan Karyawan?",
    answer: "• Owner (Pemilik): Memiliki kendali tertinggi atas organisasi, profil perusahaan, billing langganan, dan manajemen role pengguna.\n• Admin: Mengelola operasional harian, radius lokasi kantor, jadwal jam kerja, approval izin, dan laporan rekap.\n• Manager: Mengawasi kehadiran tim, memonitor absensi divisi, dan memberikan checklist tugas harian.\n• Karyawan: Melakukan absensi GPS, mengajukan izin/cuti, dan menyelesaikan tugas kerja.",
    tags: ["role", "peran", "owner", "admin", "manager", "karyawan", "hak akses", "wewenang"]
  }
];

function BantuanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeRole, isManagement: isCompanyManagement, currentUser } = useCompany();
  const [savedRole, setSavedRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem("user");
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed.activeRole) setSavedRole(parsed.activeRole);
      }
    } catch {}
  }, []);

  const isFromAdmin = searchParams.get("from") === "admin";
  
  // Deteksi wewenang manajemen (Owner, Admin, Manager)
  const hasManagementRole = Boolean(
    isCompanyManagement || 
    activeRole === "owner" || 
    activeRole === "admin" || 
    currentUser?.roles?.includes("Admin") || 
    savedRole === "owner" || 
    savedRole === "admin"
  );

  const isManagementMode = isFromAdmin && hasManagementRole;

  const [activeCategory, setActiveCategory] = useState<FAQCategory>(
    isManagementMode ? "perusahaan" : "karyawan"
  );
  const [activeTopic, setActiveTopic] = useState<TopicFilter>("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("gps-radius-error");

  // State untuk Interactive Feedback per FAQ
  const [feedbackState, setFeedbackState] = useState<Record<string, "yes" | "no">>({});

  // State untuk GPS Diagnostic Tool
  const [isCheckingGPS, setIsCheckingGPS] = useState(false);
  const [gpsDiagnostic, setGpsDiagnostic] = useState<{
    status: "idle" | "success" | "error";
    message: string;
    accuracy?: number;
    latitude?: number;
    longitude?: number;
    timestamp?: string;
  }>({
    status: "idle",
    message: "Klik tombol di bawah untuk menguji keakuratan sinyal GPS pada perangkat Anda saat ini."
  });

  useEffect(() => {
    if (isManagementMode) {
      setActiveCategory("perusahaan");
    } else {
      setActiveCategory("karyawan");
    }
  }, [isManagementMode]);

  // Handle GPS Diagnostic Check
  const handleTestGPS = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsDiagnostic({
        status: "error",
        message: "Perangkat atau browser Anda tidak mendukung fitur pendeteksian lokasi GPS."
      });
      return;
    }

    setIsCheckingGPS(true);
    setGpsDiagnostic({
      status: "idle",
      message: "Sedang mengunci satelit GPS dan menghitung akurasi sinyal..."
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsCheckingGPS(false);
        const acc = Math.round(pos.coords.accuracy);
        let msg = "";
        if (acc <= 20) {
          msg = `Sinyal GPS sangat kuat (Akurasi ±${acc} meter). Sangat optimal untuk presensi di lokasi kantor.`;
        } else if (acc <= 60) {
          msg = `Sinyal GPS cukup baik (Akurasi ±${acc} meter). Dapat digunakan untuk absensi dalam radius geofencing standar.`;
        } else {
          msg = `Akurasi sinyal saat ini ±${acc} meter (lemah). Jika berada di dalam gedung, nyalakan Wi-Fi ponsel untuk meningkatkan presisi.`;
        }

        setGpsDiagnostic({
          status: "success",
          message: msg,
          accuracy: acc,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB"
        });
      },
      (err) => {
        setIsCheckingGPS(false);
        let errorMsg = "Gagal membaca lokasi perangkat.";
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = "Akses lokasi ditolak oleh browser. Mohon izinkan akses lokasi pada setelan browser Anda lalu muat ulang halaman.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = "Sinyal GPS tidak tersedia. Pastikan fitur Lokasi di ponsel Anda telah diaktifkan.";
        } else if (err.code === err.TIMEOUT) {
          errorMsg = "Waktu permintaan GPS habis sebelum koordinat didapatkan. Coba pindah ke dekat jendela atau luar ruangan.";
        }
        setGpsDiagnostic({
          status: "error",
          message: errorMsg
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  const effectiveCategory: FAQCategory = isManagementMode ? activeCategory : "karyawan";

  const filteredFAQs = useMemo(() => {
    return FAQ_DATA.filter(item => {
      // 1. Filter kategori
      if (item.category !== effectiveCategory) {
        return false;
      }

      // 2. Filter topik
      if (activeTopic !== "semua" && item.topic !== activeTopic) {
        return false;
      }

      // 3. Filter query search
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchQuestion = item.question.toLowerCase().includes(q);
      const matchAnswer = item.answer.toLowerCase().includes(q);
      const matchTags = item.tags.some(tag => tag.toLowerCase().includes(q));

      return matchQuestion || matchAnswer || matchTags;
    });
  }, [effectiveCategory, activeTopic, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleFeedback = (faqId: string, rating: "yes" | "no") => {
    setFeedbackState(prev => ({
      ...prev,
      [faqId]: rating
    }));
  };

  const getCategoryTitle = () => {
    if (!isManagementMode) return "Pusat Bantuan & Panduan";
    if (effectiveCategory === "perusahaan") return "Panduan Perusahaan & Kantor";
    if (effectiveCategory === "admin") return "Panduan Administrator & Approval";
    return "Panduan Karyawan & Akun";
  };

  const getCategoryDesc = () => {
    if (!isManagementMode) return "Temukan jawaban lengkap seputar absensi GPS, geofencing, izin cuti, dan solusi kendala.";
    if (effectiveCategory === "perusahaan") return "Pengaturan titik koordinat GPS, radius geofencing, jam kerja kantor, dan QR Code.";
    if (effectiveCategory === "admin") return "Persetujuan izin/cuti karyawan, ekspor laporan rekapitulasi, dan hierarki wewenang.";
    return "Panduan presensi check-in/out, kendala radius GPS, pengajuan izin/cuti, dan penggunaan akun.";
  };

  const TOPIC_BADGES = [
    { key: "semua" as TopicFilter, label: "Semua Topik" },
    { key: "gps" as TopicFilter, label: "GPS & Lokasi" },
    { key: "presensi" as TopicFilter, label: "Presensi" },
    { key: "izin" as TopicFilter, label: "Izin & Cuti" },
    { key: "tugas" as TopicFilter, label: "Tugas & Agenda" },
    { key: "akun" as TopicFilter, label: "Akun & Akses" },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-20">
      {/* TopBar Header */}
      <TopBar 
        title="Pusat Bantuan & FAQ" 
        onBack={() => router.back()} 
      />

      <div className="px-5 py-5 flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Hero Header Banner */}
        <div className="bg-gradient-to-br from-[#1E4738] via-[#245241] to-[#2D5A3F] rounded-[24px] p-5 text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-semibold text-white/90 w-fit">
              <Sparkles className="w-3.5 h-3.5 text-[#7FAF8B]" />
              {getCategoryTitle()}
            </div>
            <h1 className="text-[19px] font-extrabold tracking-tight mt-1">
              Ada yang bisa kami bantu?
            </h1>
            <p className="text-white/80 text-[12.5px] leading-relaxed">
              {getCategoryDesc()}
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full pointer-events-none blur-sm" />
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-[#7d998c]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isManagementMode
                ? `Cari di FAQ ${effectiveCategory === "perusahaan" ? "Perusahaan" : effectiveCategory === "admin" ? "Admin" : "Karyawan"}...`
                : "Cari topik: GPS, checkin, izin, terlambat, dll..."
            }
            className="w-full bg-white rounded-2xl pl-10 pr-10 py-3.5 text-[13px] border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#356E3B]/30 focus:border-[#356E3B] transition-all text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.02)] placeholder:text-[#9CA3AF]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
              title="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Role-Based Tabs: HANYA MUNCUL DI MODE MANAJEMEN / ADMIN (?from=admin) */}
        {isManagementMode && (
          <div className="w-full bg-[#EEF4F0] p-1.5 rounded-[18px] border border-[#D5E2D8]/80 flex items-center justify-between gap-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <button
              onClick={() => {
                setActiveCategory("perusahaan");
                setActiveTopic("semua");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[12.5px] font-bold transition-all ${
                effectiveCategory === "perusahaan"
                  ? "bg-[#1E4738] text-white shadow-sm"
                  : "text-[#5C786C] hover:text-[#1E4738] hover:bg-white/70 active:scale-95"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              Perusahaan
            </button>

            <button
              onClick={() => {
                setActiveCategory("admin");
                setActiveTopic("semua");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[12.5px] font-bold transition-all ${
                effectiveCategory === "admin"
                  ? "bg-[#1E4738] text-white shadow-sm"
                  : "text-[#5C786C] hover:text-[#1E4738] hover:bg-white/70 active:scale-95"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              Admin
            </button>

            <button
              onClick={() => {
                setActiveCategory("karyawan");
                setActiveTopic("semua");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[12.5px] font-bold transition-all ${
                effectiveCategory === "karyawan"
                  ? "bg-[#1E4738] text-white shadow-sm"
                  : "text-[#5C786C] hover:text-[#1E4738] hover:bg-white/70 active:scale-95"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              Karyawan
            </button>
          </div>
        )}

        {/* Quick Topic Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {TOPIC_BADGES.map((badge) => {
            const isActive = activeTopic === badge.key;
            return (
              <button
                key={badge.key}
                onClick={() => setActiveTopic(badge.key)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#1E4738] text-white shadow-xs"
                    : "bg-white text-[#5C786C] border border-[#E5E7EB] hover:border-[#1E4738]/30 hover:text-[#1E4738]"
                }`}
              >
                {badge.label}
              </button>
            );
          })}
        </div>

        {/* GPS Diagnostic Widget Card (Interaktif untuk diagnosa mandiri pengguna) */}
        <div className="bg-white rounded-[22px] border border-[#D1D5DB]/80 p-4.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E8F3EB] flex items-center justify-center text-[#2D5A3F] shrink-0">
                <Compass className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[#111827] text-[13.5px] font-bold">Diagnosa Akurasi GPS Anda</span>
                <span className="text-[#6B7280] text-[11.5px]">Uji kekuatan sinyal & izin lokasi perangkat saat ini</span>
              </div>
            </div>
            {gpsDiagnostic.status === "success" && (
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#E8F3EB] text-[#2D5A3F] shrink-0">
                Aktif
              </span>
            )}
          </div>

          <div className={`text-[12px] p-3 rounded-xl leading-relaxed ${
            gpsDiagnostic.status === "success"
              ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]"
              : gpsDiagnostic.status === "error"
              ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
              : "bg-[#F9FAFB] text-[#4B5563] border border-[#F3F4F6]"
          }`}>
            <p>{gpsDiagnostic.message}</p>
            {gpsDiagnostic.status === "success" && gpsDiagnostic.accuracy && (
              <div className="mt-2 pt-2 border-t border-[#BBF7D0]/60 flex items-center justify-between text-[11px] font-medium text-[#166534]">
                <span>Tingkat Akurasi: ±{gpsDiagnostic.accuracy} meter</span>
                <span>Waktu Uji: {gpsDiagnostic.timestamp}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleTestGPS}
            disabled={isCheckingGPS}
            className="w-full py-2.5 px-4 rounded-xl bg-[#356E3B] hover:bg-[#2A582F] active:scale-[0.99] text-white text-[12.5px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGPS ? "animate-spin" : ""}`} />
            <span>{isCheckingGPS ? "Sedang Menguji Lokasi..." : "Uji Akurasi GPS Sekarang"}</span>
          </button>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-[12px] text-[#5C786C] px-1 font-medium mt-1">
          <span>Menampilkan {filteredFAQs.length} pertanyaan</span>
          {(searchQuery || activeTopic !== "semua") && (
            <button 
              onClick={() => {
                setSearchQuery("");
                setActiveTopic("semua");
              }}
              className="text-[#356E3B] font-bold hover:underline"
            >
              Reset filter
            </button>
          )}
        </div>

        {/* FAQ Accordion List */}
        <div className="flex flex-col gap-2.5">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((item) => {
              const isExpanded = expandedId === item.id;
              const Icon = item.icon;
              const userRating = feedbackState[item.id];

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="w-full text-left p-4.5 flex items-start gap-3.5 justify-between hover:bg-gray-50/70 transition-colors select-none"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        item.category === "admin" 
                          ? "bg-[#FEF3C7] text-[#92400E]" 
                          : item.category === "perusahaan"
                          ? "bg-[#E8F3EB] text-[#2D5A3F]"
                          : "bg-[#EAF3FD] text-[#2563EB]"
                      }`}>
                        <Icon className="w-4 h-4" strokeWidth={2.2} />
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-[#111827] text-[14px] font-bold leading-snug">
                          {item.question}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            item.topic === "gps" 
                              ? "bg-emerald-50 text-emerald-700"
                              : item.topic === "presensi"
                              ? "bg-blue-50 text-blue-700"
                              : item.topic === "izin"
                              ? "bg-purple-50 text-purple-700"
                              : item.topic === "tugas"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {item.topic}
                          </span>
                          {isManagementMode && (
                            <span className="text-[10px] font-medium text-gray-400 capitalize">
                              • {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <ChevronDown 
                        className={`w-5 h-5 text-[#9CA3AF] transition-transform duration-200 ${
                          isExpanded ? "rotate-180 text-[#1E4738]" : ""
                        }`} 
                        strokeWidth={2}
                      />
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="px-4.5 pb-4 pt-1 text-[#4B5563] text-[13px] leading-relaxed border-t border-[#F3F4F6] bg-[#FAFCF9]/60">
                      <p className="whitespace-pre-line mt-2 text-[#374151]">
                        {item.answer}
                      </p>

                      {/* Helpful Feedback Widget */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11.5px] text-[#6B7280]">
                          Apakah jawaban ini membantu?
                        </span>
                        {userRating ? (
                          <div className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#166534]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Terima kasih atas tanggapan Anda!</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleFeedback(item.id, "yes")}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-[11.5px] font-medium transition-colors"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>Ya</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFeedback(item.id, "no")}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-[11.5px] font-medium transition-colors"
                            >
                              <ThumbsDown className="w-3 h-3" />
                              <span>Tidak</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-[24px] border border-[#E5E7EB] p-8 text-center flex flex-col items-center justify-center gap-2.5">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-[#111827] text-[15px] font-bold">
                Tidak ada pertanyaan yang sesuai
              </h3>
              <p className="text-[#6B7280] text-[12.5px] max-w-[260px]">
                {isManagementMode 
                  ? "Coba gunakan kata kunci pencarian yang lain atau pilih kategori tab lainnya."
                  : "Coba gunakan kata kunci pencarian yang lain atau ubah topik."}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveTopic("semua");
                }}
                className="mt-2 px-4 py-2 rounded-full bg-[#356E3B] text-white text-[12px] font-bold hover:bg-[#2A582F] transition-colors"
              >
                Reset Pencarian
              </button>
            </div>
          )}
        </div>

        {/* Contact Support Channels Card */}
        <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-4.5 flex flex-col gap-3 shadow-xs mt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E8F3EB] flex items-center justify-center text-[#2D5A3F] shrink-0">
              <HelpCircle className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[#111827] text-[13.5px] font-bold">Belum menemukan jawaban?</h2>
              <p className="text-[#6B7280] text-[12px]">Tim Customer Support AbsenIn siap membantu Anda.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            {/* WhatsApp CS Button */}
            <a
              href="https://wa.me/6281234567890?text=Halo%20Tim%20AbsenIn%2C%20saya%20butuh%20bantuan%20mengenai%20aplikasi%20AbsenIn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] rounded-xl text-[12px] font-bold transition-all text-center"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>WhatsApp CS</span>
            </a>

            {/* Email Support Button */}
            <a
              href="mailto:support@absenin.com?subject=Pertanyaan%20Dukungan%20AbsenIn"
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#1E4738]/5 hover:bg-[#1E4738]/10 border border-[#1E4738]/20 text-[#1E4738] rounded-xl text-[12px] font-bold transition-all text-center"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Support</span>
            </a>
          </div>

          <div className="pt-2.5 border-t border-[#F3F4F6] flex items-center justify-between text-[11px] text-[#9CA3AF]">
            <span>Jam Operasional: Senin - Jumat, 08:00 - 18:00 WIB</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BantuanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fbfdfc] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#356E3B] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BantuanContent />
    </Suspense>
  );
}
