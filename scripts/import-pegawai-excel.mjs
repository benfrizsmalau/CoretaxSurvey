import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const SHEET_TO_SKPD = {
  BKPSDM: 'BKPSDM',
  Kesbangpol: 'BADAN KESATUAN BANGSA DAN POLITIK',
  BPBD: 'BADAN PENANGGULANGAN BENCANA DAERAH',
  BPKAD: 'BADAN PENDAPATAN PENGELOLA KEUANGAN DAN ASET DAERAH',
  'DINAS ARSIP': 'DINAS ARSIP',
  DISPORASATA: 'DINAS PEMUDA OLAHRAGA DAN PARIWISATA',
  DIDUKCAPIL: 'DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL',
  'DINKES ': 'DINAS KESEHATAN',
  'DINAS KETAHANAN PANGAN': 'DINAS KETAHANAN PANGAN',
  DISKOMINFO: 'DINAS KOMUNIKASI DAN INFORMATIKA',
  'DLH ': 'DINAS LINGKUNGAN HIDUP',
  PUPR: 'DINAS PEKERJAAN UMUM DAN PENATAAN RUANG',
  DPMK: 'DINAS PEMBERDAYAAN MASYARAKAT KAMPUNG DAN ADAT',
  DPPKB: 'DINAS PENGENDALIAN PENDUDUK DAN KB',
  DPSPT: 'DINAS PENANAMAN MODAL DAN PELAYANAN TERPADU',
  'DINAS PENDIDIDKAN': 'DINAS PENDIDIKAN',
  DISHUB: 'DINAS PERHUBUNGAN',
  'DISPERINDAG KOP &UMKM': 'DINAS PERINDUSTRIAN PERDAGANGAN KOPERASI DAN UMKM',
  PERUMAHAN: 'DINAS PERUMAHAN',
  'DINAS PERIKANAN ': 'DINAS PERIKANAN',
  DINSOS: 'DINAS SOSIAL',
  'DITAPANGA HOLTIKULTURA': 'DINAS TANAMAN PANGAN HORTIKULTURA DAN PETERNAKAN',
  'DISTRIK BENUKI': 'DISTRIK BENUKI',
  'DISTRIK M. HILIR': 'DISTRIK MAMBERAMO HILIR',
  'DIST M. HULU': 'DISTRIK MAMBERAMO HULU',
  'DIST M.TEMGAH': 'DISTRIK MAMBERAMO TENGAH',
  'DIST MTT': 'DISTRIK MAMBERAMO TENGAH TIMUR',
  'DIST ROUFAER': 'DISTRIK ROUFAER',
  'DIST SAWAI': 'DISTRIK SAWAI',
  'DIST WARTAS': 'DISTRIK WAROPEN ATAS',
  INSPEKTORAT: 'INSPEKTORAT DAERAH',
  SATPOLPP: 'SATUAN POLISI PAMONG PRAJA',
  SETDA: 'SEKRETARIAT DAERAH',
  SEKWAN: 'SEKRETARIAT DPRD',
  BAPPEDA: 'BADAN PERENCANAAN, PENELITIAN DAN PENGEMBANGAN DAERAH',
}

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  const env = fs.readFileSync(envPath, 'utf8')
  for (const line of env.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index)
    const value = trimmed.slice(index + 1).replace(/^["']|["']$/g, '')
    process.env[key] = value
  }
}

function dataRows(rows) {
  const firstRow = rows[0]?.map((value) => String(value).trim().toLowerCase()) ?? []
  const hasHeader = firstRow.includes('nip_pegawai') && firstRow.includes('nama_pegawai')
  return rows.slice(hasHeader ? 1 : 2).filter((row) => row[0])
}

function nik(value) {
  const text = String(value ?? '').trim()
  return /^\d{16}$/.test(text) ? text : null
}

function npwp(value) {
  const text = String(value ?? '').trim()
  return text && text.length <= 20 ? text : null
}

loadEnv()

const workbookPath = process.argv[2] ?? 'DATA PEGAWAI PER OPD.xlsx'
if (!fs.existsSync(workbookPath)) {
  throw new Error(`File Excel tidak ditemukan: ${workbookPath}`)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum tersedia di .env.local')
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const workbook = XLSX.readFile(workbookPath)
const skpdNames = [...new Set(workbook.SheetNames.map((sheetName) => SHEET_TO_SKPD[sheetName] ?? sheetName))]

const { error: upsertSkpdError } = await supabase
  .from('ref_skpd')
  .upsert(skpdNames.map((nama_skpd) => ({ nama_skpd })), { onConflict: 'nama_skpd', ignoreDuplicates: true })

if (upsertSkpdError) throw upsertSkpdError

const { data: skpdData, error: skpdError } = await supabase
  .from('ref_skpd')
  .select('id, nama_skpd')

if (skpdError) throw skpdError

const skpdMap = new Map((skpdData ?? []).map((row) => [row.nama_skpd, row.id]))
let prepared = 0
let upserted = 0
let failed = 0
const errors = []
const unmappedSheets = []

for (const sheetName of workbook.SheetNames) {
  const skpdName = SHEET_TO_SKPD[sheetName] ?? sheetName
  const skpdId = skpdMap.get(skpdName)
  if (!skpdId) unmappedSheets.push(`${sheetName} -> ${skpdName}`)

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' })
  const batch = dataRows(rows)
    .map((row) => ({
      nip_pegawai: String(row[0] ?? '').trim(),
      nama_pegawai: String(row[1] ?? '').trim(),
      nik_pegawai: nik(row[2]),
      npwp_pegawai: npwp(row[3]),
      skpd_id: skpdId ?? null,
      skpd_raw: skpdName,
    }))
    .filter((row) => /^\d{1,18}$/.test(row.nip_pegawai) && row.nama_pegawai)

  prepared += batch.length

  for (let index = 0; index < batch.length; index += 100) {
    const chunk = batch.slice(index, index + 100)
    const { data, error } = await supabase
      .from('pegawai_coretax')
      .upsert(chunk, { onConflict: 'nip_pegawai', ignoreDuplicates: false })
      .select('id')

    if (error) {
      failed += chunk.length
      errors.push(`${sheetName}: ${error.message}`)
    } else {
      upserted += data?.length ?? 0
    }
  }
}

const { count, error: countError } = await supabase
  .from('pegawai_coretax')
  .select('id', { count: 'exact', head: true })

if (countError) throw countError

console.log(JSON.stringify({
  file: workbookPath,
  sheets: workbook.SheetNames.length,
  prepared,
  upserted,
  failed,
  totalInDatabase: count,
  unmappedSheets,
  errors: errors.slice(0, 10),
}, null, 2))
