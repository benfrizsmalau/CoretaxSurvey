# Coretax Pendataan Pegawai — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun aplikasi web pendataan NPWP & akun Coretax untuk 2.675 pegawai Pemkab Mamberamo Raya, dioperasikan tim BPPKAD dengan autentikasi PIN, penguncian data permanen, import Excel, dan laporan PDF.

**Architecture:** Next.js 15 App Router dengan Server Actions sebagai satu-satunya jalur ke Supabase — `service_role key` tidak pernah keluar ke browser. PIN Gate diimplementasikan di middleware dengan session cookie `iron-session`. PostgreSQL trigger mengunci baris `is_final=TRUE` di level database.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v3, Shadcn UI, Supabase PostgreSQL, iron-session, zod, xlsx (SheetJS), @react-pdf/renderer, lucide-react, Netlify.

---

## File Map

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                             # redirect → /login
│   ├── login/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
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
│   ├── import/ImportDropzone.tsx
│   ├── laporan/LaporanRekapTable.tsx
│   └── admin/PinManager.tsx
├── lib/
│   ├── supabase.ts
│   ├── session.ts
│   ├── validations.ts
│   └── types.ts
├── actions/
│   ├── auth.ts
│   ├── pegawai.ts
│   ├── import.ts
│   ├── export.ts
│   └── pins.ts
└── middleware.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: project via `create-next-app`
- Create: `src/app/globals.css`
- Create: `.env.local`

- [ ] **Step 1: Scaffold Next.js 15**

```bash
cd /Users/benfrizscrmalau/Documents/AppFolder/CoreTaxSurvey
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js iron-session zod xlsx @react-pdf/renderer lucide-react
npm install --save-dev @types/node
```

- [ ] **Step 3: Init Shadcn UI**

```bash
npx shadcn@latest init
```

Pilih: Default style, Base color=Slate, CSS variables=Yes.

- [ ] **Step 4: Tambah komponen Shadcn**

```bash
npx shadcn@latest add button input label card dialog alert-dialog command badge table toast select separator dropdown-menu checkbox
```

- [ ] **Step 5: Glassmorphism dark theme di `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 15 23 42;
    --foreground: 226 232 240;
    --card: 22 33 55;
    --card-foreground: 226 232 240;
    --popover: 22 33 55;
    --popover-foreground: 226 232 240;
    --primary: 99 102 241;
    --primary-foreground: 255 255 255;
    --secondary: 30 41 59;
    --secondary-foreground: 203 213 225;
    --muted: 30 41 59;
    --muted-foreground: 148 163 184;
    --accent: 56 189 248;
    --accent-foreground: 15 23 42;
    --destructive: 239 68 68;
    --destructive-foreground: 255 255 255;
    --border: 51 65 85;
    --input: 30 41 59;
    --ring: 99 102 241;
    --radius: 0.75rem;
  }
}

body {
  background: rgb(15 23 42);
  color: rgb(226 232 240);
  min-height: 100vh;
}

.glass-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
```

- [ ] **Step 6: `src/app/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/login')
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: sukses tanpa error.

---

## Task 2: Types, Supabase Client & Session

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/supabase.ts`
- Create: `src/lib/session.ts`
- Create: `src/lib/validations.ts`
- Create: `.env.local`

- [ ] **Step 1: Buat `.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=https://vgqyqvnqceunbrjvptaa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
ADMIN_PIN=<pin_admin>
SESSION_SECRET=coretax-mamberamo-raya-secret-key-32chars!!
```

Jangan commit file ini. Tambahkan `.env.local` ke `.gitignore`.

- [ ] **Step 2: Buat `src/lib/types.ts`**

```ts
export type StatusAktivasi =
  | 'Belum Terdaftar'
  | 'Aktivasi Akun'
  | 'Pembuatan KO DJP'
  | 'Validasi Sukses'

export type Role = 'admin' | 'operator'

export interface RefSKPD {
  id: string
  nama_skpd: string
}

export interface PegawaiCoretax {
  id: string
  nip_pegawai: string
  nama_pegawai: string
  nik_pegawai: string | null
  npwp_pegawai: string | null
  skpd_id: string | null
  skpd_raw: string | null
  no_telp: string | null
  email: string | null
  status_aktivasi: StatusAktivasi
  is_final: boolean
  verified_at: string | null
  operator_verifikator: string | null
  created_at: string
  updated_at: string
  last_edited_by: string | null
  ref_skpd?: { nama_skpd: string }
}

export interface AccessPin {
  id: string
  pin: string
  label: string | null
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

export interface SessionData {
  role: Role
  pin_label?: string
  logged_in_at: number
}

export interface StatDashboard {
  total: number
  validasi_sukses: number
  sedang_proses: number
  belum_terdaftar: number
}
```

- [ ] **Step 3: Buat `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key, { auth: { persistSession: false } })
}
```

- [ ] **Step 4: Buat `src/lib/session.ts`**

```ts
import { SessionOptions } from 'iron-session'
import { SessionData } from './types'

export type { SessionData }

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'coretax-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60,
    httpOnly: true,
    sameSite: 'lax',
  },
}
```

- [ ] **Step 5: Buat `src/lib/validations.ts`**

```ts
import { z } from 'zod'

export const pegawaiUpdateSchema = z.object({
  nik_pegawai: z.string().regex(/^\d{16}$/, 'NIK harus 16 digit').optional().or(z.literal('')),
  npwp_pegawai: z.string().regex(
    /^(\d{15}|\d{16}|\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3})$/,
    'Format NPWP tidak valid'
  ).optional().or(z.literal('')),
  no_telp: z.string().regex(/^\d{8,15}$/, 'Nomor telepon 8-15 digit').optional().or(z.literal('')),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  status_aktivasi: z.enum(['Belum Terdaftar', 'Aktivasi Akun', 'Pembuatan KO DJP', 'Validasi Sukses']),
})

export type PegawaiUpdateInput = z.infer<typeof pegawaiUpdateSchema>
```

---

## Task 3: Database Migrations

Buka Supabase SQL Editor: https://supabase.com/dashboard/project/vgqyqvnqceunbrjvptaa/sql

- [ ] **Step 1: Migration 1 — ref_skpd**

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

- [ ] **Step 2: Migration 2 — pegawai_coretax**

```sql
CREATE TABLE public.pegawai_coretax (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nip_pegawai  VARCHAR(18)  NOT NULL UNIQUE,
  nama_pegawai VARCHAR(255) NOT NULL,
  nik_pegawai  VARCHAR(16),
  npwp_pegawai VARCHAR(20),
  skpd_id      UUID REFERENCES public.ref_skpd(id) ON DELETE SET NULL,
  skpd_raw     TEXT,
  no_telp      VARCHAR(20),
  email        VARCHAR(150),
  status_aktivasi VARCHAR(50) DEFAULT 'Belum Terdaftar'
    CONSTRAINT chk_status CHECK (status_aktivasi IN (
      'Belum Terdaftar', 'Aktivasi Akun', 'Pembuatan KO DJP', 'Validasi Sukses'
    )),
  is_final             BOOLEAN   DEFAULT FALSE NOT NULL,
  verified_at          TIMESTAMPTZ,
  operator_verifikator VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  last_edited_by VARCHAR(100)
);

CREATE INDEX idx_pegawai_nip   ON public.pegawai_coretax(nip_pegawai);
CREATE INDEX idx_pegawai_nik   ON public.pegawai_coretax(nik_pegawai);
CREATE INDEX idx_pegawai_skpd  ON public.pegawai_coretax(skpd_id);
CREATE INDEX idx_pegawai_final ON public.pegawai_coretax(is_final);
```

