'use server'

import { getSupabaseClient } from '@/lib/supabase'
import { getSession } from './auth'
import { AccessPin } from '@/lib/types'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') throw new Error('Unauthorized')
}

export async function getPins(): Promise<AccessPin[]> {
  await requireAdmin()
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('access_pins')
    .select('*, pin_skpd(skpd_id)')
    .order('created_at', { ascending: false })
  type Row = AccessPin & { pin_skpd: Array<{ skpd_id: string }> }
  return ((data ?? []) as Row[]).map((p) => ({
    ...p,
    skpd_ids: p.pin_skpd.map((ps) => ps.skpd_id),
    pin_skpd: undefined,
  }))
}

export async function createPin(
  label: string,
  customPin?: string,
  skpdIds?: string[]
): Promise<{ success: boolean; pin?: string; error?: string }> {
  await requireAdmin()
  const pin = customPin?.trim() || Math.floor(100000 + Math.random() * 900000).toString()
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('access_pins')
    .insert({ pin, label: label.trim() })
    .select('id')
    .single()
  if (error) return { success: false, error: error.code === '23505' ? 'PIN sudah digunakan' : error.message }

  if (skpdIds && skpdIds.length > 0) {
    const { error: skpdError } = await supabase
      .from('pin_skpd')
      .insert(skpdIds.map((skpd_id) => ({ pin_id: data.id, skpd_id })))
    if (skpdError) {
      await supabase.from('access_pins').delete().eq('id', data.id)
      return { success: false, error: 'Beberapa SKPD sudah ditugaskan ke operator lain' }
    }
  }

  return { success: true, pin }
}

export async function setSkpdForPin(
  pinId: string,
  skpdIds: string[]
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const supabase = getSupabaseClient()

  const { error: deleteError } = await supabase.from('pin_skpd').delete().eq('pin_id', pinId)
  if (deleteError) return { success: false, error: deleteError.message }

  if (skpdIds.length === 0) return { success: true }

  const { error: insertError } = await supabase
    .from('pin_skpd')
    .insert(skpdIds.map((skpd_id) => ({ pin_id: pinId, skpd_id })))
  if (insertError) {
    if (insertError.code === '23505') return { success: false, error: 'Sebagian SKPD sudah ditugaskan ke operator lain' }
    return { success: false, error: insertError.message }
  }

  return { success: true }
}

export async function getAssignedSkpdMap(): Promise<Record<string, { pinId: string; label: string | null }>> {
  await requireAdmin()
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('pin_skpd')
    .select('skpd_id, pin_id, access_pins(label)')
  const map: Record<string, { pinId: string; label: string | null }> = {}
  type Row = { skpd_id: string; pin_id: string; access_pins: unknown }
  for (const row of (data ?? []) as Row[]) {
    const pins = row.access_pins as { label: string | null } | { label: string | null }[] | null
    const pinLabel = Array.isArray(pins) ? (pins[0]?.label ?? null) : (pins?.label ?? null)
    map[row.skpd_id] = { pinId: row.pin_id, label: pinLabel }
  }
  return map
}

export async function togglePin(id: string, is_active: boolean): Promise<{ success: boolean }> {
  await requireAdmin()
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('access_pins').update({ is_active }).eq('id', id)
  return { success: !error }
}

export async function deletePin(id: string): Promise<{ success: boolean }> {
  await requireAdmin()
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('access_pins').delete().eq('id', id)
  return { success: !error }
}
