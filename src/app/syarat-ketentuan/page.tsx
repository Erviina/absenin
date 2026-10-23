"use client";

import React, { Suspense } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Loader2 } from "lucide-react";

function SyaratKetentuanContent() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-[#F6F8F7] pb-12">
      {/* TopBar */}
      <TopBar 
        title="Syarat dan Ketentuan" 
        onBack={handleBack} 
        fixed={true}
      />

      <main className="w-full px-4 pt-4 sm:pt-6">
        {/* Document Paper Container */}
        <div className="bg-white rounded-[24px] border border-[#E5E7EB] p-6 sm:p-8 shadow-xs text-gray-700 text-[13.5px] leading-relaxed">
          
          {/* Document Header */}
          <div className="border-b border-gray-100 pb-5 mb-6">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#356E3B] bg-[#EEF5F0] px-2.5 py-1 rounded-md inline-block mb-2.5">
              Dokumen Resmi
            </span>
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
        </div>
      </main>
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
