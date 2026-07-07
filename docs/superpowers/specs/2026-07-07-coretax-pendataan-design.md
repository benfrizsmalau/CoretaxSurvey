# Design Spec: Aplikasi Pendataan NPWP & Akun Coretax Pegawai Pemkab Mamberamo Raya

**Tanggal:** 2026-07-07
**Status:** Disetujui

---

## 1. Konteks & Tujuan

Aplikasi web untuk mendata NPWP dan status aktivasi akun Coretax seluruh ASN Pemerintah Kabupaten Mamberamo Raya, sesuai amanat SE Menteri PANRB No. 7 Tahun 2025. Dioperasikan secara terpusat oleh **tim data BPPKAD Kabupaten Mamberamo Raya** — bukan oleh operator masing-masing SKPD. Admin BPPKAD bertanggung jawab atas finalisasi dan penguncian data final.

---

## 2. Stack Teknologi

| Layer | Teknologi |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions) |
| UI Components | Shadcn UI + Tailwind CSS v4 |
| Premium Components | MagicUI Shine Border, @ruixenui/table-edit, @ruixenui/table-dialog, @Codehagen Floating Action Panel, Apple Liquid Glass Button (via 21st.dev) |
| Database | Supabase PostgreSQL (`vgqyqvnqceunbrjvptaa`) |
| Supabase Client | `@supabase/supabase-js` — server-side only via service_role |
| Auth/Session | `iron-session` (signed cookie, 32+ char secret) |
| Validasi | `zod` (shared client + server) |
| Excel Import/Export | `xlsx` (SheetJS) |
| PDF Laporan | `@react-pdf/renderer` |
| Deployment | Netlify (Next.js runtime) |
| Icons | `lucide-react` |

---

## 3. Arsitektur Sistem

```
Browser (Client)
      │  cookie role=admin|operator (iron-session)
      ▼
Next.js Middleware
      ├── /login           → public
      ├── /dashboard/*     → require valid session cookie
      └── /admin/*         → require role=admin
      │
      ▼
Server Actions (service_role key — TIDAK pernah ke browser)
      ├── auth.ts          → validasi PIN, issue session cookie
      ├── pegawai.ts       → CRUD pegawai_coretax (OCC via updated_at)
      ├── import.ts        → parse Excel → batch upsert
      ├── export.ts        → query → generate Excel / PDF
      └── pins.ts          → CRUD access_pins (admin only)
      │
      ▼
Supabase PostgreSQL
      ├── ref_skpd
      ├── pegawai_coretax  (+ trigger locking + RLS)
      └── access_pins
```

**Prinsip keamanan utama:**
- `SUPABASE_SERVICE_ROLE_KEY` dan `ADMIN_PIN` hanya ada di environment variables server — tidak pernah diawali `NEXT_PUBLIC_`
- Sesi disimpan di signed cookie `iron-session`; server memverifikasi role sebelum setiap Server Action
- PostgreSQL trigger sebagai lapisan keamanan kedua (data yang sudah `is_final=TRUE` tidak bisa dimodifikasi oleh siapapun via API)

---

## 4. Database Schema

### 4.1 Tabel `ref_skpd`

