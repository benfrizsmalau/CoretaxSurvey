'use server'

import { getSupabaseClient } from '@/lib/supabase'
import { StatDashboard, PegawaiCoretax, RefSKPD } from '@/lib/types'
import { getSession } from './auth'
import { pegawaiCreateSchema, PegawaiCreateInput, pegawaiUpdateSchema, PegawaiUpdateInput } from '@/lib/validations'
import { getPegawaiDataIssues } from '@/lib/data-quality'

export async function getStatDashboard(opts?: { jenisPegawai?: string }): Promise<StatDashboard> {
  const supabase = getSupabaseClient()
  const session = await getSession()
  const operatorSkpdIds =
    session?.role === 'operator' && session.skpd_ids && session.skpd_ids.length > 0
      ? session.skpd_ids
      : null

  const { data } = await supabase.rpc('get_stat_dashboard', {
    p_jenis_pegawai: opts?.jenisPegawai ?? null,
    p_skpd_ids: operatorSkpdIds ?? null,
  })

  const result = data as StatDashboard | null
  return result ?? { total: 0, validasi_sukses: 0, sedang_proses: 0, belum_terdaftar: 0, pns_total: 0, p3k_total: 0 }
}

export async function getSkpdList(): Promise<RefSKPD[]> {
  const supabase = getSupabaseClient()
  const session = await getSession()
  const { data } = await supabase.from('ref_skpd').select('id, nama_skpd').order('nama_skpd')
  const all = data ?? []
  if (session?.role === 'operator' && session.skpd_ids && session.skpd_ids.length > 0) {
    return all.filter((s) => session.skpd_ids!.includes(s.id))
  }
  return all
}

export async function getAllPegawai(): Promise<PegawaiCoretax[]> {
  const supabase = getSupabaseClient()
  const session = await getSession()
  const operatorSkpdIds =
    session?.role === 'operator' && session.skpd_ids && session.skpd_ids.length > 0
      ? session.skpd_ids
      : null

  let query = supabase
    .from('pegawai_coretax')
    .select('*, ref_skpd(nama_skpd)')
    .order('nama_pegawai', { ascending: true })

  if (operatorSkpdIds) query = query.in('skpd_id', operatorSkpdIds)

  const { data } = await query
  return (data as PegawaiCoretax[]) ?? []
}

export async function getPegawai(opts: {
  skpdId?: string
  search?: string
  jenisPegawai?: string
  page?: number
  pageSize?: number
}) {
  const supabase = getSupabaseClient()
  const session = await getSession()
  const { skpdId, search, jenisPegawai, page = 1, pageSize = 50 } = opts
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const operatorSkpdIds =
    session?.role === 'operator' && session.skpd_ids && session.skpd_ids.length > 0
      ? session.skpd_ids
      : null

  let query = supabase
    .from('pegawai_coretax')
    .select('*, ref_skpd(nama_skpd)', { count: 'exact' })
    .order('nama_pegawai', { ascending: true })
    .range(from, to)

  if (operatorSkpdIds) {
    query = query.in('skpd_id', operatorSkpdIds)
    if (skpdId && operatorSkpdIds.includes(skpdId)) query = query.eq('skpd_id', skpdId)
  } else if (skpdId) {
    query = query.eq('skpd_id', skpdId)
  }
  if (jenisPegawai) query = query.eq('jenis_pegawai', jenisPegawai)
  if (search)
    query = query.or(`nip_pegawai.ilike.%${search}%,nama_pegawai.ilike.%${search}%`)

  const { data, error, count } = await query
  return { data: (data as PegawaiCoretax[]) ?? [], error, count: count ?? 0 }
}

export async function createPegawai(
  input: PegawaiCreateInput
): Promise<{ success: boolean; error?: string; warnings?: string[]; pegawai?: PegawaiCoretax }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Sesi tidak valid' }

  const parsed = pegawaiCreateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabase = getSupabaseClient()
  const cleanInput = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v])
  )

  const { data, error } = await supabase
    .from('pegawai_coretax')
    .insert({
      ...cleanInput,
      skpd_raw: null,
      last_edited_by: session.pin_label ?? session.role,
    })
    .select('*, ref_skpd(nama_skpd)')
    .single()

  if (error) {
    if (error.code === '23505' || error.message.toLowerCase().includes('duplicate')) {
      return { success: false, error: 'NIP sudah terdaftar. Gunakan edit data jika ingin memperbarui.' }
    }
    return { success: false, error: error.message }
  }

  const pegawai = data as PegawaiCoretax
  return {
    success: true,
    pegawai,
    warnings: getPegawaiDataIssues(pegawai),
  }
}

export async function updatePegawai(
  id: string,
  lastUpdatedAt: string,
  input: PegawaiUpdateInput
): Promise<{ success: boolean; conflict?: boolean; error?: string; warnings?: string[]; updatedAt?: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Sesi tidak valid' }

  const parsed = pegawaiUpdateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

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
  const updatedPegawai = data[0] as PegawaiCoretax
  return {
    success: true,
    updatedAt: updatedPegawai.updated_at,
    warnings: getPegawaiDataIssues(updatedPegawai),
  }
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
    .select('skpd_id, status_aktivasi, jenis_pegawai')

  return (skpdList ?? [])
    .map((s) => {
      const rows = (pegawai ?? []).filter((p) => p.skpd_id === s.id)
      return {
        nama_skpd: s.nama_skpd,
        total: rows.length,
        pns: rows.filter((p) => p.jenis_pegawai === 'PNS').length,
        p3k: rows.filter((p) => p.jenis_pegawai === 'P3K').length,
        validasi_sukses: rows.filter((p) => p.status_aktivasi === 'Validasi Sukses').length,
        ko_djp: rows.filter((p) => p.status_aktivasi === 'Pembuatan KO DJP').length,
        aktivasi: rows.filter((p) => p.status_aktivasi === 'Aktivasi Akun').length,
        belum: rows.filter((p) => p.status_aktivasi === 'Belum Terdaftar').length,
      }
    })
    .filter((s) => s.total > 0)
}
