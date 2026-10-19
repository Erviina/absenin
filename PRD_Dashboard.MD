# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# ABSENIN PLATFORM ADMIN
## Platform Growth Analytics & Internal Administration Dashboard

**Versi:** 3.0  
**Status:** Proposed — Ready for Repository Audit  
**Produk:** Absenin  
**Modul:** Platform Owner Dashboard  
**Deployment:** Existing Vercel Project  
**Authentication:** Google OAuth dengan email allowlist  
**Target Pengguna:** Platform Owner yang terotorisasi

---

# 1. PRODUCT OVERVIEW

## 1.1 Deskripsi Produk

Absenin Platform Admin adalah dashboard web internal yang memungkinkan pemilik platform memantau pertumbuhan, penggunaan, serta kesehatan aplikasi Absenin melalui satu antarmuka terpusat.

Dashboard mencakup analitik perusahaan dan pengguna, tren pertumbuhan, adopsi fitur, aktivitas platform, serta monitoring error dan kebutuhan administratif.

Absenin Platform Admin dikembangkan sebagai bagian dari proyek frontend Absenin yang sudah ada, bukan sebagai proyek frontend Vercel yang terpisah.

Dashboard memiliki halaman, routing, layout, dan navigasi sendiri di dalam aplikasi web. Akses dilakukan melalui URL khusus:

`https://absenin-zeta.vercel.app/platform-admin`

Dashboard menggunakan backend dan database Absenin yang sudah ada melalui API terautentikasi.

## 1.2 Product Vision

Membangun pusat kendali internal yang memungkinkan pemilik Absenin memahami pertumbuhan platform, mengidentifikasi peluang pengembangan, dan memantau masalah operasional berdasarkan data aktual.

## 1.3 Product Goals

1. Memantau pertumbuhan perusahaan dan pengguna.
2. Mengukur aktivitas dan adopsi fitur.
3. Memahami proses aktivasi perusahaan baru.
4. Memantau kesehatan serta keandalan platform.
5. Menyediakan direktori perusahaan untuk kebutuhan administrasi internal.
6. Memastikan hanya akun yang diotorisasi yang dapat melihat analitik global.
7. Memanfaatkan infrastruktur yang sudah tersedia tanpa menduplikasi database.
8. Menjaga agar fitur dashboard baru tidak mengganggu operasional aplikasi Absenin.

---

# 2. ARCHITECTURE DECISION

## 2.1 Deployment Strategy

Gunakan **Opsi B: satu proyek Vercel dan satu frontend aplikasi dengan area dashboard terpisah**.

Tidak perlu membuat proyek Vercel atau frontend baru untuk Platform Admin pada tahap ini.

Aplikasi Absenin yang sudah ada tetap menjadi aplikasi utama, sementara Platform Admin menjadi bagian khusus di dalamnya dengan route dan layout tersendiri.

### URL aplikasi

Aplikasi operasional tetap menggunakan alamat yang sudah tersedia, contohnya:

`https://absenin-zeta.vercel.app/kehadiran`

Platform Admin menggunakan:

`https://absenin-zeta.vercel.app/platform-admin`

Route login admin:

`https://absenin-zeta.vercel.app/platform-admin/login`

Route overview:

`https://absenin-zeta.vercel.app/platform-admin/overview`

Route lainnya berada di bawah prefix `/platform-admin`.

URL tersebut merupakan rancangan routing yang harus diimplementasikan dan diuji pada proyek saat ini.

## 2.2 Shared Infrastructure

Platform Admin menggunakan kembali:

- Frontend Vue 3 + Vite yang sudah ada.
- Backend Fastify 5 yang sudah ada.
- Database MySQL yang sudah ada.
- Sistem autentikasi yang sudah ada, apabila mendukung integrasi Google OAuth dengan aman.
- Data perusahaan, pengguna, keanggotaan, absensi, task, dan kalender yang sudah ada.

Stack dan implementasi aktual harus diverifikasi melalui repository sebelum perubahan dilakukan.

## 2.3 Separation of Concerns

Walaupun frontend berada dalam proyek yang sama, kode dan antarmuka Platform Admin harus dipisahkan secara logis.

Platform Admin harus memiliki:

- Layout khusus.
- Navigation sidebar khusus.
- Routing khusus.
- Authorization guard khusus.
- Service API analytics khusus.
- Halaman overview dan analytics tersendiri.
- Penanganan sesi serta akses yang sesuai dengan kebijakan Platform Owner.

Jangan menambahkan menu Platform Admin ke dashboard karyawan, manager, atau pemilik perusahaan.

## 2.4 Deployment Implications

Karena frontend berada dalam proyek Vercel yang sama:

- Deployment frontend akan memperbarui aplikasi utama dan area Platform Admin sesuai build yang sama.
- Tidak diperlukan deployment frontend kedua.
- Backend tetap dapat di-deploy sesuai proses yang sekarang.
- Database tidak perlu dipisahkan.
- Deep-link seperti `/platform-admin/overview` harus tetap berfungsi ketika URL dibuka langsung atau halaman di-refresh.

Periksa konfigurasi SPA fallback dan routing Vercel agar URL nested tidak menghasilkan 404 akibat konfigurasi server yang tidak sesuai.

---

# 3. AUTHENTICATION & AUTHORIZATION

## 3.1 Authentication Strategy

Platform Admin menggunakan autentikasi Google melalui mekanisme Google OAuth yang terintegrasi dengan sistem autentikasi Absenin.

Jika Google OAuth sudah tersedia di aplikasi, prioritaskan penggunaan kembali mekanisme tersebut.

Jika belum tersedia atau implementasi sekarang tidak mendukung kebutuhan Platform Admin, lakukan perluasan autentikasi secara terkontrol tanpa merusak login aplikasi utama.

Pengguna dapat menggunakan sesi yang masih valid apabila sistem autentikasi yang digunakan mendukungnya. Pengguna yang belum memiliki sesi valid akan diminta login.

**Google login membuktikan identitas pengguna, sedangkan email allowlist menentukan apakah pengguna berhak masuk ke Platform Admin.**

Keduanya merupakan proses berbeda.

## 3.2 Authorized Google Accounts

Pada versi awal, hanya empat akun berikut yang diizinkan mengakses Platform Admin:

1. `shakilaaulia@upi.edu`
2. `nihaaprill@upi.edu`
3. `ervinakusnanda@upi.edu`
4. `nalifah@upi.edu`

Alamat harus dicocokkan secara tepat setelah normalisasi huruf menjadi lowercase.

Tidak boleh ada akun lain yang otomatis mendapatkan akses hanya karena berhasil login menggunakan Google atau memiliki domain email yang sama.

Keempat akun tersebut memiliki akses Platform Owner yang setara pada MVP, kecuali nanti ditetapkan model hak akses yang lebih terperinci.

## 3.3 Authorization Flow

Proses akses:

1. Pengguna membuka `/platform-admin`.
2. Frontend memeriksa apakah terdapat sesi autentikasi yang valid.
3. Jika belum login, pengguna diarahkan ke halaman login Platform Admin.
4. Pengguna melakukan login melalui Google.
5. Backend memverifikasi identitas Google melalui mekanisme tepercaya.
6. Backend memastikan email yang telah diverifikasi termasuk dalam allowlist.
7. Jika lolos, backend memberikan sesi atau authorization context yang sah untuk Platform Admin.
8. Pengguna diarahkan ke `/platform-admin/overview`.
9. Jika akun tidak termasuk allowlist, akses ditolak.

Backend tidak boleh memercayai email yang dikirim sendiri oleh frontend tanpa verifikasi identitas.

## 3.4 Authorization Requirements

- Validasi akses wajib dilakukan di backend pada setiap endpoint administratif.
- Route guards frontend hanya menjadi lapisan tambahan untuk pengalaman pengguna.
- Mengetahui URL admin tidak boleh memberikan akses.
- Nilai role di `localStorage` tidak boleh menjadi satu-satunya dasar pemberian akses.
- Pengguna yang tidak diizinkan tidak boleh dapat membaca data melalui API langsung.
- Akun Platform Owner tidak boleh dibuat melalui pendaftaran publik yang otomatis memberikan akses administratif.
- Semua proses pemberian atau pencabutan akses harus terkendali dan dapat diaudit.

## 3.5 Access Denied Behavior