34 SKPD berdasarkan data aktual file Excel kepegawaian.

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.ref_skpd (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_skpd VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.ref_skpd (nama_skpd) VALUES
  ('BKPSDM'),
  ('BADAN KESATUAN BANGSA DAN POLITIK'),
  ('BADAN PENANGGULANGAN BENCANA DAERAH'),
  ('BADAN PENDAPATAN PENGELOLA KEUANGAN DAN ASET DAERAH'),
  ('DINAS ARSIP'),
  ('DINAS PEMUDA OLAHRAGA DAN PARIWISATA'),
  ('DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL'),
  ('DINAS KESEHATAN'),
  ('DINAS KETAHANAN PANGAN'),
  ('DINAS KOMUNIKASI DAN INFORMATIKA'),
  ('DINAS LINGKUNGAN HIDUP'),
  ('DINAS PEKERJAAN UMUM DAN PENATAAN RUANG'),
  ('DINAS PEMBERDAYAAN MASYARAKAT KAMPUNG DAN ADAT'),
  ('DINAS PENGENDALIAN PENDUDUK DAN KB'),
  ('DINAS PENANAMAN MODAL DAN PELAYANAN TERPADU'),
  ('DINAS PENDIDIKAN'),
  ('DINAS PERHUBUNGAN'),
  ('DINAS PERINDUSTRIAN PERDAGANGAN KOPERASI DAN UMKM'),
  ('DINAS PERUMAHAN'),
  ('DINAS PERIKANAN'),
  ('DINAS SOSIAL'),
  ('DINAS TANAMAN PANGAN HORTIKULTURA DAN PETERNAKAN'),
  ('DISTRIK BENUKI'),
  ('DISTRIK MAMBERAMO HILIR'),
  ('DISTRIK MAMBERAMO HULU'),
  ('DISTRIK MAMBERAMO TENGAH'),
  ('DISTRIK MAMBERAMO TENGAH TIMUR'),
  ('DISTRIK ROUFAER'),
  ('DISTRIK SAWAI'),
  ('DISTRIK WAROPEN ATAS'),
  ('INSPEKTORAT DAERAH'),
  ('SATUAN POLISI PAMONG PRAJA'),
  ('SEKRETARIAT DAERAH'),
  ('SEKRETARIAT DPRD')
ON CONFLICT (nama_skpd) DO NOTHING;
```

### 4.2 Tabel `pegawai_coretax`

Hanya field yang relevan untuk pendataan Coretax. Field keuangan, keluarga, jabatan, dan bank dari Excel **tidak diimpor**.

```sql
CREATE TABLE public.pegawai_coretax (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identitas dasar (diimpor dari Excel)
  nip_pegawai  VARCHAR(18)  NOT NULL UNIQUE,
  nama_pegawai VARCHAR(255) NOT NULL,
  nik_pegawai  VARCHAR(16),           -- diisi oleh tim (awalnya kosong/nol)
  npwp_pegawai VARCHAR(20),           -- diisi oleh tim (awalnya kosong/nol)
  skpd_id      UUID REFERENCES public.ref_skpd(id) ON DELETE SET NULL,
  skpd_raw     TEXT,                  -- nama SKPD asli dari Excel (cadangan)

  -- Kontak (diisi manual oleh tim, tidak ada di Excel)
  no_telp      VARCHAR(20),
  email        VARCHAR(150),

  -- Status aktivasi Coretax (diisi manual oleh tim)
  status_aktivasi VARCHAR(50) DEFAULT 'Belum Terdaftar'
    CONSTRAINT chk_status CHECK (status_aktivasi IN (
      'Belum Terdaftar', 'Aktivasi Akun', 'Pembuatan KO DJP', 'Validasi Sukses'
    )),

  -- Penguncian data (dikelola admin)
  is_final             BOOLEAN   DEFAULT FALSE NOT NULL,
  verified_at          TIMESTAMPTZ,
  operator_verifikator VARCHAR(100),

  -- Audit trail
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  last_edited_by VARCHAR(100)
);

CREATE INDEX idx_pegawai_nip   ON public.pegawai_coretax(nip_pegawai);
CREATE INDEX idx_pegawai_nik   ON public.pegawai_coretax(nik_pegawai);
CREATE INDEX idx_pegawai_skpd  ON public.pegawai_coretax(skpd_id);
CREATE INDEX idx_pegawai_final ON public.pegawai_coretax(is_final);
```

**Total data:** 2.675 pegawai dari 34 SKPD (berdasarkan file `DATA PEGAWAI PER OPD.xlsx`).

**Kolom yang diimpor dari Excel:** `nip_pegawai`, `nama_pegawai`, `skpd` (sheet name → skpd_id).

**Kolom yang diisi tim BPPKAD:** `nik_pegawai`, `npwp_pegawai`, `no_telp`, `email`, `status_aktivasi`.

### 4.3 Tabel `access_pins` (baru)

PIN per anggota tim data BPPKAD, dikelola oleh admin.

```sql
CREATE TABLE public.access_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin VARCHAR(10) NOT NULL UNIQUE,
  label VARCHAR(100),        -- nama anggota tim BPPKAD
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);
```

### 4.4 PostgreSQL Trigger (Data Locking)

```sql
CREATE OR REPLACE FUNCTION public.enforce_data_lock_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_final = TRUE THEN
    RAISE EXCEPTION 'Akses Ditolak: Data pegawai dengan NIP % telah diverifikasi dan dikunci secara permanen.', OLD.nip_pegawai;
  END IF;
  IF NEW.is_final = TRUE AND (OLD.is_final IS NULL OR OLD.is_final = FALSE) THEN
    NEW.verified_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lock_verified_pegawai ON public.pegawai_coretax;
CREATE TRIGGER trg_lock_verified_pegawai
BEFORE UPDATE OR DELETE ON public.pegawai_coretax
FOR EACH ROW EXECUTE FUNCTION public.enforce_data_lock_integrity();
```

### 4.5 Row Level Security

```sql
ALTER TABLE public.pegawai_coretax ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_pins ENABLE ROW LEVEL SECURITY;

