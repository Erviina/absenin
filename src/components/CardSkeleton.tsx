import React from "react";

/**
 * Lightweight, accessible Skeleton Components for AbsenIN Card Lists.
 * Engineered to match exact container dimensions and layout geometries to eliminate Cumulative Layout Shift (CLS).
 */

export function NewsCardSkeleton() {
  return (
    <div className="w-full bg-white rounded-[20px] p-4 flex gap-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* Image Thumbnail Skeleton */}
      <div className="w-[80px] h-[80px] sm:w-[84px] sm:h-[84px] rounded-[16px] bg-gray-100 animate-pulse shrink-0" />
      {/* Content Skeleton */}
      <div className="flex flex-col justify-center flex-1 min-w-0">
        <div className="w-20 h-4 rounded-full bg-gray-100 animate-pulse mb-2" />
        <div className="w-3/4 h-4 rounded-md bg-gray-100 animate-pulse mb-1.5" />
        <div className="w-1/2 h-3 rounded-md bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="w-full bg-white rounded-[20px] p-4 border border-[#eef5f0] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3.5">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Checkbox Placeholder */}
        <div className="w-6 h-6 rounded-lg bg-gray-100 animate-pulse shrink-0" />
        {/* Texts */}
        <div className="flex flex-col min-w-0 flex-1 gap-1.5">
          <div className="w-44 sm:w-60 h-4 rounded-md bg-gray-100 animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="w-16 h-3 rounded bg-gray-100 animate-pulse" />
            <div className="w-12 h-3 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="w-4 h-4 rounded bg-gray-100 animate-pulse shrink-0" />
    </div>
  );
}

export function AgendaCardSkeleton() {
  return (
    <div className="w-full bg-white rounded-[20px] shadow-sm border border-[#E5E7EB] p-5 flex flex-col gap-3 relative overflow-hidden">
      {/* Left accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-200" />
      {/* Badges */}
      <div className="flex items-center gap-2 pl-2">
        <div className="w-16 h-4 rounded-full bg-gray-100 animate-pulse" />
        <div className="w-20 h-4 rounded-full bg-gray-100 animate-pulse" />
      </div>
      {/* Title */}
      <div className="w-2/3 h-5 rounded-md bg-gray-100 animate-pulse pl-2" />
      {/* Meta info */}
      <div className="flex items-center gap-2 pl-2 mt-1">
        <div className="w-28 h-3.5 rounded bg-gray-100 animate-pulse" />
        <div className="w-24 h-3.5 rounded bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

export function AttendanceCardSkeleton() {
  return (
    <div className="bg-white rounded-[20px] p-5 border border-[#E5E7EB] shadow-sm flex flex-col">
      {/* Header Row */}
      <div className="flex justify-between items-center mb-4">
        <div className="w-32 h-4 rounded-md bg-gray-100 animate-pulse" />
        <div className="w-20 h-6 rounded-full bg-gray-100 animate-pulse" />
      </div>

      <div className="h-[1px] w-full bg-[#F3F4F6] mb-4" />

      {/* Clock In / Out Columns */}
      <div className="flex justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="flex flex-col items-start gap-1">
            <div className="w-16 h-3 rounded bg-gray-100 animate-pulse" />
            <div className="w-20 h-5 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>

        <div className="w-[1px] h-10 bg-[#F3F4F6] mx-2" />

        <div className="flex items-start gap-3 flex-1 pl-2">
          <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="flex flex-col items-start gap-1">
            <div className="w-16 h-3 rounded bg-gray-100 animate-pulse" />
            <div className="w-16 h-5 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeaveCardSkeleton() {
  return (
    <div className="bg-white rounded-[20px] shadow-sm border border-[#F3F4F6] p-5 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="w-28 h-4 rounded-md bg-gray-100 animate-pulse" />
          <div className="w-48 h-3 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="w-16 h-5 rounded-full bg-gray-100 animate-pulse shrink-0" />
      </div>

      <div className="h-[1px] w-full bg-[#F3F4F6] my-1" />

      <div className="flex justify-between items-center">
        <div className="w-36 h-3.5 rounded bg-gray-100 animate-pulse" />
        <div className="w-20 h-3.5 rounded bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

export function EmployeeCardSkeleton() {
  return (
    <div className="flex items-center gap-3 border border-gray-100 p-3 rounded-[16px] bg-white">
      <div className="w-[46px] h-[46px] rounded-full bg-gray-100 animate-pulse shrink-0" />
      <div className="flex flex-col flex-1 gap-1.5 overflow-hidden">
        <div className="w-32 h-4 rounded-md bg-gray-100 animate-pulse" />
        <div className="w-40 h-3 rounded bg-gray-100 animate-pulse" />
        <div className="w-16 h-4 rounded-full bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

export function NotificationCardSkeleton() {
  return (
    <div className="border border-[#E5E7EB] bg-white rounded-[20px] p-4 flex gap-4 items-start shadow-sm">
      <div className="w-[46px] h-[46px] rounded-full bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 flex flex-col justify-center gap-2">
        <div className="flex justify-between items-start gap-2">
          <div className="w-36 h-4 rounded-md bg-gray-100 animate-pulse" />
          <div className="w-16 h-3 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="w-full h-3 rounded bg-gray-100 animate-pulse" />
        <div className="w-3/4 h-3 rounded bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

export function AdminReportCardSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-[16px] border border-gray-100 bg-white">
      <div className="w-5 h-5 rounded-[6px] bg-gray-100 animate-pulse shrink-0 mt-2" />
      <div className="flex flex-col flex-1 gap-3">
        <div className="flex items-center justify-between">
          <div className="w-32 h-4 rounded-md bg-gray-100 animate-pulse" />
          <div className="w-20 h-4 rounded-full bg-gray-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-gray-50">
          <div className="h-8 rounded bg-gray-50 animate-pulse" />
          <div className="h-8 rounded bg-gray-50 animate-pulse" />
          <div className="h-8 rounded bg-gray-50 animate-pulse" />
          <div className="h-8 rounded bg-gray-50 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export type SkeletonType =
  | "news"
  | "task"
  | "agenda"
  | "attendance"
  | "leave"
  | "employee"
  | "notification"
  | "admin-report";

interface CardListSkeletonProps {
  count?: number;
  type: SkeletonType;
  className?: string;
}

export function CardListSkeleton({ count = 3, type, className = "flex flex-col gap-3" }: CardListSkeletonProps) {
  const items = Array.from({ length: count });
  return (
    <div className={className} aria-busy="true" aria-label="Memuat daftar...">
      {items.map((_, i) => {
        switch (type) {
          case "news":
            return <NewsCardSkeleton key={`skeleton-news-${i}`} />;
          case "task":
            return <TaskCardSkeleton key={`skeleton-task-${i}`} />;
          case "agenda":
            return <AgendaCardSkeleton key={`skeleton-agenda-${i}`} />;
          case "attendance":
            return <AttendanceCardSkeleton key={`skeleton-attendance-${i}`} />;
          case "leave":
            return <LeaveCardSkeleton key={`skeleton-leave-${i}`} />;
          case "employee":
            return <EmployeeCardSkeleton key={`skeleton-employee-${i}`} />;
          case "notification":
            return <NotificationCardSkeleton key={`skeleton-notif-${i}`} />;
          case "admin-report":
            return <AdminReportCardSkeleton key={`skeleton-report-${i}`} />;
          default:
            return <div key={`skeleton-default-${i}`} className="h-16 rounded-[16px] bg-gray-100 animate-pulse" />;
        }
      })}
    </div>
  );
}

/**
 * Skeleton for user Dashboard page matching exact layout geometries.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative pb-32 animate-in fade-in duration-200">
      {/* Top Header: Profil & Notifikasi */}
      <div className="h-[72px] px-6 flex justify-between items-center bg-[#fbfdfc] shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0 border border-[#eef5f0]" />
          <div className="flex flex-col gap-1.5">
            <div className="w-20 h-3 rounded bg-gray-100 animate-pulse" />
            <div className="w-32 h-4 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0 border border-gray-100" />
      </div>

      {/* Workspace Context Bar */}
      <div className="px-6 pt-1.5 pb-4">
        <div className="w-full bg-white border border-[#DEEAE0] rounded-[22px] py-3.5 px-4 flex items-center justify-between shadow-[0_4px_16px_rgba(30,71,56,0.04)]">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-[14px] bg-gray-100 animate-pulse shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="w-36 h-4 rounded bg-gray-100 animate-pulse" />
              <div className="w-24 h-3 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
          <div className="w-4 h-4 rounded bg-gray-100 animate-pulse shrink-0 ml-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pt-0 flex flex-col gap-6">
        {/* Hero Section */}
        <div className="w-full rounded-[24px] mb-2 bg-[#dce9df]/70 animate-pulse min-h-[164px] p-6 flex flex-col justify-between">
          <div className="flex flex-col gap-2 w-2/3">
            <div className="w-full h-5 rounded bg-white/70 animate-pulse" />
            <div className="w-3/4 h-5 rounded bg-white/70 animate-pulse" />
            <div className="w-1/2 h-3.5 rounded bg-white/70 animate-pulse mt-1" />
          </div>
          <div className="self-end w-36 h-10 rounded-full bg-white/80 animate-pulse" />
        </div>

        {/* Aktivitas Hari Ini */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="w-36 h-5 rounded bg-gray-100 animate-pulse" />
            <div className="w-44 h-7 rounded-full bg-gray-100 animate-pulse" />
          </div>
          <CardListSkeleton count={2} type="task" />
        </div>

        {/* Berita Terbaru */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="w-32 h-5 rounded bg-gray-100 animate-pulse" />
            <div className="w-16 h-4 rounded bg-gray-100 animate-pulse" />
          </div>
          <CardListSkeleton count={2} type="news" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Admin Dashboard page matching exact layout geometries.
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#FAFCF9] relative pb-24 animate-in fade-in duration-200">
      {/* TopBar Placeholder */}
      <div className="h-16 px-6 bg-[#356E3B] flex items-center justify-between shrink-0 shadow-sm">
        <div className="w-6 h-6 rounded bg-white/20 animate-pulse" />
        <div className="w-28 h-5 rounded bg-white/20 animate-pulse" />
        <div className="w-6 h-6 rounded bg-white/20 animate-pulse" />
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-4">
        {/* Company Card Skeleton */}
        <div className="bg-white rounded-[20px] p-4 flex gap-4 items-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0]">
          <div className="w-[52px] h-[52px] rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="flex flex-col flex-1 gap-2">
            <div className="w-40 h-4 rounded bg-gray-100 animate-pulse" />
            <div className="w-28 h-3 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="w-4 h-4 rounded bg-gray-100 animate-pulse shrink-0" />
        </div>

        {/* Kehadiran Hari Ini Skeleton */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="w-48 h-4 rounded bg-gray-100 animate-pulse" />
            <div className="w-16 h-4 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="h-3 w-full bg-gray-100 rounded-full animate-pulse" />
          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="h-4 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex justify-between items-start">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`admin-btn-${i}`} className="flex flex-col items-center gap-2">
              <div className="w-[48px] h-[48px] rounded-[16px] bg-gray-100 animate-pulse" />
              <div className="w-10 h-2.5 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Aktivitas Terbaru Skeleton */}
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex justify-between items-center px-1">
            <div className="w-36 h-4 rounded bg-gray-100 animate-pulse" />
            <div className="w-16 h-4 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="flex gap-2 pb-1">
            <div className="w-20 h-7 rounded-full bg-gray-100 animate-pulse" />
            <div className="w-20 h-7 rounded-full bg-gray-100 animate-pulse" />
            <div className="w-20 h-7 rounded-full bg-gray-100 animate-pulse" />
          </div>
          <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#eef5f0] p-4 flex flex-col gap-3">
            <CardListSkeleton count={3} type="notification" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for user Profile page.
 */
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FBFDFC] animate-in fade-in duration-200">
      <div className="px-6 pt-6 flex flex-col gap-6">
        {/* Profile Header section */}
        <div className="flex items-center gap-5">
          <div className="w-[84px] h-[84px] rounded-full bg-gray-100 animate-pulse shrink-0 border border-gray-100" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="w-40 h-5 rounded bg-gray-100 animate-pulse" />
            <div className="w-24 h-3.5 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>

        {/* Section: Informasi Pribadi */}
        <div className="flex flex-col gap-3">
          <div className="w-36 h-4 rounded bg-gray-100 animate-pulse" />
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#E8F3EB] flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`prof-field-${i}`} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="w-24 h-3 rounded bg-gray-100 animate-pulse" />
                  <div className="w-48 h-4 rounded bg-gray-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Pengaturan Akun */}
        <div className="flex flex-col gap-3">
          <div className="w-32 h-4 rounded bg-gray-100 animate-pulse" />
          <div className="bg-white rounded-[20px] p-4 shadow-sm border border-[#E8F3EB] flex flex-col gap-3">
            <div className="h-12 rounded-xl bg-gray-100 animate-pulse w-full" />
            <div className="h-12 rounded-xl bg-gray-100 animate-pulse w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Company Profile page.
 */
export function CompanyProfileSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FBFDFC] animate-in fade-in duration-200">
      <div className="px-5 py-5 flex flex-col gap-4 pb-24">
        {/* Profile Header */}
        <div className="flex items-center gap-5 pt-1 pb-2">
          <div className="w-[84px] h-[84px] rounded-full bg-gray-100 animate-pulse shrink-0 border border-gray-100" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="w-48 h-5 rounded bg-gray-100 animate-pulse" />
            <div className="w-32 h-3.5 rounded bg-gray-100 animate-pulse" />
            <div className="w-24 h-3.5 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>

        {/* Card 1: Informasi */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#E8F3EB] flex flex-col gap-4">
          <div className="w-36 h-4 rounded bg-gray-100 animate-pulse" />
          <div className="h-16 rounded-xl bg-gray-100 animate-pulse w-full" />
        </div>

        {/* Card 2: Jadwal */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#E8F3EB] flex flex-col gap-4">
          <div className="w-36 h-4 rounded bg-gray-100 animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`workday-${i}`} className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="h-12 rounded-xl bg-gray-100 animate-pulse w-full" />
        </div>

        {/* Card 3: Lokasi Map */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#E8F3EB] flex flex-col gap-4">
          <div className="w-36 h-4 rounded bg-gray-100 animate-pulse" />
          <div className="h-44 rounded-xl bg-gray-100 animate-pulse w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for generic detail pages (agenda, tugas, notifikasi, dll).
 */
export function DetailPageSkeleton() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] animate-in fade-in duration-200">
      <div className="px-6 pt-6 flex flex-col gap-5">
        {/* Top Header Card */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E5E7EB] flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="w-44 h-4 rounded bg-gray-100 animate-pulse" />
            <div className="w-28 h-3 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>

        {/* Body Card */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E5E7EB] flex flex-col gap-4">
          <div className="w-32 h-4 rounded bg-gray-100 animate-pulse" />
          <div className="w-full h-12 rounded-xl bg-gray-100 animate-pulse" />
          <div className="w-full h-24 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
