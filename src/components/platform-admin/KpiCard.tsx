"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: "emerald" | "blue" | "amber" | "purple" | "rose";
  iconBgColor?: string;
  iconColor?: string;
}

export function KpiCard({
  title,
  value,
  subValue,
  icon: Icon,
  badge,
  badgeColor = "emerald",
  iconBgColor = "bg-[#EEF5F0]",
  iconColor = "text-[#1E4738]",
}: KpiCardProps) {
  const badgeClasses = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    blue: "bg-blue-50 text-blue-700 border-blue-200/60",
    amber: "bg-amber-50 text-amber-700 border-amber-200/60",
    purple: "bg-purple-50 text-purple-700 border-purple-200/60",
    rose: "bg-rose-50 text-rose-700 border-rose-200/60",
  }[badgeColor];

  return (
    <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-[#356E3B]/40 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-[12.5px] font-semibold text-[#6B7280] leading-snug">
          {title}
        </span>
        <div
          className={`w-10 h-10 rounded-[14px] ${iconBgColor} ${iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
        >
          <Icon className="w-5 h-5" strokeWidth={2.2} />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-[26px] sm:text-[28px] font-black text-[#111827] tracking-tight leading-none">
          {value}
        </span>
      </div>

      {(badge || subValue) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
          {badge && (
            <span
              className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${badgeClasses}`}
            >
              {badge}
            </span>
          )}
          {subValue && (
            <span className="text-[11.5px] text-[#6B7280] font-medium truncate">
              {subValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