Jika pengguna berhasil login dengan Google tetapi emailnya tidak termasuk allowlist:

- Tampilkan pesan akses ditolak yang jelas dan tidak membocorkan informasi internal.
- Jangan tampilkan dashboard atau ringkasan data platform.
- Jangan berikan authorization context Platform Owner.
- Jangan mengungkapkan detail konfigurasi allowlist.
- Pastikan API yang dipanggil secara langsung tetap menolak permintaan tersebut.

## 3.6 Allowlist Configuration

Simpan daftar email yang diizinkan pada konfigurasi server/backend atau mekanisme administrasi yang aman.

Contoh konfigurasi konseptual:

`PLATFORM_OWNER_EMAILS=email1,email2,email3,email4`

Nilai finalnya menggunakan empat email yang tercantum di bagian 3.2.

Ketentuan:

- Jangan memasukkan allowlist sebagai sumber otorisasi yang hanya tersedia di frontend.
- Jangan memakai prefix `VITE_` untuk konfigurasi rahasia atau kontrol akses yang harus tetap berada di server.
- Jangan menyimpan kredensial Google OAuth yang bersifat rahasia dalam kode frontend.
- Jika daftar email berubah, perbarui konfigurasi pada lingkungan backend yang sesuai dan ikuti proses deployment atau reload yang diperlukan.

---

# 4. ROLE & ACCESS POLICY

| Role | Akses Platform Admin | Akses aplikasi utama |
|---|---|---|
| Platform Owner yang diizinkan | Ya | Sesuai izin aplikasinya |
| Company Owner | Tidak | Dashboard perusahaannya |
| Manager | Tidak | Fitur operasional sesuai izin |
| Employee | Tidak | Fitur karyawan sesuai izin |
| Google account di luar allowlist | Tidak | Sesuai hak akses pada aplikasi utama |
| Unauthenticated user | Tidak | Harus login untuk fitur terlindungi |

Platform Owner adalah kewenangan administratif tingkat platform dan tidak boleh disamakan dengan Company Owner.

Akun perusahaan tidak otomatis berhak melihat statistik global Absenin.

Akses Platform Admin juga tidak boleh menjadi cara untuk melewati hak akses tenant pada backend operasional.

---

# 5. PRODUCT NAVIGATION

Navigasi khusus Platform Admin:

1. Overview
2. Growth Analytics
3. Companies
4. Users
5. Feature Analytics
6. System Health
7. Audit Logs
8. Settings

Rancangan route:

- `/platform-admin`
- `/platform-admin/login`
- `/platform-admin/overview`
- `/platform-admin/analytics/growth`
- `/platform-admin/companies`
- `/platform-admin/users`
- `/platform-admin/analytics/features`
- `/platform-admin/system-health`
- `/platform-admin/audit-logs`
- `/platform-admin/settings`

Jika pengguna yang berwenang membuka `/platform-admin`, arahkan ke `/platform-admin/overview`.

Jika belum login, arahkan ke proses login.

Jika telah login tetapi tidak berhak, tampilkan halaman akses ditolak yang sesuai.

---

# 6. FUNCTIONAL REQUIREMENTS

## 6.1 Overview Dashboard

Menjadi halaman utama setelah Platform Owner berhasil masuk.

### KPI Cards

- Total Companies.
- New Companies.
- Total Registered Users.
- New Users.
- Active Companies.
- Active Users.
- Attendance Activity.
- System Error Summary jika tersedia.

### Date Filters

- Last 7 Days.
- Last 30 Days.
- Last 90 Days.
- Custom Date Range.

Filter tanggal harus memperbarui grafik dan KPI terkait secara konsisten.

### Dashboard Visualizations

- Grafik pertumbuhan perusahaan.
- Grafik pertumbuhan pengguna.
- Tren pengguna aktif.
- Tren perusahaan aktif.
- Aktivitas absensi.
- Ringkasan event atau aktivitas platform.
- Informasi error penting jika sumber data tersedia.

### Onboarding Overview

Tampilkan ringkasan perusahaan yang telah:

1. Mendaftar.
2. Menyelesaikan pengaturan dasar.
3. Menambahkan anggota.
4. Mencatat absensi pertama.
5. Melanjutkan penggunaan platform.

