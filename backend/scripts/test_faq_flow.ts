import { db } from '../src/db/index';
import { faqs, companies, profiles } from '../src/db/schema';
import { eq, sql, isNull, and } from 'drizzle-orm';

async function runTest() {
  console.log("=== STARTING FAQ FLOW & MULTI-TENANT AUDIT TEST ===");

  try {
    // 1. Ambil sampel profil & perusahaan yang ada di DB
    const sampleProfiles = await db.select({ id: profiles.id, email: profiles.email, isDev: profiles.is_developer }).from(profiles).limit(2);
    const sampleCompanies = await db.select({ id: companies.id, name: companies.name }).from(companies).limit(2);

    console.log(`✓ Sample profiles found: ${sampleProfiles.length}`);
    console.log(`✓ Sample companies found: ${sampleCompanies.length}`);

    const authorId = sampleProfiles[0]?.id || null;
    const companyA = sampleCompanies[0]?.id;
    const companyB = sampleCompanies[1]?.id;

    // 2. Verifikasi data awal (Global FAQs)
    const initialGlobalFaqs = await db.execute(sql`
      SELECT id, question, scope, is_published, sop_title, sop_url 
      FROM faqs 
      WHERE scope = 'global' AND deleted_at IS NULL;
    `);
    console.log(`✓ Initial Global FAQs in database: ${initialGlobalFaqs.rows.length}`);
    if (initialGlobalFaqs.rows.length === 0) {
      throw new Error("Initial global FAQs were not found. Expected seeded FAQs.");
    }

    // 3. Uji Publikasi & Draft: Buat FAQ Draft
    console.log("\n[TEST] 1. Pengujian Publikasi (Draft vs Terbit)...");
    const testDraftFaq = await db.insert(faqs).values({
      question: "Pertanyaan Uji Draft Khusus?",
      answer: "Ini adalah jawaban draft yang seharusnya tidak tampil ke publik.",
      category: "Uji Coba",
      scope: "global",
      is_published: false, // DRAFT
      author_id: authorId,
    }).returning();
    const draftId = testDraftFaq[0].id;
    console.log(`✓ Draft FAQ created with id: ${draftId}`);

    // Query simulasi endpoint publik (hanya is_published = true)
    const publicQueryCheck = await db.execute(sql`
      SELECT id FROM faqs 
      WHERE deleted_at IS NULL AND is_published = true AND id = ${draftId};
    `);
    if (publicQueryCheck.rows.length > 0) {
      throw new Error("FAILED: Draft FAQ appeared in public query!");
    }
    console.log("✓ PASS: Draft FAQ tersembunyi dari query publik.");

    // Ubah status ke terbit (Publish)
    await db.update(faqs).set({ is_published: true }).where(eq(faqs.id, draftId));
    const publishedQueryCheck = await db.execute(sql`
      SELECT id FROM faqs 
      WHERE deleted_at IS NULL AND is_published = true AND id = ${draftId};
    `);
    if (publishedQueryCheck.rows.length === 0) {
      throw new Error("FAILED: Published FAQ was not found in public query!");
    }
    console.log("✓ PASS: FAQ terbit berhasil tampil pada query publik setelah dipublikasikan.");

    // Hapus data uji draft
    await db.delete(faqs).where(eq(faqs.id, draftId));

    // 4. Uji Dokumen SOP (SOP Title & SOP URL)
    console.log("\n[TEST] 2. Pengujian Tautan Dokumen SOP...");
    const testSopFaq = await db.insert(faqs).values({
      question: "Bagaimana SOP Pengajuan Cuti Khusus?",
      answer: "Silakan unduh dokumen panduan SOP terlampir.",
      category: "SOP Kerja",
      scope: "global",
      sop_title: "Panduan SOP Cuti Khusus 2026.pdf",
      sop_url: "https://drive.google.com/file/d/test-doc-sop/view",
      is_published: true,
      author_id: authorId,
    }).returning();
    const sopFaqId = testSopFaq[0].id;

    const sopCheck = await db.select().from(faqs).where(eq(faqs.id, sopFaqId)).limit(1);
    if (!sopCheck[0].sop_title || !sopCheck[0].sop_url) {
      throw new Error("FAILED: SOP title or URL was not saved accurately!");
    }
    console.log(`✓ PASS: Field Dokumen SOP tersimpan akurat: ${sopCheck[0].sop_title} (${sopCheck[0].sop_url})`);

    // 5. Uji Isolasi Data Antar Perusahaan (Multi-Tenant Isolation)
    if (companyA && companyB) {
      console.log("\n[TEST] 3. Pengujian Isolasi Data Antarperusahaan (Company A vs Company B)...");
      const companyAFaq = await db.insert(faqs).values({
        company_id: companyA,
        question: "FAQ Khusus Karyawan Perusahaan A?",
        answer: "Hanya karyawan Perusahaan A yang boleh melihat FAQ ini.",
        category: "Kebijakan Kantor",
        scope: "company",
        is_published: true,
        author_id: authorId,
      }).returning();
      const compAFaqId = companyAFaq[0].id;

      // Query untuk user di Perusahaan A
      const queryCompanyA = await db.execute(sql`
        SELECT id FROM faqs 
        WHERE deleted_at IS NULL AND is_published = true 
          AND (scope = 'global' OR (scope = 'company' AND company_id = ${companyA}))
          AND id = ${compAFaqId};
      `);
      if (queryCompanyA.rows.length === 0) {
        throw new Error("FAILED: Company A member could not see Company A FAQ!");
      }
      console.log("✓ PASS: Karyawan Perusahaan A dapat melihat FAQ perusahaannya.");

      // Query untuk user di Perusahaan B (HARUS TERISOLASI / KOSONG)
      const queryCompanyB = await db.execute(sql`
        SELECT id FROM faqs 
        WHERE deleted_at IS NULL AND is_published = true 
          AND (scope = 'global' OR (scope = 'company' AND company_id = ${companyB}))
          AND id = ${compAFaqId};
      `);
      if (queryCompanyB.rows.length > 0) {
        throw new Error("DATA LEAK SECURITY VIOLATION: Company B member was able to see Company A FAQ!");
      }
      console.log("✓ PASS: Data terisolasi! Karyawan Perusahaan B TIDAK BISA melihat FAQ Perusahaan A.");

      // Bersihkan data uji company A
      await db.delete(faqs).where(eq(faqs.id, compAFaqId));
    }

    // 6. Uji CRUD & Soft Delete
    console.log("\n[TEST] 4. Pengujian Alur CRUD & Soft Delete...");
    // Update pertanyaan
    await db.update(faqs).set({
      question: "Bagaimana SOP Pengajuan Cuti Khusus (Updated)?",
      answer: "Jawaban telah diperbarui melalui alur CRUD edit.",
    }).where(eq(faqs.id, sopFaqId));

    const updatedCheck = await db.select().from(faqs).where(eq(faqs.id, sopFaqId)).limit(1);
    if (!updatedCheck[0].question.includes("(Updated)")) {
      throw new Error("FAILED: FAQ edit update was not applied!");
    }
    console.log("✓ PASS: Update FAQ (Edit) berhasil.");

    // Soft delete
    await db.update(faqs).set({ deleted_at: sql`now()` }).where(eq(faqs.id, sopFaqId));
    const deletedQueryCheck = await db.execute(sql`
      SELECT id FROM faqs WHERE deleted_at IS NULL AND id = ${sopFaqId};
    `);
    if (deletedQueryCheck.rows.length > 0) {
      throw new Error("FAILED: Soft-deleted FAQ still appeared in active query!");
    }
    console.log("✓ PASS: Soft Delete berhasil. Data dinonaktifkan tanpa merusak relasi database.");

    // Bersihkan permanen
    await db.delete(faqs).where(eq(faqs.id, sopFaqId));

    console.log("\n========================================================");
    console.log(">>> SEMUA PENGUJIAN BACKEND FAQ BERHASIL 100% <<<");
    console.log("========================================================");
    process.exit(0);
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

runTest();
