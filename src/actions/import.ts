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
  'BAPPEDA': 'BADAN PERENCANAAN, PENELITIAN DAN PENGEMBANGAN DAERAH',
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

function getDataRows(rows: unknown[][]) {
  const firstRow = rows[0]?.map((value) => String(value).trim().toLowerCase()) ?? []
  const hasHeader = firstRow.includes('nip_pegawai') && firstRow.includes('nama_pegawai')
  return rows.slice(hasHeader ? 1 : 2).filter((row) => row[0])
}

function normalizeNik(value: unknown) {
  const text = String(value ?? '').trim()
  return /^\d{16}$/.test(text) ? text : null
}

function normalizeNpwp(value: unknown) {
  const text = String(value ?? '').trim()
  return text && text.length <= 20 ? text : null
}

export async function parseExcelPreview(buffer: number[]): Promise<ImportPreview[]> {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const previews: ImportPreview[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })
    const dataRows = getDataRows(rows)
    if (dataRows.length === 0) continue
    previews.push({
      sheet: sheetName,
      skpdName: SHEET_TO_SKPD[sheetName] ?? sheetName,
      rows: dataRows.slice(0, 20).map((r) => ({
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
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const skpdNames = [...new Set(wb.SheetNames.map((sheetName) => SHEET_TO_SKPD[sheetName] ?? sheetName))]
  const { error: upsertSkpdError } = await supabase
    .from('ref_skpd')
    .upsert(skpdNames.map((nama_skpd) => ({ nama_skpd })), { onConflict: 'nama_skpd', ignoreDuplicates: true })

  if (upsertSkpdError) {
    return { inserted: 0, skipped_final: 0, failed: 0, errors: [upsertSkpdError.message] }
  }

  const { data: skpdData } = await supabase.from('ref_skpd').select('id, nama_skpd')
  const skpdMap = new Map<string, string>()
  for (const s of skpdData ?? []) skpdMap.set(s.nama_skpd, s.id)

  let inserted = 0, skipped_final = 0, failed = 0
  const errors: string[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })
    const dataRows = getDataRows(rows)

    const skpdNameDb = SHEET_TO_SKPD[sheetName]
    const skpdId = skpdNameDb ? skpdMap.get(skpdNameDb) : undefined

    const batch = dataRows
      .map((r) => ({
        nip_pegawai: String(r[0] ?? '').trim(),
        nama_pegawai: String(r[1] ?? '').trim(),
        nik_pegawai: normalizeNik(r[2]),
        npwp_pegawai: normalizeNpwp(r[3]),
        skpd_id: skpdId ?? null,
        skpd_raw: skpdNameDb ?? sheetName,
      }))
      .filter((row) => /^\d{1,18}$/.test(row.nip_pegawai) && row.nama_pegawai)

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
