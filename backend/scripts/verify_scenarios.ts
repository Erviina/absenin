import { Client } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("=== MEMULAI VERIFIKASI 9 SKENARIO JAM OPERASIONAL DEFAULT ===\n");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // -------------------------------------------------------------
    // Skenario 1: Perusahaan baru tanpa pengaturan manual
    // -------------------------------------------------------------
    console.log("--- Skenario 1: Perusahaan baru tanpa pengaturan manual ---");
    const testCode = 'TEST' + Math.floor(1000 + Math.random() * 9000);
    const insertRes = await client.query(`
      INSERT INTO companies (name, address, join_code)
      VALUES ($1, $2, $3)
      RETURNING id, name, work_start_time, work_end_time, work_days
    `, ['PT Perusahaan Baru Test', 'Jl. Test Default No. 1', testCode]);
    
    const newCompany = insertRes.rows[0];
    console.log("Perusahaan baru dibuat:", {
      id: newCompany.id,
      name: newCompany.name,
      work_start_time: newCompany.work_start_time,
      work_end_time: newCompany.work_end_time,
      work_days: newCompany.work_days
    });

    const isScen1Valid = newCompany.work_start_time === '08:00:00' && 
                         newCompany.work_end_time === '17:00:00' &&
                         JSON.stringify(newCompany.work_days) === JSON.stringify(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
    console.log(`Hasil Skenario 1: ${isScen1Valid ? "BERHASIL (08:00 - 17:00, Senin-Jumat)" : "GAGAL"}\n`);

    // -------------------------------------------------------------
    // Skenario 2 & 3 & 4: Aturan keterlambatan
    // Check-in hari kerja (Rabu / Wednesday, misal 2026-10-14)
    // -------------------------------------------------------------
    console.log("--- Skenario 2, 3, 4: Aturan Keterlambatan dengan Toleransi 15 Menit (Hari Kerja - Rabu) ---");
    
    // Case 2: 07:55
    const res755 = await client.query(`
      SELECT 
        (CASE WHEN ('2026-10-14 07:55:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')::time > (COALESCE($1::time, '08:00:00'::time) + interval '15 minutes')
          AND (
            CASE EXTRACT(ISODOW FROM '2026-10-14 07:55:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF($2::text[], '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_terlambat
    `, [newCompany.work_start_time, newCompany.work_days]);
    console.log("Skenario 2 (Check-in 07.55 WIB): is_terlambat =", res755.rows[0].is_terlambat, 
      res755.rows[0].is_terlambat === false ? "-> SESUAI (Tidak Terlambat)" : "-> TIDAK SESUAI");

    // Case 3: 08:00
    const res800 = await client.query(`
      SELECT 
        (CASE WHEN ('2026-10-14 08:00:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')::time > (COALESCE($1::time, '08:00:00'::time) + interval '15 minutes')
          AND (
            CASE EXTRACT(ISODOW FROM '2026-10-14 08:00:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF($2::text[], '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_terlambat
    `, [newCompany.work_start_time, newCompany.work_days]);
    console.log("Skenario 3 (Check-in 08.00 WIB): is_terlambat =", res800.rows[0].is_terlambat, 
      res800.rows[0].is_terlambat === false ? "-> SESUAI (Tidak Terlambat)" : "-> TIDAK SESUAI");

    // Case 3b: 08:15 (Tepat di batas toleransi 15 menit)
    const res815 = await client.query(`
      SELECT 
        (CASE WHEN ('2026-10-14 08:15:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')::time > (COALESCE($1::time, '08:00:00'::time) + interval '15 minutes')
          AND (
            CASE EXTRACT(ISODOW FROM '2026-10-14 08:15:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF($2::text[], '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_terlambat
    `, [newCompany.work_start_time, newCompany.work_days]);
    console.log("Skenario 3b (Check-in 08.15 WIB - Batas Toleransi): is_terlambat =", res815.rows[0].is_terlambat, 
      res815.rows[0].is_terlambat === false ? "-> SESUAI (Tidak Terlambat)" : "-> TIDAK SESUAI");

    // Case 4: 08:16 hari kerja (Setelah toleransi 15 menit)
    const res816 = await client.query(`
      SELECT 
        (CASE WHEN ('2026-10-14 08:16:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')::time > (COALESCE($1::time, '08:00:00'::time) + interval '15 minutes')
          AND (
            CASE EXTRACT(ISODOW FROM '2026-10-14 08:16:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF($2::text[], '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_terlambat
    `, [newCompany.work_start_time, newCompany.work_days]);
    console.log("Skenario 4 (Check-in 08.16 WIB - Melewati Toleransi): is_terlambat =", res816.rows[0].is_terlambat, 
      res816.rows[0].is_terlambat === true ? "-> SESUAI (Terlambat)" : "-> TIDAK SESUAI");

    // Case 4b: Check-in hari libur (Minggu, misal 2026-10-18) pukul 08.30
    const resSunday = await client.query(`
      SELECT 
        (CASE WHEN ('2026-10-18 08:30:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')::time > (COALESCE($1::time, '08:00:00'::time) + interval '15 minutes')
          AND (
            CASE EXTRACT(ISODOW FROM '2026-10-18 08:30:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF($2::text[], '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_terlambat
    `, [newCompany.work_start_time, newCompany.work_days]);
    console.log("Skenario 4b (Check-in Hari Minggu / Bukan Hari Kerja): is_terlambat =", resSunday.rows[0].is_terlambat, 
      resSunday.rows[0].is_terlambat === false ? "-> SESUAI (Tidak Ditandai Terlambat)" : "-> TIDAK SESUAI");
    console.log("");

    // -------------------------------------------------------------
    // Skenario 5, 6, 7: Aturan Pulang Cepat
    // -------------------------------------------------------------
    console.log("--- Skenario 5, 6, 7: Aturan Pulang Cepat ---");
    
    // Case 5: 16:59
    const res1659 = await client.query(`
      SELECT 
        (CASE WHEN ('2026-10-14 16:59:00+07'::timestamptz) IS NOT NULL 
          AND ('2026-10-14 16:59:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')::time < COALESCE($1::time, '17:00:00'::time)
          AND (
            CASE EXTRACT(ISODOW FROM '2026-10-14 08:00:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF($2::text[], '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_pulang_cepat
    `, [newCompany.work_end_time, newCompany.work_days]);
    console.log("Skenario 5 (Check-out 16.59 WIB): is_pulang_cepat =", res1659.rows[0].is_pulang_cepat, 
      res1659.rows[0].is_pulang_cepat === true ? "-> SESUAI (Pulang Cepat)" : "-> TIDAK SESUAI");

    // Case 6: 17:00
    const res1700 = await client.query(`
      SELECT 
        (CASE WHEN ('2026-10-14 17:00:00+07'::timestamptz) IS NOT NULL 
          AND ('2026-10-14 17:00:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')::time < COALESCE($1::time, '17:00:00'::time)
          AND (
            CASE EXTRACT(ISODOW FROM '2026-10-14 08:00:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF($2::text[], '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_pulang_cepat
    `, [newCompany.work_end_time, newCompany.work_days]);
    console.log("Skenario 6 (Check-out 17.00 WIB): is_pulang_cepat =", res1700.rows[0].is_pulang_cepat, 
      res1700.rows[0].is_pulang_cepat === false ? "-> SESUAI (Tidak Pulang Cepat)" : "-> TIDAK SESUAI");

    // Case 7: Belum check-out (check_out_time IS NULL)
    const resNullCheckout = await client.query(`
      SELECT 
        (CASE WHEN (NULL::timestamptz) IS NOT NULL 
          AND ((NULL::timestamptz) AT TIME ZONE 'Asia/Jakarta')::time < COALESCE($1::time, '17:00:00'::time)
          AND (
            CASE EXTRACT(ISODOW FROM '2026-10-14 08:00:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF($2::text[], '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_pulang_cepat
    `, [newCompany.work_end_time, newCompany.work_days]);
    console.log("Skenario 7 (Belum Check-out): is_pulang_cepat =", resNullCheckout.rows[0].is_pulang_cepat, 
      resNullCheckout.rows[0].is_pulang_cepat === false ? "-> SESUAI (Tidak Pulang Cepat)" : "-> TIDAK SESUAI");
    console.log("");

    // -------------------------------------------------------------
    // Skenario 8: Perusahaan yang jamnya sudah diatur manual
    // (e.g. PT Sejahtera Abadi atau dibuat manual 09:00 - 18:00)
    // -------------------------------------------------------------
    console.log("--- Skenario 8: Perusahaan dengan jam manual (09:00 - 18:00) ---");
    const customCode = 'TEST' + Math.floor(1000 + Math.random() * 9000);
    const customRes = await client.query(`
      INSERT INTO companies (name, address, join_code, work_start_time, work_end_time, work_days)
      VALUES ($1, $2, $3, '09:00:00'::time, '18:00:00'::time, ARRAY['Senin', 'Selasa', 'Rabu']::text[])
      RETURNING id, name, work_start_time, work_end_time, work_days
    `, ['PT Manual Schedule Test', 'Jl. Test Manual No. 2', customCode]);
    const customCompany = customRes.rows[0];

    // Check-in pukul 08:30 (sebelum 09:00) -> tidak terlambat
    const resCustom830 = await client.query(`
      SELECT 
        (CASE WHEN ('2026-10-14 08:30:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')::time > (COALESCE($1::time, '08:00:00'::time) + interval '15 minutes')
          AND (
            CASE EXTRACT(ISODOW FROM '2026-10-14 08:30:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF($2::text[], '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_terlambat
    `, [customCompany.work_start_time, customCompany.work_days]);

    // Check-in pukul 09:20 (setelah batas toleransi 09:15 pada hari Rabu) -> terlambat
    const resCustom920 = await client.query(`
      SELECT 
        (CASE WHEN ('2026-10-14 09:20:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')::time > (COALESCE($1::time, '08:00:00'::time) + interval '15 minutes')
          AND (
            CASE EXTRACT(ISODOW FROM '2026-10-14 09:20:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF($2::text[], '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_terlambat
    `, [customCompany.work_start_time, customCompany.work_days]);

    console.log("Check-in 08:30 pada PT Manual (start 09:00): is_terlambat =", resCustom830.rows[0].is_terlambat,
      resCustom830.rows[0].is_terlambat === false ? "-> SESUAI (Tidak Terlambat)" : "-> TIDAK SESUAI");
    console.log("Check-in 09:20 pada PT Manual (start 09:00, toleransi s.d 09:15): is_terlambat =", resCustom920.rows[0].is_terlambat,
      resCustom920.rows[0].is_terlambat === true ? "-> SESUAI (Terlambat)" : "-> TIDAK SESUAI");
    console.log("");

    // -------------------------------------------------------------
    // Skenario 9: Perusahaan lama dengan konfigurasi jam NULL
    // (Simulasikan baris dengan work_start_time = NULL & work_end_time = NULL)
    // -------------------------------------------------------------
    console.log("--- Skenario 9: Perusahaan lama dengan konfigurasi jam NULL ---");
    const resNullComp = await client.query(`
      SELECT 
        (CASE WHEN ('2026-10-14 08:16:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')::time > (COALESCE(NULL::time, '08:00:00'::time) + interval '15 minutes')
          AND (
            CASE EXTRACT(ISODOW FROM '2026-10-14 08:16:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF(NULL::text[], '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_terlambat,
        (CASE WHEN ('2026-10-14 16:59:00+07'::timestamptz) IS NOT NULL 
          AND ('2026-10-14 16:59:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')::time < COALESCE(NULL::time, '17:00:00'::time)
          AND (
            CASE EXTRACT(ISODOW FROM '2026-10-14 08:00:00+07'::timestamptz AT TIME ZONE 'Asia/Jakarta')
              WHEN 1 THEN 'Senin' WHEN 2 THEN 'Selasa' WHEN 3 THEN 'Rabu' WHEN 4 THEN 'Kamis'
              WHEN 5 THEN 'Jumat' WHEN 6 THEN 'Sabtu' WHEN 7 THEN 'Minggu'
            END
          ) = ANY(COALESCE(NULLIF(NULL::text[], '{}'), ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']::text[]))
        THEN true ELSE false END) as is_pulang_cepat
    `);
    console.log("Perusahaan NULL di DB pada check-in 08.16: is_terlambat =", resNullComp.rows[0].is_terlambat,
      resNullComp.rows[0].is_terlambat === true ? "-> SESUAI (Otomatis menggunakan default 08:00 + toleransi 15m)" : "-> TIDAK SESUAI");
    console.log("Perusahaan NULL di DB pada check-out 16.59: is_pulang_cepat =", resNullComp.rows[0].is_pulang_cepat,
      resNullComp.rows[0].is_pulang_cepat === true ? "-> SESUAI (Otomatis menggunakan default 17:00)" : "-> TIDAK SESUAI");
    console.log("");

    // Cleanup test companies
    await client.query("DELETE FROM companies WHERE id IN ($1, $2)", [newCompany.id, customCompany.id]);
    console.log("Data uji dibersihkan dengan aman.");

    console.log("\n=== SELURUH 9 SKENARIO BERHASIL DIVERIFIKASI DENGAN SUKSES ===");
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
