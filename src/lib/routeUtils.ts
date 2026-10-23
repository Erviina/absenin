/**
 * Route Classification Utilities for AbsenIn
 * Digunakan oleh AuthGuard, Error Boundaries, dan Navigasi
 * untuk membedakan secara tepat antara:
 * 1. Rute Publik
 * 2. Rute Platform Admin (Desktop Dashboard)
 * 3. Rute Aplikasi Terproteksi AbsenIn (Mobile PWA)
 * 4. URL Tidak Valid (404)
 */

export const PUBLIC_EXACT_ROUTES = new Set([
  "/",
  "/login",
  "/login/onboard",
  "/unauthorized",
  "/admin/no-authorized",
  "/kebijakan-privasi",
  "/platform-admin/login",
]);

export const PUBLIC_PREFIXES = [
  "/login/",
  "/kebijakan-privasi/",
];

/**
 * Daftar prefix rute yang valid dan terdaftar di aplikasi AbsenIn
 */
export const KNOWN_APP_PREFIXES = [
  "/dashboard",
  "/profil",
  "/checkin",
  "/kehadiran",
  "/izin",
  "/tugas",
  "/agenda",
  "/berita",
  "/notifikasi",
  "/perusahaan",
  "/cek-perusahaan",
  "/buat-perusahaan",
  "/gabung-perusahaan",
  "/admin",
];

export function isPlatformAdminPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/platform-admin" || pathname.startsWith("/platform-admin/");
}

export function isPublicPath(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  if (PUBLIC_EXACT_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Memeriksa apakah suatu pathname merupakan rute resmi aplikasi AbsenIn (bukan 404).
 */
export function isKnownAppPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (isPublicPath(pathname)) return true;
  if (isPlatformAdminPath(pathname)) return true;
  
  return KNOWN_APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Memeriksa apakah URL merupakan rute tidak terdaftar (404)
 */
export function isInvalidRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return !isKnownAppPath(pathname);
}
