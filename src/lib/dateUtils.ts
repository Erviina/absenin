export const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export const DAY_NAMES_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

/**
 * Memformat tanggal ke standar Indonesia: "14 November 2005"
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  fallback: string = "—"
): string {
  if (!dateInput) return fallback;
  const d = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return fallback;

  const day = d.getDate();
  const month = MONTH_NAMES_ID[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Memformat tanggal dengan nama hari: "Senin, 14 November 2005"
 */
export function formatDateWithDay(
  dateInput: string | number | Date | null | undefined,
  fallback: string = "—"
): string {
  if (!dateInput) return fallback;
  const d = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return fallback;

  const dayName = DAY_NAMES_ID[d.getDay()];
  const day = d.getDate();
  const month = MONTH_NAMES_ID[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${day} ${month} ${year}`;
}

/**
 * Memformat tanggal dan waktu: "14 November 2005, 08:30 WIB"
 */
export function formatDateTime(
  dateInput: string | number | Date | null | undefined,
  options?: { withZone?: boolean },
  fallback: string = "—"
): string {
  if (!dateInput) return fallback;
  const d = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return fallback;

  const day = d.getDate();
  const month = MONTH_NAMES_ID[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const zone = options?.withZone === false ? "" : " WIB";

  return `${day} ${month} ${year}, ${hours}:${minutes}${zone}`;
}

/**
 * Memformat rentang tanggal:
 * - Sama hari: "14 November 2005"
 * - Bulan & tahun sama: "10 - 14 November 2005"
 * - Tahun sama beda bulan: "28 Oktober - 14 November 2005"
 * - Beda tahun: "28 Desember 2004 - 14 November 2005"
 */
export function formatDateRange(
  startInput: string | number | Date | null | undefined,
  endInput: string | number | Date | null | undefined,
  fallback: string = "—"
): string {
  if (!startInput && !endInput) return fallback;
  if (!startInput) return formatDate(endInput, fallback);
  if (!endInput) return formatDate(startInput, fallback);

  const start = typeof startInput === "object" ? startInput : new Date(startInput);
  const end = typeof endInput === "object" ? endInput : new Date(endInput);
  if (isNaN(start.getTime()) && isNaN(end.getTime())) return fallback;
  if (isNaN(start.getTime())) return formatDate(end, fallback);
  if (isNaN(end.getTime())) return formatDate(start, fallback);

  const sDay = start.getDate();
  const sMonth = MONTH_NAMES_ID[start.getMonth()];
  const sYear = start.getFullYear();

  const eDay = end.getDate();
  const eMonth = MONTH_NAMES_ID[end.getMonth()];
  const eYear = end.getFullYear();

  if (sYear !== eYear) {
    return `${sDay} ${sMonth} ${sYear} - ${eDay} ${eMonth} ${eYear}`;
  }
  if (sMonth !== eMonth) {
    return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${sYear}`;
  }
  if (sDay !== eDay) {
    return `${sDay} - ${eDay} ${sMonth} ${sYear}`;
  }
  return `${sDay} ${sMonth} ${sYear}`;
}

/**
 * Format jam menit: "08:30"
 */
export function formatTime(
  dateInput: string | number | Date | null | undefined,
  fallback: string = "—"
): string {
  if (!dateInput) return fallback;
  const d = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return fallback;

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Mendapatkan representasi tanggal lokal dalam format "YYYY-MM-DD"
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Mengonversi tanggal dan waktu tugas menjadi objek Date lokal yang akurat
 */
export function getTaskDeadline(
  dateStr?: string | null,
  timeStr?: string | null
): Date | null {
  const effectiveDate = dateStr?.trim() || getLocalDateString();
  const dateMatch = effectiveDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!dateMatch) return null;

  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10) - 1;
  const day = parseInt(dateMatch[3], 10);

  let hour = 23;
  let minute = 59;
  if (timeStr?.trim()) {
    const timeMatch = timeStr.trim().match(/^(\d{1,2}):(\d{1,2})/);
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = parseInt(timeMatch[2], 10);
    }
  }

  const d = new Date(year, month, day, hour, minute, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Menentukan apakah tugas sudah melewati batas waktu (deadline)
 */
export function isTaskOverdue(
  dateStr?: string | null,
  timeStr?: string | null,
  completed?: boolean,
  referenceTime: Date = new Date()
): boolean {
  if (completed) return false;
  const deadline = getTaskDeadline(dateStr, timeStr);
  if (!deadline) return false;
  return deadline.getTime() < referenceTime.getTime();
}

/**
 * Menghitung teks durasi keterlambatan tugas secara human-readable
 */
export function getOverdueDelayText(
  dateStr?: string | null,
  timeStr?: string | null,
  referenceTime: Date = new Date()
): string {
  const deadline = getTaskDeadline(dateStr, timeStr);
  if (!deadline) return "";
  const diffMs = referenceTime.getTime() - deadline.getTime();
  if (diffMs <= 0) return "";

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${Math.max(1, diffMinutes)} menit lalu`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} jam lalu`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} hari lalu`;
}

export type TaskDeadlineStatus = "overdue" | "today" | "upcoming" | "completed" | "unknown";

/**
 * Menentukan status kondisi deadline tugas:
 * - "completed": Tugas sudah selesai
 * - "overdue": Tugas belum selesai & deadline sudah lewat
 * - "today": Tugas belum selesai & deadline jatuh pada hari ini
 * - "upcoming": Tugas belum selesai & deadline jatuh di hari mendatang
 */
export function getTaskDeadlineStatus(
  dateStr?: string | null,
  timeStr?: string | null,
  completed?: boolean,
  referenceTime: Date = new Date()
): TaskDeadlineStatus {
  if (completed) return "completed";
  const deadline = getTaskDeadline(dateStr, timeStr);
  if (!deadline) return "unknown";

  if (deadline.getTime() < referenceTime.getTime()) {
    return "overdue";
  }

  const todayStr = getLocalDateString(referenceTime);
  const taskDateStr = dateStr?.trim() || todayStr;
  if (taskDateStr === todayStr) {
    return "today";
  }

  return "upcoming";
}

/**
 * Mendapatkan kategori kondisi waktu deadline tugas:
 * - "overdue": Deadline sudah lewat
 * - "today": Deadline hari ini
 * - "upcoming": Deadline di hari mendatang
 */
export function getTaskDeadlineCategory(
  dateStr?: string | null,
  timeStr?: string | null,
  referenceTime: Date = new Date()
): "overdue" | "today" | "upcoming" | "unknown" {
  const deadline = getTaskDeadline(dateStr, timeStr);
  if (!deadline) return "unknown";

  if (deadline.getTime() < referenceTime.getTime()) {
    return "overdue";
  }

  const todayStr = getLocalDateString(referenceTime);
  const taskDateStr = dateStr?.trim() || todayStr;
  if (taskDateStr === todayStr) {
    return "today";
  }

  return "upcoming";
}


