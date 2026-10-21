"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { ChevronRight, Loader2 } from "lucide-react";
import { useDialog } from "@/context/DialogContext";
import { useCompany } from "@/context/CompanyContext";
import { getApiUrl, clearAuthSession } from "@/lib/api";
import { getSafeInternalRedirect, getPersonalModePreference } from "@/lib/personalMode";

function KebijakanPrivasiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useDialog();
  const { refreshMemberships } = useCompany();

  const consentParam = searchParams.get("consent");
  const redirectParam = searchParams.get("redirect");

  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConsentRequired, setIsConsentRequired] = useState(false);

  useEffect(() => {
    // Cek apakah halaman dibuka dalam alur persetujuan wajib
    if (consentParam === "required") {
      setIsConsentRequired(true);
      return;
    }

    // Jika pengguna login tetapi belum pernah menyetujui kebijakan privasi
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (token && userStr) {
        const user = JSON.parse(userStr);
        if (user && user.consent && user.consent.hasConsented === false) {
          setIsConsentRequired(true);
        }
      }
    } catch {}
  }, [consentParam]);

  const handleBack = () => {
    if (isConsentRequired) {
      // Jika pengguna membatalkan pada saat login pertama kali, bersihkan sesi login
      clearAuthSession();
      router.replace("/login");
    } else {
      router.back();
    }
  };

  const handleConsentAndContinue = async () => {
    if (!isAgreed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) {
        showToast("Sesi tidak ditemukan. Silakan login kembali.", "error");
        router.replace("/login");
        return;
      }

      const res = await fetch(getApiUrl("/auth/consent"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          consent_accepted: true,
          policy_version: "v1.0",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json?.message || "Gagal mencatat persetujuan kebijakan privasi", "error");
        setIsSubmitting(false);
        return;
      }

      // Perbarui metadata user di localStorage
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.consent = {
            hasConsented: true,
            policyVersion: "v1.0",
            consentedAt: new Date().toISOString(),
          };
          localStorage.setItem("user", JSON.stringify(userObj));
        }
      } catch {}

      showToast("Persetujuan berhasil dikonfirmasi. Selamat datang di AbsenIN!", "success");

      // Muat data membership pengguna
      await refreshMemberships();

      // Alur direct setelah login seperti biasa
      const safeRedirect = getSafeInternalRedirect(redirectParam);
      if (safeRedirect) {
        router.replace(safeRedirect);
        return;
      }

      let effectiveUser: any = null;
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          effectiveUser = JSON.parse(userStr);
        }
      } catch {}

      const effectiveCompany = effectiveUser?.company || null;
      const skipCompany = getPersonalModePreference(effectiveUser?.id);
      if (!effectiveCompany && !skipCompany) {
        router.replace("/cek-perusahaan");
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      console.error("Error submitting consent:", err);
      showToast("Terjadi kesalahan jaringan saat menyimpan persetujuan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#F6F8F7] ${isConsentRequired ? "pb-36" : "pb-12"}`}>
      {/* TopBar */}
      <TopBar 
        title={isConsentRequired ? "Persetujuan Privasi" : "Kebijakan Privasi"} 
        onBack={handleBack} 
      />

      <main className="max-w-2xl mx-auto px-4 pt-4 sm:pt-6">
        {/* Document Paper Container */}
        <div className="bg-white rounded-[24px] border border-[#E5E7EB] p-6 sm:p-8 shadow-xs text-gray-700 text-[13.5px] leading-relaxed">
          
          {/* Document Header */}
          <div className="border-b border-gray-100 pb-5 mb-6">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#356E3B] bg-[#EEF5F0] px-2.5 py-1 rounded-md inline-block mb-2.5">
              Dokumen Resmi
            </span>
            <h1 className="text-[20px] sm:text-[22px] font-bold text-gray-900 leading-snug">
              Kebijakan Privasi & Perlindungan Data Pribadi
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
                Selamat datang di AbsenIN. Kami berkomitmen untuk melindungi dan menghormati privasi Anda sesuai dengan Undang-Undang Perlindungan Data Pribadi (UU PDP) yang berlaku. Dokumen Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, memproses, menyimpan, dan menjaga informasi pribadi (Personally Identifiable Information / PII) Anda saat menggunakan platform AbsenIN.
              </p>
            </section>

            {/* Bagian 1 */}
            <section className="space-y-2.5">
              <h2 className="text-[15px] font-bold text-gray-900">1. Data Pribadi yang Kami Kumpulkan</h2>
              <p>
                AbsenIN menerapkan prinsip <em>data minimization</em> (pembatasan data), di mana kami hanya memproses data yang relevan dan dibutuhkan untuk operasional presensi digital:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[13px]">
                <li>
                  <strong className="text-gray-900">Data Identitas Akun:</strong> Nama lengkap, alamat email Google yang terverifikasi, dan tautan foto profil (avatar).
                </li>
                <li>
                  <strong className="text-gray-900">Data Lokasi Geografis (GPS):</strong> Koordinat lintang (latitude) dan bujur (longitude) serta alamat saat presensi, digunakan untuk memverifikasi radius kantor (WFO) atau titik kerja resmi (WFH).
                </li>
                <li>
                  <strong className="text-gray-900">Foto Bukti Presensi:</strong> Foto wajah yang diambil secara langsung melalui kamera perangkat pada saat check-in dan check-out untuk membuktikan kehadiran nyata.
                </li>
                <li>
                  <strong className="text-gray-900">Riwayat Kehadiran & Administrasi:</strong> Catatan waktu hadir, status ketepatan waktu/keterlambatan, permohonan izin atau cuti kerja beserta dokumen lampiran pendukung yang Anda unggah.
                </li>
              </ul>
            </section>

            {/* Bagian 2 */}
            <section className="space-y-2.5">
              <h2 className="text-[15px] font-bold text-gray-900">2. Tujuan Pemrosesan Data</h2>
              <p>Informasi pribadi yang kami kumpulkan diproses untuk tujuan-tujuan berikut:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-[13px]">
                <li>Memvalidasi dan mencatat kehadiran kerja Anda secara akurat sesuai dengan jadwal kerja perusahaan yang berlaku.</li>
                <li>Mencegah kecurangan presensi (*fraud detection*) melalui verifikasi pencocokan foto dan titik koordinat GPS.</li>
                <li>Menyusun rekapitulasi kehadiran, persentase keterlambatan, dan pemrosesan permohonan izin karyawan.</li>
                <li>Mengirimkan notifikasi dan pengingat terkait agenda rapat, jadwal tugas, serta pengumuman penting internal organisasi.</li>
              </ul>
            </section>

            {/* Bagian 3 */}
            <section className="space-y-2.5">
              <h2 className="text-[15px] font-bold text-gray-900">3. Pembatasan Hak Akses & Keamanan Data</h2>
              <p>
                Kami menerapkan prinsip <em>Least Privilege</em> dan mekanisme kontrol akses ketat untuk memastikan keamanan data Anda:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[13px]">
                <li>
                  <strong className="text-gray-900">Pengguna / Karyawan:</strong> Hanya berhak mengakses dan mengelola data presensi, riwayat izin, tugas, dan profil milik sendiri.
                </li>
                <li>
                  <strong className="text-gray-900">Manajemen Perusahaan:</strong> Hanya berhak meninjau data kehadiran anggota di dalam batasan organisasi yang sama untuk kepentingan rekapitulasi operasional.
                </li>
                <li>
                  <strong className="text-gray-900">Pemisahan Multi-Tenant:</strong> Isolasi basis data dan validasi IDOR ketat diterapkan di seluruh endpoint backend untuk mencegah kebocoran data antarperusahaan.
                </li>
              </ul>
            </section>

            {/* Bagian 4 */}
            <section className="space-y-2.5">
              <h2 className="text-[15px] font-bold text-gray-900">4. Hak Pengguna atas Data Pribadi</h2>
              <p>Sebagai pemilik data pribadi, Anda memiliki hak-hak berikut:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-[13px]">
                <li>Hak untuk melihat dan mengakses informasi akun serta riwayat presensi Anda kapan saja melalui aplikasi.</li>
                <li>Hak untuk memperbarui dan mengoreksi data profil seperti nama dan foto akun.</li>
                <li>Hak untuk menarik persetujuan atau meminta peninjauan pemrosesan data melalui administrator organisasi perusahaan tempat Anda bernaung.</li>
              </ul>
            </section>

            {/* Bagian 5 */}
            <section className="space-y-2 border-t border-gray-100 pt-5 text-[12.5px] text-gray-500">
              <h2 className="text-[14px] font-bold text-gray-900">5. Perubahan Kebijakan & Kontak</h2>
              <p>
                Kebijakan privasi ini dapat diperbarui secara berkala sesuai ketentuan hukum yang berlaku. Apabila Anda memiliki pertanyaan seputar perlindungan data di AbsenIN, Anda dapat menghubungi tim pengembang atau administrator perusahaan Anda.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Floating Action Card untuk Checklist & Tombol Lanjutkan (Hanya saat isConsentRequired) */}
      {isConsentRequired && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 sm:p-5 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            {/* Checklist Persetujuan Wajib */}
            <label 
              htmlFor="mandatory-consent-checkbox"
              className={`flex items-start gap-3 p-3.5 rounded-[16px] border transition-all cursor-pointer select-none ${
                isAgreed 
                  ? "bg-[#EEF5F0] border-[#356E3B]/40" 
                  : "bg-[#F9FAFB] border-[#E5E7EB] hover:bg-[#F3F4F6]"
              }`}
            >
              <input
                id="mandatory-consent-checkbox"
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#356E3B] focus:ring-[#356E3B] cursor-pointer accent-[#356E3B] shrink-0"
              />
              <span className="text-[12.5px] text-[#1E4738] font-medium leading-[1.5]">
                Saya telah membaca, memahami, dan menyetujui seluruh isi <strong>Kebijakan Privasi</strong> di atas.
              </span>
            </label>

            {/* Tombol Lanjutkan - Muncul ketika dicentang */}
            {isAgreed && (
              <button
                type="button"
                onClick={handleConsentAndContinue}
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-full bg-[#1E4738] hover:bg-[#153428] active:scale-[0.99] text-white font-bold text-[14px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan Persetujuan...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjutkan</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KebijakanPrivasiPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F8F7] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
        </div>
      }
    >
      <KebijakanPrivasiContent />
    </Suspense>
  );
}
