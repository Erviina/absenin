import { CompanyMembership } from "@/context/CompanyContext";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_id?: string | null;
  company_id?: string | null;
  is_read?: boolean;
  created_at?: string;
}

export interface NavigationContext {
  activeCompanyId: string | null;
  activeRole: string | null;
  memberships: CompanyMembership[];
  switchCompany?: (companyId: string) => void;
}

/**
 * Menentukan target route untuk sebuah notifikasi berdasarkan type, reference_id,
 * company_id, serta hak akses dan konteks perusahaan pengguna.
 */
export function getNotificationDestination(
  notif: NotificationItem,
  context: NavigationContext
): { route: string; targetCompanyId?: string } {
  const normType = (notif.type || "").toUpperCase();
  const rawType = notif.type || "";

  // 1. Tentukan target company & cek otorisasi manajemen pada perusahaan terkait
  const targetCompanyId = notif.company_id || context.activeCompanyId || undefined;
  let isManagement = false;

  if (targetCompanyId) {
    const mem = context.memberships.find((m) => m.company_id === targetCompanyId);
    const role = mem ? mem.role : context.activeRole;
    isManagement = Boolean(role && ["owner", "admin", "manager"].includes(role.toLowerCase()));
  } else {
    isManagement = Boolean(
      context.activeRole && ["owner", "admin", "manager"].includes(context.activeRole.toLowerCase())
    );
  }

  // 2. Pemetaan berdasarkan tipe notifikasi yang didukung aplikasi
  switch (normType) {
    // === PERIZINAN / CUTI ===
    case "LEAVE_PENDING":
      // Pengajuan izin baru yang perlu ditinjau oleh pengelola
      if (isManagement) {
        return { route: "/admin/izin", targetCompanyId };
      }
      return { route: notif.reference_id ? `/izin?id=${notif.reference_id}` : "/izin", targetCompanyId };

    case "LEAVE_APPROVED":
    case "LEAVE_REJECTED":
      // Status pengajuan izin untuk karyawan pemohon
      return {
        route: notif.reference_id ? `/izin?id=${notif.reference_id}` : "/izin",
        targetCompanyId,
      };

    // === PERMINTAAN BERGABUNG (JOIN REQUESTS) ===
    case "JOIN_REQUEST_PENDING":
      // Permintaan bergabung yang harus disetujui / ditolak manajemen
      if (isManagement) {
        return { route: "/admin/karyawan?tab=masuk", targetCompanyId };
      }
      return { route: "/dashboard", targetCompanyId };

    case "JOIN_REQUEST_APPROVED":
      // Pelamar diterima, langsung ke dashboard perusahaan
      return { route: "/dashboard", targetCompanyId };

    case "JOIN_REQUEST_REJECTED":
      // Pelamar ditolak, diarahkan ke halaman registrasi/pencarian perusahaan
      return { route: "/cek-perusahaan" };

    // === PERMINTAAN KELUAR & STATUS KEANGGOTAAN ===
    case "EXIT_REQUEST":
    case "EXIT_REQUEST_PENDING":
      // Karyawan mengajukan keluar dari organisasi (untuk pengelola)
      if (isManagement) {
        return { route: "/admin/karyawan?tab=keluar", targetCompanyId };
      }
      return { route: "/profil", targetCompanyId };

    case "EXIT_APPROVED":
    case "MEMBER_REMOVED":
      // Pengguna resmi keluar / dikeluarkan dari organisasi
      return { route: "/cek-perusahaan" };

    case "EXIT_REJECTED":
      // Pengajuan keluar ditolak oleh manajemen, kembali ke profil
      return { route: "/profil", targetCompanyId };

    // === PENGUMUMAN / BERITA ===
    case "NEW_ANNOUNCEMENT":
      return { route: "/berita", targetCompanyId };

    // === PRESENSI & JADWAL ===
    case "ATTENDANCE_REMINDER":
      return { route: "/checkin", targetCompanyId };

    case "AGENDA_UPCOMING":
      return { route: "/agenda", targetCompanyId };

    default:
      // Penanganan backward compatibility untuk format string lowercase
      if (rawType === "exit_request") {
        if (isManagement) {
          return { route: "/admin/karyawan?tab=keluar", targetCompanyId };
        }
        return { route: "/profil", targetCompanyId };
      }
      if (rawType === "exit_approved" || rawType === "member_removed") {
        return { route: "/cek-perusahaan" };
      }
      if (rawType === "exit_rejected") {
        return { route: "/profil", targetCompanyId };
      }

      return { route: "/dashboard", targetCompanyId };
  }
}

/**
 * Menandai notifikasi sebagai terbaca dan menavigasikan pengguna ke halaman tujuan relevan.
 * Navigasi dipastikan tetap berjalan meskipun proses penandaan di API gagal.
 */
export async function handleNotificationNavigation(
  notif: NotificationItem,
  context: NavigationContext,
  router: { push: (href: string) => void },
  onReadSuccess?: (id: string) => void
) {
  // 1. Mark as read jika belum dibaca (fire-and-forget dengan error handling yang aman)
  if (!notif.is_read) {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${notif.id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (onReadSuccess) {
          onReadSuccess(notif.id);
        }
      }
    } catch (err) {
      console.warn("Gagal menandai notifikasi sebagai sudah dibaca, navigasi tetap dilanjutkan:", err);
    }
  }

  // 2. Dapatkan route dan target context
  const { route, targetCompanyId } = getNotificationDestination(notif, context);

  // 3. Jika notifikasi berasal dari perusahaan tertentu dan pengguna adalah anggota perusahaan tersebut,
  // serta perusahaan tersebut bukan perusahaan aktif saat ini, sesuaikan konteks perusahaan aktif.
  if (
    targetCompanyId &&
    context.activeCompanyId &&
    targetCompanyId !== context.activeCompanyId &&
    context.memberships.some((m) => m.company_id === targetCompanyId) &&
    typeof context.switchCompany === "function"
  ) {
    try {
      context.switchCompany(targetCompanyId);
    } catch (e) {
      console.warn("Gagal switch company otomatis:", e);
    }
  }

  // 4. Navigasi ke halaman tujuan
  router.push(route);
}
