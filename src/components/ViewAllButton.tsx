"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

interface ViewAllButtonProps {
  onClick?: () => void;
  title?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Komponen tombol "Lihat Semua" terstandarisasi untuk seluruh halaman AbsenIN.
 * Menjamin konsistensi teks ("Lihat Semua"), ukuran font (12px), warna forest (#356E3B),
 * font weight (semibold), icon panah (ChevronRight), alignment, dan hover effect.
 */
export function ViewAllButton({
  onClick,
  title = "Lihat Semua",
  className = "",
  disabled = false
}: ViewAllButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-[#356E3B] text-[12px] font-semibold flex items-center gap-1 hover:underline active:opacity-75 transition-all cursor-pointer group shrink-0 select-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <span>{title}</span>
      <ChevronRight 
        className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" 
        strokeWidth={2.5} 
      />
    </button>
  );
}
