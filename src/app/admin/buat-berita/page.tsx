"use client";

import { ChevronLeft, ChevronDown, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";

export default function BuatBeritaPage() {
  const router = useRouter();
  const [content, setContent] = useState("");

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f4f9f6] relative">
      
      {/* Header */}
      <TopBar title="Buat Berita" />

      {/* Main Content */}
      <div className="flex-1 px-5 py-5 flex flex-col z-10 pb-32">
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col gap-5">
          
          {/* Judul Berita */}
          <div className="flex flex-col gap-2">
            <label className="text-[#1E4738] text-[13px] font-bold">
              Judul Berita <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              placeholder="Berita Hari ini"
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors"
            />
          </div>

          {/* Jenis Berita */}
          <div className="flex flex-col gap-2 relative">
            <label className="text-[#1E4738] text-[13px] font-bold">
              Jenis Berita <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-[#1E4738] appearance-none outline-none focus:border-[#356E3B] transition-colors bg-white">
                <option value="pengumuman">Pengumuman</option>
                <option value="berita">Berita</option>
                <option value="artikel">Artikel</option>
              </select>
              <ChevronDown className="w-5 h-5 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Isi Pengumuman */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <label className="text-[#1E4738] text-[13px] font-bold">
                Isi Pengumuman <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-medium text-gray-400">
                {content.length}/300
              </span>
            </div>
            <textarea 
              placeholder="Informasi terkait penguman......"
              maxLength={300}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none focus:border-[#356E3B] transition-colors resize-none h-[120px]"
            ></textarea>
          </div>

          {/* Sampul Berita */}
          <div className="flex flex-col gap-2">
            <label className="text-[#1E4738] text-[13px] font-bold">
              Sampul Berita
            </label>
            <button className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 flex items-center justify-center gap-2 bg-[#fbfdfc] active:bg-gray-50 transition-colors">
              <PlusCircle className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
              <span className="text-[13px] font-medium text-gray-500">Upload file</span>
            </button>
          </div>

        </div>
      </div>

      {/* Sticky Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md p-5 bg-gradient-to-t from-[#f4f9f6] via-[#f4f9f6] to-transparent pb-8 z-20">
        <button className="w-full bg-[#356E3B] hover:bg-[#2b5930] text-white font-bold text-[15px] py-4 rounded-full shadow-[0_4px_12px_rgba(53,110,59,0.2)] transition-all active:scale-[0.98]">
          Unggah Sekarang
        </button>
      </div>

    </div>
  );
}
