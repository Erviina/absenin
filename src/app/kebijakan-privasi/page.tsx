"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useGoogleLogin } from "@react-oauth/google";
import { TopBar } from "@/components/TopBar";
import { ChevronRight, ChevronDown, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { GoogleIcon } from "@/components/GoogleIcon";
import { useDialog } from "@/context/DialogContext";
import { useCompany } from "@/context/CompanyContext";
import { getApiUrl, clearAuthSession, setAuthSession } from "@/lib/api";
import { getSafeInternalRedirect, getPersonalModePreference, isTokenValid } from "@/lib/personalMode";

function KebijakanPrivasiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useDialog();
  const { refreshMemberships } = useCompany();

  const flowParam = searchParams.get("flow");
  const consentParam = searchParams.get("consent");
  const redirectParam = searchParams.get("redirect");

  const [isConsentFlow, setIsConsentFlow] = useState(false);
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  // Dua checkbox persetujuan wajib sesuai permintaan pengguna
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Periksa status login & consent pengguna
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const hasValidToken = Boolean(token && isTokenValid(token));
    setHasExistingToken(hasValidToken);

    let needsConsent = false;
    if (flowParam === "consent" || consentParam === "required" || !hasValidToken) {
      needsConsent = true;
    } else if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.consent && user.consent.hasConsented === false) {
          needsConsent = true;
        }
      } catch {}
    }

    setIsConsentFlow(needsConsent);
  }, [flowParam, consentParam]);

  // Deteksi scroll ke akhir halaman kebijakan privasi
  useEffect(() => {
    if (!isConsentFlow) return;

    // 1. Observer elemen penanda akhir dokumen
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
    // Pengecekan awal bila viewport tinggi
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isConsentFlow]);

  const handleBack = () => {
    if (isConsentFlow) {
      // Kembali ke Langkah 1: Syarat dan Ketentuan
      const q = redirectParam 
        ? `?flow=consent&redirect=${encodeURIComponent(redirectParam)}`
        : `?flow=consent`;
      router.push(`/syarat-ketentuan${q}`);
    } else {
      router.back();
    }
  };

  // Handler jika pengguna sudah punya token sesi namun belum tercatat consent di backend
  const handleExistingUserConsent = async () => {
    if (!agreedTerms || !agreedPrivacy || isSubmitting) return;

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
      await refreshMemberships();

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

  // Handler Login dengan Google saat kedua checkbox sudah tercentang
  const handleGoogleSuccess = async (authPayload: { idToken?: string; accessToken?: string }) => {
    if (isSubmitting || (!authPayload.idToken && !authPayload.accessToken)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(getApiUrl("/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authPayload),
      });

      const contentType = res.headers.get("content-type");
      let data: any = null;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      }

      if (!res.ok) {
        console.error("Login failed with status:", res.status, data);
        showToast(data?.message || `Gagal login (Error ${res.status})`, "error");
        setIsSubmitting(false);
        return;
      }

      if (data?.success) {
        const user = data.data.user;
        const token = data.data.accessToken;

        // 1. Simpan sesi secara terpusat
        setAuthSession(token, user, user?.company?.id);

        // 2. Karena pengguna SUDAH menyetujui syarat & kebijakan sebelum klik login,
        // langsung catat persetujuan secara resmi ke backend (/auth/consent)
        try {
          await fetch(getApiUrl("/auth/consent"), {
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

          user.consent = {
            hasConsented: true,
            policyVersion: "v1.0",
            consentedAt: new Date().toISOString(),
          };
          localStorage.setItem("user", JSON.stringify(user));
        } catch (consentErr) {
          console.error("Gagal sinkronisasi catatan consent post-login:", consentErr);
        }

        // 3. Muat data membership pengguna
        await refreshMemberships();

        showToast("Login berhasil! Selamat datang di AbsenIN.", "success");

        // 4. Arahkan ke rute tujuan aman atau dashboard
        const safeRedirect = getSafeInternalRedirect(redirectParam);
        if (safeRedirect) {
          router.replace(safeRedirect);
          return;
        }

        const effectiveCompany = user?.company || null;
        const skipCompany = getPersonalModePreference(user.id);
        if (!effectiveCompany && !skipCompany) {
          router.replace("/cek-perusahaan");
        } else {
          router.replace("/dashboard");
        }
      } else {
        showToast(data?.message || "Login failed", "error");
      }
    } catch (err) {
      console.error("Login error:", err);
      showToast("Terjadi kesalahan jaringan saat login", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      handleGoogleSuccess({ accessToken: tokenResponse.access_token });
    },
    onError: (error) => {
      console.error("Google Login Error:", error);
      setIsSubmitting(false);
      showToast("Gagal login dengan Google", "error");
    },
    prompt: "select_account",
  });

  const bothAgreed = agreedTerms && agreedPrivacy;

  return (
    <div className={`min-h-screen bg-[#F6F8F7] ${isConsentFlow ? (hasScrolledToBottom ? "pb-64 sm:pb-56" : "pb-32") : "pb-12"}`}>
      {/* TopBar */}
      <TopBar 
        title={isConsentFlow ? "Persetujuan Privasi" : "Kebijakan Privasi"} 
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
                  2
                </span>
                <span className="text-[13px] font-bold text-[#1E4738]">
                  Langkah 2 dari 2: Kebijakan Privasi
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#356E3B] bg-[#EEF5F0] px-2.5 py-1 rounded-full">
                Tahap 2/2
              </span>
            </div>
            
            {/* Progress Bar 100% */}
            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
              <div className="bg-[#356E3B] h-full rounded-full w-full transition-all duration-500" />
            </div>

            <p className="text-[11.5px] text-[#5C786C] mt-2">
              Gulir halaman hingga akhir untuk mencentang persetujuan dan menampilkan tombol login.
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
              Kebijakan Privasi &amp; Perlindungan Data Pribadi
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
                  <strong className="text-gray-900">Riwayat Kehadiran &amp; Administrasi:</strong> Catatan waktu hadir, status ketepatan waktu/keterlambatan, permohonan izin atau cuti kerja beserta dokumen lampiran pendukung yang Anda unggah.
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
              <h2 className="text-[15px] font-bold text-gray-900">3. Pembatasan Hak Akses &amp; Keamanan Data</h2>
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
              <h2 className="text-[14px] font-bold text-gray-900">5. Perubahan Kebijakan &amp; Kontak</h2>
              <p>
                Kebijakan privasi ini dapat diperbarui secara berkala sesuai ketentuan hukum yang berlaku. Apabila Anda memiliki pertanyaan seputar perlindungan data di AbsenIN, Anda dapat menghubungi tim pengembang atau administrator perusahaan Anda.
              </p>
            </section>
          </div>

          {/* Elemen Penanda Akhir Dokumen untuk Scroll Detection */}
          <div ref={bottomSentinelRef} className="h-4 w-full" />
        </div>
      </main>

      {/* Floating Indicator Petunjuk Scroll (Sebelum mencapai akhir dokumen) */}
      {isConsentFlow && !hasScrolledToBottom && (
        <div className="fixed bottom-5 left-0 right-0 mx-auto w-fit z-30 px-4 py-2.5 bg-[#1E4738]/95 text-white rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 text-xs font-semibold animate-bounce pointer-events-none">
          <span>Gulir ke bawah untuk menyelesaikan persetujuan</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      )}

      {/* Floating Action Card: Checklist Persetujuan & Tombol Login Muncul */}
      {isConsentFlow && hasScrolledToBottom && (
        <div className="fixed bottom-0 left-0 right-0 mx-auto w-full sm:max-w-md z-40 p-4 sm:p-5 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] sm:border-x sm:border-border/40 shadow-[0_-4px_25px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-full flex flex-col gap-3">
            
            {/* Checklist 1: Menyetujui Syarat dan Ketentuan */}
            <label 
              htmlFor="mandatory-terms-checkbox"
              className={`flex items-start gap-3 p-3 rounded-[16px] border transition-all cursor-pointer select-none ${
                agreedTerms 
                  ? "bg-[#EEF5F0] border-[#356E3B]/40" 
                  : "bg-[#F9FAFB] border-[#E5E7EB] hover:bg-[#F3F4F6]"
              }`}
            >
              <input
                id="mandatory-terms-checkbox"
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#356E3B] focus:ring-[#356E3B] cursor-pointer accent-[#356E3B] shrink-0"
              />
              <span className="text-[12.5px] text-[#1E4738] font-medium leading-[1.5]">
                Saya telah membaca, memahami, dan menyetujui seluruh isi{" "}
                <Link
                  href="/syarat-ketentuan?flow=consent"
                  className="font-bold underline hover:text-[#356E3B]"
                  onClick={(e) => e.stopPropagation()}
                >
                  Syarat dan Ketentuan Layanan
                </Link>.
              </span>
            </label>

            {/* Checklist 2: Menyetujui Kebijakan Privasi */}
            <label 
              htmlFor="mandatory-privacy-checkbox"
              className={`flex items-start gap-3 p-3 rounded-[16px] border transition-all cursor-pointer select-none ${
                agreedPrivacy 
                  ? "bg-[#EEF5F0] border-[#356E3B]/40" 
                  : "bg-[#F9FAFB] border-[#E5E7EB] hover:bg-[#F3F4F6]"
              }`}
            >
              <input
                id="mandatory-privacy-checkbox"
                type="checkbox"
                checked={agreedPrivacy}
                onChange={(e) => setAgreedPrivacy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#356E3B] focus:ring-[#356E3B] cursor-pointer accent-[#356E3B] shrink-0"
              />
              <span className="text-[12.5px] text-[#1E4738] font-medium leading-[1.5]">
                Saya telah membaca, memahami, dan menyetujui seluruh isi{" "}
                <strong className="font-bold">Kebijakan Privasi &amp; Perlindungan Data Pribadi</strong>.
              </span>
            </label>

            {/* Tombol Login - Muncul HANYA ketika KEDUA persetujuan telah tercentang */}
            {bothAgreed && (
              <div className="w-full pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {hasExistingToken ? (
                  // Pengguna yang sudah punya sesi login token
                  <button
                    id="btn-confirm-consent-continue"
                    type="button"
                    onClick={handleExistingUserConsent}
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-full bg-[#2D5A3F] hover:bg-[#153428] active:scale-[0.99] text-white font-bold text-[14px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Menyimpan Persetujuan...</span>
                      </>
                    ) : (
                      <>
                        <span>Konfirmasi &amp; Masuk ke AbsenIN</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  // Pengguna baru / belum login -> Tombol Sign In with Google
                  <button
                    id="btn-google-login-after-consent"
                    type="button"
                    onClick={() => loginWithGoogle()}
                    disabled={isSubmitting}
                    className="relative w-full h-12 bg-white border border-[#dadce0] hover:bg-[#f8fafd] hover:border-[#c6c8cc] active:bg-[#f1f3f4] text-[#3c4043] font-semibold text-[14px] rounded-full shadow-sm flex items-center justify-center transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    <div className="absolute left-4 w-5 h-5 flex items-center justify-center">
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#356E3B]" />
                      ) : (
                        <GoogleIcon className="w-[18px] h-[18px]" />
                      )}
                    </div>
                    <span>{isSubmitting ? "Menghubungkan akun Google..." : "Sign in with Google"}</span>
                  </button>
                )}
              </div>
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
