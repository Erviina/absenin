/**
 * Helper untuk mengelola preferensi Mode Personal ("Nanti Saja")
 * secara terisolasi berdasarkan authenticated user ID.
 */

const PERSONAL_MODE_KEY_PREFIX = "skipCompanySelection_";
const LEGACY_GLOBAL_KEY = "skipCompanySelection";

/**
 * Mendapatkan authenticated user ID dari localStorage ('user') atau accessToken JWT.
 */
export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.id) return user.id;
    }
  } catch { }

  try {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[1]));
        return payload.sub || payload.id || payload.userId || null;
      }
    }
  } catch { }

  return null;
}

/**
 * Membaca preferensi Mode Personal untuk user ID tertentu.
 * Flag global lama akan dibersihkan secara aman agar tidak mencemari akun lain.
 */
export function getPersonalModePreference(userId?: string | null): boolean {
  if (typeof window === "undefined") return false;

  // Bersihkan flag lama yang bersifat global secara aman
  if (localStorage.getItem(LEGACY_GLOBAL_KEY) !== null) {
    localStorage.removeItem(LEGACY_GLOBAL_KEY);
  }

  const targetUid = userId || getCurrentUserId();
  if (!targetUid) return false;

  return localStorage.getItem(`${PERSONAL_MODE_KEY_PREFIX}${targetUid}`) === "true";
}

/**
 * Menyimpan preferensi Mode Personal untuk user ID tertentu.
 */
export function setPersonalModePreference(userId?: string | null): void {
  if (typeof window === "undefined") return;

  // Bersihkan flag global lama
  localStorage.removeItem(LEGACY_GLOBAL_KEY);

  const targetUid = userId || getCurrentUserId();
  if (targetUid) {
    localStorage.setItem(`${PERSONAL_MODE_KEY_PREFIX}${targetUid}`, "true");
  }
}

/**
 * Menghapus preferensi Mode Personal untuk user ID tertentu.
 */
export function clearPersonalModePreference(userId?: string | null): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(LEGACY_GLOBAL_KEY);

  const targetUid = userId || getCurrentUserId();
  if (targetUid) {
    localStorage.removeItem(`${PERSONAL_MODE_KEY_PREFIX}${targetUid}`);
  }
}

/**
 * Memvalidasi apakah accessToken memiliki format JWT valid dan belum kedaluwarsa.
 * Sebagai penyaringan awal di sisi klien sebelum validasi backend.
 */
export function isTokenValid(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;

    // Decode base64url/base64 payload
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payloadStr = atob(padded);
    const payload = JSON.parse(payloadStr);

    if (typeof payload.exp === "number") {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowInSeconds) {
        return false;
      }
    }

    return Boolean(payload.sub || payload.id || payload.userId);
  } catch {
    return false;
  }
}

/**
 * Menentukan rute tujuan redirect bagi pengguna yang sudah terautentikasi
 * berdasarkan status perusahaan dan preferensi Mode Personal.
 */
export function getAuthenticatedRedirectPath(defaultPath: string = "/dashboard"): string {
  if (typeof window === "undefined") return defaultPath;

  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const skipCompany = user?.id ? getPersonalModePreference(user.id) : false;
      if (user && !user.company && !skipCompany) {
        return "/cek-perusahaan";
      }
    }
  } catch { }

  return defaultPath;
}

