"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock, ChevronUp, ChevronDown } from "lucide-react";

export interface AgendaDateTimePickerProps {
  value: Date;
  onChange: (newDate: Date) => void;
  isAllDay?: boolean;
  minDate?: Date;
  agendasMap?: Record<string, any[]>;
}

const MONTH_NAMES = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
interface ScrollTimeInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

function ScrollTimeInput({ label, value, min, max, onChange }: ScrollTimeInputProps) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const touchStartY = React.useRef<number | null>(null);
  const touchStartVal = React.useRef<number>(0);

  // Native non-passive wheel event listener to prevent page scrolling on desktop
  React.useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    let accumulatedDelta = 0;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      accumulatedDelta += e.deltaY;
      if (Math.abs(accumulatedDelta) >= 20) {
        const step = accumulatedDelta > 0 ? 1 : -1;
        accumulatedDelta = 0;
        const currentVal = valueRef.current;
        const nextVal = Math.max(min, Math.min(max, currentVal + step));
        onChange(nextVal);
      }
    };

    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [min, max, onChange]);

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartVal.current = valueRef.current;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStartY.current - currentY;
    const step = Math.round(diff / 16);
    const nextVal = Math.max(min, Math.min(max, touchStartVal.current + step));
    if (nextVal !== valueRef.current) {
      onChange(nextVal);
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  return (
    <div
      ref={boxRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex items-center justify-between bg-white border border-[#D1D5DB] hover:border-[#356E3B] focus-within:border-[#356E3B] focus-within:ring-1 focus-within:ring-[#356E3B] rounded-[12px] px-3 py-2 shadow-2xs transition-colors cursor-ns-resize touch-none select-none group"
      title={`Gulir mouse atau geser ke atas/bawah untuk mengubah ${label}`}
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-[11px] font-semibold text-gray-400 select-none">
          {label}:
        </span>
        <span className="text-[15px] font-bold text-gray-900 font-mono select-none tracking-wide">
          {String(value).padStart(2, "0")}
        </span>
      </div>

      {/* Subtle chevron indicators on right */}
      <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-[#356E3B] transition-colors -mr-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(Math.min(max, value + 1));
          }}
          className="w-4 h-2.5 flex items-center justify-center hover:text-[#356E3B] cursor-pointer active:scale-90"
          aria-label={`Tambah ${label}`}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(Math.max(min, value - 1));
          }}
          className="w-4 h-2.5 flex items-center justify-center hover:text-[#356E3B] cursor-pointer active:scale-90"
          aria-label={`Kurang ${label}`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AgendaDateTimePicker({
  value,
  onChange,
  isAllDay = false,
  minDate,
  agendasMap
}: AgendaDateTimePickerProps) {
  // Current month displayed in the calendar view
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date();
  });

  // Sync displayed month when external value changes
  useEffect(() => {
    if (value && !isNaN(value.getTime())) {
      setCurrentMonth(new Date(value.getFullYear(), value.getMonth(), 1));
    }
  }, [value]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday = Min

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyPadding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const today = new Date();
  const isTodayDate = (d: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d
    );
  };

  const isSelectedDate = (d: number) => {
    return (
      value.getFullYear() === year &&
      value.getMonth() === month &&
      value.getDate() === d
    );
  };

  const isDayDisabled = (d: number) => {
    if (!minDate) return false;
    const startOfMinDate = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
    const currentDayTime = new Date(year, month, d).getTime();
    return currentDayTime < startOfMinDate;
  };

  const handleSelectDay = (day: number) => {
    const updated = new Date(
      year,
      month,
      day,
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds()
    );
    onChange(updated);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    const updated = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds()
    );
    onChange(updated);
  };
  const handleHourChange = (newHour: number) => {
    const updated = new Date(value);
    updated.setHours(newHour);
    onChange(updated);
  };

  const handleMinuteChange = (newMinute: number) => {
    const updated = new Date(value);
    updated.setMinutes(newMinute);
    onChange(updated);
  };

  return (
    <div 
      className="bg-[#FBFCFB] border border-[#E5EBE7] rounded-[20px] p-4 my-2 shadow-xs flex flex-col gap-3.5 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header Kalender: Bulan, Tahun & Navigasi */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
          aria-label="Bulan Sebelumnya"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
        </button>

        <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[#111827] uppercase tracking-wider text-center">
          {MONTH_NAMES[month]} {year}
        </h3>

        <button
          type="button"
          onClick={handleNextMonth}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
          aria-label="Bulan Berikutnya"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={2.2} />
        </button>
      </div>

      {/* 2. Nama Hari: Min, Sen, Sel, Rab, Kam, Jum, Sab */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_NAMES.map((dayName) => (
          <div key={dayName} className="text-[11.5px] font-bold text-[#9CA3AF] py-0.5">
            {dayName}
          </div>
        ))}
      </div>

      {/* 3. Grid Tanggal Kalender */}
      <div className="grid grid-cols-7 gap-1">
        {emptyPadding.map((_, idx) => (
          <div key={`empty-${idx}`} className="h-9 sm:h-10" />
        ))}

        {days.map((day) => {
          const isSelected = isSelectedDate(day);
          const isToday = isTodayDate(day);
          const disabled = isDayDisabled(day);

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasAgenda = Boolean(agendasMap && agendasMap[dateStr]?.length > 0);

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => handleSelectDay(day)}
              className={`
                h-9 sm:h-10 rounded-full flex flex-col items-center justify-center relative text-[13px] sm:text-[14px] transition-all cursor-pointer
                ${disabled 
                  ? "text-gray-300 cursor-not-allowed opacity-50" 
                  : isSelected
                    ? "bg-[#2D5A3F] text-white font-bold shadow-xs active:scale-95"
                    : isToday
                      ? "bg-[#E8F3EB] text-[#2D5A3F] font-bold border border-[#C5DEC9] hover:bg-[#d9ece0] active:scale-95"
                      : "text-gray-700 hover:bg-gray-100 font-medium active:scale-95"
                }
              `}
            >
              <span>{day}</span>
              {hasAgenda && (
                <span 
                  className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                    isSelected ? "bg-white" : "bg-[#356E3B]"
                  }`} 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Action: Tombol "Hari Ini" */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-[12px]">
        <button
          type="button"
          onClick={handleSelectToday}
          className="text-[#356E3B] hover:text-[#2A582F] font-bold hover:underline py-1 px-1 cursor-pointer"
        >
          Pilih Hari Ini
        </button>
        <span className="text-gray-400 font-medium">
          {value.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      {/* 4. Pemilihan Waktu (Jam & Menit) — Hanya jika BUKAN Seharian */}
      {!isAllDay && (
        <div className="pt-3 border-t border-gray-200/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#356E3B]" strokeWidth={2.5} />
              Waktu (Jam & Menit)
            </span>
            <span className="text-[11px] font-bold text-[#356E3B] bg-[#E8F3EB] px-2 py-0.5 rounded-full">
              WIB (UTC+7)
            </span>
          </div>

          {/* Dua Field Horizontal Jam & Menit dengan Scroll Langsung */}
          <div className="flex items-center gap-2">
            {/* Field Jam */}
            <ScrollTimeInput
              label="Jam"
              value={value.getHours()}
              min={0}
              max={23}
              onChange={handleHourChange}
            />

            <span className="text-[18px] font-bold text-gray-400 font-mono select-none">:</span>

            {/* Field Menit */}
            <ScrollTimeInput
              label="Menit"
              value={value.getMinutes()}
              min={0}
              max={59}
              onChange={handleMinuteChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Export as DateTimeRollerPicker for backward compatibility
export const DateTimeRollerPicker = AgendaDateTimePicker;
