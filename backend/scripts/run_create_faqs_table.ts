import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log("Creating faqs table in PostgreSQL...");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "faqs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid,
        "author_id" uuid,
        "scope" varchar(50) NOT NULL DEFAULT 'global',
        "category" varchar(100) NOT NULL DEFAULT 'Umum',
        "question" text NOT NULL,
        "answer" text NOT NULL,
        "sop_title" varchar(255),
        "sop_url" text,
        "is_published" boolean NOT NULL DEFAULT true,
        "order_index" integer NOT NULL DEFAULT 0,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        "deleted_at" timestamp with time zone
      );
    `);
    console.log("Table faqs created successfully.");

    console.log("Adding foreign keys...");
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "faqs" ADD CONSTRAINT "faqs_company_id_companies_id_fk" 
        FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "faqs" ADD CONSTRAINT "faqs_author_id_profiles_id_fk" 
        FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("Foreign keys added.");

    console.log("Adding indexes...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "faqs_company_idx" ON "faqs" ("company_id");
      CREATE INDEX IF NOT EXISTS "faqs_scope_idx" ON "faqs" ("scope");
      CREATE INDEX IF NOT EXISTS "faqs_published_idx" ON "faqs" ("is_published");
      CREATE INDEX IF NOT EXISTS "faqs_deleted_idx" ON "faqs" ("deleted_at");
      CREATE INDEX IF NOT EXISTS "faqs_category_idx" ON "faqs" ("category");
    `);
    console.log("Indexes added.");

    // Check count
    const countRes = await db.execute(sql`SELECT count(*) FROM "faqs"`);
    const count = parseInt(countRes.rows[0].count as string, 10);
    console.log(`Current FAQ count in database: ${count}`);

    if (count === 0) {
      console.log("Seeding base FAQs into database...");
      
      const seedItems = [
        {
          scope: "global",
          category: "Presensi",
          question: "Bagaimana cara melakukan absensi masuk (Check-in) dan pulang (Check-out)?",
          answer: "1. Buka halaman Beranda atau menu Kehadiran di AbsenIn.\n2. Klik tombol 'Masuk' atau 'Check In Sekarang'.\n3. Berikan izin akses lokasi jika diminta oleh browser ponsel Anda.\n4. Sistem akan memverifikasi koordinat GPS Anda secara otomatis terhadap radius kantor.\n5. Setelah sukses, status Anda menjadi 'Masuk'. Ketika jam kerja selesai, tombol akan otomatis beralih menjadi 'Keluar' untuk presensi pulang.",
          sop_title: "Panduan Alur Presensi Harian.pdf",
          sop_url: "https://drive.google.com/file/d/sample-sop-presensi/view",
          is_published: true,
          order_index: 1,
        },
        {
          scope: "global",
          category: "GPS & Lokasi",
          question: "Mengapa muncul notifikasi 'Di Luar Radius Kantor' saat ingin absen?",
          answer: "Notifikasi ini muncul karena titik koordinat GPS perangkat Anda berada di luar batas jarak (misalnya > 50 meter) dari titik kantor yang ditentukan perusahaan.\n\nTips mengatasi:\n• Pastikan Anda sudah berada di area kantor fisik perusahaan.\n• Aktifkan fitur 'Akurasi Tinggi' (Google Location Accuracy) di pengaturan ponsel Anda.\n• Nyalakan Wi-Fi ponsel (tidak perlu tersambung ke jaringan), karena pemindaian sinyal Wi-Fi di sekitar sangat membantu GPS menentukan lokasi secara presisi hingga ±5-10 meter di dalam ruangan.",
          sop_title: "SOP Kalibrasi GPS & Geofencing.pdf",
          sop_url: "https://drive.google.com/file/d/sample-sop-gps/view",
          is_published: true,
          order_index: 2,
        },
        {
          scope: "global",
          category: "GPS & Lokasi",
          question: "Bagaimana cara mengaktifkan izin lokasi/GPS di Google Chrome atau Safari?",
          answer: "Jika browser tidak sengaja memblokir akses lokasi:\n• Di Google Chrome Android: Ketuk ikon gembok / setelan di bilah alamat atas -> pilih 'Izin' (Permissions) -> pilih 'Lokasi' (Location) -> ubah ke 'Izinkan' (Allow).\n• Di Safari iOS (iPhone): Buka Pengaturan iPhone -> Privasi & Keamanan -> Layanan Lokasi -> Safari Websites -> ubah menjadi 'Saat Menggunakan App' dan aktifkan 'Lokasi Tepat'.\n• Muat ulang (Refresh) halaman AbsenIn setelah mengubah izin.",
          is_published: true,
          order_index: 3,
        },
        {
          scope: "global",
          category: "GPS & Lokasi",
          question: "Apakah aplikasi dapat mendeteksi aplikasi Fake GPS atau Mock Location?",
          answer: "Ya. AbsenIn dilengkapi sistem keamanan deteksi Mock Location dan integritas perangkat. Jika terdeteksi penggunaan aplikasi pihak ketiga pengubah lokasi (Fake GPS / VPN Spoofing), sistem akan menolak transaksi absensi dan mencatat insiden keamanan tersebut pada log audit organisasi demi menjaga validitas data.",
          sop_title: "Kebijakan Integritas & Anti Kecurangan AbsenIn.pdf",
          sop_url: "https://drive.google.com/file/d/sample-anti-fraud/view",
          is_published: true,
          order_index: 4,
        },
        {
          scope: "global",
          category: "Izin & Cuti",
          question: "Bagaimana alur pengajuan Izin, Cuti, atau Sakit?",
          answer: "1. Buka menu 'Izin' dari navigasi bawah.\n2. Klik tombol 'Ajukan Izin Baru'.\n3. Pilih jenis pengajuan: Sakit, Cuti Tahunan, Keperluan Mendesak, atau Izin Khusus.\n4. Tentukan rentang tanggal awal dan tanggal akhir pengajuan.\n5. Tuliskan keterangan alasan dengan jelas.\n6. Unggah lampiran foto/dokumen pendukung (wajib melampirkan Surat Keterangan Dokter jika memilih izin Sakit).\n7. Klik 'Kirim Pengajuan'. Permohonan Anda akan diproses oleh HR/Admin.",
          sop_title: "SOP Pengajuan Cuti & Izin Karyawan.pdf",
          sop_url: "https://drive.google.com/file/d/sample-sop-cuti/view",
          is_published: true,
          order_index: 5,
        },
        {
          scope: "global",
          category: "Tugas",
          question: "Bagaimana cara menandai tugas kerja (Task) selesai?",
          answer: "Buka menu 'Tugas' di beranda atau profil -> temukan tugas Anda -> centang kotak lingkaran checklist di samping judul tugas. Status tugas akan otomatis berpindah ke tab 'Selesai' dan dicatat tanggal penyelesaiannya.",
          is_published: true,
          order_index: 6,
        },
        {
          scope: "platform_admin",
          category: "Platform Admin",
          question: "Bagaimana hak akses Platform Admin bekerja dan siapa yang dapat masuk?",
          answer: "Platform Admin adalah panel kontrol terpusat untuk memantau seluruh perusahaan, analitik pertumbuhan, dan kesehatan sistem. Hanya pengguna yang emailnya terdaftar pada PLATFORM_OWNER_EMAILS di environment backend yang dapat mengakses panel ini.",
          sop_title: "SOP Pengelolaan Platform Owner AbsenIn.pdf",
          sop_url: "https://drive.google.com/file/d/sample-platform-admin-sop/view",
          is_published: true,
          order_index: 7,
        },
        {
          scope: "platform_admin",
          category: "Platform Admin",
          question: "Bagaimana cara meninjau Audit Logs dan anomali sistem?",
          answer: "Platform Owner dapat membuka menu 'Log Audit' di sidebar Platform Admin untuk melihat riwayat aktivitas penting seperti pembuatan perusahaan, pendaftaran pengguna baru, dan rekaman persetujuan data pribadi.",
          is_published: true,
          order_index: 8,
        }
      ];

      for (const item of seedItems) {
        await db.execute(sql`
          INSERT INTO "faqs" ("scope", "category", "question", "answer", "sop_title", "sop_url", "is_published", "order_index")
          VALUES (${item.scope}, ${item.category}, ${item.question}, ${item.answer}, ${item.sop_title || null}, ${item.sop_url || null}, ${item.is_published}, ${item.order_index});
        `);
      }
      console.log(`Seeded ${seedItems.length} initial FAQs successfully.`);
    }

    console.log("Migration finished successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();
