
### 🧩 Core Features

| # | Fitur | Role | Deskripsi Teknis |
|---|-------|------|------------------|
| F1 | Google OAuth Login | All | OAuth 2.0 PKCE flow, verifikasi domain whitelist |
| F2 | Check-in GPS | Karyawan | `navigator.geolocation` → bandingkan radius ≤ 100m dari koordinat tersimpan |
| F3 | Check-out GPS | Karyawan | Sama seperti check-in + hitung total jam kerja |
| F4 | Foto Bukti | Karyawan | Kamera / upload, kompresi client-side ≤ 2MB, simpan ke S3 |
| F5 | Grup Absensi | Karyawan | CRUD grup, invite via email/kode unik, max 50 member/grup |
| F6 | Setting Jadwal | Approval | Jam masuk, jam keluar, toleransi keterlambatan, mode (WFO/WFH/WFA) |
| F7 | Setting Lokasi | Approval | Set koordinat (pin map) + radius toleransi (meter) |
| F8 | Perizinan | Karyawan | Submit izin + dokumen pendukung → status: pending/approved/rejected |
| F9 | Approval Panel | Approval | List izin pending, satu-klik approve/reject + alasan |
| F10 | To-Do List | Karyawan | Wajib isi min. 1 task setelah check-in, editable sepanjang hari |
| F11 | Monitoring To-Do | Approval | Lihat To-Do List semua anggota grup per hari |
| F12 | Blast Email | Approval | Kirim email ke grup / semua, pakai template + variabel |
| F13 | Riwayat Absensi | All | Filter by tanggal, grup, status; export CSV |
| F14 | Dashboard Stats | Approval | Chart kehadiran, keterlambatan, izin per periode |

### Design Style
Design Style
Color Pallete
PRIMARY
Matcha Green      #7FAF8B
Dark Matcha      #527A5B
Soft Matcha      #E8F1E9

BACKGROUND
Warm White       #FAFCF9
Card             #FFFFFF

TEXT
Primary          #1F2937
Secondary        #6B7280

STATUS
Success          #5C9A6F
Warning          #D9A441
Danger           #D96C6C
Info             #6B8FD6

Font
Heading: Plus Jakarta Sans
Body: Inter

UI Style

Style keseluruhan:

Minimal • Modern • Professional • Soft • Clean

Responsive behaviour



### 🔄 User Flow (Mermaid Flowchart)

```mermaid
flowchart TB
    START([User Buka Aplikasi]) --> LOGIN{Login Google}
    LOGIN -->|Sukses| CHECK_ROLE{Role?}
    LOGIN -->|Gagal| ERROR([Tampilkan Error])
    
    CHECK_ROLE -->|Karyawan| DASH_K([Dashboard Karyawan])
    CHECK_ROLE -->|Approval| DASH_A([Dashboard Approval])

    subgraph KARYAWAN_FLOW [Flow Karyawan]
        DASH_K --> PILIH{Action}
        PILIH -->|Check-in| LOC_CHECK{Lokasi Valid?}
        LOC_CHECK -->|Ya| FOTO[📸 Ambil Foto]
        LOC_CHECK -->|Tidak| ERR_LOC([❌ Di luar radius])
        FOTO --> TODOLIST[📝 Isi To-Do List]
        TODOLIST --> CHKIN_OK([✅ Check-in Berhasil])
        
        PILIH -->|Check-out| LOC_CHECK2{Lokasi Valid?}
        LOC_CHECK2 -->|Ya| FOTO2[📸 Ambil Foto]
        FOTO2 --> CHKOUT_OK([✅ Check-out Berhasil])
        
        PILIH -->|Ajukan Izin| IZIN_FORM[Isi Form Izin]
        IZIN_FORM --> IZIN_SUBMIT([⏳ Menunggu Approval])
        
        PILIH -->|Lihat Grup| GRUP_VIEW[Anggota & Status]
        PILIH -->|Riwayat| HISTORY[Kalender Absensi]
    end

    subgraph APPROVAL_FLOW [Flow Approval]
        DASH_A --> AP_ACTION{Action}
        AP_ACTION -->|Review Izin| AP_LIST[List Permintaan Izin]
        AP_LIST --> AP_DECISION{Approve?}
        AP_DECISION -->|Ya| AP_OK([✅ Izin Disetujui + Email])
        AP_DECISION -->|Tolak| AP_REJ([❌ Izin Ditolak + Email])
        
        AP_ACTION -->|Setting| SET_JADWAL[Atur Jam & Lokasi]
        AP_ACTION -->|Blast Email| BLAST[Kirim Notifikasi Massal]
        AP_ACTION -->|Monitoring| MONITOR[To-Do List Tim]
        AP_ACTION -->|Laporan| EXPORT[Export CSV/PDF]
    end

    ```

