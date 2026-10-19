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
