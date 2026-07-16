import { getSession, logoutAction } from '@/actions/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, Settings } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen" style={{ background: 'rgb(15 23 42)' }}>
      <header className="glass-card border-b border-slate-800 sticky top-0 z-40">
        <div className="mx-auto flex h-14 w-full max-w-[2560px] items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-100">
              Coretax Mamberamo Raya
            </Link>
            <nav className="hidden md:flex gap-1 ml-4">
              <Link href="/dashboard" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800">Data Pegawai</Link>
              <Link href="/dashboard/import" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800">Import</Link>
              <Link href="/dashboard/laporan" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800">Laporan</Link>
              {session.role === 'admin' && (
                <Link href="/admin/pins" className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800">
                  <Settings className="w-3.5 h-3.5 inline mr-1" />Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:block">
              {session.role === 'admin' ? 'Admin' : session.pin_label ?? 'Operator'}
            </span>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit" className="text-slate-400 hover:text-slate-200 h-8 w-8 p-0">
                <LogOut className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[2560px] px-4 py-6 lg:px-8">{children}</main>
    </div>
  )
}
