import { Users, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { StatDashboard } from '@/lib/types'

const cards = [
  { key: 'total' as const, label: 'Total Pegawai', icon: Users, border: 'rgba(99,102,241,0.4)' },
  { key: 'validasi_sukses' as const, label: 'Validasi Sukses', icon: CheckCircle, border: 'rgba(52,211,153,0.4)' },
  { key: 'sedang_proses' as const, label: 'Sedang Proses', icon: Clock, border: 'rgba(251,191,36,0.4)' },
  { key: 'belum_terdaftar' as const, label: 'Belum Terdaftar', icon: AlertCircle, border: 'rgba(239,68,68,0.4)' },
]

export function StatCards({ stats }: { stats: StatDashboard }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon: Icon, border }) => (
        <div
          key={key}
          className="glass-card rounded-xl p-4 relative overflow-hidden"
          style={{ boxShadow: `0 0 20px ${border}` }}
        >
          <div className="absolute inset-0 rounded-xl" style={{ border: `1px solid ${border}` }} />
          <div className="relative">
            <Icon className="w-5 h-5 text-slate-400 mb-2" />
            <p className="text-2xl font-bold text-slate-100">
              {stats[key].toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
            {key === 'total' && (
              <div className="mt-2 flex gap-1.5 flex-wrap">
                <span className="text-[11px] px-1.5 py-0.5 rounded border bg-blue-500/20 text-blue-300 border-blue-500/30">
                  PNS {stats.pns_total.toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded border bg-purple-500/20 text-purple-300 border-purple-500/30">
                  P3K {stats.p3k_total.toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
