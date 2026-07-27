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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  skpdId: string | null,
  filterStatus?: string
): Promise<{ data: number[]; filename: string }> {
  const supabase = getSupabaseClient()
  const semuaSkpd = !skpdId

  let namaSkpd = 'SEMUA SKPD'
  if (!semuaSkpd) {
    const { data: skpd } = await supabase.from('ref_skpd').select('nama_skpd').eq('id', skpdId!).single()
    namaSkpd = skpd?.nama_skpd ?? 'SKPD'
  }

  const selectCols = semuaSkpd
    ? 'nip_pegawai, nama_pegawai, nik_pegawai, no_kk, nama_ibu_kandung, npwp_pegawai, no_telp, email, jenis_pegawai, status_aktivasi, ref_skpd(nama_skpd)'
    : 'nip_pegawai, nama_pegawai, nik_pegawai, no_kk, nama_ibu_kandung, npwp_pegawai, no_telp, email, jenis_pegawai, status_aktivasi'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('pegawai_coretax')
    .select(selectCols)
    .order('nama_pegawai')

  if (!semuaSkpd) query = query.eq('skpd_id', skpdId)
  if (filterStatus && filterStatus !== 'semua') query = query.eq('status_aktivasi', filterStatus)

  const { data: pegawai } = await query

  const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer')

  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const filterLabel = filterStatus && filterStatus !== 'semua' ? ` · Status: ${filterStatus}` : ''

  // F4 Landscape: 330mm × 215mm → 935pt × 609pt
  const BDR = '#888'   // border warna kolom
  const BDR_OUTER = '#333'  // border tepi luar

  const styles = StyleSheet.create({
    page: { padding: 28, paddingBottom: 36, fontSize: 7, fontFamily: 'Helvetica' },
    pageNum: { position: 'absolute', bottom: 14, left: 28, right: 28, textAlign: 'center', fontSize: 6.5, color: '#888' },
    header: { textAlign: 'center', marginBottom: 8 },
    title: { fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
    subtitle: { fontSize: 7.5, color: '#555', marginBottom: 8 },
    // thead: border tepi atas + kiri, borderBottom tebal — TANPA outer table box
    thead: {
      flexDirection: 'row', backgroundColor: '#d4d4d4',
      borderTopWidth: 1, borderTopColor: BDR_OUTER,
      borderLeftWidth: 1, borderLeftColor: BDR_OUTER,
      borderBottomWidth: 1.5, borderBottomColor: BDR_OUTER,
    },
    thcell: { padding: '4 5', borderRightWidth: 0.5, borderRightColor: BDR, fontWeight: 'bold', fontSize: 7.5 },
    thcellLast: { borderRightWidth: 1, borderRightColor: BDR_OUTER },
    // Baris data — border kiri + bawah; kanan ditangani sel terakhir
    row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ddd', borderLeftWidth: 1, borderLeftColor: BDR_OUTER },
    rowAlt: { backgroundColor: '#f4f6fa' },
    cell: { padding: '3 5', borderRightWidth: 0.5, borderRightColor: '#ccc' },
    cellLast: { borderRightWidth: 1, borderRightColor: BDR_OUTER },
    footer: { marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end' },
    signBlock: { width: 200, textAlign: 'center', fontSize: 8 },
  })

  // Kolom berbeda: semua SKPD menambah kolom SKPD, redistribusi lebar
  const colsPerSkpd = [
    { label: 'No',               w: '3%'  },
    { label: 'Nama Pegawai',     w: '14%' },
    { label: 'NIP',              w: '12%' },
    { label: 'NIK KTP',          w: '11%' },
    { label: 'No. KK',           w: '11%' },
    { label: 'Nama Ibu Kandung', w: '12%' },
    { label: 'NPWP',             w: '10%' },
    { label: 'No. Telepon',      w: '7%'  },
    { label: 'Email',            w: '12%' },
    { label: 'Jenis',            w: '4%'  },
    { label: 'Status Aktivasi',  w: '4%'  },
  ]

  const colsSemuaSkpd = [
    { label: 'No',               w: '2%'  },
    { label: 'SKPD',             w: '14%' },
    { label: 'Nama Pegawai',     w: '12%' },
    { label: 'NIP',              w: '10%' },
    { label: 'NIK KTP',          w: '9%'  },
    { label: 'No. KK',           w: '9%'  },
    { label: 'Nama Ibu Kandung', w: '10%' },
    { label: 'NPWP',             w: '9%'  },
    { label: 'No. Telepon',      w: '6%'  },
    { label: 'Email',            w: '11%' },
    { label: 'Jenis',            w: '3%'  },
    { label: 'Status',           w: '5%'  },
  ]

  const cols = semuaSkpd ? colsSemuaSkpd : colsPerSkpd

  type Row = {
    nip_pegawai: string; nama_pegawai: string
    nik_pegawai: string | null; no_kk: string | null
    nama_ibu_kandung: string | null; npwp_pegawai: string | null
    no_telp: string | null; email: string | null
    jenis_pegawai: string; status_aktivasi: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ref_skpd?: { nama_skpd: string } | null
  }

  function trunc(s: string, max: number) {
    return s.length > max ? s.slice(0, max - 1) + '…' : s
  }

  function val(p: Row, label: string, i: number): string {
    switch (label) {
      case 'No':               return String(i + 1)
      case 'SKPD':             return trunc(p.ref_skpd?.nama_skpd || '-', 36)
      case 'Nama Pegawai':     return trunc(p.nama_pegawai, 30)
      case 'NIP':              return p.nip_pegawai
      case 'NIK KTP':          return p.nik_pegawai || '-'
      case 'No. KK':           return p.no_kk || '-'
      case 'Nama Ibu Kandung': return trunc(p.nama_ibu_kandung || '-', 28)
      case 'NPWP':             return p.npwp_pegawai || '-'
      case 'No. Telepon':      return p.no_telp || '-'
      case 'Email':            return trunc(p.email || '-', 30)
      case 'Jenis':            return p.jenis_pegawai
      case 'Status Aktivasi':  return p.status_aktivasi
      case 'Status':           return p.status_aktivasi
      default:                 return '-'
    }
  }

  const rows = (pegawai ?? []) as Row[]

  const judulBaris2 = semuaSkpd
    ? 'SELURUH SKPD PEMERINTAH KABUPATEN MAMBERAMO RAYA'
    : namaSkpd.toUpperCase()

  const lastIdx = cols.length - 1

  const doc = (
    <Document>
      <Page size={[935, 609]} style={styles.page}>
        {/* Nomor halaman — muncul di setiap halaman */}
        <Text
          style={styles.pageNum}
          fixed
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          render={({ pageNumber, totalPages }: any) =>
            `Halaman ${pageNumber} dari ${totalPages}`
          }
        />

        <View style={styles.header}>
          <Text style={styles.title}>DAFTAR PEGAWAI PENDATAAN CORETAX</Text>
          <Text style={styles.title}>{judulBaris2}</Text>
          <Text style={styles.subtitle}>
            Pemerintah Kabupaten Mamberamo Raya · {tanggal}{filterLabel} · Total: {rows.length} pegawai
          </Text>
        </View>

        {/* Header kolom — fixed agar muncul di setiap halaman */}
        <View style={styles.thead} fixed>
          {cols.map((c, idx) => (
            <View key={c.label} style={idx === lastIdx ? [styles.thcell, styles.thcellLast, { width: c.w }] : [styles.thcell, { width: c.w }]}>
              <Text>{c.label}</Text>
            </View>
          ))}
        </View>

        {/* Baris data — wrap={false} agar baris tidak terputus antar halaman */}
        {rows.map((p, i) => (
          <View key={`${p.nip_pegawai}-${i}`} style={i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row} wrap={false}>
            {cols.map((c, idx) => (
              <View key={c.label} style={idx === lastIdx ? [styles.cell, styles.cellLast, { width: c.w }] : [styles.cell, { width: c.w }]}>
                <Text>{val(p, c.label, i)}</Text>
              </View>
            ))}
          </View>
        ))}

        {!semuaSkpd && (
          <View style={styles.footer}>
            <View style={styles.signBlock}>
              <Text>Kasonaweja, {tanggal}</Text>
              <Text>Kepala {namaSkpd}</Text>
              <View style={{ height: 48 }} />
              <Text>_______________________________</Text>
              <Text>NIP.</Text>
            </View>
          </View>
        )}
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(doc)
  const slugSkpd = semuaSkpd ? 'semua-skpd' : namaSkpd.replace(/\s+/g, '-').toLowerCase()
  const filename = `daftar-${slugSkpd}-${tanggal.replace(/\s/g, '-')}.pdf`
  return { data: Array.from(buffer), filename }
}
