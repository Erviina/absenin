import { getApiUrl, getAuthHeaders } from "./api";

export interface FaqItem {
  id: string;
  company_id: string | null;
  company_name?: string | null;
  author_id: string | null;
  author_name?: string | null;
  scope: "global" | "company" | "platform_admin";
  category: string;
  question: string;
  answer: string;
  sop_title: string | null;
  sop_url: string | null;
  is_published: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface FaqPayload {
  question: string;
  answer: string;
  category: string;
  scope: "global" | "company" | "platform_admin";
  sop_title?: string | null;
  sop_url?: string | null;
  is_published?: boolean;
  order_index?: number;
}

/**
 * Mengambil daftar FAQ terbit untuk Pusat Bantuan pengguna umum / karyawan.
 * Otomatis menyertakan token auth & x-company-id untuk mengambil FAQ Global + Perusahaan Aktif + Platform Admin (jika owner).
 */
export async function getPublicFaqs(params?: {
  search?: string;
  category?: string;
  scope?: string;
}): Promise<FaqItem[]> {
  try {
    const query = new URLSearchParams();
    if (params?.search && params.search.trim()) query.set("search", params.search.trim());
    if (params?.category && params.category !== "Semua") query.set("category", params.category.trim());
    if (params?.scope) query.set("scope", params.scope);

    const qs = query.toString();
    const url = getApiUrl(`/faqs${qs ? `?${qs}` : ""}`);
    const headers = getAuthHeaders();

    const res = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Gagal mengambil FAQ (${res.status})`);
    }

    const json = await res.json();
    return json.data || [];
  } catch (err: any) {
    console.error("getPublicFaqs error:", err);
    return [];
  }
}

/**
 * Mengambil daftar FAQ untuk manajemen (Platform Owner atau Admin Perusahaan).
 * Mengembalikan seluruh status (Draft maupun Terbit).
 */
export async function getManageFaqs(params: {
  scope: "global" | "company" | "platform_admin";
  status?: "all" | "published" | "draft";
  search?: string;
  category?: string;
}): Promise<FaqItem[]> {
  const query = new URLSearchParams();
  query.set("scope", params.scope);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.search && params.search.trim()) query.set("search", params.search.trim());
  if (params.category && params.category !== "Semua") query.set("category", params.category.trim());

  const url = getApiUrl(`/faqs/manage?${query.toString()}`);
  const headers = getAuthHeaders();

  const res = await fetch(url, {
    method: "GET",
    headers,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || `Gagal memuat FAQ manajemen (${res.status})`);
  }

  return json.data || [];
}

/**
 * Mengambil daftar kategori FAQ yang tersedia
 */
export async function getFaqCategories(): Promise<string[]> {
  try {
    const url = getApiUrl("/faqs/categories");
    const headers = getAuthHeaders();

    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) return ["Umum", "Presensi", "GPS & Lokasi", "Izin & Cuti", "Tugas", "Kebijakan Kantor", "SOP Kerja"];

    const json = await res.json();
    return json.data || ["Umum", "Presensi", "GPS & Lokasi", "Izin & Cuti", "Tugas", "Kebijakan Kantor", "SOP Kerja"];
  } catch {
    return ["Umum", "Presensi", "GPS & Lokasi", "Izin & Cuti", "Tugas", "Kebijakan Kantor", "SOP Kerja"];
  }
}

/**
 * Menambahkan FAQ baru
 */
export async function createFaq(payload: FaqPayload): Promise<FaqItem> {
  const url = getApiUrl("/faqs");
  const headers = getAuthHeaders({ "Content-Type": "application/json" });

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const msg = json.errors?.join(", ") || json.message || "Gagal membuat FAQ baru";
    throw new Error(msg);
  }

  return json.data;
}

/**
 * Memperbarui FAQ
 */
export async function updateFaq(id: string, payload: Partial<FaqPayload>): Promise<FaqItem> {
  const url = getApiUrl(`/faqs/${id}`);
  const headers = getAuthHeaders({ "Content-Type": "application/json" });

  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const msg = json.errors?.join(", ") || json.message || "Gagal memperbarui FAQ";
    throw new Error(msg);
  }

  return json.data;
}

/**
 * Menghapus FAQ secara aman (Soft Delete)
 */
export async function deleteFaq(id: string): Promise<boolean> {
  const url = getApiUrl(`/faqs/${id}`);
  const headers = getAuthHeaders();

  const res = await fetch(url, {
    method: "DELETE",
    headers,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal menghapus FAQ");
  }

  return true;
}
