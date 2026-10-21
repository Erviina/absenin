"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { 
  ShieldCheck, 
  MapPin, 
  Camera, 
  UserCheck, 
  FileText, 
  Lock, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  ChevronRight,
  Loader2
} from "lucide-react";
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
      // Jika pengguna menolak menyetujui pada saat login pertama kali, batalkan sesi login
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
    <div className={`min-h-screen bg-[#fbfdfc] ${isConsentRequired ? "pb-36" : "pb-12"}`}>
      {/* TopBar */}
      <TopBar 
        title={isConsentRequired ? "Persetujuan Privasi" : "Kebijakan Privasi"} 
        onBack={handleBack} 
      />

      <main className="max-w-2xl mx-auto px-5 pt-6 flex flex-col gap-6">
        {/* Banner Khusus Saat Wajib Persetujuan */}
        {isConsentRequired && (
          <div className="bg-[#E8F3EB] border border-[#C1DFCD] rounded-[20px] p-4 flex gap-3.5 items-start animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-full bg-[#1E4738] text-white flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-[13px] text-[#1E4738] leading-relaxed">
              <strong className="font-bold block mb-0.5">Konfirmasi Persetujuan Pengguna:</strong>
              Sebagai langkah akhir pendaftaran akun AbsenIN, mohon pelajari ringkasan kebijakan privasi berikut dan centang persetujuan di bagian bawah untuk melanjutkan masuk.
            </div>
          </div>
        )}

        {/* Header Hero Banner */}
        <div className="bg-gradient-to-br from-[#1E4738] to-[#2D5A3F] rounded-[24px] p-6 text-white shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-200 tracking-wider uppercase">AbsenIN Data Privacy</span>
              <h1 className="text-[20px] font-bold leading-tight">Kebijakan Privasi & Perlindungan Data</h1>
            </div>
          </div>
          <p className="text-emerald-100/90 text-[13px] leading-relaxed">
            Komitmen kami untuk melindungi informasi pribadi (PII) Anda serta menjaga transparansi pemrosesan data kehadiran di platform AbsenIN.
          </p>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-emerald-200">
            <span>Versi Kebijakan: <strong>v1.0 (Oktober 2026)</strong></span>
            <span>Berlaku untuk seluruh pengguna AbsenIN</span>
          </div>
        </div>

        {/* Pemberitahuan Transparansi / Disclaimer Operasional */}
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-[20px] p-4 flex gap-3.5 items-start">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-[12.5px] text-amber-900 leading-relaxed">
            <strong className="font-semibold block mb-1">Catatan Transparansi Pemrosesan Data:</strong>
            Kebijakan privasi ini menjelaskan data apa saja yang diproses oleh aplikasi AbsenIN untuk keperluan operasional absensi digital, presensi berbasis lokasi, dan pengelolaan kehadiran karyawan. Dokumen ini merupakan kebijakan operasional aktif dan dapat disesuaikan berkala sesuai kepatuhan hukum dan ketentuan organisasi Anda.
          </div>
        </div>

        {/* 1. Informasi Pribadi yang Diproses */}
        <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F3EB] flex items-center justify-center text-[#2D5A3F]">
              <UserCheck className="w-4 h-4" />
            </div>
            <h2 className="text-[16px] font-bold text-[#111827]">1. Data Pribadi yang Diproses (PII)</h2>
          </div>
          <p className="text-[#4B5563] text-[13px] leading-relaxed">
            AbsenIN menerapkan prinsip <em>data minimization</em>, di mana kami hanya memproses data yang benar-benar dibutuhkan untuk pencatatan dan verifikasi kehadiran:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
            <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] flex flex-col gap-1.5">
              <div className="flex items-center gap-2 font-semibold text-[#1E4738]">
                <UserCheck className="w-4 h-4 text-[#356E3B]" />
                <span>Identitas & Akun</span>
              </div>
              <p className="text-[#6B7280] leading-normal">
                Nama lengkap, alamat email Google yang terverifikasi, dan foto profil/avatar akun.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] flex flex-col gap-1.5">
              <div className="flex items-center gap-2 font-semibold text-[#1E4738]">
                <Camera className="w-4 h-4 text-[#356E3B]" />
                <span>Foto Bukti Kehadiran</span>
              </div>
              <p className="text-[#6B7280] leading-normal">
                Foto wajah yang diambil saat melakukan check-in dan check-out untuk verifikasi kehadiran nyata.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] flex flex-col gap-1.5">
              <div className="flex items-center gap-2 font-semibold text-[#1E4738]">
                <MapPin className="w-4 h-4 text-[#356E3B]" />
                <span>Lokasi Geografis (GPS)</span>
              </div>
              <p className="text-[#6B7280] leading-normal">
                Koordinat lintang, bujur, dan alamat saat presensi guna memvalidasi radius kantor (WFO) atau lokasi kerja (WFH).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] flex flex-col gap-1.5">
              <div className="flex items-center gap-2 font-semibold text-[#1E4738]">
                <FileText className="w-4 h-4 text-[#356E3B]" />
                <span>Riwayat Izin & Presensi</span>
              </div>
              <p className="text-[#6B7280] leading-normal">
                Waktu check-in/out, status keterlambatan, permohonan izin/cuti, dan surat keterangan pendukung yang diunggah.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Tujuan Pemrosesan Data */}
        <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F3EB] flex items-center justify-center text-[#2D5A3F]">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-[16px] font-bold text-[#111827]">2. Tujuan Pemrosesan Data</h2>
          </div>
          <ul className="flex flex-col gap-2.5 text-[13px] text-[#4B5563]">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#356E3B] shrink-0 mt-0.5" />
              <span>Memvalidasi dan mencatat kehadiran pengguna secara akurat sesuai jadwal kerja organisasi.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#356E3B] shrink-0 mt-0.5" />
              <span>Mencegah kecurangan absensi (fraud detection) melalui pencocokan foto dan titik koordinat GPS.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#356E3B] shrink-0 mt-0.5" />
              <span>Menghitung rekapitulasi kehadiran, keterlambatan, dan pemrosesan permohonan izin karyawan.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#356E3B] shrink-0 mt-0.5" />
              <span>Menyediakan notifikasi pengingat agenda, tugas, dan pembaruan penting di tempat kerja.</span>
            </li>
          </ul>
        </div>

        {/* 3. Pembatasan Akses & Keamanan */}
        <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F3EB] flex items-center justify-center text-[#2D5A3F]">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-[16px] font-bold text-[#111827]">3. Batasan Akses & Keamanan Data (Least Privilege)</h2>
          </div>
          <p className="text-[#4B5563] text-[13px] leading-relaxed">
            Data Anda dilindungi melalui mekanisme <em>Policy Enforcement Point (PEP)</em> dan aturan kontrol akses ketat:
          </p>
          <div className="flex flex-col gap-2.5 text-[12.5px] text-[#374151]">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2.5">
              <span className="font-bold text-[#1E4738] shrink-0">• Pengguna Biasa:</span>
              <span>Hanya dapat melihat dan mengelola data presensi, izin, dan profil miliknya sendiri. Akses ke data pengguna lain diblokir oleh sistem otorisasi server.</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2.5">
              <span className="font-bold text-[#1E4738] shrink-0">• Manajemen (Owner/Admin/Manager):</span>
              <span>Hanya berhak mengakses data kehadiran anggota di dalam batasan organisasi yang sama untuk kepentingan rekapitulasi kerja.</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2.5">
              <span className="font-bold text-[#1E4738] shrink-0">• Perlindungan Multi-Tenant:</span>
              <span>Pemeriksaan tenant dan IDOR diterapkan di setiap endpoint backend guna mencegah kebocoran data lintas perusahaan.</span>
            </div>
          </div>
        </div>

        {/* 4. Hak Pengguna */}
        <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F3EB] flex items-center justify-center text-[#2D5A3F]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-[16px] font-bold text-[#111827]">4. Hak Pengguna atas Data Pribadi</h2>
          </div>
          <p className="text-[#4B5563] text-[13px] leading-relaxed">
            Sesuai prinsip Undang-Undang Perlindungan Data Pribadi (UU PDP):
          </p>
          <ul className="flex flex-col gap-2 text-[12.5px] text-[#4B5563] list-disc list-inside leading-relaxed">
            <li>Anda berhak melihat informasi akun dan riwayat kehadiran Anda kapan saja melalui aplikasi.</li>
            <li>Anda berhak memperbarui nama dan foto profil akun Anda.</li>
            <li>Anda berhak menarik persetujuan atau meminta peninjauan pemrosesan data melalui pengelola organisasi atau admin perusahaan tempat Anda bernaung.</li>
          </ul>
        </div>
      </main>

      {/* Floating Action Card untuk Checklist & Tombol Lanjutkan (Hanya saat isConsentRequired) */}
      {isConsentRequired && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 sm:p-5 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
          <div className="max-w-md mx-auto flex flex-col gap-3">
            {/* Checklist Persetujuan Wajib */}
            <label 
              htmlFor="mandatory-consent-checkbox"
              className={`flex items-start gap-3 p-3.5 rounded-[18px] border transition-all cursor-pointer select-none ${
                isAgreed 
                  ? "bg-[#EEF5F0] border-[#356E3B]/40 ring-1 ring-[#356E3B]/20" 
                  : "bg-[#F9FAFB] border-[#E5E7EB] hover:bg-[#F3F4F6]"
              }`}
            >
              <input
                id="mandatory-consent-checkbox"
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300 text-[#356E3B] focus:ring-[#356E3B] cursor-pointer accent-[#356E3B] shrink-0"
              />
              <span className="text-[12.5px] text-[#1E4738] font-medium leading-[1.5]">
                Saya telah membaca, memahami, dan menyetujui seluruh isi <strong>Kebijakan Privasi</strong> serta pemrosesan data pribadi saya di AbsenIN.
              </span>
            </label>

            {/* Tombol Lanjutkan - Muncul ketika dicentang */}
            {isAgreed && (
              <button
                type="button"
                onClick={handleConsentAndContinue}
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-full bg-[#1E4738] hover:bg-[#153428] active:scale-[0.99] text-white font-bold text-[14px] shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-200"
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
        <div className="min-h-screen bg-[#fbfdfc] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
        </div>
      }
    >
      <KebijakanPrivasiContent />
    </Suspense>
  );
}