Tahapan ini hanya dapat dihitung apabila sumber data dan definisi event tersedia.

## 6.2 Growth Analytics

Menganalisis:

- Jumlah perusahaan baru per hari, minggu, atau bulan.
- Jumlah pengguna baru dalam periode.
- Tren perusahaan aktif.
- Tren pengguna aktif.
- Perubahan terhadap periode sebelumnya.
- Perkembangan aktivitas penggunaan.

Jangan menampilkan persentase pertumbuhan yang menyesatkan apabila periode pembanding memiliki data nol atau tidak lengkap.

## 6.3 Company Analytics

Menampilkan direktori perusahaan dengan:

- Company ID.
- Nama perusahaan.
- Tanggal pendaftaran.
- Jumlah anggota.
- Status perusahaan.
- Status onboarding jika tersedia.
- Aktivitas terakhir yang relevan.

Fitur:

- Search.
- Filter.
- Sort.
- Pagination.
- Halaman detail perusahaan.
- Ringkasan aktivitas perusahaan.

MVP berfokus pada observasi dan analitik, bukan perubahan langsung terhadap data operasional pelanggan.

Penghapusan tenant, penggantian pemilik, penonaktifan perusahaan, dan tindakan destruktif lainnya berada di luar cakupan MVP.

## 6.4 User Analytics

Menampilkan:

- Total pengguna terdaftar.
- Pengguna baru dalam periode.
- Distribusi pengguna berdasarkan status atau role jika tersedia.
- Aktivitas pengguna.
- Tren pertumbuhan pengguna.

Minimalkan akses terhadap informasi sensitif karyawan dan data lokasi rinci yang tidak diperlukan.

## 6.5 Feature Analytics

Fitur Absenin yang menjadi objek pengukuran:

- Attendance.
- QR Check-in.
- Location Verification.
- Calendar.
- Task Management.
- Leave Requests.
- Sick Leave Requests.
- Team and Company Management.

Data yang ditampilkan dapat mencakup:

- Jumlah penggunaan.
- Pengguna unik.
- Tren penggunaan.
- Perbandingan antarperiode.
- Tingkat keberhasilan atau kegagalan jika sumber data tersedia.

Setiap fitur harus memiliki definisi penggunaan yang terdokumentasi.

## 6.6 Activation Funnel

Tahapan aktivasi perusahaan:

1. Company Registration.
2. Company Setup Completed.
3. Members Added or Invited.
4. First Successful Attendance.
5. Continued Usage.

Funnel harus memakai denominator yang sesuai dan definisi event yang konsisten.

Data historis yang tidak tersedia tidak boleh direkonstruksi dengan asumsi yang tidak dapat diverifikasi.

## 6.7 Engagement and Retention

Fitur analitik lanjutan:

- DAU.
- WAU.
- MAU.
- Cohort Retention.
- Repeat Usage.
- Company Inactivity Monitoring.

Active User harus dihitung berdasarkan aktivitas bermakna yang telah disepakati.

Jika pencatatan aktivitas historis belum tersedia, mulai pengumpulan event dari tanggal implementasi dan dokumentasikan keterbatasan historisnya.

## 6.8 System Health

Jika sumber monitoring tersedia, tampilkan:

- Ringkasan error API.
- Tren kegagalan proses penting.
- Kegagalan check-in.
- Kegagalan QR scanning.
- Masalah integrasi Maps atau lokasi.
- Waktu respons layanan.
- Waktu kejadian dan tingkat urgensi.

Jangan mengklaim monitoring real-time jika sumber data sebenarnya hanya berupa agregasi periodik atau catatan historis.

## 6.9 Audit Logs

Mencatat tindakan administratif penting, termasuk:

- Login dan logout administratif sesuai kebijakan.
- Perubahan konfigurasi.
- Perubahan akses.
- Tindakan administrasi perusahaan.
- Hasil operasi sensitif.

Catatan mencakup actor yang relevan, jenis tindakan, target, timestamp, dan hasilnya.

Jangan mencatat password, token autentikasi, atau secret ke dalam log.

## 6.10 Settings