- [ ] **Step 3: Migration 3 — trigger data locking**

```sql
CREATE OR REPLACE FUNCTION public.enforce_data_lock_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_final = TRUE THEN
    RAISE EXCEPTION 'Akses Ditolak: Data NIP % telah dikunci permanen.', OLD.nip_pegawai;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_final = TRUE THEN
    RAISE EXCEPTION 'Akses Ditolak: Data NIP % telah dikunci permanen.', OLD.nip_pegawai;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.is_final = TRUE AND OLD.is_final = FALSE THEN
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

- [ ] **Step 4: Migration 4 — access_pins + RLS**

```sql
CREATE TABLE public.access_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin VARCHAR(10) NOT NULL UNIQUE,
  label VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

ALTER TABLE public.pegawai_coretax ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_skpd ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_pegawai" ON public.pegawai_coretax FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_pins"    ON public.access_pins     FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_skpd"    ON public.ref_skpd        FOR ALL TO anon USING (false);

CREATE POLICY "service_role_pegawai" ON public.pegawai_coretax FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_pins"    ON public.access_pins     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_skpd"    ON public.ref_skpd        FOR ALL TO service_role USING (true) WITH CHECK (true);
```

- [ ] **Step 5: Verifikasi**

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

Expected: `ref_skpd`, `pegawai_coretax`, `access_pins` muncul.

---

## Task 4: Middleware & Auth Actions

**Files:**
- Create: `src/middleware.ts`
- Create: `src/actions/auth.ts`

- [ ] **Step 1: Buat `src/middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { SessionData, sessionOptions } from '@/lib/session'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const session = await getIronSession<SessionData>(request, response, sessionOptions)
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/dashboard') && !session.role) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
```

- [ ] **Step 2: Buat `src/actions/auth.ts`**

```ts
'use server'

import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { SessionData, sessionOptions } from '@/lib/session'

export async function loginAction(pin: string) {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (pin === process.env.ADMIN_PIN) {
    session.role = 'admin'
    session.logged_in_at = Date.now()
    await session.save()
    return { success: true }
  }

  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('access_pins')
    .select('id, label')
    .eq('pin', pin)
    .eq('is_active', true)
    .single()

  if (data) {
    session.role = 'operator'
    session.pin_label = data.label ?? undefined
    session.logged_in_at = Date.now()
    await session.save()
    await supabase
      .from('access_pins')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
    return { success: true }
  }

  return { success: false, error: 'PIN tidak valid' }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  session.destroy()
  redirect('/login')
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  if (!session.role) return null
  return { role: session.role, pin_label: session.pin_label, logged_in_at: session.logged_in_at }
}
```

---

## Task 5: Login Page

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Buat `src/app/login/page.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Shield } from 'lucide-react'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await loginAction(pin)
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error ?? 'Terjadi kesalahan')
        setPin('')
      }
    })
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(56,189,248,0.1) 0%, transparent 60%), rgb(15 23 42)',
      }}
    >
      <div className="glass-card rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.4)',
            }}
          >
            <Shield className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-xl font-semibold text-slate-100">Pendataan Coretax</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">
            Pemerintah Kabupaten Mamberamo Raya
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin" className="text-slate-300 text-sm">
              Kode Akses
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN"
                className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending || !pin}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isPending ? 'Memverifikasi...' : 'Masuk'}
          </Button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Test login**

```bash
npm run dev
```

Buka http://localhost:3000 — redirect ke /login. Masukkan ADMIN_PIN — redirect ke /dashboard (404 normal, belum dibuat).

---

## Task 6: Dashboard Layout & Stat Cards

**Files:**
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/components/dashboard/StatCards.tsx`
- Modify: `src/actions/pegawai.ts` (buat file baru dengan getStatDashboard)

- [ ] **Step 1: Buat `src/actions/pegawai.ts`**

```ts
'use server'

import { getSupabaseClient } from '@/lib/supabase'
import { StatDashboard, PegawaiCoretax, RefSKPD } from '@/lib/types'
import { getSession } from './auth'
import { pegawaiUpdateSchema, PegawaiUpdateInput } from '@/lib/validations'

export async function getStatDashboard(): Promise<StatDashboard> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('pegawai_coretax').select('status_aktivasi')
  if (!data) return { total: 0, validasi_sukses: 0, sedang_proses: 0, belum_terdaftar: 0 }
  return {
    total: data.length,
    validasi_sukses: data.filter((d) => d.status_aktivasi === 'Validasi Sukses').length,
    sedang_proses: data.filter(
      (d) => d.status_aktivasi === 'Aktivasi Akun' || d.status_aktivasi === 'Pembuatan KO DJP'
    ).length,
    belum_terdaftar: data.filter((d) => d.status_aktivasi === 'Belum Terdaftar').length,
  }
}

export async function getSkpdList(): Promise<RefSKPD[]> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('ref_skpd').select('id, nama_skpd').order('nama_skpd')
  return data ?? []
}

export async function getPegawai(opts: {
  skpdId?: string
  search?: string
  page?: number
  pageSize?: number
}) {
  const supabase = getSupabaseClient()
  const { skpdId, search, page = 1, pageSize = 50 } = opts
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('pegawai_coretax')
    .select('*, ref_skpd(nama_skpd)', { count: 'exact' })
    .order('nama_pegawai', { ascending: true })
    .range(from, to)

  if (skpdId) query = query.eq('skpd_id', skpdId)
  if (search)
    query = query.or(`nip_pegawai.ilike.%${search}%,nama_pegawai.ilike.%${search}%`)

  const { data, error, count } = await query
  return { data: (data as PegawaiCoretax[]) ?? [], error, count: count ?? 0 }
}

export async function updatePegawai(
  id: string,
  lastUpdatedAt: string,
  input: PegawaiUpdateInput
): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Sesi tidak valid' }

  const parsed = pegawaiUpdateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const supabase = getSupabaseClient()
  const cleanInput = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v])
  )

  const { data, error } = await supabase
    .from('pegawai_coretax')
    .update({ ...cleanInput, last_edited_by: session.pin_label ?? session.role })
    .eq('id', id)
    .eq('updated_at', lastUpdatedAt)
    .eq('is_final', false)
    .select()

  if (error) return { success: false, error: error.message }
  if (!data || data.length === 0) return { success: false, conflict: true }
  return { success: true }
}

export async function finalizePegawai(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return { success: false, error: 'Hanya admin yang dapat mengunci data' }

  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('pegawai_coretax')
    .update({ is_final: true, operator_verifikator: session.pin_label ?? 'admin' })
    .eq('id', id)
    .eq('is_final', false)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function bulkFinalizePegawai(
  ids: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'admin') return { success: false, count: 0, error: 'Hanya admin' }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('pegawai_coretax')
    .update({ is_final: true, operator_verifikator: 'admin' })
    .in('id', ids)
    .eq('is_final', false)
    .select('id')

  if (error) return { success: false, count: 0, error: error.message }
  return { success: true, count: data?.length ?? 0 }
}

