"use client";

import React from "react";
import { Calendar, Clock } from "lucide-react";
import { formatAgendaSchedule } from "@/lib/agendaScheduleUtils";

export interface AgendaScheduleProps {
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  isAllDay?: boolean | null;
  fallbackTime?: string | null;
}

/**
 * Komponen untuk menampilkan jadwal pada Card Agenda (list view)
 */
export function AgendaCardSchedule({
  startTime,
  endTime,
  isAllDay,
  fallbackTime,
}: AgendaScheduleProps) {
  const sched = formatAgendaSchedule(startTime, endTime, isAllDay, fallbackTime);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Tanggal Pelaksanaan */}
      <div className="flex items-center gap-2">
        <Calendar className="w-[14px] h-[14px] text-[#356E3B] shrink-0" strokeWidth={2.2} />
        <span className="text-[#374151] text-[12.5px] font-medium leading-tight">
          {sched.dateDisplay}
        </span>
      </div>

      {/* Waktu Pelaksanaan */}
      <div className="flex items-center gap-2">
        <Clock className="w-[14px] h-[14px] text-[#6B7280] shrink-0" strokeWidth={2.2} />
        <span className="text-[#4B5563] text-[12px] font-medium leading-tight flex items-center gap-1.5 flex-wrap">
          <span>{sched.timeDisplay}</span>
          {sched.isAllDay && (
            <span className="bg-[#E8F3EB] text-[#2D5A3F] text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-[#C5DEC9]">
              Seharian
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * Komponen untuk menampilkan jadwal lengkap pada Modal Detail & Halaman Detail Agenda
 */
export function AgendaDetailSchedule({
  startTime,
  endTime,
  isAllDay,
  fallbackTime,
}: AgendaScheduleProps) {
  const sched = formatAgendaSchedule(startTime, endTime, isAllDay, fallbackTime);

  return (
    <div className="flex flex-col gap-2.5 bg-[#F9FAFB] p-3.5 rounded-[16px] border border-[#E5E7EB]">
      {/* Tanggal Pelaksanaan */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#E8F3EB] flex items-center justify-center text-[#2D5A3F] shrink-0 mt-0.5">
          <Calendar className="w-4 h-4" strokeWidth={2.2} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            Tanggal Pelaksanaan
          </span>
          <span className="text-[14px] font-bold text-[#111827] leading-snug">
            {sched.dateRangeDetail}
          </span>
          {sched.isMultiDay && (
            <span className="text-[11px] text-gray-500 font-medium mt-0.5">
              Mulai: {sched.startDateFormatted} • Selesai: {sched.endDateFormatted}
            </span>
          )}
        </div>
      </div>

      {/* Waktu Pelaksanaan */}
      <div className="flex items-start gap-3 pt-2.5 border-t border-gray-200/60">
        <div className="w-8 h-8 rounded-full bg-[#E8F3EB] flex items-center justify-center text-[#2D5A3F] shrink-0 mt-0.5">
          <Clock className="w-4 h-4" strokeWidth={2.2} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Waktu Pelaksanaan
            </span>
            {sched.isAllDay && (
              <span className="bg-[#E8F3EB] text-[#2D5A3F] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#C5DEC9]">
                Seharian
              </span>
            )}
          </div>
          <span className="text-[14px] font-bold text-[#111827] leading-snug">
            {sched.timeRangeDetail}
          </span>
          {!sched.isAllDay && (
            <span className="text-[11px] text-gray-500 font-medium mt-0.5">
              Jam Mulai: {sched.startTimeFormatted} • Jam Selesai: {sched.endTimeFormatted}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
