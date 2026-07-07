-- Migration 4: access_pins table + Row Level Security on all tables
CREATE TABLE IF NOT EXISTS public.access_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin VARCHAR(10) NOT NULL UNIQUE,
  label VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.pegawai_coretax ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_skpd ENABLE ROW LEVEL SECURITY;

-- Deny anonymous access to all tables
CREATE POLICY "deny_anon_pegawai" ON public.pegawai_coretax FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_pins"    ON public.access_pins     FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_skpd"    ON public.ref_skpd        FOR ALL TO anon USING (false);

-- Allow service_role full access (used by server-side Next.js actions)
CREATE POLICY "service_role_pegawai" ON public.pegawai_coretax FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_pins"    ON public.access_pins     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_skpd"    ON public.ref_skpd        FOR ALL TO service_role USING (true) WITH CHECK (true);
