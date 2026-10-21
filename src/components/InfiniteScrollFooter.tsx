"use client";

import React, { useEffect, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";

export interface InfiniteScrollFooterProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  error?: string | null;
  onRetry?: () => void;
  endMessage?: string;
  loadingMessage?: string;
  isEmpty?: boolean;
  className?: string;
}

export function InfiniteScrollFooter({
  hasMore,
  isLoadingMore,
  onLoadMore,
  error = null,
  onRetry,
  endMessage = "Semua data telah ditampilkan",
  loadingMessage = "Memuat data berikutnya...",
  isEmpty = false,
  className = "",
}: InfiniteScrollFooterProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (!hasMore || isLoadingMore || Boolean(error) || isEmpty) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting) {
          onLoadMoreRef.current();
        }
      },
      {
        root: null,
        rootMargin: "250px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, error, isEmpty]);

  if (isEmpty || (!hasMore && !isLoadingMore && !error && !endMessage)) return null;

  return (
    <div
      className={`w-full py-4 flex flex-col items-center justify-center text-center ${className}`}
      aria-live="polite"
    >
      {/* Loading state indicator */}
      {isLoadingMore && (
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#5C786C] py-2 animate-in fade-in duration-200">
          <Loader2 className="w-4 h-4 animate-spin text-[#356E3B]" />
          <span>{loadingMessage}</span>
        </div>
      )}

      {/* Error state with retry action */}
      {error && !isLoadingMore && (
        <div className="flex flex-col sm:flex-row items-center gap-2 text-[13px] text-amber-900 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl shadow-2xs animate-in fade-in duration-200 max-w-md mx-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[#1E4738] font-semibold underline hover:text-[#356E3B] cursor-pointer ml-auto"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {/* End of list message */}
      {!hasMore && !isLoadingMore && !error && endMessage && (
        <div className="flex items-center gap-2 text-[12px] font-medium text-gray-400 py-3 select-none">
          <span className="w-8 h-[1px] bg-gray-200" />
          <span>{endMessage}</span>
          <span className="w-8 h-[1px] bg-gray-200" />
        </div>
      )}

      {/* Sentinel element to trigger intersection */}
      {hasMore && !isLoadingMore && !error && (
        <div
          ref={sentinelRef}
          className="h-4 w-full pointer-events-none opacity-0"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
