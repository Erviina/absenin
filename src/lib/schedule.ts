export interface CompanyScheduleData {
  work_start_time?: string | null;
  work_end_time?: string | null;
  work_days?: string[] | null;
  server_time?: string | null;
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
}

export function evaluateSchedule(
  schedule?: CompanyScheduleData | null,
  clientServerOffsetMs: number = 0
): ScheduleEvaluation {
  // Gunakan waktu acuan yang sudah disesuaikan dengan server offset jika ada
  const referenceDate = new Date(Date.now() + clientServerOffsetMs);

  // Format ke timezone Asia/Jakarta
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "long"
  });

  const parts = formatter.formatToParts(referenceDate);
  const partMap: Record<string, string> = {};
  for (const p of parts) partMap[p.type] = p.value;

  const weekdayEnglish = partMap.weekday;
  const dayMap: Record<string, string> = {
    Monday: "Senin",
    Tuesday: "Selasa",
    Wednesday: "Rabu",
    Thursday: "Kamis",
    Friday: "Jumat",
    Saturday: "Sabtu",
    Sunday: "Minggu"
  };
  const currentDayName = dayMap[weekdayEnglish] || "Senin";
  const currentHour = parseInt(partMap.hour, 10);
  const currentMin = parseInt(partMap.minute, 10);
  const currentTotalMinutes = currentHour * 60 + currentMin;

  // Nilai default jika perusahaan belum memiliki setting khusus
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
    isWorkDay = workDays.includes(currentDayName);
  }

  // Cek jam buka check-in
  const isTimeOpen = currentTotalMinutes >= openTotalMinutes;
  const isCheckInOpen = isWorkDay && isTimeOpen;

  let reason = "";
  if (!isWorkDay) {
    reason = `Hari ini (${currentDayName}) bukan hari kerja perusahaan.`;
  } else if (!isTimeOpen) {
    reason = `Check-in dibuka pukul ${openTimeFormatted} WIB (15 menit sebelum jam masuk ${startTimeFormatted} WIB).`;
  }

  // Check-out sebelum jam pulang
  const isEarlyCheckout = currentTotalMinutes < endTotalMinutes;

  return {
    isWorkDay,
    isCheckInOpen,
    isEarlyCheckout,
    openTimeFormatted,
    startTimeFormatted,
    endTimeFormatted,
    currentDayName,
    reason
  };
}
