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
