/**
 * API client helper with Multi-Tenant company headers and auth support
 */

const STORAGE_KEY = "activeCompanyId";

export function getActiveCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // 1. Check tab-scoped sessionStorage first (prevents multi-tab cross-contamination on reload)
    const sessionVal = sessionStorage.getItem(STORAGE_KEY);
    if (sessionVal && sessionVal.trim() !== "" && sessionVal !== "undefined" && sessionVal !== "null") {
      return sessionVal.trim();
    }
    // 2. Fallback to localStorage (for newly opened tabs or initial tab)
    const localVal = localStorage.getItem(STORAGE_KEY);
    if (localVal && localVal.trim() !== "" && localVal !== "undefined" && localVal !== "null") {
      try {
        sessionStorage.setItem(STORAGE_KEY, localVal.trim());
      } catch {}
      return localVal.trim();
    }
  } catch {}
  return null;
}

export function setActiveCompanyId(companyId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (companyId && companyId.trim() !== "" && companyId !== "undefined" && companyId !== "null") {
      const cleanId = companyId.trim();
      sessionStorage.setItem(STORAGE_KEY, cleanId);
      localStorage.setItem(STORAGE_KEY, cleanId);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

export function setAuthSession(token: string, user: any, companyId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("accessToken", token);
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
    // Hapus cache membership akun lama agar tidak bocor ke akun baru yang sedang login
    localStorage.removeItem("companyMemberships");
    const targetCompId = companyId || user?.company?.id || null;
    setActiveCompanyId(targetCompId);
    window.dispatchEvent(new CustomEvent("authSessionUpdated", { detail: { user, companyId: targetCompId } }));
  } catch (e) {
    console.error("Failed to set auth session:", e);
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("companyMemberships");

    // Bersihkan sesi Google OAuth jika ada
    try {
      const { googleLogout } = require("@react-oauth/google");
      if (typeof googleLogout === "function") {
        googleLogout();
      }
    } catch {}

    // Bersihkan hanya key sessionStorage yang berkaitan dengan autentikasi & status perusahaan aktif
    try {
      sessionStorage.removeItem("activeCompanyId");
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith("ack_seen_") || key === "activeCompanyId")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {}

    setActiveCompanyId(null);

    // Reset akun Google yang tersimpan di browser agar tombol login tidak menampilkan email sebelumnya
    try {
      (window as any).google?.accounts?.id?.disableAutoSelect?.();
    } catch {}

    window.dispatchEvent(new CustomEvent("authSessionCleared"));
  } catch (e) {
    console.error("Failed to clear auth session:", e);
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken") || null;
}

export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const companyId = getActiveCompanyId();
  const headers: Record<string, string> = { ...customHeaders };
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (token && companyId && !headers["x-company-id"]) {
    headers["x-company-id"] = companyId;
  }
  return headers;
}

/**
 * Mendapatkan base URL API.
 * Default adalah "/api" jika NEXT_PUBLIC_API_URL tidak tersedia atau bernilai kosong/undefined.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === "string") {
    const trimmed = envUrl.trim();
    if (trimmed !== "" && trimmed !== "undefined" && trimmed !== "null") {
      return trimmed.replace(/\/+$/, "");
    }
  }
  return "/api";
}

/**
 * Helper untuk menyusun URL API yang konsisten di seluruh aplikasi.
 * - Mendukung URL absolut (http:// atau https://).
 * - Menangani base URL berupa "/api" atau URL eksternal lengkap.
 * - Mencegah duplikasi path seperti "/api/api/auth/me" jika base URL sudah berakhiran "/api"
 *   dan endpoint juga menyertakan prefix "/api".
 */
export function getApiUrl(endpoint: string): string {
  if (!endpoint) return getApiBaseUrl();

  // Jika sudah merupakan URL absolut, gunakan langsung
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const base = getApiBaseUrl();
  const cleanPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Jika base URL sudah berakhiran "/api" (misal "/api" atau "https://domain.com/api")
  // dan cleanPath juga diawali dengan "/api/", hindari duplikasi "/api/api/..."
  if (base.endsWith("/api") && cleanPath.startsWith("/api/")) {
    return `${base}${cleanPath.slice(4)}`;
  }

  if (base === "/api" && cleanPath === "/api") {
    return "/api";
  }

  return `${base}${cleanPath}`;
}

export async function fetchApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const companyId = getActiveCompanyId();

  const url = getApiUrl(endpoint);

  const headers = new Headers(options.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (token && companyId && !headers.has("x-company-id")) {
    headers.set("x-company-id", companyId);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 403 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("unauthorizedAccess", { detail: { url } }));
  }

  return res;
}

