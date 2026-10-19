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

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("companyMemberships");

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

export async function fetchApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const companyId = getActiveCompanyId();

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = new Headers(options.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (token && companyId && !headers.has("x-company-id")) {
    headers.set("x-company-id", companyId);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

