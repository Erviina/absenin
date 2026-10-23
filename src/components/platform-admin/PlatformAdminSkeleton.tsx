"use client";

import React from "react";

/**
 * Skeleton UI for Platform Admin mirroring exact desktop layouts
 * Prevents layout shift, flicker, and replaces spinner loaders.
 */

export function PlatformAdminHeaderSkeleton() {
  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E8F0EA] px-4 sm:px-6 py-3.5 transition-all flex items-center justify-between">
      <div className="flex flex-col gap-2 min-w-0">
        <div className="w-48 h-5 bg-gray-200/80 rounded-full animate-pulse" />
        <div className="w-80 h-3.5 bg-gray-100 rounded-full animate-pulse hidden sm:block" />
      </div>
      <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
    </div>
  );
}

export function PlatformAdminSidebarSkeleton() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-[#1E3F2B] hidden lg:flex flex-col select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-[14px] bg-white/20 animate-pulse shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="w-20 h-4 bg-white/20 rounded-full animate-pulse" />
          <div className="w-14 h-3 bg-white/10 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 p-3.5 space-y-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] bg-white/5 animate-pulse"
          >
            <div className="w-4 h-4 bg-white/20 rounded shrink-0" />
            <div className="w-24 h-3.5 bg-white/20 rounded-full" />
          </div>
        ))}
      </div>

      {/* Footer Profile */}
      <div className="p-3.5 border-t border-white/10 bg-black/15">
        <div className="flex items-center gap-2.5 p-2 rounded-[14px] bg-white/5 border border-white/10">
          <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse shrink-0" />
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="w-24 h-3 bg-white/20 rounded-full animate-pulse" />
            <div className="w-32 h-2.5 bg-white/10 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </aside>
  );
}

export function PlatformAdminOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse select-none">
      {/* Date Filter & Actions Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-56 h-10 bg-gray-200/80 rounded-[16px]" />
        <div className="w-28 h-10 bg-gray-200/80 rounded-[16px]" />
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 h-[140px] flex flex-col justify-between shadow-xs"
          >
            <div className="flex justify-between items-start">
              <div className="w-28 h-4 bg-gray-200 rounded-full" />
              <div className="w-8 h-8 rounded-xl bg-gray-100" />
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded-xl" />
            <div className="w-32 h-4 bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>

      {/* Row 1: Charts & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white border border-[#E8F0EA] rounded-[24px] p-6 h-[380px] flex flex-col justify-between shadow-xs">
          <div className="w-48 h-5 bg-gray-200 rounded-full" />
          <div className="w-full h-56 bg-gray-100/70 rounded-xl" />
        </div>
        <div className="lg:col-span-1 bg-white border border-[#E8F0EA] rounded-[24px] p-6 h-[380px] flex flex-col gap-4 shadow-xs">
          <div className="w-36 h-5 bg-gray-200 rounded-full" />
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className="h-14 bg-gray-100/70 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Row 2: Recent Companies & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 h-[320px] flex flex-col gap-3 shadow-xs">
          <div className="w-40 h-5 bg-gray-200 rounded-full mb-2" />
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="h-10 bg-gray-100/70 rounded-xl" />
          ))}
        </div>
        <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 h-[320px] flex flex-col gap-3 shadow-xs">
          <div className="w-40 h-5 bg-gray-200 rounded-full mb-2" />
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="h-10 bg-gray-100/70 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Full Shell Skeleton rendered during layout authorization verification
 * Completely eliminates layout jump and spinner flash.
 */
export function PlatformAdminShellSkeleton() {
  return (
    <div id="platform-admin-root" className="w-full min-h-screen bg-[#F8FAF9] text-[#111827] flex">
      <PlatformAdminSidebarSkeleton />
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen w-full">
        <PlatformAdminHeaderSkeleton />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <PlatformAdminOverviewSkeleton />
        </main>
      </div>
    </div>
  );
}

/**
 * Skeleton for data table rows (Companies, Users, Audit Logs)
 */
export function PlatformAdminTableRowsSkeleton({
  cols = 6,
  count = 6,
}: {
  cols?: number;
  count?: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, rIdx) => (
        <tr key={`table-skeleton-${rIdx}`} className="animate-pulse">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={`cell-${rIdx}-${cIdx}`} className="py-4 px-4">
              <div
                className={`h-4 bg-gray-200/80 rounded-md ${
                  cIdx === 0
                    ? "w-40"
                    : cIdx === cols - 1
                    ? "w-16 ml-auto"
                    : "w-24 mx-auto"
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Skeleton for Company Detail page (/platform-admin/companies/[id])
 */
export function PlatformAdminCompanyDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse select-none">
      {/* Back button & Title banner */}
      <div className="w-24 h-8 bg-gray-200/80 rounded-[12px]" />
      <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[20px] bg-gray-200" />
          <div className="flex flex-col gap-2">
            <div className="w-48 h-6 bg-gray-200 rounded-full" />
            <div className="w-32 h-4 bg-gray-100 rounded-full" />
          </div>
        </div>
        <div className="w-28 h-8 bg-gray-100 rounded-full" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200/70 pb-2">
        <div className="w-20 h-8 bg-gray-200 rounded-xl" />
        <div className="w-20 h-8 bg-gray-100 rounded-xl" />
        <div className="w-20 h-8 bg-gray-100 rounded-xl" />
        <div className="w-20 h-8 bg-gray-100 rounded-xl" />
      </div>

      {/* Detail Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 h-[260px] flex flex-col justify-between shadow-xs">
          <div className="w-36 h-5 bg-gray-200 rounded-full" />
          <div className="space-y-3">
            <div className="w-full h-4 bg-gray-100 rounded-full" />
            <div className="w-3/4 h-4 bg-gray-100 rounded-full" />
            <div className="w-1/2 h-4 bg-gray-100 rounded-full" />
          </div>
          <div className="w-28 h-4 bg-gray-100 rounded-full" />
        </div>

        <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 h-[260px] flex flex-col justify-between shadow-xs">
          <div className="w-36 h-5 bg-gray-200 rounded-full" />
          <div className="w-full h-36 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for System Health diagnostic page
 */
export function PlatformAdminSystemHealthSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse select-none">
      <div className="flex justify-between items-center">
        <div className="w-48 h-7 bg-gray-200 rounded-full" />
        <div className="w-28 h-9 bg-gray-200 rounded-[14px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 h-[160px] flex flex-col justify-between shadow-xs"
          >
            <div className="w-32 h-4 bg-gray-200 rounded-full" />
            <div className="w-20 h-8 bg-gray-200 rounded-xl" />
            <div className="w-28 h-3 bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 h-[300px] flex flex-col gap-4 shadow-xs">
        <div className="w-40 h-5 bg-gray-200 rounded-full" />
        {[1, 2, 3, 4].map((j) => (
          <div key={j} className="h-10 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
