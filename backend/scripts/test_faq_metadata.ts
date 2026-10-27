import { db } from "../src/db";
import { faqs, companies, profiles } from "../src/db/schema";
import { eq, sql, and, isNull } from "drizzle-orm";
import { STANDARD_CATEGORIES, createFaqSchema, updateFaqSchema } from "../src/routes/faqs";

async function runMetadataTests() {
  console.log("=== STARTING BACKEND FAQ METADATA TESTS ===");

  try {
    // -------------------------------------------------------------
    // 1. Verifikasi Standard Categories
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Verifikasi Kategori Standar...");
    const expectedCategories = [
      "Akun",
      "Perusahaan",
      "Absensi",
      "Persetujuan",
      "Tugas",
      "Laporan",
      "Analitik",
      "Sistem",
      "Pengaturan",
    ];

    for (const cat of expectedCategories) {
      if (!STANDARD_CATEGORIES.includes(cat)) {
        throw new Error(`FAILED: Kategori standar '${cat}' tidak ditemukan di STANDARD_CATEGORIES!`);
      }
    }
    console.log(`✓ PASS: Semua 9 kategori standar hadir: ${expectedCategories.join(", ")}`);

    // -------------------------------------------------------------
    // 2. Verifikasi Kompatibilitas Data Lama (Needs Review & Defaults)
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Verifikasi Kompatibilitas Data Lama...");
    const legacyRows = await db.execute(sql`
      SELECT id, question, scope, content_scope, target_roles, content_type, display_context, needs_review
      FROM faqs
      WHERE deleted_at IS NULL;
    `);

    console.log(`✓ Ditemukan ${legacyRows.rows.length} FAQ aktif di database.`);
    if (legacyRows.rows.length === 0) {
      throw new Error("FAILED: Tidak ada FAQ di database untuk diverifikasi.");
    }

    for (const r of legacyRows.rows as any[]) {
      if (r.content_scope === null || r.content_scope === undefined) {
        throw new Error(`FAILED: FAQ ID ${r.id} memiliki content_scope null!`);
      }
      if (!Array.isArray(r.target_roles)) {
        throw new Error(`FAILED: FAQ ID ${r.id} target_roles bukan array!`);
      }
      if (!r.content_type) {
        throw new Error(`FAILED: FAQ ID ${r.id} memiliki content_type null!`);
      }
      if (!r.display_context) {
        throw new Error(`FAILED: FAQ ID ${r.id} memiliki display_context null!`);
      }
      if (r.needs_review !== true && r.needs_review !== false) {
        throw new Error(`FAILED: FAQ ID ${r.id} needs_review tidak bernilai boolean!`);
      }
    }
    console.log("✓ PASS: Seluruh FAQ lama memiliki metadata valid (content_scope, target_roles, content_type, display_context, needs_review).");

    // -------------------------------------------------------------
    // 3. Uji Pembuatan FAQ Baru dengan Metadata Lengkap
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Uji Zod Validation & Insert FAQ Baru dengan Metadata...");
    
    // Ambil sampel company & profile
    const sampleProfiles = await db.select().from(profiles).limit(1);
    const sampleCompanies = await db.select().from(companies).limit(1);
    const authorId = sampleProfiles[0]?.id || null;
    const companyId = sampleCompanies[0]?.id || null;

    const newFaqPayload = {
      question: "Bagaimana cara menangani kendala koneksi saat presensi (Troubleshooting)?",
      answer: "Pastikan sinyal seluler atau Wi-Fi aktif dan mode hemat daya dimatikan.",
      category: "Absensi",
      scope: "company" as const,
      content_scope: "company" as const,
      target_roles: ["employee", "manager"] as ("employee" | "manager")[],
      content_type: "troubleshooting" as const,
      display_context: "both" as const,
      needs_review: false,
      is_published: true,
      order_index: 99,
    };

    const parseResult = createFaqSchema.safeParse(newFaqPayload);
    if (!parseResult.success) {
      throw new Error(`FAILED: Zod validation failed: ${JSON.stringify(parseResult.error.issues)}`);
    }
    console.log("✓ PASS: Validasi Zod createFaqSchema berhasil dengan metadata baru.");

    const inserted = await db
      .insert(faqs)
      .values({
        company_id: companyId,
        author_id: authorId,
        question: newFaqPayload.question,
        answer: newFaqPayload.answer,
        category: newFaqPayload.category,
        scope: newFaqPayload.scope,
        content_scope: newFaqPayload.content_scope,
        target_roles: newFaqPayload.target_roles,
        content_type: newFaqPayload.content_type,
        display_context: newFaqPayload.display_context,
        needs_review: newFaqPayload.needs_review,
        is_published: newFaqPayload.is_published,
        order_index: newFaqPayload.order_index,
      })
      .returning();

    const createdFaq = inserted[0];
    console.log(`✓ FAQ baru berhasil disimpan dengan id: ${createdFaq.id}`);
    if (
      createdFaq.content_scope !== "company" ||
      createdFaq.content_type !== "troubleshooting" ||
      createdFaq.display_context !== "both" ||
      createdFaq.needs_review !== false ||
      createdFaq.target_roles.length !== 2
    ) {
      throw new Error("FAILED: Data tersimpan tidak cocok dengan payload!");
    }
    console.log("✓ PASS: Field metadata tersimpan akurat di database.");

    // -------------------------------------------------------------
    // 4. Uji Filter Berdasarkan Metadata
    // -------------------------------------------------------------
    console.log("\n[TEST 4] Uji Filter Query SQL berdasarkan Metadata...");

    // Filter by content_type = 'troubleshooting'
    const filterType = await db.execute(sql`
      SELECT id, question, content_type FROM faqs 
      WHERE deleted_at IS NULL AND content_type = 'troubleshooting' AND id = ${createdFaq.id};
    `);
    if (filterType.rows.length !== 1) {
      throw new Error("FAILED: Filter content_type gagal menemukan FAQ yang dibuat.");
    }
    console.log("✓ PASS: Filter content_type = 'troubleshooting' berhasil.");

    // Filter by target_role = 'employee'
    const filterRole = await db.execute(sql`
      SELECT id, question, target_roles FROM faqs 
      WHERE deleted_at IS NULL AND 'employee' = ANY(target_roles) AND id = ${createdFaq.id};
    `);
    if (filterRole.rows.length !== 1) {
      throw new Error("FAILED: Filter target_role gagal menemukan FAQ yang dibuat.");
    }
    console.log("✓ PASS: Filter target_role 'employee' = ANY(target_roles) berhasil.");

    // Filter by display_context = 'login' (should match 'both' because 'both' is visible on login)
    const filterDisplayContext = await db.execute(sql`
      SELECT id, question, display_context FROM faqs 
      WHERE deleted_at IS NULL AND display_context IN ('login', 'both') AND id = ${createdFaq.id};
    `);
    if (filterDisplayContext.rows.length !== 1) {
      throw new Error("FAILED: Filter display_context login/both gagal.");
    }
    console.log("✓ PASS: Filter display_context IN ('login', 'both') berhasil.");

    // Filter by needs_review = false
    const filterNeedsReview = await db.execute(sql`
      SELECT id, question, needs_review FROM faqs 
      WHERE deleted_at IS NULL AND needs_review = false AND id = ${createdFaq.id};
    `);
    if (filterNeedsReview.rows.length !== 1) {
      throw new Error("FAILED: Filter needs_review = false gagal.");
    }
    console.log("✓ PASS: Filter needs_review = false berhasil.");

    // -------------------------------------------------------------
    // 5. Uji Pembaruan Metadata (Update FAQ)
    // -------------------------------------------------------------
    console.log("\n[TEST 5] Uji Pembaruan Metadata (PUT update)...");
    const updatePayload = {
      content_type: "tips_best_practice" as const,
      display_context: "help_center" as const,
      target_roles: ["manager", "company_owner_admin"] as ("manager" | "company_owner_admin")[],
      needs_review: true, // tandai ulang untuk ditinjau
    };

    const updateCheck = updateFaqSchema.safeParse(updatePayload);
    if (!updateCheck.success) {
      throw new Error(`FAILED: updateFaqSchema validation failed: ${JSON.stringify(updateCheck.error.issues)}`);
    }

    const updated = await db
      .update(faqs)
      .set({
        content_type: updatePayload.content_type,
        display_context: updatePayload.display_context,
        target_roles: updatePayload.target_roles,
        needs_review: updatePayload.needs_review,
        updated_at: sql`now()`,
      })
      .where(eq(faqs.id, createdFaq.id))
      .returning();

    const updatedFaq = updated[0];
    if (
      updatedFaq.content_type !== "tips_best_practice" ||
      updatedFaq.display_context !== "help_center" ||
      updatedFaq.needs_review !== true ||
      !updatedFaq.target_roles.includes("company_owner_admin")
    ) {
      throw new Error("FAILED: Pembaruan metadata tidak tercermin pada data terupdate!");
    }
    console.log("✓ PASS: Metadata berhasil diperbarui (content_type: tips_best_practice, display_context: help_center, needs_review: true).");

    // -------------------------------------------------------------
    // 6. Uji Soft Delete
    // -------------------------------------------------------------
    console.log("\n[TEST 6] Uji Soft Delete...");
    await db.update(faqs).set({ deleted_at: sql`now()` }).where(eq(faqs.id, createdFaq.id));
    const deletedCheck = await db.execute(sql`
      SELECT id FROM faqs WHERE id = ${createdFaq.id} AND deleted_at IS NULL;
    `);
    if (deletedCheck.rows.length > 0) {
      throw new Error("FAILED: FAQ yang di-soft-delete masih muncul pada query aktif!");
    }
    console.log("✓ PASS: Soft delete berfungsi normal, data tidak muncul di query aktif.");

    // Hapus permanen data uji agar DB tetap bersih
    await db.delete(faqs).where(eq(faqs.id, createdFaq.id));
    console.log("✓ Cleanup data uji selesai.");

    console.log("\n==============================================");
    console.log("ALL BACKEND FAQ METADATA TESTS PASSED! (6/6)");
    console.log("==============================================");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    process.exit(1);
  }
}

runMetadataTests();