export async function getRekapPerSKPD() {
  const supabase = getSupabaseClient()
  const { data: skpdList } = await supabase
    .from('ref_skpd')
    .select('id, nama_skpd')
    .order('nama_skpd')
  const { data: pegawai } = await supabase
    .from('pegawai_coretax')
    .select('skpd_id, status_aktivasi')

  return (skpdList ?? [])
    .map((s) => {
      const rows = (pegawai ?? []).filter((p) => p.skpd_id === s.id)
      return {
        nama_skpd: s.nama_skpd,
        total: rows.length,
        validasi_sukses: rows.filter((p) => p.status_aktivasi === 'Validasi Sukses').length,
        ko_djp: rows.filter((p) => p.status_aktivasi === 'Pembuatan KO DJP').length,
        aktivasi: rows.filter((p) => p.status_aktivasi === 'Aktivasi Akun').length,
        belum: rows.filter((p) => p.status_aktivasi === 'Belum Terdaftar').length,
      }
    })
    .filter((s) => s.total > 0)
}
```

- [ ] **Step 2: Buat `src/components/dashboard/StatCards.tsx`**

```tsx
import { Users, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { StatDashboard } from '@/lib/types'

const cards = [
  { key: 'total' as const, label: 'Total Pegawai', icon: Users, border: 'rgba(99,102,241,0.4)' },
  { key: 'validasi_sukses' as const, label: 'Validasi Sukses', icon: CheckCircle, border: 'rgba(52,211,153,0.4)' },
  { key: 'sedang_proses' as const, label: 'Sedang Proses', icon: Clock, border: 'rgba(251,191,36,0.4)' },
  { key: 'belum_terdaftar' as const, label: 'Belum Terdaftar', icon: AlertCircle, border: 'rgba(239,68,68,0.4)' },
]

export function StatCards({ stats }: { stats: StatDashboard }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon: Icon, border }) => (
        <div
          key={key}
          className="glass-card rounded-xl p-4 relative overflow-hidden"
          style={{ boxShadow: `0 0 20px ${border}` }}
        >
          <div className="absolute inset-0 rounded-xl" style={{ border: `1px solid ${border}` }} />
          <div className="relative">
            <Icon className="w-5 h-5 text-slate-400 mb-2" />
            <p className="text-2xl font-bold text-slate-100">
              {stats[key].toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Buat `src/app/dashboard/layout.tsx`**

```tsx
import { getSession, logoutAction } from '@/actions/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, Settings } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen" style={{ background: 'rgb(15 23 42)' }}>
      <header className="glass-card border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-100">
              Coretax Mamberamo Raya
            </Link>
            <nav className="hidden md:flex gap-1 ml-4">
              <Link href="/dashboard" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800">Data Pegawai</Link>
              <Link href="/dashboard/import" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800">Import</Link>
              <Link href="/dashboard/laporan" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800">Laporan</Link>
              {session.role === 'admin' && (
                <Link href="/admin/pins" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800">
                  <Settings className="w-3.5 h-3.5 inline mr-1" />Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:block">
              {session.role === 'admin' ? 'Admin' : session.pin_label ?? 'Operator'}
            </span>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit" className="text-slate-400 hover:text-slate-200 h-8 w-8 p-0">
                <LogOut className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-screen-xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
```

---

## Task 7: Pegawai Table & Dashboard Page

**Files:**
- Create: `src/components/dashboard/PegawaiTable.tsx`
- Create: `src/components/dashboard/EditDialog.tsx`
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Buat `src/components/dashboard/EditDialog.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { PegawaiCoretax, RefSKPD, Role } from '@/lib/types'
import { updatePegawai, finalizePegawai } from '@/actions/pegawai'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Lock } from 'lucide-react'

interface Props {
  pegawai: PegawaiCoretax
  skpdList: RefSKPD[]
  role: Role
  onClose: () => void
  onSaved: () => void
}

export function EditDialog({ pegawai, role, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    nik_pegawai: pegawai.nik_pegawai ?? '',
    npwp_pegawai: pegawai.npwp_pegawai ?? '',
    no_telp: pegawai.no_telp ?? '',
    email: pegawai.email ?? '',
    status_aktivasi: pegawai.status_aktivasi,
  })
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSave() {
    setError('')
    startTransition(async () => {
      const result = await updatePegawai(pegawai.id, pegawai.updated_at, form as any)
      if (result.conflict) {
        setError('Data telah diperbarui oleh anggota tim lain. Tutup dan coba lagi.')
        return
      }
      if (!result.success) { setError(result.error ?? 'Gagal menyimpan'); return }
      onSaved()
    })
  }

  function handleFinalize() {
    startTransition(async () => {
      const result = await finalizePegawai(pegawai.id)
      if (!result.success) { setError(result.error ?? 'Gagal mengunci data'); return }
      onSaved()
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Edit Data Pegawai</DialogTitle>
          <p className="text-sm text-slate-400">{pegawai.nama_pegawai} · {pegawai.nip_pegawai}</p>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {[
            { key: 'nik_pegawai', label: 'NIK (16 digit)', placeholder: '3200...' },
            { key: 'npwp_pegawai', label: 'NPWP', placeholder: 'xx.xxx.xxx.x-xxx.xxx atau 15/16 digit' },
            { key: 'no_telp', label: 'No. Telepon', placeholder: '0812...' },
            { key: 'email', label: 'Email', placeholder: 'nama@domain.com' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="grid grid-cols-3 gap-3 items-center">
              <Label className="text-slate-300 text-right text-sm">{label}</Label>
              <Input
                value={form[key as keyof typeof form]}
                onChange={(e) => field(key as keyof typeof form, e.target.value)}
                placeholder={placeholder}
                className="col-span-2 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
              />
            </div>
          ))}

          <div className="grid grid-cols-3 gap-3 items-center">
            <Label className="text-slate-300 text-right text-sm">Status Aktivasi</Label>
            <Select value={form.status_aktivasi} onValueChange={(v) => field('status_aktivasi', v)}>
              <SelectTrigger className="col-span-2 bg-slate-800 border-slate-700 text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {['Belum Terdaftar', 'Aktivasi Akun', 'Pembuatan KO DJP', 'Validasi Sukses'].map((s) => (
                  <SelectItem key={s} value={s} className="text-slate-300">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          {role === 'admin' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 mr-auto">
                  <Lock className="w-3.5 h-3.5 mr-1.5" />Verifikasi & Kunci
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-slate-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-slate-100">Kunci Data Permanen?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    Tindakan ini akan mengunci data <strong className="text-slate-200">{pegawai.nama_pegawai}</strong> secara permanen dan tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFinalize} disabled={isPending} className="bg-amber-600 hover:bg-amber-500 text-white">
                    Ya, Kunci Permanen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="ghost" onClick={onClose} className="text-slate-400">Batal</Button>
          <Button onClick={handleSave} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Buat `src/components/dashboard/PegawaiTable.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { PegawaiCoretax, RefSKPD, Role } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Lock, Pencil } from 'lucide-react'
import { EditDialog } from './EditDialog'

const statusColors: Record<string, string> = {
  'Validasi Sukses':   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Pembuatan KO DJP': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Aktivasi Akun':     'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Belum Terdaftar':   'bg-red-500/20 text-red-300 border-red-500/30',
}

interface Props {
  pegawai: PegawaiCoretax[]
  skpdList: RefSKPD[]
  role: Role
  onSelectionChange: (ids: string[]) => void
  onDataChanged: () => void
}

export function PegawaiTable({ pegawai, skpdList, role, onSelectionChange, onDataChanged }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editTarget, setEditTarget] = useState<PegawaiCoretax | null>(null)

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      onSelectionChange([...next])
      return next
    })
  }

  function toggleAll() {
    if (selected.size === pegawai.length) {
      setSelected(new Set()); onSelectionChange([])
    } else {
      const all = new Set(pegawai.map((p) => p.id))
      setSelected(all); onSelectionChange([...all])
    }
  }

  return (
    <>
      <div className="rounded-xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="w-10 p-3 text-left">
                  <Checkbox
                    checked={selected.size === pegawai.length && pegawai.length > 0}
                    onCheckedChange={toggleAll}
                    className="border-slate-600"
                  />
                </th>
                <th className="p-3 text-left text-slate-400 font-medium">NIP</th>
                <th className="p-3 text-left text-slate-400 font-medium">Nama</th>
                <th className="p-3 text-left text-slate-400 font-medium hidden md:table-cell">SKPD</th>
                <th className="p-3 text-left text-slate-400 font-medium hidden lg:table-cell">NPWP</th>
                <th className="p-3 text-left text-slate-400 font-medium">Status</th>
                <th className="p-3 text-right text-slate-400 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pegawai.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">Tidak ada data</td>
                </tr>
              )}
              {pegawai.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-slate-800/50 transition-colors ${
                    p.is_final ? 'bg-slate-900/80 opacity-75'
                    : selected.has(p.id) ? 'bg-indigo-950/40'
                    : 'hover:bg-slate-800/30'
                  }`}
                >
                  <td className="p-3">
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleRow(p.id)} disabled={p.is_final} className="border-slate-600" />
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-300">{p.nip_pegawai}</td>
                  <td className="p-3 text-slate-200">
                    <span className="font-medium">{p.nama_pegawai}</span>
                    {p.is_final && <Lock className="inline w-3 h-3 ml-1.5 text-slate-500" />}
                  </td>
                  <td className="p-3 text-slate-400 hidden md:table-cell text-xs">
                    {p.ref_skpd?.nama_skpd ?? p.skpd_raw ?? '—'}
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-400 hidden lg:table-cell">
                    {p.npwp_pegawai || '—'}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[p.status_aktivasi]}`}>
                      {p.status_aktivasi}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {!p.is_final && (
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(p)} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget && (
        <EditDialog
          pegawai={editTarget}
          skpdList={skpdList}
          role={role}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); onDataChanged() }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: Buat `src/app/dashboard/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { PegawaiCoretax, RefSKPD, Role } from '@/lib/types'
import { getPegawai, getSkpdList, getStatDashboard } from '@/actions/pegawai'
import { getSession } from '@/actions/auth'
import { StatCards } from '@/components/dashboard/StatCards'
import { PegawaiTable } from '@/components/dashboard/PegawaiTable'
import { FloatingActionPanel } from '@/components/dashboard/FloatingActionPanel'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 50

export default function DashboardPage() {
  const [pegawai, setPegawai] = useState<PegawaiCoretax[]>([])
  const [skpdList, setSkpdList] = useState<RefSKPD[]>([])
  const [stats, setStats] = useState({ total: 0, validasi_sukses: 0, sedang_proses: 0, belum_terdaftar: 0 })
  const [role, setRole] = useState<Role>('operator')
  const [search, setSearch] = useState('')
  const [skpdFilter, setSkpdFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  const loadData = useCallback(() => {
    startTransition(async () => {
      const [pegawaiResult, skpd, stat, session] = await Promise.all([
        getPegawai({ skpdId: skpdFilter || undefined, search: search || undefined, page, pageSize: PAGE_SIZE }),
        getSkpdList(),
        getStatDashboard(),
        getSession(),
      ])
      setPegawai(pegawaiResult.data)
      setTotalCount(pegawaiResult.count)
      setSkpdList(skpd)
      setStats(stat)
      if (session) setRole(session.role)
    })
  }, [search, skpdFilter, page])

  useEffect(() => { loadData() }, [loadData])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <StatCards stats={stats} />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Cari NIP atau Nama..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <Select value={skpdFilter} onValueChange={(v) => { setSkpdFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-64 bg-slate-800/50 border-slate-700 text-slate-300">
            <SelectValue placeholder="Semua SKPD" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-slate-300">Semua SKPD</SelectItem>
            {skpdList.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-slate-300">{s.nama_skpd}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Memuat data...</div>
      ) : (
        <PegawaiTable
          pegawai={pegawai}
          skpdList={skpdList}
          role={role}
          onSelectionChange={setSelectedIds}
          onDataChanged={loadData}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>{totalCount.toLocaleString('id-ID')} pegawai · Hal {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="border-slate-700 text-slate-300 h-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-slate-700 text-slate-300 h-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <FloatingActionPanel
          selectedIds={selectedIds}
          role={role}
          onActionDone={() => { setSelectedIds([]); loadData() }}
        />
      )}
    </div>
  )
}
```