Mendukung pengaturan yang relevan untuk Platform Admin, seperti preferensi tampilan dan konfigurasi pelaporan yang aman.

Perubahan allowlist atau pengaturan keamanan tidak boleh dilakukan melalui frontend tanpa kontrol administratif dan validasi yang sesuai.

---

# 7. ANALYTICS DEFINITIONS

Setiap metrik harus mempunyai definisi, sumber data, rentang waktu, dan aturan perhitungan yang terdokumentasi.

### Total Companies

Jumlah tenant yang memenuhi kriteria pencatatan status dan penghapusan.

### New Companies

Tenant yang tanggal pembuatannya berada dalam periode terpilih.

### Total Registered Users

Jumlah akun pengguna unik yang memenuhi kriteria pendaftaran.

### Active Users

Pengguna unik yang melakukan setidaknya satu aktivitas bermakna yang telah ditentukan dalam periode pengukuran.

### Active Companies

Perusahaan yang memenuhi aturan aktivitas tenant yang sudah ditentukan.

### Activation Rate

Persentase populasi pendaftar yang berhasil mencapai milestone aktivasi tertentu.

### Feature Adoption

Penggunaan suatu fitur berdasarkan event penggunaan dan populasi pengguna yang relevan.

### Error Rate

Proporsi operasi gagal terhadap total operasi terkait dalam periode pengukuran, apabila kedua jumlah tersedia.

Jangan menghitung akun yang terdaftar sebagai pengguna aktif secara otomatis.

---

# 8. DATA AND DATABASE REQUIREMENTS

## 8.1 Existing Data Sources

Audit dan gunakan tabel yang sudah tersedia untuk:

- Users.
- Companies or Tenants.
- Memberships.
- Attendance.
- Tasks.
- Calendar Events.
- Leave and Sick Leave Requests.
- Activity or system logs jika tersedia.

Nama tabel, relasi, dan kolom harus mengikuti database aktual.

## 8.2 Additional Analytics Events

Tambahkan mekanisme tracking hanya jika sumber data saat ini belum mencukupi.

Potensi event:

- `signup_completed`
- `company_created`
- `member_invited`
- `company_setup_completed`
- `first_check_in`
- `task_completed`
- `calendar_event_created`
- `feature_used`

Event perlu memiliki identitas unik, timestamp, nama aktivitas, dan metadata minimal yang diperlukan.

Hindari mencatat password, token, atau koordinat GPS rinci dalam analytics events.

## 8.3 Data Integrity

- Cegah penghitungan ganda dari join.
- Terapkan deduplikasi untuk event yang dapat terkirim berulang.
- Gunakan timezone dan date boundaries secara konsisten.
- Jangan membuat tabel operasional duplikat.
- Optimalkan query berdasarkan pengukuran.
- Jangan melakukan destructive migration.
- Pertimbangkan agregasi atau caching jika volume data membenarkannya.

---

# 9. API REQUIREMENTS

Endpoint berikut adalah rancangan awal, bukan klaim bahwa seluruh endpoint sudah tersedia.

| Method | Endpoint | Tujuan |
|---|---|---|
| GET | `/api/platform/me` | Memeriksa identitas dan hak akses Platform Admin |
| GET | `/api/platform/analytics/overview` | Ringkasan KPI |
| GET | `/api/platform/analytics/growth` | Pertumbuhan perusahaan dan pengguna |
| GET | `/api/platform/analytics/engagement` | Aktivitas pengguna |
| GET | `/api/platform/analytics/funnel` | Funnel aktivasi |
| GET | `/api/platform/analytics/features` | Adopsi fitur |
| GET | `/api/platform/companies` | Direktori perusahaan |
| GET | `/api/platform/companies/:id` | Ringkasan perusahaan |
| GET | `/api/platform/system-health` | Ringkasan kesehatan sistem |
| GET | `/api/platform/audit-logs` | Riwayat administratif |

Sebelum menambahkan route baru, audit route dan service yang sudah ada untuk menghindari duplikasi.

Semua endpoint wajib memvalidasi autentikasi dan kewenangan Platform Owner secara server-side.

---

# 10. FRONTEND STRUCTURE

Platform Admin tetap berada dalam proyek frontend Absenin yang ada.

Struktur konseptual:

