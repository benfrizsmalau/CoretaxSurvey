import Link from 'next/link'
import { BarChart3, FileText } from 'lucide-react'

const reports = [
  {
    href: '/dashboard/laporan/rekap',
    icon: BarChart3,
    title: 'Rekapitulasi Per SKPD',
    desc: 'Ringkasan statistik aktivasi Coretax per instansi. Export Excel dan cetak.',
  },
  {
    href: '/dashboard/laporan/daftar',
    icon: FileText,
    title: 'Daftar Pegawai Per SKPD',
    desc: 'Daftar lengkap format surat resmi. Export PDF.',
  },
]

export default function LaporanPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold text-slate-100">Laporan</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="glass-card block rounded-xl p-5 transition-colors hover:border-indigo-500/40"
          >
            <Icon className="mb-3 h-6 w-6 text-indigo-400" />
            <h2 className="text-sm font-medium text-slate-200">{title}</h2>
            <p className="mt-1 text-xs text-slate-400">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
