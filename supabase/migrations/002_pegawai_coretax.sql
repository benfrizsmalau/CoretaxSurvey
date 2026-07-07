-- Migration 2: pegawai_coretax table + indexes
CREATE TABLE IF NOT EXISTS public.pegawai_coretax (
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

CREATE INDEX IF NOT EXISTS idx_pegawai_nip   ON public.pegawai_coretax(nip_pegawai);
CREATE INDEX IF NOT EXISTS idx_pegawai_nik   ON public.pegawai_coretax(nik_pegawai);
CREATE INDEX IF NOT EXISTS idx_pegawai_skpd  ON public.pegawai_coretax(skpd_id);
CREATE INDEX IF NOT EXISTS idx_pegawai_final ON public.pegawai_coretax(is_final);