---

## Task 8: Floating Action Panel & Export

**Files:**
- Create: `src/components/dashboard/FloatingActionPanel.tsx`
- Create: `src/actions/export.ts`

- [ ] **Step 1: Buat `src/actions/export.ts`**

```ts
'use server'

import { getSupabaseClient } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function exportSelectedToExcel(
  ids: string[]
): Promise<{ data: number[]; filename: string }> {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('pegawai_coretax')
    .select('nip_pegawai, nama_pegawai, nik_pegawai, npwp_pegawai, no_telp, email, status_aktivasi, is_final, ref_skpd(nama_skpd)')
    .in('id', ids)
    .order('nama_pegawai')

  const rows = (data ?? []).map((p: any) => ({
    NIP: p.nip_pegawai,
    Nama: p.nama_pegawai,
    SKPD: p.ref_skpd?.nama_skpd ?? '',
    NIK: p.nik_pegawai ?? '',
    NPWP: p.npwp_pegawai ?? '',
    Telepon: p.no_telp ?? '',
    Email: p.email ?? '',
    'Status Aktivasi': p.status_aktivasi,
    'Status Data': p.is_final ? 'Terkunci' : 'Draft',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data Pegawai')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return {
    data: Array.from(buffer),
    filename: `coretax-ekspor-${new Date().toISOString().slice(0, 10)}.xlsx`,
  }
}

export async function exportRekapToExcel(): Promise<{ data: number[]; filename: string }> {
  const { getRekapPerSKPD } = await import('./pegawai')
  const rekap = await getRekapPerSKPD()

  const rows = rekap.map((r) => ({
    SKPD: r.nama_skpd,
    Total: r.total,
    'Validasi Sukses': r.validasi_sukses,
    'Pembuatan KO DJP': r.ko_djp,
    'Aktivasi Akun': r.aktivasi,
    'Belum Terdaftar': r.belum,
    'Persentase (%)': r.total > 0 ? ((r.validasi_sukses / r.total) * 100).toFixed(1) : '0.0',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Rekapitulasi')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return {
    data: Array.from(buffer),
    filename: `rekap-coretax-${new Date().toISOString().slice(0, 10)}.xlsx`,
  }
}

export async function generateDaftarPdf(
  skpdId: string,
  filterStatus?: string
): Promise<{ data: number[]; filename: string }> {
  const supabase = getSupabaseClient()
  const { data: skpd } = await supabase.from('ref_skpd').select('nama_skpd').eq('id', skpdId).single()

  let query = supabase
    .from('pegawai_coretax')
    .select('nip_pegawai, nama_pegawai, nik_pegawai, npwp_pegawai, status_aktivasi')
    .eq('skpd_id', skpdId)
    .order('nama_pegawai')

  if (filterStatus && filterStatus !== 'semua') {
    query = query.eq('status_aktivasi', filterStatus)
  }

  const { data: pegawai } = await query

  const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer')

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica' },
    header: { textAlign: 'center', marginBottom: 16 },
    title: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
    subtitle: { fontSize: 9, color: '#555', marginBottom: 12 },
    table: { borderWidth: 1, borderColor: '#000' },
    thead: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderColor: '#000' },
    row: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#ccc' },
    cell: { padding: '4 6', borderRightWidth: 0.5, borderColor: '#ccc' },
    no: { width: '5%' }, nama: { width: '30%' }, nip: { width: '25%' },
    npwp: { width: '25%' }, status: { width: '15%' },
    footer: { marginTop: 24, flexDirection: 'row', justifyContent: 'flex-end' },
    signBlock: { width: 200, textAlign: 'center' },
  })

  const namaSkpd = skpd?.nama_skpd ?? 'SKPD'
  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>DAFTAR PEGAWAI PENDATAAN CORETAX</Text>
          <Text style={styles.title}>{namaSkpd}</Text>
          <Text style={styles.subtitle}>Pemerintah Kabupaten Mamberamo Raya · {tanggal}</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.thead}>
            {([['No', 'no'], ['Nama Pegawai', 'nama'], ['NIP', 'nip'], ['NPWP', 'npwp'], ['Status', 'status']] as [string, string][]).map(([label, key]) => (
              <View key={key} style={[styles.cell, styles[key as keyof typeof styles] as any]}>
                <Text style={{ fontWeight: 'bold' }}>{label}</Text>
              </View>
            ))}
          </View>
          {(pegawai ?? []).map((p, i) => (
            <View key={p.nip_pegawai} style={styles.row}>
              <View style={[styles.cell, styles.no]}><Text>{i + 1}</Text></View>
              <View style={[styles.cell, styles.nama]}><Text>{p.nama_pegawai}</Text></View>
              <View style={[styles.cell, styles.nip]}><Text>{p.nip_pegawai}</Text></View>
              <View style={[styles.cell, styles.npwp]}><Text>{p.npwp_pegawai || '-'}</Text></View>
              <View style={[styles.cell, styles.status]}><Text>{p.status_aktivasi}</Text></View>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <View style={styles.signBlock}>
            <Text>Kasonaweja, {tanggal}</Text>
            <Text>Kepala {namaSkpd}</Text>
            <View style={{ height: 50 }} />
            <Text>_______________________________</Text>
            <Text>NIP.</Text>
          </View>
        </View>
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(doc)
  const filename = `daftar-${namaSkpd.replace(/\s+/g, '-').toLowerCase()}-${tanggal.replace(/\s/g, '-')}.pdf`
  return { data: Array.from(buffer), filename }
}
```

