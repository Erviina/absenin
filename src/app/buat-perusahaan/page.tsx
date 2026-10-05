"use client";

import { ChevronLeft, Check, QrCode, Copy, Share, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { CustomSelect } from "@/components/CustomSelect";

export default function BuatPerusahaanPage() {
  const router = useRouter();

  const [jenis, setJenis] = useState("Perusahaan");
  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const maxAlamat = 300;

  const handleLanjutkan = async () => {
    // Basic validation
    if (!nama || !alamat) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        alert("Sesi telah habis, silakan login kembali.");
        setIsLoading(false);
        return;
      }

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: nama, address: alamat }),
      });

      const data = await res.json();
      if (data.success) {
        setJoinCode(data.data.join_code);
        setIsSuccess(true);
      } else {
        alert(data.message || "Gagal membuat perusahaan");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan jaringan");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#f7fbf8] px-6 py-10 relative items-center justify-center">
        
        {/* Success Icon */}
        <div className="w-[84px] h-[84px] bg-[#356E3B] rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(53,110,59,0.3)] mb-8">
          <Check className="w-10 h-10 text-white" strokeWidth={3} />
        </div>

        {/* Text Content */}
        <div className="text-center flex flex-col gap-2.5 mb-10 w-full max-w-sm">
          <h1 className="text-[22px] font-bold text-[#1E293B] leading-tight">
            Perusahaan Berhasil Dibuat!
          </h1>
          <h2 className="text-[#356E3B] font-bold text-[15px]">
            {nama}
          </h2>
          <p className="text-[#64748B] text-[13px] px-4 leading-relaxed">
            Anda telah menjadi pengelola pertama dari perusahaan ini.
          </p>
        </div>

        {/* QR Code Card */}
        <div className="bg-white rounded-[24px] p-6 w-full max-w-[320px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#eef5f0] flex items-center gap-5 mb-8">
          <div className="w-[80px] h-[80px] bg-[#f8faf9] rounded-[16px] flex items-center justify-center border border-gray-100 shrink-0">
            <QrCode className="w-12 h-12 text-[#1E293B]" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col justify-center gap-1 flex-1">
            <p className="text-[#64748B] text-[12px] font-medium">Kode Bergabung</p>
            <div className="flex items-center justify-between">
              <span className="text-[#1E293B] text-[24px] font-bold tracking-wider">{joinCode || "ABC123"}</span>
              <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full max-w-[320px] gap-3 mb-16">
          <button className="flex-1 bg-white border border-[#356E3B] text-[#356E3B] py-3.5 rounded-full text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[#f4f9f6] transition-colors">
            <Share className="w-4 h-4" />
            Bagikan Undangan
          </button>
          <button className="flex-1 bg-[#356E3B] text-white py-3.5 rounded-full text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[#2b5930] shadow-[0_4px_12px_rgba(53,110,59,0.2)] transition-colors">
            <ImageIcon className="w-4 h-4" />
            Simpan QR
          </button>
        </div>

        {/* Bottom Button */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-center">
          <button 
            onClick={() => router.push("/admin/dashboard")}
            className="w-full max-w-md bg-[#356E3B] hover:bg-[#2b5930] text-white py-4 rounded-full text-[15px] font-bold transition-all shadow-[0_4px_16px_rgba(53,110,59,0.2)] active:scale-[0.98]"
          >
            Mulai ke Beranda
          </button>
        </div>

      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f7fbf8] relative">
      
      {/* Header */}
      <TopBar title="Buat Perusahaan" />

      {/* Main Content */}
      <div className="flex-1 px-5 py-5 pb-32">
        <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-[#eef5f0] flex flex-col gap-5">
          
          {/* Jenis */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#334155] text-[13px] font-bold">
              Jenis <span className="text-[#e11d48]">*</span>
            </label>
            <div className="relative">
              <CustomSelect
                value={jenis}
                onChange={setJenis}
                options={[
                  { value: "Perusahaan", label: "Perusahaan" },
                  { value: "Organisasi", label: "Organisasi" },
                  { value: "Komunitas", label: "Komunitas" }
                ]}
              />
            </div>
          </div>

          {/* Nama Perusahaan */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#334155] text-[13px] font-bold">
              Nama Perusahaan <span className="text-[#e11d48]">*</span>
            </label>
            <input 
              type="text" 
              placeholder="Perusahaan"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full border border-gray-200 rounded-[12px] px-4 py-3 text-[14px] text-[#334155] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors"
            />
          </div>

          {/* Alamat */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-end">
              <label className="text-[#334155] text-[13px] font-bold">
                Alamat <span className="text-[#e11d48]">*</span>
              </label>
              <span className="text-[11px] font-medium text-gray-400">
                {alamat.length}/{maxAlamat}
              </span>
            </div>
            <textarea 
              placeholder="Informasi terkait alamat......"
              value={alamat}
              maxLength={maxAlamat}
              onChange={(e) => setAlamat(e.target.value)}
              className="w-full border border-gray-200 rounded-[12px] px-4 py-3 text-[14px] text-[#334155] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors resize-none h-[120px]"
            />
          </div>

        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#f7fbf8] via-[#f7fbf8] to-transparent z-10 pointer-events-none">
        <button 
          onClick={handleLanjutkan}
          disabled={!nama || !alamat || isLoading}
          className={`w-full max-w-md mx-auto pointer-events-auto py-4 rounded-[20px] text-[15px] font-bold flex items-center justify-center transition-all shadow-[0_4px_16px_rgba(53,110,59,0.2)] ${nama && alamat && !isLoading ? 'bg-[#356E3B] hover:bg-[#2b5930] text-white active:scale-[0.98]' : 'bg-gray-300 text-gray-100 shadow-none'}`}
        >
          {isLoading ? "Memproses..." : "Lanjutkan"}
        </button>
      </div>

    </div>
  );
}
