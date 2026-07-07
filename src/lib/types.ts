export type StatusAktivasi =
  | 'Belum Terdaftar'
  | 'Aktivasi Akun'
  | 'Pembuatan KO DJP'
  | 'Validasi Sukses'

export type Role = 'admin' | 'operator'

export type JenisPegawai = 'PNS' | 'P3K'

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
  jenis_pegawai: JenisPegawai
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
  pns_total: number
  p3k_total: number
}