- [ ] **Step 2: Buat `src/components/dashboard/FloatingActionPanel.tsx`**

```tsx
'use client'

import { useTransition } from 'react'
import { Role } from '@/lib/types'
import { bulkFinalizePegawai } from '@/actions/pegawai'
import { exportSelectedToExcel } from '@/actions/export'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Download, Lock } from 'lucide-react'

interface Props { selectedIds: string[]; role: Role; onActionDone: () => void }

export function FloatingActionPanel({ selectedIds, role, onActionDone }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleExport() {
    startTransition(async () => {
      const { data, filename } = await exportSelectedToExcel(selectedIds)
      const blob = new Blob([new Uint8Array(data)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    })
  }

  function handleBulkFinalize() {
    startTransition(async () => {
      await bulkFinalizePegawai(selectedIds)
      onActionDone()
    })
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl border border-slate-700">
        <span className="text-sm text-slate-300 font-medium">{selectedIds.length} dipilih</span>
        <div className="w-px h-5 bg-slate-700" />
        <Button size="sm" variant="ghost" onClick={handleExport} disabled={isPending} className="text-slate-300 hover:text-white gap-1.5">
          <Download className="w-4 h-4" />Ekspor Excel
        </Button>
        {role === 'admin' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" disabled={isPending} className="text-amber-400 hover:text-amber-300 gap-1.5">
                <Lock className="w-4 h-4" />Verifikasi Massal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-slate-100">Kunci {selectedIds.length} data?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Tindakan ini akan mengunci {selectedIds.length} data pegawai secara permanen dan tidak dapat dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkFinalize} className="bg-amber-600 hover:bg-amber-500 text-white">
                  Ya, Kunci Semua
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
```

---

## Task 9: Import Excel

**Files:**
- Create: `src/actions/import.ts`
- Create: `src/components/import/ImportDropzone.tsx`
- Create: `src/app/dashboard/import/page.tsx`

- [ ] **Step 1: Buat `src/actions/import.ts`**

