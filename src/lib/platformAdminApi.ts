/**
 * Platform Admin API Client Helper
 * Khusus untuk komunikasi dengan endpoint /api/platform/* (Platform Owner)
 * Tanpa mengirim header x-company-id untuk mencegah kontaminasi tenant.
 */

export interface PlatformOwnerProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: "PLATFORM_OWNER";
  verifiedAt: string;
}

export interface PlatformApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export function getPlatformAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken") || null;
}

export async function fetchPlatformApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<PlatformApiResponse<T>> {
  const token = getPlatformAuthToken();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const url = `${baseUrl}/platform/${cleanEndpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const json = await res.json();
    return json;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal terhubung ke server Platform Admin",
      errors: [error.message],
    };
  }
}

/**
 * Memverifikasi apakah pengguna saat ini sah sebagai Platform Owner
 */
export async function verifyPlatformAdmin(): Promise<PlatformApiResponse<PlatformOwnerProfile>> {
  return fetchPlatformApi<PlatformOwnerProfile>("me", { method: "GET" });
}

/**
 * Logout dari sesi Platform Admin
 */
export function logoutPlatformAdmin(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  window.location.href = "/platform-admin/login";
}
