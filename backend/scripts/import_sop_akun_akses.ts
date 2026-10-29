import fs from "fs";
import path from "path";
import { db } from "../src/db";
import { faqs } from "../src/db/schema";
import { sql, eq } from "drizzle-orm";

interface JsonStep {
  step: number;
  title: string;
  instruction: string;
}

interface JsonSection {
  sectionId: string;
  title: string;
  steps?: JsonStep[];
  items?: (string | { question: string; answer: string })[];
}

interface SopJsonData {
  schemaVersion: string;
  contentType: string;
  metadata: {
    id: string;
    title: string;
    slug: string;
    description: string;
    scope: string;
    category: string;
    subcategory: string[];
    roles: string[];
    audience: string;
    tags: string[];
    language: string;
    status: string;
    version: string;
    sopUrl: string;
    documentFormat: string;
    sourceDocument: string;
    sourceNotes: string;
  };
  content: JsonSection[];
}

/**
 * Format structured JSON content into rich HTML for faqs.answer
 * Strict compliance with allowed TipTap HTML tags: p, strong, h3, h4, ol, ul, li, blockquote
 */
function buildHtmlAnswer(jsonData: SopJsonData): string {
  const meta = jsonData.metadata;
  const sections = jsonData.content;

  let html = "";

  // 1. Ringkasan Dokumen & Metadata Header
  html += `<blockquote>`;
  html += `<p><strong>Deskripsi Dokumen:</strong> ${meta.description}</p>`;
  html += `<p><strong>Kategori:</strong> ${meta.category} | <strong>Versi:</strong> ${meta.version} (Draft)</p>`;
  html += `<p><strong>Subkategori:</strong> ${meta.subcategory.join(", ")}</p>`;
  html += `<p><strong>Target Pengguna:</strong> ${meta.audience}</p>`;
  html += `<p><strong>Dokumen Sumber:</strong> ${meta.sourceDocument}</p>`;
  html += `<p><strong>Tag Terkait:</strong> ${meta.tags.map(t => `#${t}`).join(" ")}</p>`;
  html += `</blockquote>`;

  // 2. Loop setiap bagian konten sesuai dokumen sumber
  for (const sec of sections) {
    html += `<h3>${sec.title}</h3>`;

    if (sec.steps && sec.steps.length > 0) {
      html += `<ol>`;
      for (const step of sec.steps) {
        html += `<li><p><strong>Langkah ${step.step} - ${step.title}:</strong> ${step.instruction}</p></li>`;
      }
      html += `</ol>`;
    } else if (sec.items && sec.items.length > 0) {
      if (typeof sec.items[0] === "string") {
        html += `<ul>`;
        for (const item of sec.items as string[]) {
          html += `<li><p>${item}</p></li>`;
        }
        html += `</ul>`;
      } else {
        for (const qa of sec.items as { question: string; answer: string }[]) {
          html += `<p><strong>T: ${qa.question}</strong><br/>J: ${qa.answer}</p>`;
        }
      }
    }
  }

  return html;
}

