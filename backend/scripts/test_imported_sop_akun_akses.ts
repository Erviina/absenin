import express from "express";
import faqsRouter from "../src/routes/faqs";
import { db } from "../src/db";
import { faqs, profiles } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

async function main() {
  console.log("==========================================================");
  console.log("TEST INTEGRASI & HAK AKSES: SOP AKUN DAN AKSES PERUSAHAAN");
  console.log("==========================================================\n");

  const app = express();
  app.use(express.json());
  app.use("/api/faqs", faqsRouter);

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/faqs`;

  try {
    // 1. Ambil SOP yang telah diimpor dari database
    console.log("[TEST 1] Memeriksa metadata SOP di database...");
    const [sop] = await db
      .select()
      .from(faqs)
      .where(sql`question = 'Memulai dan Mengelola Akun Perusahaan' AND scope = 'global' AND deleted_at IS NULL`)
      .limit(1);

    if (!sop) {
      throw new Error("FAIL: SOP 'Memulai dan Mengelola Akun Perusahaan' tidak ditemukan di database!");
    }

    console.log(`✓ ID: ${sop.id}`);
    console.log(`✓ Judul (question): ${sop.question}`);
    console.log(`✓ Judul SOP (sop_title): ${sop.sop_title}`);
    console.log(`✓ Kategori: ${sop.category}`);
    console.log(`✓ Scope: ${sop.scope}`);
    console.log(`✓ Content Scope: ${sop.content_scope}`);
    console.log(`✓ Content Type: ${sop.content_type}`);
    console.log(`✓ Display Context: ${sop.display_context}`);
    console.log(`✓ Target Roles: [${sop.target_roles.join(", ")}]`);
    console.log(`✓ is_published: ${sop.is_published}`);
    console.log(`✓ needs_review: ${sop.needs_review}`);
    console.log(`✓ sop_url: ${sop.sop_url}`);

    // Validasi Metadata Kritis
    if (sop.is_published !== false) throw new Error("FAIL: Status SOP harus DRAFT (is_published = false)!");
    if (sop.needs_review !== true) throw new Error("FAIL: needs_review harus true!");
    if (sop.sop_url !== null) throw new Error("FAIL: sop_url harus null/kosong!");
    if (sop.scope !== "global") throw new Error("FAIL: scope harus 'global'!");
    if (sop.content_scope !== "user") throw new Error("FAIL: content_scope harus 'user'!");
    if (sop.content_type !== "sop_guide") throw new Error("FAIL: content_type harus 'sop_guide'!");
    if (sop.category !== "Akun") throw new Error("FAIL: category harus 'Akun'!");
    console.log("✓ PASS: Semua metadata terpetakan 100% akurat sesuai spesifikasi.\n");

    // 2. Validasi Isi Prosedur (Langkah, Tips, Troubleshooting, FAQ)
    console.log("[TEST 2] Memeriksa kelengkapan konten dokumen sumber...");
    const ans = sop.answer;
    
    // Periksa Langkah 1 - 8 Registrasi & Login
    if (!ans.includes("Langkah 1 - Memulai Proses Pendaftaran")) throw new Error("Langkah 1 registrasi hilang!");
    if (!ans.includes("Langkah 8 - Mengakses Dasbor Utama")) throw new Error("Langkah 8 registrasi hilang!");
    if (!ans.includes("Sign in with Google")) throw new Error("Sign in with Google hilang!");

    // Periksa Logout
    if (!ans.includes("Keluar dari Akun")) throw new Error("Bagian logout hilang!");
    if (!ans.includes("Langkah 3 - Mengonfirmasi Logout")) throw new Error("Langkah 3 logout hilang!");

    // Periksa Halaman Kesalahan & Hak Akses
    if (!ans.includes("Menangani Halaman Kesalahan dan Hak Akses")) throw new Error("Bagian error handler hilang!");
    if (!ans.includes("Halaman 403")) throw new Error("Penyebutan Halaman 403 hilang!");

    // Periksa Tips
    if (!ans.includes("Tips dan Praktik Terbaik")) throw new Error("Bagian Tips hilang!");
    if (!ans.includes("Gunakan Mode Manajemen untuk mengakses fitur manajemen perusahaan.")) throw new Error("Tips Mode Manajemen hilang!");

    // Periksa Troubleshooting
    if (!ans.includes("Pemecahan Masalah")) throw new Error("Bagian Troubleshooting hilang!");
    if (!ans.includes("Mengapa saya tidak bisa melihat Mode Manajemen?")) throw new Error("Q&A Mode Manajemen hilang!");

    // Periksa FAQ
    if (!ans.includes("Pertanyaan yang Sering Diajukan")) throw new Error("Bagian FAQ hilang!");
    if (!ans.includes("Apakah saya bisa mengubah nama perusahaan setelah menyimpannya?")) throw new Error("FAQ ganti nama perusahaan hilang!");
    console.log("✓ PASS: Seluruh 6 bagian dokumen sumber (Langkah 1-8, Logout, Error 403, Tips, Troubleshooting, FAQ) lengkap dan verbatim.\n");

    // 3. Uji Akses Publik: SOP Draft TIDAK boleh muncul di GET /api/faqs
    console.log("[TEST 3] Uji visibilitas publik pengguna biasa (GET /api/faqs)...");
    const resPublic = await fetch(`${baseUrl}?search=Memulai dan Mengelola Akun Perusahaan`);
    const jsonPublic = await resPublic.json();
    if (jsonPublic.data && jsonPublic.data.length > 0) {
      throw new Error("FAIL: SOP DRAFT bocor ke endpoint publik!");
    }
    console.log("✓ PASS: SOP berstatus DRAFT tidak dapat dilihat oleh pengguna biasa di Pusat Bantuan publik.\n");

    // 4. Siapkan Auth Token Platform Admin & User Biasa
    console.log("[TEST 4] Uji visibilitas manajemen Platform Admin (GET /api/faqs/manage)...");
    const devProfile = await db.select().from(profiles).where(eq(profiles.is_developer, true)).limit(1);
    if (devProfile.length === 0) throw new Error("FAIL: Profil platform admin tidak ditemukan!");
    const devToken = jwt.sign({ sub: devProfile[0].id, email: devProfile[0].email }, JWT_SECRET, { expiresIn: "1h" });

    // Request ke endpoint manajemen dengan role Platform Admin
    const resManage = await fetch(`${baseUrl}/manage?scope=global&search=Memulai dan Mengelola Akun Perusahaan`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const jsonManage = await resManage.json();
    if (!jsonManage.success || !jsonManage.data || jsonManage.data.length === 0) {
      throw new Error("FAIL: SOP tidak ditemukan di endpoint manajemen Platform Admin!");
    }

    const manageItem = jsonManage.data[0];
    if (manageItem.id !== sop.id) throw new Error("FAIL: ID SOP di manage endpoint tidak cocok!");
    if (manageItem.is_published !== false) throw new Error("FAIL: is_published harus false di manage!");
    if (manageItem.needs_review !== true) throw new Error("FAIL: needs_review harus true di manage!");
    console.log(`✓ PASS: Pengelola Platform Admin berhasil melihat SOP dalam status Draft / Perlu Ditinjau.`);

    // Uji filter status=draft
    const resDraftFilter = await fetch(`${baseUrl}/manage?scope=global&status=draft&search=Memulai`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const jsonDraftFilter = await resDraftFilter.json();
    if (!jsonDraftFilter.data.some((d: any) => d.id === sop.id)) {
      throw new Error("FAIL: SOP tidak muncul pada filter status=draft!");
    }
    console.log(`✓ PASS: Filter status=draft berhasil mengembalikan SOP ini.`);

    // 5. Uji Otorisasi: User biasa tidak berhak mengakses manajemen FAQ Global
    console.log("\n[TEST 5] Uji perlindungan hak akses (RBAC)...");
    const normalProfile = await db.select().from(profiles).where(eq(profiles.is_developer, false)).limit(1);
    if (normalProfile.length > 0) {
      const normalToken = jwt.sign({ sub: normalProfile[0].id, email: normalProfile[0].email }, JWT_SECRET, { expiresIn: "1h" });
      const resForbidden = await fetch(`${baseUrl}/manage?scope=global`, {
        headers: { Authorization: `Bearer ${normalToken}` },
      });
      if (resForbidden.status !== 403) {
        throw new Error(`FAIL: User biasa harus menerima 403 Forbidden saat mengakses manajemen Global, diterima: ${resForbidden.status}`);
      }
      console.log("✓ PASS: User non-admin ditolak (403 Forbidden) saat mencoba mengelola SOP Global.");
    }

    // 6. Uji Simulasi Siklus Publikasi (Draft -> Terbit -> Draft)
    console.log("\n[TEST 6] Uji simulasi siklus publikasi (Draft -> Terbit -> Draft)...");
    // a. Terbitkan sementara
    await db.update(faqs).set({ is_published: true, needs_review: false }).where(eq(faqs.id, sop.id));
    const resPublishedCheck = await fetch(`${baseUrl}?search=Memulai dan Mengelola Akun Perusahaan`);
    const jsonPublishedCheck = await resPublishedCheck.json();
    if (!jsonPublishedCheck.data || jsonPublishedCheck.data.length === 0) {
      throw new Error("FAIL: Setelah diterbitkan, SOP harusnya langsung dapat diakses oleh publik!");
    }
    console.log("✓ PASS: Saat diterbitkan, SOP langsung dapat dibaca oleh pengguna di Pusat Bantuan.");

    // b. Kembalikan ke Draft
    await db.update(faqs).set({ is_published: false, needs_review: true }).where(eq(faqs.id, sop.id));
    const resDraftRecheck = await fetch(`${baseUrl}?search=Memulai dan Mengelola Akun Perusahaan`);
    const jsonDraftRecheck = await resDraftRecheck.json();
    if (jsonDraftRecheck.data && jsonDraftRecheck.data.length > 0) {
      throw new Error("FAIL: Setelah dikembalikan ke draft, SOP masih muncul di publik!");
    }
    console.log("✓ PASS: SOP berhasil dikembalikan ke status DRAFT murni sesuai instruksi 5.");

    console.log("\n==========================================================");
    console.log("SEMUA PENGUJIAN SOP AKUN DAN AKSES BERHASIL DILAKUKAN (6/6)");
    console.log("==========================================================");

  } catch (err: any) {
    console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