-- Blokir akses anon ke semua data
CREATE POLICY "deny_anon_pegawai"
ON public.pegawai_coretax FOR ALL TO anon USING (false);

CREATE POLICY "deny_anon_pins"
ON public.access_pins FOR ALL TO anon USING (false);

-- Izinkan service_role penuh (digunakan oleh Server Actions)
CREATE POLICY "service_role_full_access_pegawai"
ON public.pegawai_coretax FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_pins"
ON public.access_pins FOR ALL TO service_role USING (true) WITH CHECK (true);
```

---

## 5. Autentikasi & Otorisasi

### Dua Tier Akses

| Tier | Sumber PIN | Akses |
|---|---|---|
| Admin | `ADMIN_PIN` env var | Semua fitur + finalisasi data + kelola PIN anggota tim |
| Anggota Tim BPPKAD | Tabel `access_pins` (dikelola admin) | Input & edit data, import, export |

### Alur Login

```
POST /login (Server Action)
  1. Cek PIN == ADMIN_PIN (env var) → cookie { role: 'admin' }
  2. Cek PIN ada di access_pins WHERE is_active=TRUE → cookie { role: 'operator' }
     → update last_used_at
  3. Tidak cocok → error "PIN tidak valid"
```

### Session Cookie (`iron-session`)

```ts
interface SessionData {
  role: 'admin' | 'operator'
  pin_label?: string  // label PIN operator yang digunakan
  logged_in_at: number
}
```

Cookie TTL: 8 jam. Middleware memverifikasi cookie di setiap request ke `/dashboard/*` dan `/admin/*`.

---

## 6. Halaman & Komponen

### 6.1 `/login`

- Card glassmorphism di atas gradient gelap
- Input PIN dengan masking
- Server Action validasi → redirect ke `/dashboard`

### 6.2 `/dashboard`

**Stat Cards** (Shine Border / MagicUI):
- Total Pegawai, Akun Aktif (Validasi Sukses), Sedang Proses, Belum Terdaftar

**Filter Bar:**
- Combobox SKPD (Shadcn UI)
- Search input NIP/Nama
- Tombol Import Excel → `/dashboard/import`
- Tombol Laporan → `/dashboard/laporan`

**Tabel Utama** (`@ruixenui/table-edit`):
- Kolom: ☐ | NIP | Nama | SKPD | NPWP | Telepon | Email | Status | Aksi
- Inline edit: `npwp_pegawai`, `no_telp`, `email`, `status_aktivasi`
- Row dropdown: Edit Dialog (detail lengkap) | Kunci Data (admin only)
- Baris `is_final=TRUE`: background berbeda, semua input disabled, badge "Terkunci"

**Floating Action Panel** (@Codehagen) — muncul saat ≥1 baris dipilih:
- [Ekspor Excel] — semua role
- [Verifikasi & Kunci Massal] — admin only

### 6.3 `/dashboard/import`

Mendukung file Excel multi-sheet (format `DATA PEGAWAI PER OPD.xlsx`).

1. Dropzone upload `.xlsx`
2. Parser membaca **semua sheet** — setiap sheet = satu SKPD
3. Header data ada di **baris ke-2** (baris ke-1 kosong) — parser skip baris pertama
4. Kolom yang diimpor: `nip_pegawai`, `nama_pegawai` — nama sheet dipetakan ke `skpd_id`
5. Preview: tabel per-sheet, 20 baris pertama, tampilkan NIP + Nama + SKPD
6. Validasi: `nip_pegawai` wajib ada dan 18 digit angka; `nama_pegawai` tidak boleh kosong
7. Tombol "Impor Semua" → Server Action batch upsert:
   - `ON CONFLICT (nip_pegawai) DO UPDATE SET nama_pegawai, skpd_id, skpd_raw` — update nama/SKPD jika berubah
   - Baris `is_final=TRUE` dilewati (trigger menolak perubahan)
8. Laporan hasil: X ditambahkan, Y diperbarui, Z dilewati (terkunci), W gagal validasi

### 6.4 `/dashboard/laporan`

Pilih jenis laporan + filter SKPD → preview → export/cetak.

**Laporan 1 — Rekapitulasi Per SKPD:**
- Tabel: SKPD | Total | Validasi Sukses | Sedang Proses | Belum Terdaftar
- Export: PDF + Excel
- Cetak: `window.print()` dengan CSS `@media print`

**Laporan 2 — Daftar Pegawai Per SKPD (Format Surat Resmi):**
- Filter wajib: Combobox pilih satu SKPD (tombol Generate disabled sampai SKPD dipilih)
- Filter opsional: status aktivasi (semua / hanya aktif / belum terdaftar)
- Template: kop daerah, tabel No/Nama/NIP/NPWP/Status, kolom tanda tangan pejabat
- Export: PDF via `@react-pdf/renderer`, siap cetak A4 portrait

### 6.5 `/admin/pins`

Kelola PIN anggota tim data BPPKAD.

- Tabel PIN: Nama Anggota Tim | PIN (masked •••••) | Status | Terakhir Digunakan | Aksi
- Form tambah: isi nama anggota tim → generate PIN 6 digit otomatis (bisa diubah manual)
- Tombol: Nonaktifkan | Hapus

---

## 7. Validasi Data (Zod)

```ts
const pegawaiSchema = z.object({
  nip_pegawai:   z.string().regex(/^\d{18}$/, 'NIP harus 18 digit angka'),
  nik_pegawai:   z.string().regex(/^\d{16}$/, 'NIK harus 16 digit angka'),
  npwp_pegawai:  z.string().regex(
    /^(\d{15}|\d{16}|\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3})$/,
    'Format NPWP tidak valid'
  ).optional(),
  no_telp:       z.string().regex(/^\d{8,15}$/).optional(),
  email:         z.string().email().optional(),
})
```

---

## 8. Optimistic Concurrency Control (OCC)

Setiap UPDATE menyertakan `updated_at` lama sebagai kondisi WHERE:

```ts
const result = await supabase
  .from('pegawai_coretax')
  .update({ ...changes })
  .eq('id', id)
  .eq('updated_at', lastKnownUpdatedAt)  // OCC check
  .select()

if (result.data?.length === 0) {
  // Tidak ada baris yang diupdate → konflik → reload + notifikasi
  return { conflict: true }
}
```

Notifikasi konflik: `"Gagal Menyimpan: Data pegawai ini telah diperbarui oleh anggota tim lain. Aplikasi memuat data terbaru."`

---

## 9. Alur Finalisasi & Penguncian Data

```
Admin klik "Verifikasi & Kunci" (Liquid Glass Button)
  ↓
Alert Dialog konfirmasi: "Tindakan ini akan mengunci data secara permanen..."
  ↓ Konfirmasi
Server Action (verifikasi role=admin di server)
  → UPDATE pegawai_coretax SET is_final=TRUE WHERE id=?
  ↓
PostgreSQL Trigger: set verified_at=NOW(), updated_at=NOW()
  ↓
UI: baris berubah warna gelap, badge "Terkunci", semua input disabled
```

Pengecualian unlock hanya bisa dilakukan langsung via Supabase SQL Editor dengan service role key.

---

## 10. Struktur Folder

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── import/page.tsx
│   │   └── laporan/
│   │       ├── page.tsx
│   │       ├── rekap/page.tsx
│   │       └── daftar/page.tsx
│   └── admin/
│       └── pins/page.tsx
├── components/
│   ├── dashboard/
│   │   ├── StatCards.tsx
│   │   ├── PegawaiTable.tsx
│   │   ├── EditDialog.tsx
│   │   └── FloatingActionPanel.tsx
│   ├── import/
│   │   └── ImportDropzone.tsx
│   ├── laporan/
│   │   ├── LaporanRekapTable.tsx
│   │   └── LaporanDaftarPegawai.tsx
│   ├── admin/
│   │   └── PinManager.tsx
│   └── ui/                         # Shadcn components
├── lib/
│   ├── supabase.ts                 # server-only Supabase client
│   ├── session.ts                  # iron-session config
│   └── validations.ts              # Zod schemas
├── actions/
│   ├── auth.ts
│   ├── pegawai.ts
│   ├── import.ts
│   ├── export.ts
│   └── pins.ts
└── middleware.ts                   # route protection
```

---

## 11. Environment Variables

```bash
# Public (aman di browser)
NEXT_PUBLIC_SUPABASE_URL=https://vgqyqvnqceunbrjvptaa.supabase.co

# Server only (RAHASIA — jangan awali NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
ADMIN_PIN=<pin_admin>
SESSION_SECRET=<random_32+_chars>
```

---

## 12. Rencana Implementasi (Fase)

| Fase | Scope |
|---|---|
| 1. Setup & DB | Init Next.js, konfigurasi Supabase, jalankan semua migration SQL |
| 2. Auth | Login page, middleware, iron-session, PIN validation |
| 3. Dashboard Core | Stat cards, tabel pegawai, inline edit, OCC |
| 4. Import | Excel upload, preview, batch upsert |
| 5. Admin | PIN manager, finalisasi & kunci data |
| 6. Laporan | Rekapitulasi PDF/Excel, daftar surat resmi PDF |
| 7. Polish & Deploy | Dark/light mode, animasi, Netlify deployment |
