import { getApiUrl, getAuthHeaders } from "./api";

export type ContentScope = "platform" | "company" | "user";
export type TargetRole = "platform_admin" | "company_owner_admin" | "manager" | "employee";
export type ContentType = "sop_guide" | "faq" | "troubleshooting" | "tips_best_practice";
export type DisplayContext = "login" | "help_center" | "both";

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
  content_scope?: ContentScope;
  target_roles?: TargetRole[];
  content_type?: ContentType;
  display_context?: DisplayContext;
  needs_review?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaqPayload {
  question: string;
  answer: string;
  category: string;
  scope: "global" | "company" | "platform_admin";
  content_scope?: ContentScope;
  target_roles?: TargetRole[];
  content_type?: ContentType;
  display_context?: DisplayContext;
  needs_review?: boolean;
  sop_title?: string | null;
  sop_url?: string | null;
  is_published?: boolean;
  order_index?: number;
}

// Opsi Pilihan Metadata dengan Bahasa Indonesia
export const CONTENT_SCOPE_OPTIONS: { value: ContentScope; label: string; desc: string }[] = [
  { value: "company", label: "Perusahaan", desc: "Berlaku untuk operasional internal perusahaan aktif" },
  { value: "user", label: "Pengguna", desc: "Panduan umum untuk seluruh pengguna aplikasi AbsenIN" },
  { value: "platform", label: "Platform", desc: "Khusus sistem dan administrasi platform AbsenIN" },
];

export const TARGET_ROLE_OPTIONS: { value: TargetRole; label: string }[] = [
  { value: "company_owner_admin", label: "Owner / Admin Perusahaan" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Karyawan" },
  { value: "platform_admin", label: "Platform Admin" },
];

export const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: "faq", label: "FAQ (Tanya Jawab)" },
  { value: "sop_guide", label: "SOP & Panduan" },
  { value: "troubleshooting", label: "Troubleshooting (Solusi Kendala)" },
  { value: "tips_best_practice", label: "Tips & Best Practice" },
];

export const DISPLAY_CONTEXT_OPTIONS: { value: DisplayContext; label: string }[] = [
  { value: "help_center", label: "Help Center (Setelah Login)" },
  { value: "login", label: "Halaman Login (Sebelum Masuk)" },
  { value: "both", label: "Keduanya (Login & Help Center)" },
];

// Helper Badge UI untuk Visual Konsisten
export function getContentScopeBadge(scope?: ContentScope) {
  switch (scope) {
    case "platform":
      return { label: "Platform", className: "bg-purple-50 text-purple-700 border-purple-200" };
    case "user":
      return { label: "Pengguna", className: "bg-sky-50 text-sky-700 border-sky-200" };
    case "company":
    default:
      return { label: "Perusahaan", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
}

export function getContentTypeBadge(type?: ContentType) {
  switch (type) {
    case "sop_guide":
      return { label: "SOP & Panduan", className: "bg-blue-50 text-blue-700 border-blue-200" };
    case "troubleshooting":
      return { label: "Troubleshooting", className: "bg-amber-50 text-amber-700 border-amber-200" };
    case "tips_best_practice":
      return { label: "Tips & Praktik", className: "bg-teal-50 text-teal-700 border-teal-200" };
    case "faq":
    default:
      return { label: "FAQ", className: "bg-gray-100 text-gray-700 border-gray-200" };
  }
}

export function getDisplayContextBadge(dc?: DisplayContext) {
  switch (dc) {
    case "login":
      return { label: "Hanya Login", className: "bg-orange-50 text-orange-700 border-orange-200" };
    case "both":
      return { label: "Login & Help", className: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    case "help_center":
    default:
      return { label: "Help Center", className: "bg-gray-50 text-gray-600 border-gray-200" };
  }
}

/**
 * Mengambil daftar FAQ terbit untuk Pusat Bantuan pengguna umum / karyawan.
 */
export async function getPublicFaqs(params?: {
  search?: string;
  category?: string;
  scope?: string;
  content_scope?: string;
  target_role?: string;
  content_type?: string;
  display_context?: string;
  needs_review?: string;
}): Promise<FaqItem[]> {
  try {
    const query = new URLSearchParams();
    if (params?.search && params.search.trim()) query.set("search", params.search.trim());
    if (params?.category && params.category !== "Semua") query.set("category", params.category.trim());
    if (params?.scope) query.set("scope", params.scope);
    if (params?.content_scope && params.content_scope !== "all") query.set("content_scope", params.content_scope);
    if (params?.target_role && params.target_role !== "all") query.set("target_role", params.target_role);
    if (params?.content_type && params.content_type !== "all") query.set("content_type", params.content_type);
    if (params?.display_context && params.display_context !== "all") query.set("display_context", params.display_context);
    if (params?.needs_review && params.needs_review !== "all") query.set("needs_review", params.needs_review);

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
 * Mengembalikan seluruh status (Draft maupun Terbit) beserta filter metadata.
 */
export async function getManageFaqs(params: {
  scope: "global" | "company" | "platform_admin";
  status?: "all" | "published" | "draft";
  search?: string;
  category?: string;
  content_scope?: ContentScope | "all";
  target_role?: TargetRole | "all";
  content_type?: ContentType | "all";
  display_context?: DisplayContext | "all";
  needs_review?: "all" | "true" | "false";
}): Promise<FaqItem[]> {
  const query = new URLSearchParams();
  query.set("scope", params.scope);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.search && params.search.trim()) query.set("search", params.search.trim());
  if (params.category && params.category !== "Semua") query.set("category", params.category.trim());
  if (params.content_scope && params.content_scope !== "all") query.set("content_scope", params.content_scope);
  if (params.target_role && params.target_role !== "all") query.set("target_role", params.target_role);
  if (params.content_type && params.content_type !== "all") query.set("content_type", params.content_type);
  if (params.display_context && params.display_context !== "all") query.set("display_context", params.display_context);
  if (params.needs_review && params.needs_review !== "all") query.set("needs_review", params.needs_review);

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
 * Memeriksa apakah URL materi SOP merupakan video tutorial
 */
export function isMediaVideo(url?: string | null, title?: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  const t = (title || "").toLowerCase();
  return (
    u.includes("youtube.com") ||
    u.includes("youtu.be") ||
    u.includes("vimeo.com") ||
    u.includes("loom.com") ||
    u.endsWith(".mp4") ||
    u.endsWith(".webm") ||
    t.includes("video") ||
    t.includes("tutorial") ||
    t.includes("rekaman")
  );
}

/**
 * Mendapatkan thumbnail YouTube jika URL berupa tautan YouTube
 */
export function getYouTubeThumbnail(url?: string | null): string | null {
  if (!url) return null;
  try {
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
  } catch {}
  return null;
}

/**
 * Mengambil daftar kategori FAQ yang tersedia secara dinamis dari backend
 */
export async function getFaqCategories(params?: {
  content_scope?: string;
  display_context?: string;
  only_existing?: boolean;
}): Promise<string[]> {
  try {
    const query = new URLSearchParams();
    if (params?.content_scope) query.set("content_scope", params.content_scope);
    if (params?.display_context) query.set("display_context", params.display_context);
    if (params?.only_existing) query.set("only_existing", "true");

    const qs = query.toString();
    const url = getApiUrl(`/faqs/categories${qs ? `?${qs}` : ""}`);
    const headers = getAuthHeaders();

    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) return [];

    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
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
