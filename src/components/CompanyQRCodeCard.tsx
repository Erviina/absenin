"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Building2, Copy, Check, ScanLine, QrCode } from "lucide-react";

export interface CompanyQRCodeCardProps {
  /** Nilai URL yang di-encode ke dalam QR code */
  qrUrl: string;
  /** Kode unik bergabung perusahaan (6 digit/huruf) */
  joinCode?: string | null;
  /** Nama perusahaan */
  companyName?: string | null;
  /** ID elemen SVG (penting untuk fitur download PNG) */
  id?: string;
  /** Ukuran QR code dalam pixel (default: 190) */
  size?: number;
  /** Apakah menampilkan kotak kode bergabung dan tombol salin di bawah QR (default: false) */
  showJoinCodeBox?: boolean;
  /** Callback opsional saat tombol salin ditekan */
  onCopy?: () => void;
  /** State eksternal untuk status copy */
  isCopied?: boolean;
  /** Teks instruksi opsional di bawah QR */
  instructionText?: string;
  /** ClassName tambahan untuk container luar */
  className?: string;
}

/**
 * Komponen terpadu untuk menampilkan QR Code Perusahaan pada AbsenIN.
 * Memastikan QR code menjadi fokus utama dengan kontras tinggi,
 * padding quiet-zone yang aman untuk pemindaian kamera, serta
 * border hijau khas AbsenIN.
 */
export function CompanyQRCodeCard({
  qrUrl,
  joinCode,
  companyName,
  id,
  size = 190,
  showJoinCodeBox = false,
  onCopy,
  isCopied: externalIsCopied,
  instructionText = "Arahkan kamera ke kode QR untuk bergabung",
  className = "",
}: CompanyQRCodeCardProps) {
  const [internalCopied, setInternalCopied] = useState(false);
  const isCopied = externalIsCopied !== undefined ? externalIsCopied : internalCopied;

  const handleCopy = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      setInternalCopied(true);
      setTimeout(() => setInternalCopied(false), 2000);
    }
    if (onCopy) {
      onCopy();
    }
  };

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* Outer Card with AbsenIN Theme */}
      <div className="w-full bg-[#f8faf9] border border-[#dcebe0] rounded-[26px] p-5 sm:p-6 flex flex-col items-center shadow-[0_8px_30px_rgba(53,110,59,0.06)] relative overflow-hidden">
        
        {/* Soft Background Glow Accent */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-[#356E3B]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-[#356E3B]/5 rounded-full blur-2xl pointer-events-none" />

        {/* HERO QR Code Frame */}
        <div className="relative group">
          {/* Subtle Decorative Corner Accents */}
          <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#356E3B] rounded-tl-lg pointer-events-none z-10" />
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#356E3B] rounded-tr-lg pointer-events-none z-10" />
          <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#356E3B] rounded-bl-lg pointer-events-none z-10" />
          <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#356E3B] rounded-br-lg pointer-events-none z-10" />

          {/* White High-Contrast Box with Quiet Zone */}
          <div className="bg-white p-4 sm:p-5 rounded-[22px] border-2 border-[#356E3B]/25 shadow-[0_8px_24px_rgba(53,110,59,0.1)] flex items-center justify-center transition-all duration-200 group-hover:border-[#356E3B]/45 group-hover:shadow-[0_12px_28px_rgba(53,110,59,0.15)]">
            {qrUrl ? (
              <QRCodeSVG
                id={id}
                value={qrUrl}
                size={size}
                level="M"
                marginSize={1}
                bgColor="#FFFFFF"
                fgColor="#111827"
                className="w-auto h-auto max-w-full"
              />
            ) : (
              <div 
                style={{ width: size, height: size }} 
                className="flex flex-col items-center justify-center text-gray-400 gap-2"
              >
                <QrCode className="w-16 h-16 text-[#356E3B]/60" strokeWidth={1.2} />
                <span className="text-[12px] font-medium text-gray-400">Kode belum tersedia</span>
              </div>
            )}
          </div>
        </div>

        {/* Company Name Badge */}
        {companyName && (
          <div className="mt-4 flex items-center gap-1.5 bg-[#E8F3EB] border border-[#C5DEC9] px-3.5 py-1.5 rounded-full shadow-sm max-w-[260px]">
            <Building2 className="w-3.5 h-3.5 text-[#356E3B] shrink-0" />
            <span className="text-[#356E3B] text-[12px] font-bold tracking-wide truncate">
              {companyName}
            </span>
          </div>
        )}

        {/* Scan Guidance Text */}
        {instructionText && (
          <p className="mt-2.5 text-[12px] text-[#6B7280] font-medium text-center flex items-center justify-center gap-1.5 leading-snug px-2">
            <ScanLine className="w-3.5 h-3.5 text-[#356E3B] shrink-0" />
            <span>{instructionText}</span>
          </p>
        )}

        {/* Optional Integrated Join Code Box */}
        {showJoinCodeBox && (
          <div className="w-full mt-5 pt-4 border-t border-[#e2ece5] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6B7280] font-bold uppercase tracking-wider">
                Kode Bergabung Manual
              </span>
              <span className="text-[11px] text-[#356E3B] font-semibold">
                6 Karakter
              </span>
            </div>

            <div className="w-full flex items-center justify-between bg-white border border-[#D1E5D5] rounded-[14px] p-2 pl-3.5 shadow-sm transition-colors focus-within:border-[#356E3B]">
              <span className="text-[#111827] font-mono text-[16px] font-extrabold tracking-widest">
                {joinCode || "------"}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!joinCode}
                className="bg-[#356E3B] hover:bg-[#2A582F] text-white text-[12px] font-bold px-4 py-2 rounded-[10px] transition-all active:scale-95 flex items-center gap-1.5 shadow-sm shadow-[#356E3B]/20 disabled:opacity-50"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
