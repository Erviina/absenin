"use client";

import { useState } from "react";
import {
  Settings,
  Shield,
  User,
  Bell,
  Sliders,
  Database,
  CheckCircle2,
  LogOut,
  Save,
  Trash2,
} from "lucide-react";
import { usePlatformAdmin } from "../layout";
import { logoutPlatformAdmin } from "@/lib/platformAdminApi";

export default function PlatformAdminSettingsPage() {
  const { profile } = usePlatformAdmin();
  const [autoRefreshInterval, setAutoRefreshInterval] = useState("30");
  const [alertHighLatency, setAlertHighLatency] = useState(true);
  const [alertFailedAuth, setAlertFailedAuth] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleClearCache = () => {
    if (confirm("Bersihkan cache lokal Platform Admin?")) {
      sessionStorage.clear();
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-[#356E3B]" />
        <h2 className="text-[20px] sm:text-[22px] font-black text-[#111827] tracking-tight">
          Pengaturan Platform Admin
        </h2>
      </div>

      {isSaved && (
        <div className="p-3.5 rounded-[16px] bg-[#E8F5E9] border border-[#A5D6A7] text-[#2E7D32] text-[13px] font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Pengaturan preferensi Platform Admin berhasil disimpan.</span>
        </div>
      )}

      {/* Profile & Identity Card */}
      <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
            <Shield className="w-5 h-5 text-[#356E3B]" />
          </div>
          <div>
            <h3 className="font-extrabold text-[16px] text-gray-900 leading-tight">
              Identitas Pemilik Platform
            </h3>
            <span className="text-[12px] text-gray-400">
              Hak akses administratif tertinggi Absenin
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase">
              Nama Lengkap
            </span>
            <span className="text-[14px] font-bold text-gray-900 mt-1">
              {profile?.fullName || "Administrator Platform"}
            </span>
          </div>

          <div className="p-3.5 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase">
              Email Terotorisasi
            </span>
            <span className="text-[14px] font-bold text-[#1E3F2B] mt-1 font-mono">
              {profile?.email || "-"}
            </span>
          </div>

          <div className="p-3.5 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase">
              Peran Otorisasi
            </span>
            <div className="mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EEF5F0] text-[#1E3F2B] border border-[#DCE9DF]">
                PEMILIK PLATFORM
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-[16px] bg-[#F9FBFA] border border-gray-100 flex flex-col">
            <span className="text-[11px] font-bold text-gray-400 uppercase">
              Waktu Verifikasi Sesi
            </span>
            <span className="text-[13px] text-gray-600 mt-1">
              {profile?.verifiedAt
                ? new Date(profile.verifiedAt).toLocaleString("id-ID")
                : "Baru saja"}
            </span>
          </div>
        </div>
      </div>

      {/* Monitoring Preferences */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col gap-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#EEF5F0] flex items-center justify-center text-[#1E3F2B]">
            <Sliders className="w-5 h-5 text-[#356E3B]" />
          </div>
          <div>
            <h3 className="font-extrabold text-[16px] text-gray-900 leading-tight">
              Preferensi Pemantauan & Pelaporan
            </h3>
            <span className="text-[12px] text-gray-400">
              Konfigurasi pembaruan otomatis dan sensitivitas metrik
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-gray-100">
            <div>
              <span className="font-bold text-[13.5px] text-gray-900 block">
                Interval Pembaruan Otomatis Kesehatan Sistem
              </span>
              <span className="text-[12px] text-gray-400">
                Frekuensi pemeriksaan otomatis data latensi dan status server
              </span>
            </div>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(e.target.value)}
              className="px-3 py-2 bg-white border border-[#DCE9DF] rounded-[14px] text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#356E3B]/20"
            >
              <option value="15">Setiap 15 detik</option>
              <option value="30">Setiap 30 detik (Standar)</option>
              <option value="60">Setiap 60 detik</option>
              <option value="0">Nonaktifkan pembaruan otomatis</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <span className="font-bold text-[13.5px] text-gray-900 block">
                Peringatan Latensi Database Tinggi
              </span>
              <span className="text-[12px] text-gray-400">
                Munculkan tanda waspada jika respon database melebihi 1000ms
              </span>
            </div>
            <input
              type="checkbox"
              checked={alertHighLatency}
              onChange={(e) => setAlertHighLatency(e.target.checked)}
              className="w-4 h-4 accent-[#356E3B] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="font-bold text-[13.5px] text-gray-900 block">
                Peringatan Akses Tanpa Izin
              </span>
              <span className="text-[12px] text-gray-400">
                Catat ke log audit setiap upaya masuk Google di luar daftar izin
              </span>
            </div>
            <input
              type="checkbox"
              checked={alertFailedAuth}
              onChange={(e) => setAlertFailedAuth(e.target.checked)}
              className="w-4 h-4 accent-[#356E3B] cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-[#1E3F2B] text-white text-[13px] font-bold hover:bg-[#356E3B] transition-colors cursor-pointer shadow-2xs"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col gap-4">
        <h3 className="font-extrabold text-[16px] text-red-700 leading-tight">
          Tindakan Sesi & Keamanan
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <span className="font-bold text-[13px] text-gray-900 block">
              Bersihkan Cache Sesi
            </span>
            <span className="text-[11.5px] text-gray-500">
              Menghapus memori cache sementara dasbor pada peramban ini
            </span>
          </div>
          <button
            onClick={handleClearCache}
            className="px-4 py-2 rounded-[14px] border border-gray-200 text-gray-700 hover:bg-gray-50 text-[12.5px] font-bold transition-colors cursor-pointer"
          >
            Bersihkan Cache
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div>
            <span className="font-bold text-[13px] text-red-700 block">
              Keluar dari Platform Admin
            </span>
            <span className="text-[11.5px] text-gray-500">
              Mengakhiri sesi autentikasi Pemilik Platform pada perangkat ini
            </span>
          </div>
          <button
            onClick={() => {
              if (confirm("Keluar dari Platform Admin?")) logoutPlatformAdmin();
            }}
            className="px-4 py-2 rounded-[14px] bg-red-600 text-white hover:bg-red-700 text-[12.5px] font-bold transition-colors cursor-pointer"
          >
            Keluar Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
