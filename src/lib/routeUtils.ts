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
  "/syarat-ketentuan",
]);

export const PUBLIC_PREFIXES = [
  "/login/",
  "/kebijakan-privasi/",
  "/syarat-ketentuan/",
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
  "/bantuan",
  "/faq",
  "/syarat-ketentuan",
];

export function isPlatformAdminPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/platform-admin" || pathname.startsWith("/platform-admin/");
}

/**
 * Memeriksa apakah pathname merupakan rute resmi di dalam Platform Admin
 */
export function isKnownPlatformAdminRoute(pathname: string | null | undefined): boolean {
  if (!pathname || !isPlatformAdminPath(pathname)) return false;
  if (pathname === "/platform-admin" || pathname === "/platform-admin/overview") return true;
  if (pathname === "/platform-admin/analytics/growth" || pathname === "/platform-admin/analytics/features") return true;
  if (pathname === "/platform-admin/companies" || pathname.startsWith("/platform-admin/companies/")) return true;
  if (pathname === "/platform-admin/users") return true;
  if (pathname === "/platform-admin/system-health") return true;
  if (pathname === "/platform-admin/audit-logs") return true;
  if (pathname === "/platform-admin/settings") return true;
  return false;
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
