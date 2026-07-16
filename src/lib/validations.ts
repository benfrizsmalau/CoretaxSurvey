import { z } from 'zod'

export const pegawaiUpdateSchema = z.object({
  nik_pegawai: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'NIK KTP harus 16 digit angka')
    .optional()
    .or(z.literal('')),
  no_kk: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'No. KK harus 16 digit angka')
    .optional()
    .or(z.literal('')),
  nama_ibu_kandung: z
    .string()
    .trim()
    .max(255, 'Nama ibu kandung terlalu panjang')
    .optional()
    .or(z.literal('')),
  npwp_pegawai: z
    .string()
    .trim()
    .max(32, 'NPWP terlalu panjang')
    .optional()
    .or(z.literal('')),
  no_telp: z
    .string()
    .trim()
    .max(24, 'Nomor telepon terlalu panjang')
    .optional()
    .or(z.literal('')),
  email: z.string().trim().max(120, 'Email terlalu panjang').optional().or(z.literal('')),
  status_aktivasi: z.enum([
    'Belum Terdaftar',
    'Aktivasi Akun',
    'Pembuatan KO DJP',
    'Validasi Sukses',
  ]),
  jenis_pegawai: z.enum(['PNS', 'P3K']).default('PNS'),
})

export type PegawaiUpdateInput = z.infer<typeof pegawaiUpdateSchema>

export const pegawaiCreateSchema = pegawaiUpdateSchema.extend({
  nip_pegawai: z
    .string()
    .trim()
    .regex(/^\d{1,18}$/, 'NIP wajib diisi maksimal 18 digit angka'),
  nama_pegawai: z.string().trim().min(1, 'Nama pegawai wajib diisi').max(255, 'Nama pegawai terlalu panjang'),
  skpd_id: z.string().uuid('SKPD tidak valid').optional().or(z.literal('')),
})

export type PegawaiCreateInput = z.infer<typeof pegawaiCreateSchema>
