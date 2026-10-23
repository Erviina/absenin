"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { ChevronRight, ChevronDown, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { isTokenValid } from "@/lib/personalMode";

function SyaratKetentuanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const flowParam = searchParams.get("flow");
  const redirectParam = searchParams.get("redirect");

  const [isConsentFlow, setIsConsentFlow] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Tentukan apakah dalam alur persetujuan:
    // 1. Parameter eksplisit ?flow=consent
    // 2. Pengguna belum login (tidak ada token sesi yang valid)
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const hasValidToken = Boolean(token && isTokenValid(token));

    if (flowParam === "consent" || !hasValidToken) {
      setIsConsentFlow(true);
    } else {
      setIsConsentFlow(false);
    }
  }, [flowParam]);

  // Deteksi scroll hingga ke bagian akhir dokumen
  useEffect(() => {
    if (!isConsentFlow) return;

    // 1. Observer pada elemen penanda di akhir dokumen
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setHasScrolledToBottom(true);
        }
      },
      {
        root: null,
        rootMargin: "0px 0px 140px 0px",
        threshold: 0.05,
      }
    );

    if (bottomSentinelRef.current) {
      observer.observe(bottomSentinelRef.current);
    }

    // 2. Fallback deteksi scroll window
    const handleScroll = () => {
      if (typeof window === "undefined") return;
      const scrollPosition = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      if (scrollPosition >= documentHeight - 150) {
        setHasScrolledToBottom(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Pengecekan awal bila layar sangat tinggi
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isConsentFlow]);

  const handleBack = () => {
    if (isConsentFlow) {
      router.push("/login/onboard");
    } else {
      router.back();
    }
  };

  const handleGoNext = () => {
    const q = redirectParam 
      ? `?flow=consent&redirect=${encodeURIComponent(redirectParam)}`
      : `?flow=consent`;
    router.push(`/kebijakan-privasi${q}`);
  };

  return (
    <div className={`min-h-screen bg-[#F6F8F7] ${isConsentFlow ? "pb-36" : "pb-12"}`}>
      {/* TopBar */}
      <TopBar 
        title={isConsentFlow ? "Syarat & Ketentuan" : "Syarat dan Ketentuan"} 
        onBack={handleBack} 
        fixed={true}
      />

      <main className="w-full px-4 pt-4 sm:pt-6">
        {/* Progress Step Header (Hanya pada alur persetujuan) */}
        {isConsentFlow && (
          <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-4 mb-4 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1E4738] text-white text-[11px] font-bold">
                  1
                </span>
                <span className="text-[13px] font-bold text-[#1E4738]">
                  Langkah 1 dari 2: Syarat &amp; Ketentuan
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#5C786C] bg-[#EEF5F0] px-2.5 py-1 rounded-full">
                Tahap 1/2
              </span>
            </div>
            
            {/* Progress Bar 50% */}
            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
              <div className="bg-[#356E3B] h-full rounded-full w-1/2 transition-all duration-500" />
            </div>

            <p className="text-[11.5px] text-[#5C786C] mt-2">
              Silakan baca dan gulir halaman hingga akhir untuk membuka tombol langkah berikutnya.
            </p>
          </div>
        )}

        {/* Document Paper Container */}
        <div className="bg-white rounded-[24px] border border-[#E5E7EB] p-6 sm:p-8 shadow-xs text-gray-700 text-[13.5px] leading-relaxed">
          
          {/* Document Header */}
          <div className="border-b border-gray-100 pb-5 mb-6">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#356E3B] bg-[#EEF5F0] px-2.5 py-1 rounded-md inline-block">
                Dokumen Resmi
              </span>
              {hasScrolledToBottom && isConsentFlow && (
                <span className="text-[11px] font-semibold text-[#356E3B] bg-[#E8F5E9] px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in duration-300">
                  <CheckCircle2 className="w-3 h-3" />
                  Selesai dibaca
                </span>
              )}
            </div>
            <h1 className="text-[20px] sm:text-[22px] font-bold text-gray-900 leading-snug">
              Syarat dan Ketentuan Layanan
            </h1>
            <p className="text-[12px] text-gray-400 mt-1.5">
              Versi 1.0 • Terakhir diperbarui: Oktober 2026 • Berlaku untuk seluruh pengguna AbsenIN
            </p>
          </div>

          {/* Document Body Sections */}
          <div className="space-y-6 text-gray-700">
            {/* Pendahuluan */}
            <section className="space-y-2">
              <h2 className="text-[15px] font-bold text-gray-900">Pendahuluan</h2>
              <p>
                Selamat datang di platform AbsenIN (&quot;Aplikasi&quot;). Syarat dan Ketentuan Layanan ini merupakan perjanjian yang mengikat secara hukum antara Anda (&quot;Pengguna&quot;) dan pihak pengelola AbsenIN. Dengan mengakses, mengunduh, atau menggunakan layanan AbsenIN, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui untuk terikat oleh seluruh Syarat dan Ketentuan ini serta Kebijakan Privasi kami.
              </p>
            </section>

            {/* Bagian 1 */}
            <section className="space-y-2.5">
              <h2 className="text-[15px] font-bold text-gray-900">1. Akun Pengguna &amp; Autentikasi</h2>
              <p>
                Untuk menggunakan layanan AbsenIN, Anda wajib mematuhi ketentuan kepemilikan dan autentikasi akun sebagai berikut:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[13px]">
                <li>
                  <strong className="text-gray-900">Autentikasi Akun Resmi:</strong> Akun dibuat dan diautentikasi menggunakan layanan Google OAuth resmi dengan email yang sah dan terverifikasi.
                </li>
                <li>
                  <strong className="text-gray-900">Keamanan Akses:</strong> Anda bertanggung jawab penuh untuk menjaga kerahasiaan sesi login Anda. Segala tindakan atau aktivitas yang dilakukan menggunakan akun Anda dianggap sebagai tindakan sah dari Anda.
                </li>
                <li>
                  <strong className="text-gray-900">Larangan Pengalihan Akun:</strong> Akun AbsenIN bersifat personal dan tidak dapat dialihkan atau dipinjamkan kepada orang lain untuk tujuan apa pun.
                </li>
              </ul>
            </section>

            {/* Bagian 2 */}
            <section className="space-y-2.5">
              <h2 className="text-[15px] font-bold text-gray-900">2. Ketentuan Presensi &amp; Larangan Manipulasi</h2>
              <p>
                Keandalan dan kejujuran data presensi merupakan fondasi utama layanan AbsenIN. Pengguna wajib mematuhi pedoman presensi berikut:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[13px]">
                <li>
                  <strong className="text-gray-900">Presensi Mandiri Real-Time:</strong> Pencatatan kehadiran (Check-in dan Check-out) harus dilakukan secara langsung oleh Pengguna pada saat jam kerja berlaku.
                </li>
                <li>
                  <strong className="text-gray-900">Verifikasi Lokasi (GPS):</strong> Data lokasi wajib diambil langsung dari sensor GPS perangkat tanpa melalui modifikasi atau simulasi tiruan.
                </li>
                <li>
                  <strong className="text-gray-900">Larangan Fake GPS &amp; Emulator:</strong> Pengguna dilarang keras menggunakan aplikasi pemalsu lokasi (Mock Location / Fake GPS), emulator perangkat lunak, bot otomatis, atau rekayasa data jaringan.
                </li>
                <li>
                  <strong className="text-gray-900">Foto Bukti Wajah Asli:</strong> Foto presensi wajib diambil secara langsung melalui kamera perangkat dan menampilkan wajah Pengguna secara jelas. Penggunaan foto dari galeri, foto pihak ketiga, atau rekayasa grafis dilarang keras.
                </li>
                <li>
                  <strong className="text-gray-900">Konsekuensi Pelanggaran:</strong> Segala bentuk manipulasi data kehadiran dapat mengakibatkan pembatalan presensi, pelaporan pelanggaran ke manajemen perusahaan, hingga penonaktifan akun.
                </li>
              </ul>
            </section>

            {/* Bagian 3 */}
            <section className="space-y-2.5">
              <h2 className="text-[15px] font-bold text-gray-900">3. Peran Platform &amp; Manajemen Perusahaan</h2>
              <p>
                AbsenIN menyediakan sarana teknologi untuk mempermudah pencatatan kehadiran, pengajuan cuti/izin, serta manajemen tugas:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[13px]">
                <li>
                  <strong className="text-gray-900">Kewenangan Organisasi:</strong> Penetapan jadwal kerja, radius kantor, persetujuan permohonan izin/cuti, serta kebijakan kompensasi sepenuhnya merupakan wewenang dari pihak manajemen perusahaan masing-masing.
                </li>
                <li>
                  <strong className="text-gray-900">Hubungan Kerja:</strong> AbsenIN tidak bertindak sebagai pemberi kerja dan tidak bertanggung jawab atas perselisihan ketenagakerjaan antara karyawan dan perusahaan.
                </li>
              </ul>
            </section>

            {/* Bagian 4 */}
            <section className="space-y-2.5">
              <h2 className="text-[15px] font-bold text-gray-900">4. Ketersediaan Layanan &amp; Batasan Tanggung Jawab</h2>
              <p>
                Kami terus berupaya menyediakan layanan yang stabil, aman, dan tanpa gangguan:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[13px]">
                <li>
                  Layanan disediakan atas dasar &quot;sebagaimana adanya&quot; (&quot;as is&quot;). Kami tidak menjamin bahwa layanan akan selalu bebas dari kegagalan transmisi jaringan seluler atau gangguan perangkat pengguna.
                </li>
                <li>
                  Pengguna disarankan untuk memastikan ketersediaan sinyal seluler atau internet dan izin akses perangkat (GPS dan Kamera) berfungsi dengan baik saat melakukan presensi.
                </li>
                <li>
                  Kami tidak bertanggung jawab atas kerugian langsung maupun tidak langsung akibat ketidakmampuan melakukan presensi yang disebabkan oleh kegagalan perangkat keras pengguna atau koneksi internet pihak ketiga.
                </li>
              </ul>
            </section>

            {/* Bagian 5 */}
            <section className="space-y-2.5">
              <h2 className="text-[15px] font-bold text-gray-900">5. Hak Kekayaan Intelektual</h2>
              <p>
                Seluruh hak cipta, merek dagang, desain grafis antarmuka, kode sumber, dan dokumentasi platform AbsenIN merupakan hak milik eksklusif pengembang AbsenIN dan dilindungi oleh peraturan perundang-undangan hak cipta yang berlaku. Anda dilarang menggandakan, memodifikasi, merekayasa balik (reverse-engineer), atau mendistribusikan materi milik AbsenIN tanpa izin tertulis sebelumnya.
              </p>
            </section>

            {/* Bagian 6 */}
            <section className="space-y-2 border-t border-gray-100 pt-5 text-[12.5px] text-gray-500">
              <h2 className="text-[14px] font-bold text-gray-900">6. Pembaruan Ketentuan &amp; Kontak</h2>
              <p>
                Kami dapat memperbarui Syarat dan Ketentuan ini dari waktu ke waktu. Pembaruan akan berlaku efektif setelah ditayangkan pada halaman ini. Penggunaan berkelanjutan atas layanan kami setelah perubahan tersebut menandakan persetujuan Anda terhadap ketentuan yang diperbarui. Untuk pertanyaan lebih lanjut, silakan hubungi administrator perusahaan Anda atau tim dukungan AbsenIN.
              </p>
            </section>
          </div>

          {/* Elemen Penanda Akhir Dokumen untuk Scroll Detection */}
          <div ref={bottomSentinelRef} className="h-4 w-full" />
        </div>
      </main>

      {/* Floating Indicator Petunjuk Scroll (Sebelum mencapai akhir) */}
      {isConsentFlow && !hasScrolledToBottom && (
        <div className="fixed bottom-5 left-0 right-0 mx-auto w-fit z-30 px-4 py-2.5 bg-[#1E4738]/95 text-white rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 text-xs font-semibold animate-bounce pointer-events-none">
          <span>Gulir ke bawah untuk membaca seluruh ketentuan</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      )}

      {/* Floating Action Card: Tombol "Selanjutnya" muncul setelah scroll */}
      {isConsentFlow && hasScrolledToBottom && (
        <div className="fixed bottom-0 left-0 right-0 mx-auto w-full sm:max-w-md z-40 p-4 sm:p-5 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] sm:border-x sm:border-border/40 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[#5C786C] px-1">
              <span className="font-medium">Ketentuan telah selesai dibaca</span>
              <span className="font-bold text-[#1E4738]">Langkah 1/2 Selesai</span>
            </div>

            <button
              id="btn-next-to-privacy"
              type="button"
              onClick={handleGoNext}
              className="w-full py-3.5 px-6 rounded-full bg-[#2D5A3F] hover:bg-[#153428] active:scale-[0.99] text-white font-bold text-[14px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Selanjutnya: Kebijakan Privasi</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SyaratKetentuanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F8F7] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
        </div>
      }
    >
      <SyaratKetentuanContent />
    </Suspense>
  );
}
