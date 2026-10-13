export interface CompanyScheduleData {
  work_start_time?: string | null;
  work_end_time?: string | null;
  work_days?: string[] | null;
  server_time?: string | null;
}

export interface NextCheckInSchedule {
  date: Date;
  dayName: string;
  dateFormatted: string;
  dateWithDayFormatted: string;
  openTimeFormatted: string;
  startTimeFormatted: string;
  isToday: boolean;
  isTomorrow: boolean;
  description: string;
}

export interface ScheduleEvaluation {
  isWorkDay: boolean;
  isCheckInOpen: boolean;
  isEarlyCheckout: boolean;
  openTimeFormatted: string; // e.g. "07:45"
  startTimeFormatted: string; // e.g. "08:00"
  endTimeFormatted: string; // e.g. "17:00"
  currentDayName: string; // e.g. "Senin"
  reason?: string;
  nextCheckInSchedule?: NextCheckInSchedule;
}

export const DAY_MAP_EN_TO_ID: Record<string, string> = {
  Monday: "Senin",
  Tuesday: "Selasa",
  Wednesday: "Rabu",
  Thursday: "Kamis",
  Friday: "Jumat",
  Saturday: "Sabtu",
  Sunday: "Minggu"
};

export const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
] as const;

/**
 * Mem-parsing string server_time secara aman ke epoch timestamp (ms).
 * Mendukung format ISO dengan offset (+07:00, Z) maupun string tanpa offset (diasumsikan Asia/Jakarta).
 */
export function parseServerTime(serverTimeStr?: string | null): number | null {
  if (!serverTimeStr) return null;
  const trimmed = serverTimeStr.trim();
  if (!trimmed) return null;

  // Cek apakah string sudah memiliki penanda timezone (Z atau +HH:mm atau -HH:mm)
  const hasTimezoneOffset = /(Z|[+-]\d{2}(:?\d{2})?)$/i.test(trimmed);
  const normalizedStr = hasTimezoneOffset ? trimmed : `${trimmed}+07:00`;

  const parsed = new Date(normalizedStr).getTime();
  return isNaN(parsed) ? null : parsed;
}

/**
 * Menghitung selisih clock skew antara server dan klien dalam ms.
 */
export function calculateServerOffsetMs(
  serverTimeStr?: string | null,
  clientNowMs: number = Date.now()
): number {
  const serverMs = parseServerTime(serverTimeStr);
  if (serverMs === null) return 0;
  return serverMs - clientNowMs;
}

export interface JakartaParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  currentDayName: string;
  totalMinutes: number;
}

/**
 * Mengekstrak komponen kalender & jam di zona waktu Asia/Jakarta dari sebuah Date.
 */
export function getJakartaParts(date: Date): JakartaParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
    weekday: "long"
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) partMap[p.type] = p.value;

  const weekdayEnglish = partMap.weekday;
  const currentDayName = DAY_MAP_EN_TO_ID[weekdayEnglish] || "Senin";
  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  const hour = parseInt(partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);
  const second = parseInt(partMap.second, 10);
  const totalMinutes = hour * 60 + minute;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    currentDayName,
    totalMinutes
  };
}

/**
 * Menentukan jadwal pembukaan check-in berikutnya berdasarkan work_days dan work_start_time.
 * Membuka 15 menit sebelum work_start_time pada hari operasional.
 */
