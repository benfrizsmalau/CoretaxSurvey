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
  const { data } = await supabase.from('access_pins').select('*').order('created_at', { ascending: false })
  return (data as AccessPin[]) ?? []
}

export async function createPin(
  label: string,
  customPin?: string
): Promise<{ success: boolean; pin?: string; error?: string }> {
  await requireAdmin()
  const pin = customPin?.trim() || Math.floor(100000 + Math.random() * 900000).toString()
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('access_pins').insert({ pin, label: label.trim() })
  if (error) return { success: false, error: error.code === '23505' ? 'PIN sudah digunakan' : error.message }
  return { success: true, pin }
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
