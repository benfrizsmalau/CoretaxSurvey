'use server'

import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { SessionData, sessionOptions } from '@/lib/session'

export async function loginAction(pin: string) {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (pin === process.env.ADMIN_PIN) {
    session.role = 'admin'
    session.logged_in_at = Date.now()
    session.skpd_ids = undefined
    await session.save()
    return { success: true }
  }

  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('access_pins')
    .select('id, label, pin_skpd(skpd_id)')
    .eq('pin', pin)
    .eq('is_active', true)
    .single()

  if (data) {
    const pinData = data as typeof data & { pin_skpd: Array<{ skpd_id: string }> }
    session.role = 'operator'
    session.pin_label = pinData.label ?? undefined
    session.logged_in_at = Date.now()
    session.skpd_ids = pinData.pin_skpd.map((ps) => ps.skpd_id)
    await session.save()
    await supabase
      .from('access_pins')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', pinData.id)
    return { success: true }
  }

  return { success: false, error: 'PIN tidak valid' }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  session.destroy()
  redirect('/login')
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  if (!session.role) return null
  return {
    role: session.role,
    pin_label: session.pin_label,
    logged_in_at: session.logged_in_at,
    skpd_ids: session.skpd_ids,
  }
}
