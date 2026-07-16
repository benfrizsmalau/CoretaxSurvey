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
  skpdId: string,
  filterStatus?: string
): Promise<{ data: number[]; filename: string }> {
  const supabase = getSupabaseClient()
  const { data: skpd } = await supabase.from('ref_skpd').select('nama_skpd').eq('id', skpdId).single()

  let query = supabase
    .from('pegawai_coretax')
    .select('nip_pegawai, nama_pegawai, nik_pegawai, no_kk, nama_ibu_kandung, npwp_pegawai, no_telp, email, jenis_pegawai, status_aktivasi')
    .eq('skpd_id', skpdId)
    .order('nama_pegawai')

  if (filterStatus && filterStatus !== 'semua') {
    query = query.eq('status_aktivasi', filterStatus)
  }

  const { data: pegawai } = await query

  const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer')

  const namaSkpd = skpd?.nama_skpd ?? 'SKPD'
  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  // F4 Landscape: 330mm × 215mm → 935pt × 609pt
  const styles = StyleSheet.create({
    page: { padding: 28, fontSize: 7, fontFamily: 'Helvetica' },
    header: { textAlign: 'center', marginBottom: 10 },
    title: { fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
    subtitle: { fontSize: 8, color: '#555', marginBottom: 10 },
    table: { borderWidth: 1, borderColor: '#000' },
    thead: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderBottomWidth: 1, borderColor: '#000' },
    row: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#ccc' },
    cell: { padding: '3 4', borderRightWidth: 0.5, borderColor: '#bbb' },
    bold: { fontWeight: 'bold' },
    footer: { marginTop: 18, flexDirection: 'row', justifyContent: 'flex-end' },
    signBlock: { width: 200, textAlign: 'center', fontSize: 8 },
  })

  const cols = [
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

  type Row = {
    nip_pegawai: string; nama_pegawai: string
    nik_pegawai: string | null; no_kk: string | null
    nama_ibu_kandung: string | null; npwp_pegawai: string | null
    no_telp: string | null; email: string | null
    jenis_pegawai: string; status_aktivasi: string
  }

  function val(p: Row, label: string, i: number): string {
    switch (label) {
      case 'No':               return String(i + 1)
      case 'Nama Pegawai':     return p.nama_pegawai
      case 'NIP':              return p.nip_pegawai
      case 'NIK KTP':          return p.nik_pegawai || '-'
      case 'No. KK':           return p.no_kk || '-'
      case 'Nama Ibu Kandung': return p.nama_ibu_kandung || '-'
      case 'NPWP':             return p.npwp_pegawai || '-'
      case 'No. Telepon':      return p.no_telp || '-'
      case 'Email':            return p.email || '-'
      case 'Jenis':            return p.jenis_pegawai
      case 'Status Aktivasi':  return p.status_aktivasi
      default:                 return '-'
    }
  }

  const rows = (pegawai ?? []) as Row[]

  const doc = (
    <Document>
      <Page size={[935, 609]} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>DAFTAR PEGAWAI PENDATAAN CORETAX</Text>
          <Text style={styles.title}>{namaSkpd.toUpperCase()}</Text>
          <Text style={styles.subtitle}>Pemerintah Kabupaten Mamberamo Raya · {tanggal}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.thead}>
            {cols.map((c) => (
              <View key={c.label} style={[styles.cell, { width: c.w }]}>
                <Text style={styles.bold}>{c.label}</Text>
              </View>
            ))}
          </View>
          {rows.map((p, i) => (
            <View key={p.nip_pegawai} style={styles.row}>
              {cols.map((c) => (
                <View key={c.label} style={[styles.cell, { width: c.w }]}>
                  <Text>{val(p, c.label, i)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.signBlock}>
            <Text>Kasonaweja, {tanggal}</Text>
            <Text>Kepala {namaSkpd}</Text>
            <View style={{ height: 48 }} />
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
