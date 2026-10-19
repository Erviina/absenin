import { DAY_NAMES_ID, MONTH_NAMES_ID, formatDateWithDay } from "./dateUtils";

export interface AgendaScheduleInfo {
  // Card Display
  dateDisplay: string;
  timeDisplay: string;
  isAllDay: boolean;
  isSameDay: boolean;
  isMultiDay: boolean;

  // Detail Modal & Page Display
  startDateFormatted: string;
  endDateFormatted: string;
  startTimeFormatted: string;
  endTimeFormatted: string;
  dateRangeDetail: string;
  timeRangeDetail: string;
}

/**
 * Format tanggal dan waktu agenda untuk card dan detail agenda
 * Mendukung agenda biasa, seharian, lintas hari, dan fallback jika data belum lengkap.
 */
export function formatAgendaSchedule(
  startTimeInput?: string | Date | null,
  endTimeInput?: string | Date | null,
  isAllDayInput?: boolean | null,
  fallbackTime?: string | null
): AgendaScheduleInfo {
  const isAllDay = Boolean(isAllDayInput);

  if (!startTimeInput) {
    return {
      dateDisplay: "Tanggal belum ditentukan",
      timeDisplay: fallbackTime || (isAllDay ? "Seharian" : "—"),
      isAllDay,
      isSameDay: true,
      isMultiDay: false,
      startDateFormatted: "—",
      endDateFormatted: "—",
      startTimeFormatted: "—",
      endTimeFormatted: "—",
      dateRangeDetail: "Tanggal belum ditentukan",
      timeRangeDetail: fallbackTime || (isAllDay ? "Seharian" : "—"),
    };
  }

  const start = typeof startTimeInput === "object" ? startTimeInput : new Date(startTimeInput);
  if (isNaN(start.getTime())) {
    return {
      dateDisplay: "Tanggal tidak valid",
      timeDisplay: fallbackTime || (isAllDay ? "Seharian" : "—"),
      isAllDay,
      isSameDay: true,
      isMultiDay: false,
      startDateFormatted: "—",
      endDateFormatted: "—",
      startTimeFormatted: "—",
      endTimeFormatted: "—",
      dateRangeDetail: "Tanggal tidak valid",
      timeRangeDetail: fallbackTime || (isAllDay ? "Seharian" : "—"),
    };
  }

  const end = endTimeInput 
    ? (typeof endTimeInput === "object" ? endTimeInput : new Date(endTimeInput))
    : new Date(start);
  const validEnd = !isNaN(end.getTime()) ? end : new Date(start);

  const isSameDay = 
    start.getFullYear() === validEnd.getFullYear() &&
    start.getMonth() === validEnd.getMonth() &&
    start.getDate() === validEnd.getDate();

  const isMultiDay = !isSameDay;

  // Single Day Formats
  const startDateFormatted = formatDateWithDay(start);
  const endDateFormatted = formatDateWithDay(validEnd);

  const sDay = start.getDate();
  const sDayName = DAY_NAMES_ID[start.getDay()];
  const sMonthShort = MONTH_NAMES_ID[start.getMonth()].slice(0, 3);
  const sMonthFull = MONTH_NAMES_ID[start.getMonth()];
  const sYear = start.getFullYear();

  const eDay = validEnd.getDate();
  const eDayName = DAY_NAMES_ID[validEnd.getDay()];
  const eMonthShort = MONTH_NAMES_ID[validEnd.getMonth()].slice(0, 3);
  const eMonthFull = MONTH_NAMES_ID[validEnd.getMonth()];
  const eYear = validEnd.getFullYear();

  let dateDisplay = "";
  let dateRangeDetail = "";

  if (isSameDay) {
    dateDisplay = startDateFormatted; // "Jumat, 16 Oktober 2026"
    dateRangeDetail = startDateFormatted;
  } else {
    // Multi-day Range
    if (sYear !== eYear) {
      dateDisplay = `${sDay} ${sMonthShort} ${sYear} – ${eDay} ${eMonthShort} ${eYear}`;
      dateRangeDetail = `${sDayName}, ${sDay} ${sMonthFull} ${sYear} – ${eDayName}, ${eDay} ${eMonthFull} ${eYear}`;
    } else if (start.getMonth() !== validEnd.getMonth()) {
      dateDisplay = `${sDay} ${sMonthShort} – ${eDay} ${eMonthShort} ${sYear}`;
      dateRangeDetail = `${sDayName}, ${sDay} ${sMonthFull} – ${eDayName}, ${eDay} ${eMonthFull} ${sYear}`;
    } else {
      dateDisplay = `${sDayName}, ${sDay} ${sMonthShort} – ${eDayName}, ${eDay} ${sMonthShort} ${sYear}`;
      dateRangeDetail = `${sDayName}, ${sDay} ${sMonthFull} – ${eDayName}, ${eDay} ${sMonthFull} ${sYear}`;
    }
  }

  // Time Formats (24 hours in Asia/Jakarta WIB)
  const sHour = String(start.getHours()).padStart(2, "0");
  const sMin = String(start.getMinutes()).padStart(2, "0");
  const eHour = String(validEnd.getHours()).padStart(2, "0");
  const eMin = String(validEnd.getMinutes()).padStart(2, "0");

  const startTimeFormatted = `${sHour}.${sMin} WIB`;
  const endTimeFormatted = `${eHour}.${eMin} WIB`;

  let timeDisplay = "";
  let timeRangeDetail = "";

  if (isAllDay) {
    timeDisplay = "Seharian";
    timeRangeDetail = "Sepanjang hari (Seharian)";
  } else {
    timeDisplay = `${sHour}.${sMin} - ${eHour}.${eMin} WIB`;
    timeRangeDetail = `${sHour}.${sMin} - ${eHour}.${eMin} WIB`;
  }

  return {
    dateDisplay,
    timeDisplay,
    isAllDay,
    isSameDay,
    isMultiDay,
    startDateFormatted,
    endDateFormatted,
    startTimeFormatted,
    endTimeFormatted,
    dateRangeDetail,
    timeRangeDetail,
  };
}
