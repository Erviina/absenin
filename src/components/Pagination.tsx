"use client";

import React, { useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
  isLoading?: boolean;
  label?: string; // e.g. "data", "karyawan", "berita", "pengajuan"
  className?: string;
  hideIfSinglePage?: boolean;
}

export function Pagination({
  total,
  limit,
  offset,
  onPageChange,
  isLoading = false,
  label = "data",
  className = "",
  hideIfSinglePage = false,
}: PaginationProps) {
  const safeTotal = Math.max(0, total);
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit));
  const currentPage = Math.min(Math.floor(offset / safeLimit) + 1, totalPages);

  // Auto-correct offset if current offset is beyond the total count
  useEffect(() => {
    if (safeTotal > 0 && offset >= safeTotal) {
      const correctedOffset = Math.max(0, (totalPages - 1) * safeLimit);
      if (correctedOffset !== offset) {
        onPageChange(correctedOffset);
      }
    }
  }, [safeTotal, offset, totalPages, safeLimit, onPageChange]);

  // Range calculation
  const startRange = safeTotal === 0 ? 0 : Math.min(offset + 1, safeTotal);
  const endRange = safeTotal === 0 ? 0 : Math.min(offset + safeLimit, safeTotal);

  const canPrev = offset > 0 && !isLoading;
  const canNext = offset + safeLimit < safeTotal && !isLoading;

  const handlePrev = () => {
    if (canPrev) {
      onPageChange(Math.max(0, offset - safeLimit));
    }
  };

  const handleNext = () => {
    if (canNext) {
      onPageChange(offset + safeLimit);
    }
  };

  const handlePageClick = (pageNumber: number) => {
    if (isLoading || pageNumber === currentPage) return;
    const targetOffset = (pageNumber - 1) * safeLimit;
    onPageChange(targetOffset);
  };

  // Visible page numbers calculation (smart windowing)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [];
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  if (hideIfSinglePage && totalPages <= 1 && safeTotal <= safeLimit) {
    return null;
  }

  return (
    <div
      className={`w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-1 text-[13px] ${className}`}
      aria-label="Navigasi Halaman"
    >
      {/* Range Info */}
      <div className="text-gray-500 font-medium text-center sm:text-left select-none">
        {safeTotal === 0 ? (
          <span>Tidak ada {label}</span>
        ) : (
          <span>
            Menampilkan <strong className="font-semibold text-[#1E4738]">{startRange}–{endRange}</strong> dari{" "}
            <strong className="font-semibold text-[#1E4738]">{safeTotal}</strong> {label}
          </span>
        )}
      </div>

      {/* Controls & Page Numbers */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Previous Button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canPrev}
          aria-label="Halaman sebelumnya"
          className="h-9 px-2.5 sm:px-3 rounded-[12px] border border-gray-200 bg-white text-[#1E4738] font-medium flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:not-disabled:border-[#356E3B] hover:not-disabled:bg-[#f4f9f6] active:not-disabled:scale-95 shadow-2xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline text-[12px]">Sebelumnya</span>
        </button>

        {/* Numeric Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-9 flex items-center justify-center text-gray-400 select-none text-[12px]"
                >
                  •••
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => handlePageClick(p as number)}
                disabled={isLoading || isCurrent}
                aria-current={isCurrent ? "page" : undefined}
                className={`min-w-8 h-9 px-2 rounded-[12px] text-[12px] font-semibold flex items-center justify-center transition-all ${
                  isCurrent
                    ? "bg-[#356E3B] text-white shadow-xs cursor-default"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-[#356E3B] hover:text-[#356E3B] hover:bg-[#f4f9f6] active:scale-95 shadow-2xs"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext}
          aria-label="Halaman berikutnya"
          className="h-9 px-2.5 sm:px-3 rounded-[12px] border border-gray-200 bg-white text-[#1E4738] font-medium flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:not-disabled:border-[#356E3B] hover:not-disabled:bg-[#f4f9f6] active:not-disabled:scale-95 shadow-2xs"
        >
          <span className="hidden sm:inline text-[12px]">Berikutnya</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
