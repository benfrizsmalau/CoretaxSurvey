import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { SessionData, sessionOptions } from '@/lib/session'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const session = await getIronSession<SessionData>(request, response, sessionOptions)
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/dashboard') && !session.role) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