```ts
'use server'

import * as XLSX from 'xlsx'
import { getSupabaseClient } from '@/lib/supabase'

const SHEET_TO_SKPD: Record<string, string> = {
  'BKPSDM': 'BKPSDM',
  'Kesbangpol': 'BADAN KESATUAN BANGSA DAN POLITIK',
  'BPBD': 'BADAN PENANGGULANGAN BENCANA DAERAH',
  'BPKAD': 'BADAN PENDAPATAN PENGELOLA KEUANGAN DAN ASET DAERAH',
  'DINAS ARSIP': 'DINAS ARSIP',
  'DISPORASATA': 'DINAS PEMUDA OLAHRAGA DAN PARIWISATA',
  'DIDUKCAPIL': 'DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL',
  'DINKES ': 'DINAS KESEHATAN',
  'DINAS KETAHANAN PANGAN': 'DINAS KETAHANAN PANGAN',
  'DISKOMINFO': 'DINAS KOMUNIKASI DAN INFORMATIKA',
  'DLH ': 'DINAS LINGKUNGAN HIDUP',
  'PUPR': 'DINAS PEKERJAAN UMUM DAN PENATAAN RUANG',
  'DPMK': 'DINAS PEMBERDAYAAN MASYARAKAT KAMPUNG DAN ADAT',
  'DPPKB': 'DINAS PENGENDALIAN PENDUDUK DAN KB',
  'DPSPT': 'DINAS PENANAMAN MODAL DAN PELAYANAN TERPADU',
  'DINAS PENDIDIDKAN': 'DINAS PENDIDIKAN',
  'DISHUB': 'DINAS PERHUBUNGAN',
  'DISPERINDAG KOP &UMKM': 'DINAS PERINDUSTRIAN PERDAGANGAN KOPERASI DAN UMKM',
  'PERUMAHAN': 'DINAS PERUMAHAN',
  'DINAS PERIKANAN ': 'DINAS PERIKANAN',
  'DINSOS': 'DINAS SOSIAL',
  'DITAPANGA HOLTIKULTURA': 'DINAS TANAMAN PANGAN HORTIKULTURA DAN PETERNAKAN',
  'DISTRIK BENUKI': 'DISTRIK BENUKI',
  'DISTRIK M. HILIR': 'DISTRIK MAMBERAMO HILIR',
  'DIST M. HULU': 'DISTRIK MAMBERAMO HULU',
  'DIST M.TEMGAH': 'DISTRIK MAMBERAMO TENGAH',
  'DIST MTT': 'DISTRIK MAMBERAMO TENGAH TIMUR',
  'DIST ROUFAER': 'DISTRIK ROUFAER',
  'DIST SAWAI': 'DISTRIK SAWAI',
  'DIST WARTAS': 'DISTRIK WAROPEN ATAS',
  'INSPEKTORAT': 'INSPEKTORAT DAERAH',
  'SATPOLPP': 'SATUAN POLISI PAMONG PRAJA',
  'SETDA': 'SEKRETARIAT DAERAH',
  'SEKWAN': 'SEKRETARIAT DPRD',
}

export interface ImportPreview {
  sheet: string
  skpdName: string
  rows: { nip: string; nama: string }[]
  totalRows: number
}

export interface ImportResult {
  inserted: number
  skipped_final: number
  failed: number
  errors: string[]
}

export async function parseExcelPreview(buffer: number[]): Promise<ImportPreview[]> {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const previews: ImportPreview[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })
    const dataRows = rows.slice(2).filter((r: any[]) => r[0])
    if (dataRows.length === 0) continue
    previews.push({
      sheet: sheetName,
      skpdName: SHEET_TO_SKPD[sheetName] ?? sheetName,
      rows: dataRows.slice(0, 20).map((r: any[]) => ({
        nip: String(r[0] ?? '').trim(),
        nama: String(r[1] ?? '').trim(),
      })),
      totalRows: dataRows.length,
    })
  }

  return previews
}

export async function importExcel(buffer: number[]): Promise<ImportResult> {
  const supabase = getSupabaseClient()
  const { data: skpdData } = await supabase.from('ref_skpd').select('id, nama_skpd')
  const skpdMap = new Map<string, string>()
  for (const s of skpdData ?? []) skpdMap.set(s.nama_skpd, s.id)

  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  let inserted = 0, skipped_final = 0, failed = 0
  const errors: string[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })
    const dataRows = rows.slice(2).filter((r: any[]) => r[0])

    const skpdNameDb = SHEET_TO_SKPD[sheetName]
    const skpdId = skpdNameDb ? skpdMap.get(skpdNameDb) : undefined

    const batch = dataRows
      .map((r: any[]) => ({
        nip_pegawai: String(r[0] ?? '').trim(),
        nama_pegawai: String(r[1] ?? '').trim(),
        skpd_id: skpdId ?? null,
        skpd_raw: skpdNameDb ?? sheetName,
      }))
      .filter((row) => /^\d{18}$/.test(row.nip_pegawai) && row.nama_pegawai)

    for (let i = 0; i < batch.length; i += 100) {
      const chunk = batch.slice(i, i + 100)
      const { data, error } = await supabase
        .from('pegawai_coretax')
        .upsert(chunk, { onConflict: 'nip_pegawai', ignoreDuplicates: false })
        .select('id')

      if (error) {
        if (error.message.includes('dikunci permanen')) {
          skipped_final += chunk.length
        } else {
          failed += chunk.length
          errors.push(`${sheetName}: ${error.message}`)
        }
      } else {
        inserted += data?.length ?? 0
      }
    }
  }

  return { inserted, skipped_final, failed, errors }
}
```

- [ ] **Step 2: Buat `src/components/import/ImportDropzone.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { parseExcelPreview, importExcel, ImportPreview, ImportResult } from '@/actions/import'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react'

export function ImportDropzone() {
  const [previews, setPreviews] = useState<ImportPreview[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [buffer, setBuffer] = useState<number[] | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const arr = Array.from(new Uint8Array(e.target!.result as ArrayBuffer))
      setBuffer(arr); setResult(null)
      startTransition(async () => { setPreviews(await parseExcelPreview(arr)) })
    }
    reader.readAsArrayBuffer(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.xlsx')) handleFile(file)
  }

  function handleImport() {
    if (!buffer) return
    startTransition(async () => {
      const r = await importExcel(buffer)
      setResult(r); setPreviews([]); setBuffer(null)
    })
  }

  const totalRows = previews.reduce((s, p) => s + p.totalRows, 0)

  return (
    <div className="space-y-6">
      {!previews.length && !result && (
        <div
          onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-indigo-500/50 transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Seret file Excel ke sini</p>
          <p className="text-sm text-slate-500 mt-1">atau klik untuk memilih file .xlsx</p>
          <input id="file-input" type="file" accept=".xlsx" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      )}

      {isPending && <div className="text-center py-8 text-slate-400">Memproses file...</div>}

      {previews.length > 0 && !isPending && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-200 font-medium">{previews.length} sheet · {totalRows.toLocaleString('id-ID')} pegawai</p>
              <p className="text-sm text-slate-400">Preview 20 baris pertama per sheet</p>
            </div>
            <Button onClick={handleImport} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              Impor Semua ({totalRows.toLocaleString('id-ID')})
            </Button>
          </div>
          {previews.map((p) => (
            <div key={p.sheet} className="glass-card rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-slate-200">{p.skpdName}</span>
                <span className="text-xs text-slate-500 ml-auto">{p.totalRows} pegawai</span>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-slate-800">
                  <th className="p-2 text-left text-slate-500 font-normal">NIP</th>
                  <th className="p-2 text-left text-slate-500 font-normal">Nama</th>
                </tr></thead>
                <tbody>
                  {p.rows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td className="p-2 font-mono text-slate-400">{r.nip}</td>
                      <td className="p-2 text-slate-300">{r.nama}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="glass-card rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <p className="font-medium text-slate-200">Import selesai</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              { label: 'Ditambahkan/Diperbarui', value: result.inserted, color: 'text-emerald-400' },
              { label: 'Dilewati (Terkunci)', value: result.skipped_final, color: 'text-amber-400' },
              { label: 'Gagal', value: result.failed, color: 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800/50 rounded-lg p-3">
                <p className={`text-lg font-bold ${color}`}>{value.toLocaleString('id-ID')}</p>
                <p className="text-slate-400 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {result.errors.map((e, i) => <p key={i} className="text-xs text-red-300">{e}</p>)}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setResult(null)} className="border-slate-700 text-slate-300">
            Import file lain
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Buat `src/app/dashboard/import/page.tsx`**

```tsx
import { ImportDropzone } from '@/components/import/ImportDropzone'

