import { db } from "../src/db";
import { faqs } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function seedLoginFaqs() {
  console.log("Seeding login & public guide FAQs into database...");

  const loginItems = [
    {
      question: "Bagaimana cara masuk (login) ke AbsenIN menggunakan Akun Google?",
      answer: "<p>1. Buka aplikasi atau tautan resmi AbsenIN pada browser perangkat Anda.</p><p>2. Di halaman login, klik tombol <strong>Sign in with Google</strong>.</p><p>3. Pilih akun Google yang terdaftar atau masukkan email dan kata sandi Google Anda.</p><p>4. Berikan izin akses profil dasar dan email jika diminta oleh Google.</p><p>5. Setelah verifikasi berhasil, Anda akan langsung diarahkan ke beranda aplikasi.</p>",
      category: "Akun",
      scope: "global" as const,
      content_scope: "user" as const,
      target_roles: ["employee", "manager", "company_owner_admin"],
      content_type: "faq" as const,
      display_context: "both" as const,
      is_published: true,
      needs_review: false,
      order_index: 1,
    },
    {
      question: "Mengapa muncul pesan 'Gagal verifikasi sesi' atau gagal login dengan Google?",
      answer: "<p>Kendala saat login Google umumnya disebabkan oleh:</p><ul><li><p><strong>Gangguan koneksi internet:</strong> Pastikan perangkat Anda terhubung ke internet yang stabil.</p></li><li><p><strong>Sesi Google kedaluwarsa:</strong> Muat ulang (refresh) halaman login dan ketuk kembali 'Sign in with Google'.</p></li><li><p><strong>Cache browser menumpuk:</strong> Bersihkan riwayat dan cache browser, atau coba buka melalui jendela penyamaran (Incognito Window).</p></li><li><p><strong>Popup terblokir:</strong> Pastikan browser ponsel tidak memblokir jendela sembulan (pop-up) autentikasi Google.</p></li></ul>",
      category: "Akun",
      scope: "global" as const,
      content_scope: "user" as const,
      target_roles: ["employee", "manager", "company_owner_admin"],
      content_type: "troubleshooting" as const,
      display_context: "both" as const,
      is_published: true,
      needs_review: false,
      order_index: 2,
    },
    {
      question: "Apakah saya perlu membuat kata sandi (password) baru untuk akun AbsenIN?",
      answer: "<p>Tidak perlu. AbsenIN menggunakan sistem Single Sign-On (SSO) Google yang terenkripsi dan aman. Anda tidak perlu membuat atau mengingat kata sandi tambahan. Keamanan akun Anda sepenuhnya dilindungi oleh autentikasi dua faktor (2FA) dan standar keamanan akun Google Anda.</p>",
      category: "Akun",
      scope: "global" as const,
      content_scope: "user" as const,
      target_roles: ["employee", "manager", "company_owner_admin"],
      content_type: "faq" as const,
      display_context: "both" as const,
      is_published: true,
      needs_review: false,
      order_index: 3,
    },
    {
      question: "Bagaimana alur persetujuan kebijakan bagi akun Google yang baru pertama kali mendaftar?",
      answer: "<p>Bagi akun Google yang baru pertama kali mendaftar, sistem akan menampilkan lembar persetujuan Syarat & Ketentuan serta Kebijakan Privasi PII secara transparan. Setelah Anda membaca dan menyetujui kedua dokumen tersebut, akun Anda akan langsung aktif untuk digunakan.</p>",
      category: "Akun",
      scope: "global" as const,
      content_scope: "user" as const,
      target_roles: ["employee", "manager", "company_owner_admin"],
      content_type: "faq" as const,
      display_context: "both" as const,
      is_published: true,
      needs_review: false,
      order_index: 4,
    },
    {
      question: "Bagaimana jika email saya belum terhubung ke perusahaan mana pun setelah login?",
      answer: "<p>Setelah berhasil login untuk pertama kali:</p><ul><li><p><strong>Jika Anda karyawan:</strong> Minta Kode Perusahaan atau QR Code pendaftaran kepada Admin/HR kantor Anda, lalu masukkan pada menu 'Gabung Perusahaan'.</p></li><li><p><strong>Jika Anda pemilik usaha/HR:</strong> Anda dapat memilih 'Buat Perusahaan Baru' untuk mendaftarkan organisasi kantor Anda secara mandiri.</p></li></ul>",
      category: "Akun",
      scope: "global" as const,
      content_scope: "user" as const,
      target_roles: ["employee", "manager", "company_owner_admin"],
      content_type: "faq" as const,
      display_context: "both" as const,
      is_published: true,
      needs_review: false,
      order_index: 5,
    },
  ];

  for (const item of loginItems) {
    const existing = await db.execute(sql`
      SELECT id FROM faqs WHERE question = ${item.question} AND deleted_at IS NULL;
    `);

    if (existing.rows.length === 0) {
      await db.insert(faqs).values(item);
      console.log(`✓ Inserted login FAQ: "${item.question}"`);
    } else {
      await db
        .update(faqs)
        .set({
          display_context: item.display_context,
          content_scope: item.content_scope,
          target_roles: item.target_roles,
          content_type: item.content_type,
          is_published: item.is_published,
          needs_review: item.needs_review,
        })
        .where(sql`id = ${existing.rows[0].id}`);
      console.log(`✓ Updated existing FAQ to login display_context: "${item.question}"`);
    }
  }

  console.log("Seeding finished successfully.");
  process.exit(0);
}

seedLoginFaqs().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