export function getNextCheckInSchedule(
  schedule?: CompanyScheduleData | null,
  clientServerOffsetMs: number = 0,
  options?: { afterCheckout?: boolean; referenceDate?: Date | null }
): NextCheckInSchedule {
  const refDate = options?.referenceDate || new Date(Date.now() + clientServerOffsetMs);
  const afterCheckout = !!options?.afterCheckout;

  const rawStartTime = schedule?.work_start_time || "08:00";
  const [startHourRaw, startMinRaw] = rawStartTime.split(":").map(Number);
  const startHour = isNaN(startHourRaw) ? 8 : startHourRaw;
  const startMin = isNaN(startMinRaw) ? 0 : startMinRaw;
  const startTotalMinutes = startHour * 60 + startMin;
  const openTotalMinutes = Math.max(0, startTotalMinutes - 15);
  const openHour = Math.floor(openTotalMinutes / 60);
  const openMinute = openTotalMinutes % 60;
  const openTimeFormatted = `${String(openHour).padStart(2, '0')}:${String(openMinute).padStart(2, '0')}`;
  const startTimeFormatted = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

  const workDays = schedule?.work_days;
  const hasCustomWorkDays = Array.isArray(workDays) && workDays.length > 0;
  const isWorkDay = (dayName: string) => (hasCustomWorkDays ? workDays.includes(dayName) : true);

  const jktParts = getJakartaParts(refDate);

  // Jika belum checkout, hari ini adalah hari kerja, dan jam buka belum lewat:
  // Jendela check-in berikutnya adalah hari ini.
  if (!afterCheckout && isWorkDay(jktParts.currentDayName) && jktParts.totalMinutes < openTotalMinutes) {
    const todayTargetEpoch = new Date(Date.UTC(jktParts.year, jktParts.month - 1, jktParts.day, openHour - 7, openMinute, 0));
    const monthName = MONTH_NAMES_ID[jktParts.month - 1];
    const dateFormatted = `${jktParts.day} ${monthName} ${jktParts.year}`;
    const dateWithDayFormatted = `${jktParts.currentDayName}, ${dateFormatted}`;

    return {
      date: todayTargetEpoch,
      dayName: jktParts.currentDayName,
      dateFormatted,
      dateWithDayFormatted,
      openTimeFormatted,
      startTimeFormatted,
      isToday: true,
      isTomorrow: false,
      description: `Hari ini (${jktParts.currentDayName}) pukul ${openTimeFormatted} WIB`
    };
  }

  // Jika sudah checkout hari ini, hari ini bukan hari kerja, atau jam buka hari ini sudah lewat:
  // Cari hari kerja berikutnya (offset 1 sampai 14 hari ke depan).
  for (let offset = 1; offset <= 14; offset++) {
    const candidateUtc = new Date(Date.UTC(jktParts.year, jktParts.month - 1, jktParts.day + offset, 12, 0, 0));
    const candParts = getJakartaParts(candidateUtc);
    const candDayName = candParts.currentDayName;

    if (isWorkDay(candDayName)) {
      const nextTargetEpoch = new Date(Date.UTC(candParts.year, candParts.month - 1, candParts.day, openHour - 7, openMinute, 0));
      const monthName = MONTH_NAMES_ID[candParts.month - 1];
      const dateFormatted = `${candParts.day} ${monthName} ${candParts.year}`;
      const dateWithDayFormatted = `${candDayName}, ${dateFormatted}`;
      const isTomorrow = offset === 1;

      return {
        date: nextTargetEpoch,
        dayName: candDayName,
        dateFormatted,
        dateWithDayFormatted,
        openTimeFormatted,
        startTimeFormatted,
        isToday: false,
        isTomorrow,
        description: `${isTomorrow ? 'Besok' : candDayName} (${dateFormatted}) pukul ${openTimeFormatted} WIB`
      };
    }
  }

  // Fallback
  return {
    date: new Date(refDate.getTime() + 86400000),
    dayName: "Senin",
    dateFormatted: "-",
    dateWithDayFormatted: "-",
    openTimeFormatted,
    startTimeFormatted,
    isToday: false,
    isTomorrow: false,
    description: `Pukul ${openTimeFormatted} WIB`
  };
}

export function evaluateSchedule(
  schedule?: CompanyScheduleData | null,
  clientServerOffsetMs: number = 0,
  referenceDateInput?: Date | null
): ScheduleEvaluation {
  const referenceDate = referenceDateInput || new Date(Date.now() + clientServerOffsetMs);
  const jktParts = getJakartaParts(referenceDate);

  // Nilai default jika perusahaan belum memiliki setting khusus (standar proyek 08:00 - 17:00)
  const rawStartTime = schedule?.work_start_time || "08:00";
  const rawEndTime = schedule?.work_end_time || "17:00";
  const workDays = schedule?.work_days;

  const [startHourRaw, startMinRaw] = rawStartTime.split(":").map(Number);
  const [endHourRaw, endMinRaw] = rawEndTime.split(":").map(Number);

  const startHour = isNaN(startHourRaw) ? 8 : startHourRaw;
  const startMin = isNaN(startMinRaw) ? 0 : startMinRaw;
  const endHour = isNaN(endHourRaw) ? 17 : endHourRaw;
  const endMin = isNaN(endMinRaw) ? 0 : endMinRaw;

  const startTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = endHour * 60 + endMin;

  // Check-in dibuka 15 menit sebelum work_start_time
  const openTotalMinutes = Math.max(0, startTotalMinutes - 15);
  const openHour = Math.floor(openTotalMinutes / 60);
  const openMinute = openTotalMinutes % 60;
  const openTimeFormatted = `${String(openHour).padStart(2, '0')}:${String(openMinute).padStart(2, '0')}`;
  const startTimeFormatted = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
  const endTimeFormatted = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

  // Cek work_days
  let isWorkDay = true;
  if (Array.isArray(workDays) && workDays.length > 0) {
    isWorkDay = workDays.includes(jktParts.currentDayName);
  }

  // Cek jam buka check-in
  const isTimeOpen = jktParts.totalMinutes >= openTotalMinutes;
  const isCheckInOpen = isWorkDay && isTimeOpen;

  let reason = "";
  if (!isWorkDay) {
    reason = `Hari ini (${jktParts.currentDayName}) bukan hari kerja perusahaan.`;
  } else if (!isTimeOpen) {
    reason = `Check-in dibuka pukul ${openTimeFormatted} WIB (15 menit sebelum jam masuk ${startTimeFormatted} WIB).`;
  }

  // Check-out sebelum jam pulang
  const isEarlyCheckout = jktParts.totalMinutes < endTotalMinutes;

  const nextCheckInSchedule = getNextCheckInSchedule(schedule, clientServerOffsetMs, {
    afterCheckout: false,
    referenceDate
  });

  return {
    isWorkDay,
    isCheckInOpen,
    isEarlyCheckout,
    openTimeFormatted,
    startTimeFormatted,
    endTimeFormatted,
    currentDayName: jktParts.currentDayName,
    reason,
    nextCheckInSchedule
  };
}