export default function ImportPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Import Data Pegawai</h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload file Excel format <code className="text-indigo-400">DATA PEGAWAI PER OPD.xlsx</code> — semua sheet diproses otomatis.
        </p>
      </div>
      <ImportDropzone />
    </div>
  )
}
```

---

## Task 10: Admin PIN Manager

**Files:**
- Create: `src/actions/pins.ts`
- Create: `src/components/admin/PinManager.tsx`
- Create: `src/app/admin/pins/page.tsx`

- [ ] **Step 1: Buat `src/actions/pins.ts`**

```ts
'use server'

import { getSupabaseClient } from '@/lib/supabase'
import { getSession } from './auth'
import { AccessPin } from '@/lib/types'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') throw new Error('Unauthorized')
}

export async function getPins(): Promise<AccessPin[]> {
  await requireAdmin()
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('access_pins').select('*').order('created_at', { ascending: false })
  return (data as AccessPin[]) ?? []
}

export async function createPin(
  label: string,
  customPin?: string
): Promise<{ success: boolean; pin?: string; error?: string }> {
  await requireAdmin()
  const pin = customPin?.trim() || Math.floor(100000 + Math.random() * 900000).toString()
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('access_pins').insert({ pin, label: label.trim() })
  if (error) return { success: false, error: error.code === '23505' ? 'PIN sudah digunakan' : error.message }
  return { success: true, pin }
}

export async function togglePin(id: string, is_active: boolean): Promise<{ success: boolean }> {
  await requireAdmin()
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('access_pins').update({ is_active }).eq('id', id)
  return { success: !error }
}

export async function deletePin(id: string): Promise<{ success: boolean }> {
  await requireAdmin()
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('access_pins').delete().eq('id', id)
  return { success: !error }
}
```

- [ ] **Step 2: Buat `src/components/admin/PinManager.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { AccessPin } from '@/lib/types'
import { getPins, createPin, togglePin, deletePin } from '@/actions/pins'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Eye, EyeOff, Power } from 'lucide-react'