```text
src/
├── layouts/
│   └── PlatformAdminLayout.vue
├── views/
│   └── platform-admin/
│       ├── LoginView.vue
│       ├── OverviewView.vue
│       ├── GrowthAnalyticsView.vue
│       ├── CompaniesView.vue
│       ├── UsersView.vue
│       ├── FeatureAnalyticsView.vue
│       ├── SystemHealthView.vue
│       ├── AuditLogsView.vue
│       └── SettingsView.vue
├── components/
│   └── platform-admin/
│       ├── KpiCard.vue
│       ├── GrowthChart.vue
│       ├── DateRangeFilter.vue
│       └── DataTable.vue
├── router/
├── services/
│   └── platformAdminService.js
└── stores/
```

Struktur aktual harus mengikuti pola repository yang ada. Jangan menduplikasi router, store, atau service jika sistem sekarang menyediakan mekanisme yang dapat diperluas dengan aman.

---

# 11. UI AND UX REQUIREMENTS

Gunakan identitas visual Absenin:

- Forest Green: `#1E3F2B`.
- Deep Green: `#356E3B`.
- Sage Green: `#7FAF8B`.
- Soft Mint: `#D8EADB`.
- Pale Green: `#EAF4EC`.
- White: `#FFFFFF`.

Karakter tampilan:

- Modern, profesional, dan mudah dipindai.
- Sidebar khusus Platform Admin.
- Hierarki visual yang jelas.
- KPI cards dan grafik yang mudah dibaca.
- Tabel yang mendukung pencarian serta pagination.
- Layout responsif.
- Loading state.
- Empty state.
- Error state.
- Access denied state.
- Konfirmasi untuk tindakan sensitif.

Dashboard tidak boleh menampilkan data dummy sebagai statistik produksi.

---

# 12. NON-FUNCTIONAL REQUIREMENTS

## Security

- Google identity verification.
- Email allowlist enforcement.
- Server-side authorization.
- Tenant isolation.
- Secure session handling.
- Secure CORS jika diperlukan.
- Validasi input.
- Audit trail.
- Secret management pada konfigurasi server.

## Performance

- Query analitik yang efisien.
- Pagination untuk data besar.
- Penggunaan agregasi sesuai kebutuhan.
- Caching bila terbukti diperlukan.
- Target performa berdasarkan hasil pengukuran aktual.

## Reliability

- Penanganan error konsisten.
- Tidak merusak fitur aplikasi utama.
- Migration aman.
- Dokumentasi konfigurasi dan troubleshooting.

## Maintainability

- Pemisahan area Platform Admin.
- Reuse komponen serta service yang sesuai.
- Pengujian otorisasi.
- Dokumentasi API dan KPI.
- Konfigurasi environment yang jelas.

---

# 13. IMPLEMENTATION PHASES

## Phase 0 — Repository Audit

- Periksa struktur Vue, router, dan layout.
- Periksa autentikasi Google yang sudah ada.
- Audit mekanisme sesi dan role.
- Audit backend dan database.
- Identifikasi sumber data analytics.
- Tentukan kebutuhan perubahan API.

**Output:** laporan audit dan rencana implementasi.

## Phase 1 — Platform Admin Access

- Tambahkan route `/platform-admin`.
- Buat layout khusus.
- Integrasikan Google login.
- Terapkan allowlist untuk empat email yang disetujui.
- Tambahkan pemeriksaan hak akses backend.
- Uji skenario akses yang diizinkan dan ditolak.

**Output:** area Platform Admin yang hanya dapat diakses akun berwenang.

## Phase 2 — Overview and Growth MVP

- KPI cards.
- Filter tanggal.
- Grafik pertumbuhan pengguna.
- Grafik pertumbuhan perusahaan.
- Direktori perusahaan.
- Ringkasan data operasional yang tersedia.

**Output:** dashboard analytics pertama menggunakan data aktual.

## Phase 3 — Product Analytics

- Feature analytics.
- Aktivasi.
- Event tracking.
- Engagement metrics.
- Retention setelah data mencukupi.

**Output:** insight tentang penggunaan produk.

## Phase 4 — Platform Operations

- System health.
- Error monitoring.
- Audit log viewer.
- Alert dan monitoring lanjutan jika diperlukan.

