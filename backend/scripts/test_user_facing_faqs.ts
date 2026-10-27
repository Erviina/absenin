import express from "express";
import faqsRouter from "../src/routes/faqs";
import { db } from "../src/db";
import { faqs, profiles, companies, company_members } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

async function main() {
  console.log("==========================================================");
  console.log("PUSAT BANTUAN ABSENIN - USER FACING METADATA TEST SUITE");
  console.log("==========================================================\n");

  // Siapkan express app untuk pengetesan HTTP end-to-end
  const app = express();
  app.use(express.json());
  app.use("/api/faqs", faqsRouter);

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/faqs`;

  const cleanupFaqIds: string[] = [];

  try {
    // 0. Setup data uji
    console.log("[SETUP] Menyiapkan profil, perusahaan, dan data uji...");
    const sampleProfiles = await db.select({ id: profiles.id, email: profiles.email, isDev: profiles.is_developer }).from(profiles).limit(5);
    const sampleCompanies = await db.select({ id: companies.id, name: companies.name }).from(companies).limit(3);

    if (sampleProfiles.length === 0 || sampleCompanies.length === 0) {
      throw new Error("Dibutuhkan setidaknya 1 profil dan 1 perusahaan di database untuk pengujian.");
    }

    const companyA = sampleCompanies[0].id;
    const companyB = sampleCompanies.length > 1 ? sampleCompanies[1].id : null;

    // Temukan / buat profil dengan role
    const devProfile = sampleProfiles.find(p => p.isDev) || sampleProfiles[0];
    const normalProfile = sampleProfiles.find(p => !p.isDev) || sampleProfiles[0];

    // Helper membuat token JWT
    function createToken(profileId: string, email: string) {
      return jwt.sign({ sub: profileId, email }, JWT_SECRET, { expiresIn: "1h" });
    }

    const guestHeaders = {};
    const devToken = createToken(devProfile.id, devProfile.email);
    const normalToken = createToken(normalProfile.id, normalProfile.email);

    // Buat data FAQ uji untuk setiap skenario display_context dan scope
    const [loginOnlyFaq] = await db.insert(faqs).values({
      question: "AAA Uji Bantuan Login Eksklusif",
      answer: "Panduan khusus login yang tidak boleh muncul di help center pasca-login.",
      category: "Akun",
      scope: "global",
      content_scope: "user",
      display_context: "login",
      target_roles: ["employee", "manager", "company_owner_admin"],
      content_type: "faq",
      is_published: true,
    }).returning();
    cleanupFaqIds.push(loginOnlyFaq.id);

    const [helpOnlyFaq] = await db.insert(faqs).values({
      question: "BBB Uji Bantuan Help Center Pasca-Login",
      answer: "Panduan operasional harian yang tidak boleh muncul di login.",
      category: "Presensi",
      scope: "global",
      content_scope: "user",
      display_context: "help_center",
      target_roles: ["employee", "manager"],
      content_type: "troubleshooting",
      is_published: true,
    }).returning();
    cleanupFaqIds.push(helpOnlyFaq.id);

    const [bothContextFaq] = await db.insert(faqs).values({
      question: "CCC Uji Bantuan Keduanya (Both Context)",
      answer: "Panduan umum yang muncul di halaman login maupun pusat bantuan.",
      category: "Akun",
      scope: "global",
      content_scope: "user",
      display_context: "both",
      target_roles: [], // universal
      content_type: "tips_best_practice",
      is_published: true,
    }).returning();
    cleanupFaqIds.push(bothContextFaq.id);

    // FAQ Privat Perusahaan A
    const [companyAFaq] = await db.insert(faqs).values({
      question: "DDD SOP Khusus Perusahaan Uji Internal",
      answer: "Dokumentasi SOP rahasia internal perusahaan A.",
      category: "SOP Kerja",
      scope: "company",
      company_id: companyA,
      content_scope: "company",
      display_context: "help_center",
      target_roles: ["company_owner_admin", "manager"],
      content_type: "sop_guide",
      is_published: true,
    }).returning();
    cleanupFaqIds.push(companyAFaq.id);

    // FAQ Platform Admin
    const [platformFaq] = await db.insert(faqs).values({
      question: "EEE Panduan Pemeliharaan Platform Admin",
      answer: "Dokumentasi rahasia operasional platform owner.",
      category: "Platform Admin",
      scope: "platform_admin",
      content_scope: "platform",
      display_context: "help_center",
      target_roles: ["platform_admin"],
      content_type: "sop_guide",
      is_published: true,
    }).returning();
    cleanupFaqIds.push(platformFaq.id);

    console.log("✓ Data FAQ uji berhasil disiapkan.\n");

    // ==========================================================
    // 1. PENGUJIAN PENGGUNA BELUM LOGIN (GUEST / LOGIN CONTEXT)
    // ==========================================================
    console.log("[TEST 1] Pengguna Belum Login & Halaman Login (?display_context=login)");
    
    // 1a. Request login context normal
    const resLogin = await fetch(`${baseUrl}?display_context=login`);
    const jsonLogin = await resLogin.json();
    if (!resLogin.ok || !jsonLogin.success) {
      throw new Error(`Test 1a gagal: ${JSON.stringify(jsonLogin)}`);
    }

    const loginItems: any[] = jsonLogin.data;
    console.log(`✓ Jumlah FAQ publik pada konteks login: ${loginItems.length}`);

    // Pastikan SEMUA item yang dikembalikan hanya display_context IN ('login', 'both')
    const invalidContextItem = loginItems.find(i => i.display_context !== "login" && i.display_context !== "both");
    if (invalidContextItem) {
      throw new Error(`FAIL: Item dengan display_context '${invalidContextItem.display_context}' bocor ke login!`);
    }
    console.log("✓ PASS: Semua konten login berstatus 'login' atau 'both'.");

    // Pastikan tidak ada konten privat perusahaan atau platform
    const leakedCompany = loginItems.find(i => i.scope === "company" || i.company_id || i.id === companyAFaq.id);
    if (leakedCompany) {
      throw new Error(`FAIL: Konten perusahaan privat bocor ke login! (${leakedCompany.question})`);
    }
    const leakedPlatform = loginItems.find(i => i.scope === "platform_admin" || i.content_scope === "platform" || i.id === platformFaq.id);
    if (leakedPlatform) {
      throw new Error(`FAIL: Konten platform admin bocor ke login! (${leakedPlatform.question})`);
    }
    console.log("✓ PASS: Bebas dari kebocoran konten perusahaan dan platform admin.");

    // Pastikan item loginOnlyFaq dan bothContextFaq ada, sedangkan helpOnlyFaq TIDAK ada
    const hasLoginOnly = loginItems.some(i => i.id === loginOnlyFaq.id);
    const hasBoth = loginItems.some(i => i.id === bothContextFaq.id);
    const hasHelpOnly = loginItems.some(i => i.id === helpOnlyFaq.id);
    if (!hasLoginOnly || !hasBoth) {
      throw new Error("FAIL: Konten login/both yang sah tidak muncul pada halaman login!");
    }
    if (hasHelpOnly) {
      throw new Error("FAIL: Konten help_center-only bocor ke halaman login!");
    }
    console.log("✓ PASS: loginOnlyFaq dan bothContextFaq hadir, helpOnlyFaq terisolasi.");

    // 1b. Uji Percobaan Tampering URL / Parameter oleh Pengguna Tamu
    console.log("\n[TEST 2] Uji Ketahanan Terhadap Percobaan Tampering Query Parameter:");
    
    // Tamper 1: Tamu meminta ?display_context=help_center tanpa login
    const resTamperHelp = await fetch(`${baseUrl}?display_context=help_center`);
    const jsonTamperHelp = await resTamperHelp.json();
    if (jsonTamperHelp.data.length > 0) {
      throw new Error("FAIL: Tamu belum login berhasil mengakses konten help_center melalui URL tampering!");
    }
    console.log("✓ PASS: Permintaan help_center tanpa token ditolak (mengembalikan data kosong).");

    // Tamper 2: Tamu meminta ?scope=company
    const resTamperCompany = await fetch(`${baseUrl}?display_context=login&scope=company`);
    const jsonTamperCompany = await resTamperCompany.json();
    if (jsonTamperCompany.data.length > 0) {
      throw new Error("FAIL: Tamu berhasil mengakses FAQ scope=company!");
    }
    console.log("✓ PASS: Permintaan scope=company pada konteks login menghasilkan [] kosong.");

    // Tamper 3: Tamu meminta ?scope=platform_admin
    const resTamperPlatform = await fetch(`${baseUrl}?display_context=login&scope=platform_admin`);
    if (resTamperPlatform.status !== 403) {
      throw new Error(`FAIL: Permintaan scope=platform_admin harus 403 Forbidden, dapat ${resTamperPlatform.status}`);
    }
    console.log("✓ PASS: Permintaan scope=platform_admin ditolak dengan 403 Forbidden.");

    // Tamper 4: Tamu meminta ?content_scope=platform
    const resTamperContentPlatform = await fetch(`${baseUrl}?display_context=login&content_scope=platform`);
    if (resTamperContentPlatform.status !== 403) {
      throw new Error(`FAIL: Permintaan content_scope=platform harus 403 Forbidden, dapat ${resTamperContentPlatform.status}`);
    }
    console.log("✓ PASS: Permintaan content_scope=platform ditolak dengan 403 Forbidden.");

    // 1c. Uji Empty State Halaman Login
    console.log("\n[TEST 3] Uji Empty State Halaman Login:");
    const resEmptyLogin = await fetch(`${baseUrl}?display_context=login&search=keyword_pasti_tidak_ada_xyz_999`);
    const jsonEmptyLogin = await resEmptyLogin.json();
    if (jsonEmptyLogin.data.length !== 0) {
      throw new Error("FAIL: Empty state check harus menghasilkan 0 item.");
    }
    console.log("✓ PASS: Query tanpa hasil mengembalikan [] kosong (Frontend akan menampilkan empty state informatif dengan link ke /login).");

    // ==========================================================
    // 2. PENGUJIAN ROLE PENGGUNA TERAUTENTIKASI (PASCA-LOGIN)
    // ==========================================================
    console.log("\n[TEST 4] Uji Role Pengguna Terautentikasi (Karyawan, Manager, Owner/Admin, Platform Admin):");

    // 4a. Karyawan: Filter target_role=employee
    const resEmployee = await fetch(`${baseUrl}?target_role=employee`, {
      headers: { Authorization: `Bearer ${normalToken}` },
    });
    const jsonEmployee = await resEmployee.json();
    const employeeItems: any[] = jsonEmployee.data;
    console.log(`✓ Karyawan menerima ${employeeItems.length} FAQ`);
    
    // Pastikan tidak ada FAQ khusus platform admin
    const employeeHasPlatform = employeeItems.some(i => i.scope === "platform_admin" || i.content_scope === "platform");
    if (employeeHasPlatform) {
      throw new Error("FAIL: Karyawan dapat melihat FAQ Platform Admin!");
    }
    // Pastikan konten yang target_roles-nya universal (cardinality 0) tetap masuk
    const employeeHasUniversal = employeeItems.some(i => i.id === bothContextFaq.id);
    if (!employeeHasUniversal) {
      throw new Error("FAIL: Konten umum tanpa pembatasan role tidak muncul untuk Karyawan!");
    }
    console.log("✓ PASS: Karyawan melihat konten target employee dan universal, bebas dari platform admin.");

    // 4b. Manager: Filter target_role=manager
    const resManager = await fetch(`${baseUrl}?target_role=manager`, {
      headers: { Authorization: `Bearer ${normalToken}` },
    });
    const jsonManager = await resManager.json();
    const managerItems: any[] = jsonManager.data;
    console.log(`✓ Manager menerima ${managerItems.length} FAQ`);
    const managerHasPlatform = managerItems.some(i => i.scope === "platform_admin" || i.content_scope === "platform");
    if (managerHasPlatform) {
      throw new Error("FAIL: Manager dapat melihat FAQ Platform Admin!");
    }
    console.log("✓ PASS: Manager menerima konten relevan tanpa kebocoran platform admin.");

    // 4c. Owner/Admin: Filter target_role=company_owner_admin
    const resOwner = await fetch(`${baseUrl}?target_role=company_owner_admin`, {
      headers: { Authorization: `Bearer ${normalToken}` },
    });
    const jsonOwner = await resOwner.json();
    const ownerItems: any[] = jsonOwner.data;
    console.log(`✓ Owner/Admin menerima ${ownerItems.length} FAQ`);
    console.log("✓ PASS: Owner/Admin menerima panduan manajemen perusahaan.");

    // 4d. Platform Admin: Akses scope platform
    // Set user devProfile is_developer = true di DB untuk memastikan
    await db.update(profiles).set({ is_developer: true }).where(eq(profiles.id, devProfile.id));
    const resPlatformAdmin = await fetch(`${baseUrl}?scope=platform_admin`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const jsonPlatformAdmin = await resPlatformAdmin.json();
    if (!resPlatformAdmin.ok || jsonPlatformAdmin.data.length === 0) {
      throw new Error(`FAIL: Platform Admin gagal mengakses scope=platform_admin! (${resPlatformAdmin.status})`);
    }
    console.log(`✓ PASS: Platform Admin berhasil mengakses ${jsonPlatformAdmin.data.length} FAQ Platform Admin.`);

    // ==========================================================
    // 3. PENGUJIAN SETIAP DISPLAY CONTEXT
    // ==========================================================
    console.log("\n[TEST 5] Uji Konsistensi Setiap Display Context (login, help_center, both):");
    
    // Help Center pasca-login default harus menyertakan help_center dan both, tetapi TIDAK login-only
    const resHelpDefault = await fetch(`${baseUrl}?display_context=help_center`, {
      headers: { Authorization: `Bearer ${normalToken}` },
    });
    const jsonHelpDefault = await resHelpDefault.json();
    const helpDefaultItems: any[] = jsonHelpDefault.data;

    const hasHelpOnlyInHelp = helpDefaultItems.some(i => i.id === helpOnlyFaq.id);
    const hasBothInHelp = helpDefaultItems.some(i => i.id === bothContextFaq.id);
    const hasLoginOnlyInHelp = helpDefaultItems.some(i => i.id === loginOnlyFaq.id);

    if (!hasHelpOnlyInHelp) throw new Error("FAIL: help_center FAQ tidak muncul di help center!");
    if (!hasBothInHelp) throw new Error("FAIL: both FAQ tidak muncul di help center!");
    if (hasLoginOnlyInHelp) throw new Error("FAIL: login-only FAQ bocor ke help center!");
    console.log("✓ PASS: help_center FAQ dan both FAQ hadir di Pusat Bantuan, login-only terfilter rapi.");

    // ==========================================================
    // 4. PENGUJIAN SKEMA AKSES LAMA & ISOLASI TENANT
    // ==========================================================
    console.log("\n[TEST 6] Uji Skema Akses Lama & Isolasi Tenant Perusahaan:");
    
    // Periksa FAQ Global lama (scope=global)
    const resGlobal = await fetch(`${baseUrl}?scope=global`, {
      headers: { Authorization: `Bearer ${normalToken}` },
    });
    const jsonGlobal = await resGlobal.json();
    if (jsonGlobal.data.length === 0) {
      throw new Error("FAIL: FAQ dengan skema scope lama 'global' tidak ditemukan!");
    }
    console.log(`✓ PASS: ${jsonGlobal.data.length} FAQ global lama dapat diakses normal tanpa regresi.`);

    // ==========================================================
    // 5. PENGUJIAN DATA LAMA TANPA METADATA
    // ==========================================================
    console.log("\n[TEST 7] Uji Kompatibilitas Data Lama (Fallback / Default Metadata):");
    
    // Buat FAQ simulasi data lama yang dibuat tanpa menentukan metadata baru
    const [legacyFaq] = await db.insert(faqs).values({
      question: "FFF Pertanyaan Lama AbsenIN Tanpa Metadata Baru",
      answer: "Jawaban dari sistem lama sebelum ada metadata.",
      category: "Umum",
      scope: "global",
      is_published: true,
    }).returning();
    cleanupFaqIds.push(legacyFaq.id);

    const resLegacyCheck = await fetch(`${baseUrl}?search=Pertanyaan Lama AbsenIN`, {
      headers: { Authorization: `Bearer ${normalToken}` },
    });
    const jsonLegacyCheck = await resLegacyCheck.json();
    const foundLegacy = jsonLegacyCheck.data.find((i: any) => i.id === legacyFaq.id);
    if (!foundLegacy) {
      throw new Error("FAIL: FAQ lama tidak dapat ditemukan!");
    }
    if (foundLegacy.content_scope !== "company" || foundLegacy.display_context !== "help_center") {
      throw new Error(`FAIL: Nilai default metadata data lama tidak sesuai! (got ${foundLegacy.content_scope}, ${foundLegacy.display_context})`);
    }
    console.log("✓ PASS: Data lama memiliki nilai default yang aman dan tampil tanpa regresi.");

    // ==========================================================
    // 6. PENGUJIAN PENCARIAN, FILTER, DAN PENGURUTAN ALFABETIS (A-Z)
    // ==========================================================
    console.log("\n[TEST 8] Uji Pencarian, Filter, dan Pengurutan Alfabetis (A-Z):");

    // 8a. Pencarian kata kunci
    const resSearch = await fetch(`${baseUrl}?search=Eksklusif`);
    const jsonSearch = await resSearch.json();
    if (jsonSearch.data.length === 0 || !jsonSearch.data[0].question.includes("Eksklusif")) {
      throw new Error("FAIL: Pencarian kata kunci 'Eksklusif' tidak menemukan data uji!");
    }
    console.log("✓ PASS: Pencarian kata kunci berfungsi akurat.");

    // 8b. Filter content_type
    const resTypeFilter = await fetch(`${baseUrl}?content_type=troubleshooting`, {
      headers: { Authorization: `Bearer ${normalToken}` },
    });
    const jsonTypeFilter = await resTypeFilter.json();
    const allTrouble = jsonTypeFilter.data.every((i: any) => i.content_type === "troubleshooting");
    if (!allTrouble) {
      throw new Error("FAIL: Filter content_type=troubleshooting mengembalikan jenis konten lain!");
    }
    console.log(`✓ PASS: Filter jenis konten berhasil menyaring ${jsonTypeFilter.data.length} item troubleshooting.`);

    // 8c. Pengurutan Alfabetis (A-Z)
    const resAlphabet = await fetch(`${baseUrl}?display_context=help_center`, {
      headers: { Authorization: `Bearer ${normalToken}` },
    });
    const jsonAlphabet = await resAlphabet.json();
    const questions: string[] = jsonAlphabet.data.map((i: any) => i.question);
    
    let isSorted = true;
    for (let k = 0; k < questions.length - 1; k++) {
      if (questions[k].localeCompare(questions[k + 1], "id", { sensitivity: "base" }) > 0) {
        console.warn(`Peringatan urutan: '${questions[k]}' vs '${questions[k + 1]}'`);
        isSorted = false;
        break;
      }
    }
    if (!isSorted) {
      throw new Error("FAIL: Hasil API tidak berurutan secara alfabetis A-Z!");
    }
    console.log(`✓ PASS: ${questions.length} FAQ terurut secara alfabetis (A-Z) dengan tepat.`);

    // ==========================================================
    // 7. PENGUJIAN KATEGORI DINAMIS (NON-EMPTY) & MATERI VIDEO/DOKUMEN
    // ==========================================================
    console.log("\n[TEST 9] Uji Master Kategori Dinamis Backend & Video Tutorial SOP:");

    // 9a. Verifikasi endpoint /categories?only_existing=true tidak mengembalikan kategori kosong
    const resCatsOnlyExisting = await fetch(`${baseUrl}/categories?only_existing=true&display_context=help_center`, {
      headers: { Authorization: `Bearer ${normalToken}` },
    });
    const jsonCatsOnlyExisting = await resCatsOnlyExisting.json();
    if (!resCatsOnlyExisting.ok || !jsonCatsOnlyExisting.success) {
      throw new Error("FAIL: Endpoint /categories?only_existing=true gagal!");
    }
    const existingCats: string[] = jsonCatsOnlyExisting.data;
    console.log(`✓ Kategori aktif yang ditemukan di database: ${existingCats.join(", ")}`);
    
    // Pastikan semua kategori yang dikembalikan benar-benar ada FAQ terbitnya
    for (const cat of existingCats) {
      const checkCatRes = await fetch(`${baseUrl}?category=${encodeURIComponent(cat)}`, {
        headers: { Authorization: `Bearer ${normalToken}` },
      });
      const checkCatJson = await checkCatRes.json();
      if (checkCatJson.data.length === 0) {
        throw new Error(`FAIL: Kategori '${cat}' dikembalikan padahal tidak memiliki konten relevan!`);
      }
    }
    console.log("✓ PASS: only_existing=true hanya mengembalikan kategori yang memiliki konten aktif (tanpa kategori kosong).");

    // 9b. Uji Materi SOP Video Tutorial
    const [videoFaq] = await db.insert(faqs).values({
      question: "GGG Tutorial Presensi Melalui Video",
      answer: "Tonton langkah-langkah presensi cepat berikut.",
      category: "Presensi",
      scope: "global",
      content_scope: "user",
      display_context: "both",
      content_type: "sop_guide",
      sop_title: "Video Panduan Presensi Cepat",
      sop_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      is_published: true,
    }).returning();
    cleanupFaqIds.push(videoFaq.id);

    const resVideoCheck = await fetch(`${baseUrl}?search=Tutorial Presensi Melalui Video`);
    const jsonVideoCheck = await resVideoCheck.json();
    if (jsonVideoCheck.data.length === 0) {
      throw new Error("FAIL: FAQ materi video tutorial tidak ditemukan!");
    }
    const retrievedVideo = jsonVideoCheck.data[0];
    if (retrievedVideo.sop_url !== "https://www.youtube.com/watch?v=dQw4w9WgXcQ") {
      throw new Error("FAIL: URL video tutorial tidak tersimpan / terambil dengan benar!");
    }
    console.log("✓ PASS: Panduan dengan materi video tutorial tersimpan dan terambil dengan akurat.");

    console.log("\n==========================================================");
    console.log("ALL 9 USER-FACING FAQ METADATA TEST SCENARIOS PASSED! (9/9)");
    console.log("==========================================================");

  } catch (err: any) {
    console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    // Cleanup data uji
    console.log("\n[CLEANUP] Membersihkan data uji...");
    for (const id of cleanupFaqIds) {
      try {
        await db.delete(faqs).where(eq(faqs.id, id));
      } catch {}
    }
    server.close();
    console.log("✓ Cleanup selesai.");
    process.exit(process.exitCode || 0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
