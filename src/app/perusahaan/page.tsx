"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ProfilPerusahaanContent = dynamic(
  () => import("./page-content"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7fbf8]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
          <span className="text-[14px] font-medium text-[#5C786C]">Memuat profil perusahaan...</span>
        </div>
      </div>
    ),
  }
);

export default function ProfilPerusahaanPage() {
  return <ProfilPerusahaanContent />;
}