**Output:** pengawasan platform yang lebih lengkap.

---

# 14. ACCEPTANCE CRITERIA

Implementasi dinyatakan memenuhi kebutuhan apabila:

1. Platform Admin dapat diakses melalui `/platform-admin` pada domain Vercel Absenin yang sama.
2. Tidak diperlukan frontend Vercel baru untuk versi ini.
3. Route aplikasi utama tetap berfungsi normal.
4. Empat akun Google yang disetujui dapat masuk setelah autentikasi berhasil dan email terverifikasi.
5. Akun di luar allowlist ditolak meskipun login Google berhasil.
6. Email tidak ditentukan hanya berdasarkan input frontend.
7. Endpoint admin memvalidasi otorisasi secara mandiri.
8. Company Owner, Manager, dan Employee tidak memperoleh akses Platform Admin.
9. Refresh atau direct navigation ke route admin tidak menimbulkan routing error.
10. Analytics menampilkan data aktual dari sumber yang tervalidasi.
11. Tidak ada duplikasi data akibat query atau event tracking.
12. Data historis yang tidak tersedia tidak disajikan sebagai data aktual.
13. Fitur utama aplikasi Absenin tidak mengalami regresi.
14. Konfigurasi autentikasi dan environment terdokumentasi.
15. Tes untuk akun yang diizinkan, akun di luar allowlist, pengguna belum login, dan pengguna aplikasi biasa telah dilakukan.

---

# 15. RISKS AND MITIGATIONS

**Risiko: Route admin dianggap aman hanya karena disembunyikan di frontend.**  
Mitigasi: wajibkan validasi server-side untuk seluruh endpoint platform.

**Risiko: Google OAuth sudah login tetapi email tidak sesuai.**  
Mitigasi: validasi identitas dari provider, status email terverifikasi, dan allowlist server-side.

**Risiko: Perubahan autentikasi mengganggu login aplikasi utama.**  
Mitigasi: audit implementasi autentikasi sebelum mengubahnya dan uji regresi pada flow yang ada.

**Risiko: Dashboard memperlihatkan data tenant lain.**  
Mitigasi: batasi akses berdasarkan role dan terapkan tenant isolation pada backend.

**Risiko: Deep-link `/platform-admin` menghasilkan 404.**  
Mitigasi: uji konfigurasi routing SPA dan deployment Vercel.

**Risiko: Data historis analytics tidak lengkap.**  
Mitigasi: dokumentasikan keterbatasan data dan mulai event tracking sejak implementasi.

**Risiko: Perubahan frontend memengaruhi aplikasi operasional.**  
Mitigasi: pisahkan layout dan route secara logis serta jalankan build dan regression test.

---

# 16. OUT OF SCOPE FOR MVP

- Frontend Vercel kedua untuk admin.
- Dashboard bagi Company Owner, Manager, atau Employee pada area Platform Admin.
- Penghapusan permanen perusahaan.
- Impersonation atau login sebagai karyawan.
- Pengubahan langsung data absensi.
- Billing dan revenue analytics jika sistem langganan belum tersedia.
- Prediksi pertumbuhan berbasis machine learning.
- Pengelolaan allowlist melalui UI publik.
- Membangun ulang authentication atau database tanpa kebutuhan yang terbukti.

---

# 17. FINAL PRODUCT DECISION

Absenin Platform Admin merupakan area administrasi dan analytics khusus Platform Owner yang berada dalam proyek frontend Vercel Absenin yang sudah ada.

Dashboard diakses langsung melalui:

`https://absenin-zeta.vercel.app/platform-admin`

Login menggunakan Google dengan pembatasan ke empat akun yang telah ditetapkan. Backend melakukan verifikasi identitas dan allowlist sebelum memberikan akses administratif.

Frontend, backend, dan database yang sudah berjalan dimanfaatkan kembali dengan pemisahan route, layout, dan otorisasi yang jelas.

Pengembangan dimulai dari audit repository, akses Platform Owner, kemudian overview serta growth analytics.

**Prinsip utama: same Vercel project, dedicated admin routes, Google authentication, server-side email allowlist, shared backend and database, and no disruption to the existing Absenin application.**