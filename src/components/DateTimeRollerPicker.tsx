"use client";

import React, { useRef, useCallback, useMemo } from "react";

interface DateTimeRollerPickerProps {
  value: Date;
  onChange: (newDate: Date) => void;
  isAllDay?: boolean;
}

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

// Sub-component for an individual roller column
interface RollerColumnProps<T> {
  items: T[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  renderLabel: (item: T) => string;
  widthClass?: string;
}

function RollerColumn<T>({
  items,
  selectedIndex,
  onSelectIndex,
  renderLabel,
  widthClass = "flex-1"
}: RollerColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  const safeIndex = Math.max(0, Math.min(items.length - 1, selectedIndex));

  const visibleOffsets = [-2, -1, 0, 1, 2];

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 15) {
      if (safeIndex < items.length - 1) {
        onSelectIndex(safeIndex + 1);
      }
    } else if (e.deltaY < -15) {
      if (safeIndex > 0) {
        onSelectIndex(safeIndex - 1);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = touchStartY.current - e.touches[0].clientY;
    if (Math.abs(diff) > 25) {
      if (diff > 0 && safeIndex < items.length - 1) {
        onSelectIndex(safeIndex + 1);
        touchStartY.current = e.touches[0].clientY;
      } else if (diff < 0 && safeIndex > 0) {
        onSelectIndex(safeIndex - 1);
        touchStartY.current = e.touches[0].clientY;
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`h-[180px] flex flex-col justify-center items-center select-none cursor-pointer relative overflow-hidden py-2 ${widthClass}`}
    >
      <div className="flex flex-col items-center justify-center w-full gap-1.5">
        {visibleOffsets.map((offset) => {
          const itemIndex = safeIndex + offset;
          const item = items[itemIndex];
          const isSelected = offset === 0;

          if (!item) {
            return (
              <div
                key={`empty-${offset}`}
                className="h-8 flex items-center justify-center text-transparent text-[14px]"
              >
                &nbsp;
              </div>
            );
          }

          let opacityClass = "opacity-30 text-[13px] text-gray-400 font-normal";
          if (offset === -1 || offset === 1) {
            opacityClass = "opacity-60 text-[16px] text-gray-500 font-medium";
          } else if (isSelected) {
            opacityClass = "opacity-100 text-[20px] text-gray-950 font-bold scale-105";
          }

          return (
            <div
              key={`${renderLabel(item)}-${offset}`}
              onClick={() => onSelectIndex(itemIndex)}
              className={`h-8 flex items-center justify-center w-full transition-all duration-150 text-center tracking-tight ${opacityClass}`}
            >
              {renderLabel(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DateTimeRollerPicker({
  value,
  onChange,
  isAllDay = false
}: DateTimeRollerPickerProps) {
  // Generate a list of dates: 60 days before and 90 days after current value
  const dateList = useMemo(() => {
    const list: Date[] = [];
    const base = new Date(value);
    base.setHours(0, 0, 0, 0);

    for (let i = -60; i <= 90; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      list.push(d);
    }
    return list;
  }, [value]);

  // Find index of current date in dateList
  const selectedDateIndex = useMemo(() => {
    const valTime = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
    const idx = dateList.findIndex((d) => d.getTime() === valTime);
    return idx >= 0 ? idx : Math.floor(dateList.length / 2);
  }, [dateList, value]);

  // Hours: 0 to 23
  const hoursList = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const selectedHourIndex = value.getHours();

  // Minutes: 0 to 59
  const minutesList = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const selectedMinuteIndex = value.getMinutes();

  const handleSelectDate = useCallback((index: number) => {
    const targetDate = dateList[index];
    if (!targetDate) return;
    const next = new Date(value);
    next.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    onChange(next);
  }, [dateList, value, onChange]);

  const handleSelectHour = useCallback((index: number) => {
    const next = new Date(value);
    next.setHours(index);
    onChange(next);
  }, [value, onChange]);

  const handleSelectMinute = useCallback((index: number) => {
    const next = new Date(value);
    next.setMinutes(index);
    onChange(next);
  }, [value, onChange]);

  return (
    <div className="w-full bg-[#FAFAFA] rounded-[20px] p-2 flex items-center justify-center border border-gray-100 my-2 relative">
      {/* Center highlight indicator line or box */}
      <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-9 bg-white/70 rounded-[12px] pointer-events-none border border-gray-200/50 shadow-xs" />

      {/* Date Column */}
      <RollerColumn<Date>
        items={dateList}
        selectedIndex={selectedDateIndex}
        onSelectIndex={handleSelectDate}
        renderLabel={(d) => `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]}`}
        widthClass={isAllDay ? "w-full" : "flex-[1.3]"}
      />

      {/* Hour & Minute Columns */}
      {!isAllDay && (
        <>
          <RollerColumn<number>
            items={hoursList}
            selectedIndex={selectedHourIndex}
            onSelectIndex={handleSelectHour}
            renderLabel={(h) => String(h).padStart(2, "0")}
            widthClass="flex-1"
          />

          <RollerColumn<number>
            items={minutesList}
            selectedIndex={selectedMinuteIndex}
            onSelectIndex={handleSelectMinute}
            renderLabel={(m) => String(m).padStart(2, "0")}
            widthClass="flex-1"
          />
        </>
      )}
    </div>
  );
}