---

### 🖥️ App Flow — Sitemap

```mermaid
graph LR
    A[Splash Screen] --> B[Login Page]
    B --> C{Google OAuth}
    C --> D[Dashboard Karyawan]
    C --> E[Dashboard Approval]
    
    D --> D1[Absensi]
    D1 --> D1A[Check-in]
    D1 --> D1B[Check-out]
    D --> D2[To-Do List]
    D --> D3[Perizinan]
    D3 --> D3A[Ajukan Baru]
    D3 --> D3B[Status Izin]
    D --> D4[Grup Saya]
    D4 --> D4A[Buat Grup]
    D4 --> D4A2[Invite Member]
    D --> D5[Riwayat]
    D --> D6[Profil]

    E --> E1[Dashboard]
    E --> E2[Approval Izin]
    E2 --> E2A[Approve/Reject]
    E --> E3[Monitoring]
    E3 --> E3A[To-Do List Tim]
    E3 --> E3B[Kehadiran Hari Ini]
    E --> E4[Setting]
    E4 --> E4A[Jadwal Kerja]
    E4 --> E4B[Lokasi Kantor]
    E4 --> E4C[Mode Kerja]
    E --> E5[Blast Email]
    E --> E6[Laporan]
    E --> E7[Kelola Grup]
```

---

### 📱 ASCII WIREFRAME

#### Screen 1: Login Page

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│              AbsenIn                 │
│    Smart Attendance System           │
│                                      │
│  ┌────────────────────────────────┐  |
│  │  🔵  Sign in with Google       │  │
│  └────────────────────────────────┘  │
│                                      │
│    By continuing, you agree to       │
│    our Terms & Privacy Policy        │
│                                      │
└──────────────────────────────────────┘
```

#### Screen 2: Dashboard Karyawan

```
┌──────────────────────────────────────┐
│  AbsenIn   🔔  👤 [Nama]            │
├──────────────────────────────────────┤
│                                      │
│  📍 Mode: WFO | Grup: Engineering    │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ⏰ Selamat Pagi, Budi!        │  │
│  │  Jam Kerja: 08:00 - 17:00     │  │
│  │                                │  │
│  │  🟢 BELUM CHECK-IN            │  │
│  │  ┌──────────────────────┐     │  │
│  │  │   📍 CHECK-IN NOW    │     │  │
│  │  └──────────────────────┘     │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌──────────────┬──────────────────┐ │
│  │  📋 To-Do    │  📅 Riwayat     │ │
│  │  (3 tasks)   │  22 hari hadir  │ │
│  └──────────────┴──────────────────┘ │
│  ┌──────────────┬──────────────────┐ │
│  │  📝 Izin     │  👥 Grup        │ │
│  │  1 pending   │  Tech Team      │ │
│  └──────────────┴──────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📊 Minggu Ini                 │  │
│  │  Sen  ✅  │ Sel ✅  │ Rab  ⏳  │  │
│  │  Kam  —   │ Jum —   │ Sab  —   │  │
│  └────────────────────────────────┘  │
│                                      │
│  [🏠 Home] [📋Todo] [📝Izin] [👤Profil]│
└──────────────────────────────────────┘
```

#### Screen 3: Check-in dengan GPS & Foto

```
┌──────────────────────────────────────┐
│  ◀  Check-in                         │
├──────────────────────────────────────┤
│                                      │
│  📍 Lokasi Terdeteksi                │
│  ┌────────────────────────────────┐  │
│  │  🗺️  [MAP VIEW]               │  │
│  │       ▲ You are here           │  │
│  │    ┌──●──┐                     │  │
│  │    │ 100m│  Radius Kantor      │  │
│  │    └─────┘                     │  │
│  │                                │  │
│  │  ✅ Anda berada dalam radius  │  │
│  │     (34 meter dari kantor)    │  │
│  └────────────────────────────────┘  │
│                                      │
│  📸 Foto Bukti Kehadiran             │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │       ┌──────────────┐        │  │
│  │       │              │        │  │
│  │       │   📷 AMBIL   │        │  │
│  │       │    FOTO      │        │  │
│  │       │              │        │  │
│  │       └──────────────┘        │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │       ✅ CHECK-IN             │  │
│  │    Pukul: 07:45 WIB           │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

