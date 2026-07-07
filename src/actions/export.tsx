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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <View style={[styles.cell, styles.npwp]}><Text>{(p as any).npwp_pegawai || '-'}</Text></View>
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
