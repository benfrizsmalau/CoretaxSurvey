import type { SessionOptions } from 'iron-session'
import type { SessionData } from './types'

export type { SessionData }

const secret = process.env.SESSION_SECRET
if (!secret) throw new Error('SESSION_SECRET env var is missing')

export const sessionOptions: SessionOptions = {
  password: secret,
  cookieName: 'coretax-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60,
    httpOnly: true,
    sameSite: 'lax',
  },
}