#### Screen 4: To-Do List (Setelah Check-in)

```
┌──────────────────────────────────────┐
│  ◀  To-Do List Hari Ini              │
├──────────────────────────────────────┤
│  📅 Rabu, 15 Januari 2025            │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ✅  Review PR [#142]           │  │
│  │    ⏰ Estimasi: 2 jam          │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ ⬜  Sprint Planning Meeting    │  │
│  │    ⏰ Estimasi: 1.5 jam        │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ ⬜  Bug Fix: Login Issue #89   │  │
│  │    ⏰ Estimasi: 3 jam          │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  + Tambah Task Baru            │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │       💾 SIMPAN               │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```
#### Screen 5: Perizinan

```

```
┌──────────────────────────────────────┐
│  ← Kembali     AJUKAN IZIN         │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Tipe Izin                     │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │ 🏥 Sakit            ▼   │  │  │  ← Dropdown
│  │  └──────────────────────────┘  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📅 Tanggal                    │  │
│  │  ┌────────────┐ ┌───────────┐ │  │
│  │  │ 20/01/2025 │→│21/01/2025 │ │  │  ← Date Range
│  │  └────────────┘ └───────────┘ │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📝 Alasan                     │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │ Demam dan flu, butuh     │  │  │  ← Text Area
│  │  │ istirahat...             │  │  │
│  │  │                          │  │  │
│  │  └──────────────────────────┘  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📎 Lampiran (Opsional)        │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │ 📄 Surat_Dokter.pdf     │  │  │  ← Upload
│  │  │ [+ Tambah Lampiran]     │  │  │
│  │  └──────────────────────────┘  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │       ✈️ KIRIM PERMOHONAN     │  │  ← Submit
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```


#### Screen 6: Dashboard Approval

```
┌──────────────────────────────────────┐
│  AbsenIn    🔔  👤 [Manager]         │
├──────────────────────────────────────┤
│                                      │
│  📊 Ringkasan Hari Ini               │
│  ┌──────────┬──────────┬───────────┐ │
│  │ 👥 Hadir │ ⏰ Telat │ ❌ Absen  │ │
│  │   12     │    2     │    3      │ │
│  └──────────┴──────────┴───────────┘ │
│                                      │
│  ⚠️ Pending Approval (5)             │
│  ┌────────────────────────────────┐  │
│  │ 🟡 Budi - Cuti Tahunan         │  │
│  │    15-16 Jan · 2 hari          │  │
│  │    [✓ Approve] [✗ Reject]      │  │
│  ├────────────────────────────────┤  │
│  │ 🟡 Siti - Izin Sakit           │  │
│  │    15 Jan · 1 hari             │  │
│  │    📎 [Lihat Surat Dokter]     │  │
│  │    [✓ Approve] [✗ Reject]      │  │
│  ├────────────────────────────────┤  │
│  │ 🟡 ...3 lainnya                │  │
│  └────────────────────────────────┘  │
│                                      │
│  📋 Quick Actions                    │
│  [📧 Blast] [⚙️ Setting] [📊 Report]│
│                                      │
│  [🏠 Home] [✅Apprv] [👥Tim] [⚙️Set] │
└──────────────────────────────────────┘
```