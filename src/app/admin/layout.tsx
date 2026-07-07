import { getSession } from '@/actions/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')
  return <>{children}</>
}
