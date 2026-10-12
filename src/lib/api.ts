/**
 * API client helper with Multi-Tenant company headers and auth support
 */

export function getActiveCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("activeCompanyId") || null;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken") || null;
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

  if (companyId && !headers.has("x-company-id")) {
    headers.set("x-company-id", companyId);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
