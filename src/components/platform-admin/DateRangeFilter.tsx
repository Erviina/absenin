"use client";

import { Calendar } from "lucide-react";

export type PeriodType = "7d" | "30d" | "90d" | "all";

interface DateRangeFilterProps {
  selectedPeriod: PeriodType;
  onChange: (period: PeriodType) => void;
  isLoading?: boolean;
}

const PERIODS: { label: string; value: PeriodType }[] = [
  { label: "7 Hari Terakhir", value: "7d" },
  { label: "30 Hari Terakhir", value: "30d" },
  { label: "90 Hari Terakhir", value: "90d" },
  { label: "Semua Waktu", value: "all" },
];

export function DateRangeFilter({
  selectedPeriod,
  onChange,
  isLoading = false,
}: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[#EEF5F0] border border-[#DCE9DF] rounded-[16px] shadow-2xs shrink-0">
      <div className="items-center gap-1 pl-2.5 pr-1 text-[#356E3B] hidden md:flex shrink-0">
        <Calendar className="w-3.5 h-3.5" />
        <span className="text-[11px] font-bold">Periode:</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        {PERIODS.map((p) => {
          const isActive = selectedPeriod === p.value;
          return (
            <button
              key={p.value}
              type="button"
              disabled={isLoading}
              onClick={() => onChange(p.value)}
              className={`px-3 py-1.5 rounded-[12px] text-[11.5px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isActive
                  ? "bg-white text-[#1E4738] shadow-xs"
                  : "text-[#5C786C] hover:text-[#1E4738] hover:bg-white/50"
              } ${isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