export function PinManager({ initialPins }: { initialPins: AccessPin[] }) {
  const [pins, setPins] = useState(initialPins)
  const [label, setLabel] = useState('')
  const [customPin, setCustomPin] = useState('')
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [newPinResult, setNewPinResult] = useState('')

  function reload() { startTransition(async () => { setPins(await getPins()) }) }

  function handleCreate() {
    if (!label.trim()) return
    startTransition(async () => {
      const result = await createPin(label, customPin)
      if (result.success) {
        setNewPinResult(`PIN dibuat: ${result.pin}`)
        setLabel(''); setCustomPin(''); reload()
      }
    })
  }

  function toggleVisible(id: string) {
    setVisibleIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-slate-200">Tambah Anggota Tim</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs text-slate-400">Nama Anggota Tim</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="contoh: Budi Santoso"
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">PIN (kosongkan = auto)</Label>
            <Input value={customPin} onChange={(e) => setCustomPin(e.target.value)} placeholder="6 digit" maxLength={10}
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleCreate} disabled={isPending || !label.trim()} size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5">
            <Plus className="w-4 h-4" />Tambah
          </Button>
          {newPinResult && <p className="text-sm text-emerald-400">{newPinResult}</p>}
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-800 bg-slate-900/60">
            <th className="p-3 text-left text-slate-400 font-medium">Nama</th>
            <th className="p-3 text-left text-slate-400 font-medium">PIN</th>
            <th className="p-3 text-left text-slate-400 font-medium">Status</th>
            <th className="p-3 text-left text-slate-400 font-medium">Terakhir Digunakan</th>
            <th className="p-3 text-right text-slate-400 font-medium">Aksi</th>
          </tr></thead>
          <tbody>
            {pins.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Belum ada anggota tim</td></tr>
            )}
            {pins.map((p) => (
              <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="p-3 text-slate-200">{p.label ?? '—'}</td>
                <td className="p-3 font-mono text-slate-300">
                  {visibleIds.has(p.id) ? p.pin : '••••••'}
                  <Button variant="ghost" size="sm" onClick={() => toggleVisible(p.id)}
                    className="ml-2 h-6 w-6 p-0 text-slate-500 hover:text-slate-300">
                    {visibleIds.has(p.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                    {p.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="p-3 text-slate-400 text-xs">
                  {p.last_used_at ? new Date(p.last_used_at).toLocaleString('id-ID') : '—'}
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => startTransition(async () => { await togglePin(p.id, !p.is_active); reload() })}
                    disabled={isPending} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200 mr-1">
                    <Power className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startTransition(async () => { await deletePin(p.id); reload() })}
                    disabled={isPending} className="h-7 w-7 p-0 text-red-500/70 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Buat `src/app/admin/pins/page.tsx`**

```tsx
import { getPins } from '@/actions/pins'
import { PinManager } from '@/components/admin/PinManager'

export default async function AdminPinsPage() {
  const pins = await getPins()
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Kelola Akses Tim</h1>
        <p className="text-sm text-slate-400 mt-1">Tambah dan kelola PIN untuk anggota tim data BPPKAD.</p>
      </div>
      <PinManager initialPins={pins} />
    </div>
  )
}
```

- [ ] **Step 4: Tambah admin layout di `src/app/admin/layout.tsx`**

```tsx
import { getSession } from '@/actions/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')
  return <>{children}</>
}
```

---

## Task 11: Laporan

**Files:**
- Create: `src/app/dashboard/laporan/page.tsx`
- Create: `src/app/dashboard/laporan/rekap/page.tsx`
- Create: `src/components/laporan/LaporanRekapTable.tsx`
- Create: `src/app/dashboard/laporan/daftar/page.tsx`

- [ ] **Step 1: Buat `src/app/dashboard/laporan/page.tsx`**

```tsx
import Link from 'next/link'
import { BarChart3, FileText } from 'lucide-react'

export default function LaporanPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold text-slate-100">Laporan</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { href: '/dashboard/laporan/rekap', icon: BarChart3, title: 'Rekapitulasi Per SKPD', desc: 'Ringkasan statistik aktivasi Coretax per instansi. Export PDF & Excel.' },
          { href: '/dashboard/laporan/daftar', icon: FileText, title: 'Daftar Pegawai Per SKPD', desc: 'Daftar lengkap format surat resmi. Export PDF.' },
        ].map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href} className="glass-card rounded-xl p-5 hover:border-indigo-500/40 transition-colors block">
            <Icon className="w-6 h-6 text-indigo-400 mb-3" />
            <h2 className="text-sm font-medium text-slate-200">{title}</h2>
            <p className="text-xs text-slate-400 mt-1">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Buat `src/components/laporan/LaporanRekapTable.tsx`**

```tsx
'use client'

import { useTransition } from 'react'
import { exportRekapToExcel } from '@/actions/export'
import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'

interface RekapRow {
  nama_skpd: string; total: number; validasi_sukses: number
  ko_djp: number; aktivasi: number; belum: number
}

export function LaporanRekapTable({ data }: { data: RekapRow[] }) {
  const [isPending, startTransition] = useTransition()

  const totals = data.reduce(
    (acc, r) => ({ total: acc.total + r.total, validasi_sukses: acc.validasi_sukses + r.validasi_sukses, ko_djp: acc.ko_djp + r.ko_djp, aktivasi: acc.aktivasi + r.aktivasi, belum: acc.belum + r.belum }),
    { total: 0, validasi_sukses: 0, ko_djp: 0, aktivasi: 0, belum: 0 }
  )

  function handleExport() {
    startTransition(async () => {
      const { data: buf, filename } = await exportRekapToExcel()
      const blob = new Blob([new Uint8Array(buf)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end no-print">
        <Button size="sm" variant="outline" onClick={handleExport} disabled={isPending} className="border-slate-700 text-slate-300 gap-1.5">
          <Download className="w-4 h-4" />Excel
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()} className="border-slate-700 text-slate-300 gap-1.5">
          <Printer className="w-4 h-4" />Cetak
        </Button>
      </div>
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              <th className="p-3 text-left text-slate-400 font-medium">SKPD</th>
              <th className="p-3 text-center text-slate-400 font-medium">Total</th>
              <th className="p-3 text-center text-emerald-400 font-medium">Validasi Sukses</th>
              <th className="p-3 text-center text-cyan-400 font-medium">KO DJP</th>
              <th className="p-3 text-center text-amber-400 font-medium">Aktivasi</th>
              <th className="p-3 text-center text-red-400 font-medium">Belum</th>
              <th className="p-3 text-center text-slate-400 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.nama_skpd} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="p-3 text-slate-200 text-xs">{r.nama_skpd}</td>
                <td className="p-3 text-center text-slate-300 font-medium">{r.total}</td>
                <td className="p-3 text-center text-emerald-400">{r.validasi_sukses}</td>
                <td className="p-3 text-center text-cyan-400">{r.ko_djp}</td>
                <td className="p-3 text-center text-amber-400">{r.aktivasi}</td>
                <td className="p-3 text-center text-red-400">{r.belum}</td>
                <td className="p-3 text-center text-slate-400 text-xs">
                  {r.total > 0 ? ((r.validasi_sukses / r.total) * 100).toFixed(0) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700 bg-slate-900/80 font-semibold">
              <td className="p-3 text-slate-200">TOTAL</td>
              <td className="p-3 text-center text-slate-100">{totals.total}</td>
              <td className="p-3 text-center text-emerald-300">{totals.validasi_sukses}</td>
              <td className="p-3 text-center text-cyan-300">{totals.ko_djp}</td>
              <td className="p-3 text-center text-amber-300">{totals.aktivasi}</td>
              <td className="p-3 text-center text-red-300">{totals.belum}</td>
              <td className="p-3 text-center text-slate-300">
                {totals.total > 0 ? ((totals.validasi_sukses / totals.total) * 100).toFixed(0) : 0}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Buat `src/app/dashboard/laporan/rekap/page.tsx`**

```tsx
import { getRekapPerSKPD } from '@/actions/pegawai'
import { LaporanRekapTable } from '@/components/laporan/LaporanRekapTable'

export default async function RekapPage() {
  const data = await getRekapPerSKPD()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100 print:text-black">Rekapitulasi Pendataan Coretax</h1>
        <p className="text-sm text-slate-400 print:text-gray-600 mt-1">
          Pemerintah Kabupaten Mamberamo Raya · Per {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <LaporanRekapTable data={data} />
    </div>
  )
}
```

- [ ] **Step 4: Buat `src/app/dashboard/laporan/daftar/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import { getSkpdList } from '@/actions/pegawai'
import { generateDaftarPdf } from '@/actions/export'
import { RefSKPD } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { FileText } from 'lucide-react'

export default function DaftarPage() {
  const [skpdList, setSkpdList] = useState<RefSKPD[]>([])
  const [skpdId, setSkpdId] = useState('')
  const [filterStatus, setFilterStatus] = useState('semua')
  const [isPending, startTransition] = useTransition()

  useEffect(() => { getSkpdList().then(setSkpdList) }, [])

  function handleGenerate() {
    if (!skpdId) return
    startTransition(async () => {
      const { data, filename } = await generateDaftarPdf(skpdId, filterStatus)
      const blob = new Blob([new Uint8Array(data)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Daftar Pegawai Per SKPD</h1>
        <p className="text-sm text-slate-400 mt-1">Format surat resmi A4, siap cetak dan ditandatangani pimpinan.</p>
      </div>
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-slate-300">Pilih SKPD *</Label>
          <Select value={skpdId} onValueChange={setSkpdId}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
              <SelectValue placeholder="— Pilih SKPD —" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-64">
              {skpdList.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-slate-300">{s.nama_skpd}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-slate-300">Filter Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="semua" className="text-slate-300">Semua Status</SelectItem>
              {['Belum Terdaftar', 'Aktivasi Akun', 'Pembuatan KO DJP', 'Validasi Sukses'].map((s) => (
                <SelectItem key={s} value={s} className="text-slate-300">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGenerate} disabled={!skpdId || isPending} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
          <FileText className="w-4 h-4" />
          {isPending ? 'Membuat PDF...' : 'Buat & Buka PDF'}
        </Button>
      </div>
    </div>
  )
}
```

---

## Task 12: Netlify Deployment

**Files:**
- Create: `netlify.toml`

- [ ] **Step 1: Buat `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

- [ ] **Step 2: Install plugin**

```bash
npm install --save-dev @netlify/plugin-nextjs
```

- [ ] **Step 3: Final build check**

```bash
npm run build
```

Expected: sukses. Perbaiki TypeScript errors jika ada sebelum deploy.

- [ ] **Step 4: Set env vars di Netlify Dashboard**

Tambahkan ke Netlify → Site → Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PIN`
- `SESSION_SECRET`

- [ ] **Step 5: Deploy**

```bash
npx netlify-cli deploy --prod
```

---

## Self-Review

**Spec coverage:**
- ✅ Task 1-2: Scaffold, env, types, Supabase client (server-only), iron-session
- ✅ Task 3: Semua 4 SQL migration — ref_skpd (34 SKPD), pegawai_coretax, trigger locking, access_pins + RLS deny_anon
- ✅ Task 4-5: Middleware route protection, login PIN gate, logout
- ✅ Task 6: Dashboard layout + header + nav + stat cards
- ✅ Task 7: Tabel pegawai, filter SKPD + search, paginate 50/halaman, edit dialog, OCC (updated_at check)
- ✅ Task 8: Floating action panel, bulk finalize (admin only), export Excel terpilih
- ✅ Task 9: Import Excel multi-sheet, map 34 sheet → SKPD DB, preview, batch upsert 100/chunk
- ✅ Task 10: Admin PIN manager — create, toggle aktif/nonaktif, delete
- ✅ Task 11: Laporan rekapitulasi (table + export Excel + cetak), laporan daftar surat resmi PDF per SKPD
- ✅ Task 12: Netlify config, env vars

**Placeholder scan:** Tidak ada TBD, TODO, atau "implement later". Semua task berisi kode lengkap siap pakai.

**Type consistency:** `PegawaiCoretax`, `RefSKPD`, `SessionData`, `AccessPin`, `StatDashboard` — didefinisikan sekali di `types.ts` Task 2, digunakan konsisten di semua task berikutnya. `updatePegawai(id, lastUpdatedAt, input)` cocok dengan pemanggilan di `EditDialog`. `getRekapPerSKPD()` didefinisikan di `pegawai.ts` dan di-import dengan dynamic import di `export.ts` untuk menghindari circular dependency.
