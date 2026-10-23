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
  Briefcase
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";

export type FAQCategory = "karyawan" | "perusahaan" | "admin";

interface FAQItem {
  id: string;
  category: FAQCategory;
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
    icon: UserCheck,
    question: "Bagaimana cara melakukan absensi masuk (Check-in) dan pulang (Check-out)?",
    answer: "Buka halaman Beranda atau Kehadiran, lalu klik tombol 'Check In Sekarang'. Pastikan GPS/Lokasi perangkat Anda aktif dan Anda berada di dalam radius area kantor yang ditentukan perusahaan. Tombol Check-out akan otomatis aktif setelah Anda berhasil melakukan check-in.",
    tags: ["absen", "checkin", "checkout", "kehadiran", "karyawan", "masuk", "pulang"]
  },
  {
    id: "gps-radius-error",
    category: "karyawan",
    icon: MapPin,
    question: "Mengapa muncul notifikasi 'Di Luar Radius Kantor' saat ingin absen?",
    answer: "Sistem AbsenIn memverifikasi radius Geofencing GPS secara real-time. Notifikasi ini muncul jika jarak posisi Anda melebihi batas radius kantor yang disetel oleh perusahaan. Pastikan Anda sudah tiba di lokasi kantor, aktifkan mode 'Akurasi Tinggi' pada setelan GPS ponsel, atau tunggu beberapa detik agar satelit GPS mengunci koordinat Anda.",
    tags: ["gps", "radius", "jarak", "lokasi", "gagal absen", "luar radius"]
  },
  {
    id: "pengajuan-izin-cuti",
    category: "karyawan",
    icon: FileText,
    question: "Bagaimana alur pengajuan Izin, Cuti, atau Sakit?",
    answer: "Buka menu 'Izin & Cuti' dari navigasi bawah, lalu klik 'Ajukan Izin Baru'. Pilih jenis izin (Sakit, Cuti Tahunan, Izin Kepentingan Pribadi, dsb.), tentukan tanggal awal dan akhir, berikan keterangan alasan, serta unggah lampiran bukti (misalnya Surat Dokter jika sakit). Permohonan akan berstatus 'Menunggu' sampai ditinjau oleh Admin/HR.",
    tags: ["izin", "cuti", "sakit", "surat dokter", "form izin", "pengajuan"]
  },
  {
    id: "pantau-tugas-agenda",
    category: "karyawan",
    icon: Clock,
    question: "Di mana saya bisa melihat tugas kerja dan jadwal agenda kantor?",
    answer: "Anda dapat mengakses menu 'Daftar Tugas' di bilah navigasi bawah untuk melihat tugas aktif, tenggat waktu, dan checklist pekerjaan. Untuk jadwal rapat, kegiatan perusahaan, atau hari libur bersama, buka menu 'Agenda'.",
    tags: ["tugas", "agenda", "jadwal", "kegiatan", "rapat"]
  },
  {
    id: "multi-perusahaan",
    category: "karyawan",
    icon: Building2,
    question: "Bisakah satu akun bergabung di lebih dari satu perusahaan?",
    answer: "Bisa. Satu akun email AbsenIn dapat terdaftar di berbagai organisasi atau cabang perusahaan berbeda. Anda dapat berpindah konteks perusahaan secara instan melalui 'Company Switcher' di bilah atas Beranda atau melalui menu 'Ganti Perusahaan' di halaman Profil.",
    tags: ["ganti perusahaan", "multi perusahaan", "cabang", "pindah organisasi", "akun"]
  },
  {
    id: "privasi-pelacakan-gps",
    category: "karyawan",
    icon: Lock,
    question: "Apakah AbsenIn melacak lokasi GPS pengguna sepanjang waktu (24 jam)?",
    answer: "Tidak sama sekali. Demi menjaga privasi data pengguna dan efisiensi baterai, AbsenIn HANYA meminta dan memverifikasi koordinat lokasi saat Anda menekan tombol absensi (Check-in / Check-out). Aplikasi tidak melakukan pelacakan lokasi latar belakang (background location tracking) di luar sesi absensi.",
    tags: ["privasi", "pelacakan", "gps 24 jam", "keamanan", "baterai", "pii"]
  },
  {
    id: "lupa-kata-sandi",
    category: "karyawan",
    icon: Lock,
    question: "Bagaimana cara memperbarui profil atau mengubah kata sandi?",
    answer: "Buka menu 'Profil' dari icon profil atau avatar Anda. Di bagian 'Informasi Akun', klik 'Ubah Kata Sandi' untuk mengganti password login Anda. Anda juga dapat memperbarui foto profil dengan mengetuk icon kamera pada avatar foto Anda.",
    tags: ["password", "kata sandi", "foto profil", "ganti password", "profil"]
  },

  // ================= 2. PERUSAHAAN =================
  {
    id: "atur-lokasi-radius",
    category: "perusahaan",
    icon: MapPin,
    question: "Bagaimana cara mengatur titik lokasi kantor dan radius absensi?",
    answer: "Buka Dashboard Admin -> klik Card Perusahaan Anda (atau menu 'Kelola Perusahaan'). Di bagian 'Lokasi Kantor & Radius Geofencing', geser marker pin pada peta Leaflet ke lokasi kantor Anda atau gunakan tombol deteksi koordinat. Tentukan batas radius kehadiran (misalnya 50 meter atau 100 meter), lalu klik 'Simpan Perubahan'.",
    tags: ["lokasi kantor", "koordinat", "geofencing", "radius", "peta", "leaflet", "perusahaan"]
  },
  {
    id: "atur-jam-kerja",
    category: "perusahaan",
    icon: Clock,
    question: "Bagaimana cara menyetel hari kerja, jam masuk, jam pulang, dan toleransi keterlambatan?",
    answer: "Di halaman Kelola Perusahaan, buka bagian 'Jadwal & Jam Kerja Kantor'. Anda dapat menentukan Hari Kerja aktif, Jam Masuk (misal 08:00), Jam Pulang (misal 17:00), serta Toleransi Keterlambatan (misalnya 15 menit). Karyawan yang absen setelah jam masuk + toleransi akan otomatis tercatat sebagai 'Terlambat'.",
    tags: ["jam kerja", "jadwal", "shift", "toleransi", "terlambat", "jam masuk", "hari kerja", "perusahaan"]
  },
  {
    id: "qr-code-karyawan",
    category: "perusahaan",
    icon: QrCode,
    question: "Bagaimana cara membagikan QR Code dan Kode Bergabung Perusahaan?",
    answer: "Setiap perusahaan memiliki Kode Unik Perusahaan dan QR Code khusus. Anda dapat melihat dan mengunduh QR Code ini di halaman Kelola Perusahaan (bagian 'Kode & QR Perusahaan'). Karyawan baru dapat bergabung dengan memindai QR tersebut dari kamera ponsel atau memasukkan kode perusahaan secara manual.",
    tags: ["undang", "tambah karyawan", "qr code", "kode perusahaan", "gabung", "perusahaan"]
  },
  {
    id: "ubah-profil-kantor",
    category: "perusahaan",
    icon: Building2,
    question: "Bagaimana cara memperbarui logo, nama, atau alamat kantor perusahaan?",
    answer: "Di halaman Kelola Perusahaan, klik tombol 'Ubah Informasi Perusahaan' di samping nama perusahaan. Anda dapat mengganti foto logo organisasi, nama perusahaan, serta alamat lengkap resmi.",
    tags: ["logo perusahaan", "nama kantor", "alamat", "ubah profil perusahaan"]
  },

  // ================= 3. ADMIN =================
  {
    id: "approval-izin-admin",
    category: "admin",
    icon: FileText,
    question: "Bagaimana cara menyetujui (Approve) atau menolak pengajuan izin karyawan?",
    answer: "Di Dashboard Admin, buka tab 'Izin & Cuti'. Anda akan melihat badge jumlah pengajuan berstatus 'Menunggu'. Klik pada permohonan untuk memeriksa detail, alasan, dan berkas lampiran. Klik tombol 'Setujui' untuk menyetujui atau 'Tolak' dengan menyertakan catatan alasan penolakan.",
    tags: ["approve", "approval", "persetujuan", "tolak izin", "verifikasi izin", "admin"]
  },
  {
    id: "rekap-laporan-kehadiran",
    category: "admin",
    icon: Users,
    question: "Bagaimana cara mengekspor laporan rekap kehadiran ke format Excel atau PDF?",
    answer: "Masuk ke Dashboard Admin -> pilih menu 'Laporan Kehadiran'. Tentukan filter rentang tanggal, departemen, atau status kehadiran. Klik tombol 'Ekspor Data' untuk mengunduh rekapitulasi data lengkap dalam format spreadsheet Excel (.xlsx) atau dokumen PDF cetak siap pakai.",
    tags: ["laporan", "rekap", "export", "excel", "pdf", "kehadiran", "unduh data", "admin"]
  },
  {
    id: "peran-role-hirarki",
    category: "admin",
    icon: ShieldCheck,
    question: "Apa perbedaan wewenang antara Owner, Admin, Manager, dan Karyawan?",
    answer: "• Owner (Pemilik): Memiliki hak kendali penuh organisasi, profil perusahaan, billing, dan dapat mengatur role pengguna lain.\n• Admin: Mengelola operasional harian, radius lokasi kantor, jadwal jam kerja, approval izin, dan laporan kehadiran.\n• Manager: Memantau kehadiran anggota tim dan memberikan tugas kerja.\n• Karyawan (Member): Melakukan absensi, mengajukan izin, melihat agenda, dan menyelesaikan tugas.",
    tags: ["role", "peran", "owner", "admin", "manager", "karyawan", "hak akses"]
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

  // Jika dibuka dari admin (?from=admin) -> Mode Manajemen/Admin (ada tab)
  // Jika dibuka dari Mode Personal / Profil (tanpa ?from=admin) -> Mode Personal (TIDAK ADA TAB, langsung FAQ Karyawan)
  const isManagementMode = isFromAdmin && hasManagementRole;

  const [activeCategory, setActiveCategory] = useState<FAQCategory>(
    isManagementMode ? "perusahaan" : "karyawan"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isManagementMode) {
      setActiveCategory("perusahaan");
    } else {
      setActiveCategory("karyawan");
    }
  }, [isManagementMode]);

  // Di mode personal: kunci HANYA menampilkan FAQ karyawan
  const effectiveCategory: FAQCategory = isManagementMode ? activeCategory : "karyawan";

  const filteredFAQs = useMemo(() => {
    return FAQ_DATA.filter(item => {
      // Filter kategori FAQ
      if (item.category !== effectiveCategory) {
        return false;
      }

      // Filter search
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchQuestion = item.question.toLowerCase().includes(q);
      const matchAnswer = item.answer.toLowerCase().includes(q);
      const matchTags = item.tags.some(tag => tag.toLowerCase().includes(q));

      return matchQuestion || matchAnswer || matchTags;
    });
  }, [effectiveCategory, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const getCategoryTitle = () => {
    if (!isManagementMode) return "Pusat Bantuan Karyawan";
    if (effectiveCategory === "perusahaan") return "Panduan Perusahaan & Kantor";
    if (effectiveCategory === "admin") return "Panduan Administrator & Approval";
    return "Panduan Karyawan & Akun";
  };

  const getCategoryDesc = () => {
    if (!isManagementMode) return "Pertanyaan umum seputar absensi masuk/pulang, GPS radius, izin/cuti, dan penggunaan akun.";
    if (effectiveCategory === "perusahaan") return "Pengaturan titik koordinat GPS, radius geofencing, jam kerja kantor, dan QR Code.";
    if (effectiveCategory === "admin") return "Persetujuan izin/cuti karyawan, ekspor laporan rekapitulasi, dan hierarki wewenang.";
    return "Panduan presensi check-in/out, kendala radius GPS, pengajuan izin/cuti, dan penggunaan akun.";
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-16">
      {/* TopBar Header */}
      <TopBar 
        title="Pusat Bantuan" 
        onBack={() => router.back()} 
      />

      <div className="px-5 py-5 flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Hero Header Banner */}
        <div className="bg-gradient-to-br from-[#1E4738] to-[#2D5A3F] rounded-[24px] p-5 text-white shadow-sm relative overflow-hidden">
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
                : "Cari pertanyaan bantuan atau topik..."
            }
            className="w-full bg-white rounded-2xl pl-10 pr-10 py-3.5 text-[13px] border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#356E3B]/30 focus:border-[#356E3B] transition-all text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.02)] placeholder:text-[#9CA3AF]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Role-Based Tabs (Simpel: Perusahaan, Admin, Karyawan) */}
        {/* HANYA MUNCUL DI MODE MANAJEMEN / ADMIN (?from=admin). DI MODE PERSONAL TIDAK ADA TAB SAMA SEKALI! */}
        {isManagementMode && (
          <div className="w-full bg-[#EEF4F0] p-1.5 rounded-[18px] border border-[#D5E2D8]/80 flex items-center justify-between gap-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <button
              onClick={() => setActiveCategory("perusahaan")}
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
              onClick={() => setActiveCategory("admin")}
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
              onClick={() => setActiveCategory("karyawan")}
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

        {/* Counter Info */}
        <div className="flex items-center justify-between text-[12px] text-[#5C786C] px-1 font-medium">
          <span>Menampilkan {filteredFAQs.length} pertanyaan</span>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="text-[#356E3B] font-bold hover:underline"
            >
              Hapus pencarian
            </button>
          )}
        </div>

        {/* FAQ Accordion List */}
        <div className="flex flex-col gap-2.5">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((item) => {
              const isExpanded = expandedId === item.id;
              const Icon = item.icon;

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
                        {isManagementMode && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              item.category === "admin" 
                                ? "bg-[#FEF3C7] text-[#92400E]" 
                                : item.category === "perusahaan"
                                ? "bg-[#E8F3EB] text-[#2D5A3F]"
                                : "bg-[#EAF3FD] text-[#2563EB]"
                            }`}>
                              {item.category}
                            </span>
                          </div>
                        )}
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
                    <div className="px-4.5 pb-4.5 pt-1 text-[#4B5563] text-[13px] leading-relaxed border-t border-[#F3F4F6] bg-[#FAFCF9]/60">
                      <p className="whitespace-pre-line mt-2 text-[#374151]">
                        {item.answer}
                      </p>
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
                  : "Coba gunakan kata kunci pencarian yang lain."}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                }}
                className="mt-2 px-4 py-2 rounded-full bg-[#356E3B] text-white text-[12px] font-bold hover:bg-[#2A582F] transition-colors"
              >
                Reset Pencarian
              </button>
            </div>
          )}
        </div>

        {/* Contact Support Footer Card */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-4.5 flex flex-col gap-2 shadow-xs mt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E8F3EB] flex items-center justify-center text-[#2D5A3F] shrink-0">
              <HelpCircle className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[#111827] text-[13.5px] font-bold">Belum menemukan jawaban?</h2>
              <p className="text-[#6B7280] text-[12px]">Tim dukungan AbsenIn siap membantu Anda kapan saja.</p>
            </div>
          </div>
          <div className="mt-2 pt-3 border-t border-[#F3F4F6] flex items-center justify-between">
            <span className="text-[12px] text-[#6B7280]">Email dukungan:</span>
            <a 
              href="mailto:support@absenin.com" 
              className="text-[12px] font-bold text-[#356E3B] hover:underline"
            >
              support@absenin.com
            </a>
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