export async function importSopAkunDanAkses() {
  console.log("==========================================================");
  console.log("IMPORT SOP AKUN DAN AKSES PERUSAHAAN KE ABSENIN");
  console.log("==========================================================\n");

  // 1. Baca file absenin_sop_akun_dan_akses.json
  const jsonPath = path.resolve(__dirname, "../../absenin_sop_akun_dan_akses.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`File sumber tidak ditemukan di: ${jsonPath}`);
  }

  const rawJson = fs.readFileSync(jsonPath, "utf-8");
  const sopData: SopJsonData = JSON.parse(rawJson);
  console.log(`✓ Berhasil membaca file sumber: ${sopData.metadata.title} (v${sopData.metadata.version})`);

  // 2. Petakan metadata ke skema database faqs
  // Audit & Penyesuaian Pemetaan:
  // - metadata.title ("Memulai dan Mengelola Akun Perusahaan") -> faqs.question
  // - SOP Document Title -> faqs.sop_title: "SOP Akun dan Akses Perusahaan (v1.0)"
  // - metadata.sopUrl ("") -> faqs.sop_url: null (biarkan kosong per instruksi)
  // - metadata.scope ("global") -> faqs.scope: "global"
  // - metadata.roles (["pengguna", "owner_perusahaan", "admin_perusahaan", "manager", "karyawan"])
  //   -> faqs.target_roles: ["company_owner_admin", "manager", "employee"], faqs.content_scope: "user"
  // - metadata.category ("Akun dan Akses") -> faqs.category: "Akun" (Kategori standar sistem AbsenIN)
  // - metadata.status ("draft") -> faqs.is_published: false, faqs.needs_review: true
  // - metadata.contentType ("sop") -> faqs.content_type: "sop_guide"
  // - display_context -> "both" (berlaku di alur login/registrasi & Pusat Bantuan)

  const richHtmlAnswer = buildHtmlAnswer(sopData);

  const targetPayload = {
    question: sopData.metadata.title,
    answer: richHtmlAnswer,
    category: "Akun", // Kategori standar sistem yang menampung 'Akun dan Akses'
    scope: "global" as const,
    content_scope: "user" as const,
    target_roles: ["company_owner_admin", "manager", "employee"],
    content_type: "sop_guide" as const,
    display_context: "both" as const,
    sop_title: `SOP Akun dan Akses Perusahaan (v${sopData.metadata.version})`,
    sop_url: null, // Dikosongkan sesuai instruksi
    video_title: null,
    video_url: null,
    is_published: false, // Pertahankan DRAFT
    needs_review: true,  // Tandai butuh tinjauan sebelum publikasi
    order_index: 1,
    company_id: null,
    author_id: null,
  };

  console.log("\n[PEMETAAN METADATA]");
  console.log(`- Judul (question): ${targetPayload.question}`);
  console.log(`- Judul SOP (sop_title): ${targetPayload.sop_title}`);
  console.log(`- Kategori Sistem (category): ${targetPayload.category} (dari "${sopData.metadata.category}")`);
  console.log(`- Cakupan (scope): ${targetPayload.scope}`);
  console.log(`- Cakupan Konten (content_scope): ${targetPayload.content_scope}`);
  console.log(`- Target Roles: [${targetPayload.target_roles.join(", ")}]`);
  console.log(`- Jenis Konten (content_type): ${targetPayload.content_type}`);
  console.log(`- Konteks Tampilan (display_context): ${targetPayload.display_context}`);
  console.log(`- Status Publikasi (is_published): ${targetPayload.is_published} (DRAFT)`);
  console.log(`- Status Review (needs_review): ${targetPayload.needs_review}`);
  console.log(`- Tautan PDF (sop_url): ${targetPayload.sop_url ?? "(KOSONG / NULL)"}`);

  // 3. Mekanisme Upsert untuk mencegah duplikasi data
  console.log("\n[MEMERIKSA DUPLIKASI DATA]");
  const existingRecord = await db.execute(sql`
    SELECT id, question, scope, is_published, deleted_at 
    FROM faqs 
    WHERE (question = ${targetPayload.question} OR sop_title = ${targetPayload.sop_title})
      AND scope = 'global'
    LIMIT 1;
  `);

  let recordId: string;

  if (existingRecord.rows.length > 0) {
    const existing = existingRecord.rows[0] as any;
    recordId = existing.id;
    console.log(`⚠ Ditemukan SOP yang sudah ada (ID: ${recordId}). Melakukan pembaruan (upsert)...`);

    await db
      .update(faqs)
      .set({
        question: targetPayload.question,
        answer: targetPayload.answer,
        category: targetPayload.category,
        scope: targetPayload.scope,
        content_scope: targetPayload.content_scope,
        target_roles: targetPayload.target_roles,
        content_type: targetPayload.content_type,
        display_context: targetPayload.display_context,
        sop_title: targetPayload.sop_title,
        sop_url: targetPayload.sop_url,
        video_title: targetPayload.video_title,
        video_url: targetPayload.video_url,
        is_published: targetPayload.is_published,
        needs_review: targetPayload.needs_review,
        order_index: targetPayload.order_index,
        deleted_at: null, // Pastikan tidak terhapus
        updated_at: new Date(),
      })
      .where(eq(faqs.id, recordId));

    console.log(`✓ Data SOP berhasil diperbarui tanpa membuat duplikat.`);
  } else {
    console.log("ℹ Tidak ditemukan duplikat sebelumnya. Menyimpan SOP baru...");
    const [inserted] = await db
      .insert(faqs)
      .values({
        ...targetPayload,
        deleted_at: null,
      })
      .returning({ id: faqs.id });

    recordId = inserted.id;
    console.log(`✓ SOP berhasil dimasukkan ke sistem dengan ID: ${recordId}`);
  }

  // 4. Validasi Hasil Import & Hak Akses
  console.log("\n[VALIDASI DATABASE & INTEGRITAS KONTEN]");
  const checkDb = await db.execute(sql`
    SELECT id, question, sop_title, sop_url, category, scope, content_scope, target_roles, content_type, display_context, is_published, needs_review, deleted_at, length(answer) as answer_len
    FROM faqs 
    WHERE id = ${recordId};
  `);

  if (checkDb.rows.length === 0) {
    throw new Error("FAIL: Record SOP tidak ditemukan di database setelah import!");
  }

  const row = checkDb.rows[0] as any;
  console.log(`✓ Record ID: ${row.id}`);
  console.log(`✓ Question: "${row.question}"`);
  console.log(`✓ SOP Title: "${row.sop_title}"`);
  console.log(`✓ SOP URL: ${row.sop_url === null ? "null (Valid, tidak ada URL palsu)" : row.sop_url}`);
  console.log(`✓ Category: ${row.category}`);
  console.log(`✓ Scope: ${row.scope}`);
  console.log(`✓ Content Scope: ${row.content_scope}`);
  console.log(`✓ Content Type: ${row.content_type}`);
  console.log(`✓ Display Context: ${row.display_context}`);
  console.log(`✓ Status Publikasi: is_published = ${row.is_published} (Sesuai kriteria: DRAFT)`);
  console.log(`✓ Status Review: needs_review = ${row.needs_review}`);
  console.log(`✓ Panjang HTML Jawaban: ${row.answer_len} karakter`);

  if (row.is_published !== false) {
    throw new Error("FAIL: Status SOP tidak boleh terbit otomatis! Harus draft.");
  }
  if (row.sop_url !== null) {
    throw new Error("FAIL: SOP URL harus null/kosong!");
  }
  if (row.scope !== "global") {
    throw new Error("FAIL: Scope SOP harus global!");
  }

  // 5. Validasi Otorisasi & Visibilitas Publik vs Manajemen
  console.log("\n[VALIDASI VISIBILITAS AKSES (ISOLASI DRAFT)]");
  // a. Periksa visibilitas di endpoint publik (GET /api/faqs)
  const publicQuery = await db.execute(sql`
    SELECT id FROM faqs 
    WHERE id = ${recordId} 
      AND deleted_at IS NULL 
      AND is_published = true;
  `);
  if (publicQuery.rows.length > 0) {
    throw new Error("FAIL: SOP yang berstatus draft tidak boleh muncul di query publik!");
  }
  console.log("✓ Berhasil diverifikasi: SOP Draft TIDAK muncul di Pusat Bantuan publik (/bantuan) sebelum diterbitkan.");

  // b. Periksa visibilitas di endpoint manajemen (GET /api/faqs/manage)
  const manageQuery = await db.execute(sql`
    SELECT id, question, is_published, needs_review 
    FROM faqs 
    WHERE id = ${recordId} 
      AND deleted_at IS NULL 
      AND scope = 'global';
  `);
  if (manageQuery.rows.length === 0) {
    throw new Error("FAIL: SOP tidak ditemukan pada query manajemen Platform Admin!");
  }
  console.log("✓ Berhasil diverifikasi: SOP muncul di Manajemen SOP (/platform-admin/faq) untuk pengelola berwenang.");

  console.log("\n==========================================================");
  console.log("IMPORT & INTEGRASI SOP AKUN DAN AKSES SELESAI DENGAN SUKSES!");
  console.log("==========================================================");

  return {
    success: true,
    recordId,
    metadata: targetPayload,
  };
}

// Jalankan jika dipanggil via CLI
if (require.main === module) {
  importSopAkunDanAkses()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\n❌ Terjadi kesalahan saat import SOP:", err);
      process.exit(1);
    });
}
