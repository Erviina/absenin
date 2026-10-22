"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Download, 
  ExternalLink, 
  MapPin, 
  ImageOff, 
  FileText
} from "lucide-react";

export interface PreviewPhotoData {
  url: string;
  title?: string;
  subtitle?: string;
  date?: string;
  time?: string;
  location?: string;
  coords?: string;
}

export interface ImagePreviewModalProps {
  isOpen?: boolean;
  photo: PreviewPhotoData | null;
  onClose: () => void;
}

export default function ImagePreviewModal({
  isOpen = true,
  photo,
  onClose,
}: ImagePreviewModalProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Reset state when photo changes
  useEffect(() => {
    if (photo) {
      setImageError(false);
      setIsDownloading(false);
    }
  }, [photo]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (photo && isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Lock body scroll
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [photo, isOpen, onClose]);

  if (!isOpen || !photo || !photo.url) return null;

  const isPdf = photo.url.toLowerCase().split("?")[0].endsWith(".pdf");

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const fileName = photo.title 
        ? `${photo.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}${isPdf ? ".pdf" : ".jpg"}`
        : (isPdf ? "dokumen.pdf" : "foto.jpg");
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback if CORS prevents fetch
      window.open(photo.url, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-[24px] overflow-hidden flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200 border border-gray-100 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white">
          <div className="flex flex-col min-w-0 pr-3">
            <span className="text-[#111827] text-[15px] font-bold truncate">
              {photo.title || (isPdf ? "Lihat Lampiran Dokumen" : "Lihat Foto")}
            </span>
            {(photo.subtitle || photo.date || photo.time) && (
              <span className="text-gray-500 text-[11px] truncate mt-0.5">
                {photo.subtitle ? photo.subtitle : ""}
                {photo.subtitle && (photo.date || photo.time) ? " • " : ""}
                {photo.date ? photo.date : ""} 
                {photo.time ? ` (${photo.time})` : ""}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-[#E8F3EB] hover:text-[#356E3B] flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              title="Unduh file"
              aria-label="Unduh file"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Close Button (Top Right) */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              aria-label="Tutup Modal"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body - Fit without black borders */}
        <div className="relative bg-white flex flex-col items-center justify-center overflow-hidden">
          {isPdf ? (
            <div className="w-full h-[65vh] flex flex-col bg-gray-50">
              <iframe
                src={photo.url}
                title={photo.title || "Lampiran Dokumen PDF"}
                className="w-full h-full border-0"
              />
              <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2 text-gray-600 truncate">
                  <FileText className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="truncate">Dokumen PDF</span>
                </div>
                <a
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#356E3B] font-bold inline-flex items-center gap-1 hover:underline text-[12px] shrink-0"
                >
                  <span>Buka di Tab Baru</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : imageError ? (
            <div className="p-10 flex flex-col items-center justify-center text-center text-gray-500 bg-gray-50 w-full min-h-[220px]">
              <ImageOff className="w-10 h-10 mb-2 text-gray-400" />
              <span className="text-[13px] font-semibold text-gray-700">Gagal Memuat Foto</span>
              <span className="text-[11px] text-gray-400 mt-1 max-w-xs">
                Tautan foto mungkin telah kedaluwarsa atau tidak dapat diakses saat ini.
              </span>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center bg-white p-0 overflow-hidden">
              <img
                src={photo.url}
                alt={photo.title || "Preview Foto"}
                className="w-full max-h-[72vh] object-contain block mx-auto bg-white"
                onError={() => setImageError(true)}
              />
            </div>
          )}
        </div>

        {/* Modal Footer / Location details (Only shown if location or coords exist) */}
        {(photo.location || photo.coords) && (
          <div className="p-3.5 bg-white border-t border-gray-100 flex flex-col gap-2.5">
            {photo.location && (
              <div className="flex items-start gap-2 text-[12px] text-gray-600 bg-gray-50 p-2.5 rounded-[14px]">
                <MapPin className="w-4 h-4 text-[#356E3B] shrink-0 mt-0.5" />
                <span className="font-medium break-words leading-relaxed text-[12px]">
                  {photo.location}
                </span>
              </div>
            )}

            {photo.coords && (
              <div className="flex items-center justify-between gap-2 text-[11px] px-1">
                <span className="text-gray-400 font-mono">
                  Koordinat: {photo.coords}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${photo.coords}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#356E3B] font-bold hover:underline inline-flex items-center gap-1"
                  title="Buka titik lokasi di Google Maps"
                >
                  <span>Buka Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
