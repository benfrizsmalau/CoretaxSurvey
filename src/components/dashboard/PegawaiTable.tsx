'use client'

import { useEffect, useState } from 'react'
import { PegawaiCoretax, RefSKPD, Role } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Lock, Pencil } from 'lucide-react'
import { EditDialog } from './EditDialog'
import { getNpwpState } from '@/lib/data-quality'

const jenisBadge: Record<string, string> = {
  PNS: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  P3K: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

const statusColors: Record<string, string> = {
  'Validasi Sukses':   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Pembuatan KO DJP': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Aktivasi Akun':     'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Belum Terdaftar':   'bg-red-500/20 text-red-300 border-red-500/30',
}

interface Props {
  pegawai: PegawaiCoretax[]
  skpdList: RefSKPD[]
  role: Role
  onSelectionChange: (ids: string[]) => void
  onDataChanged: () => void
}

export function PegawaiTable({ pegawai, skpdList, role, onSelectionChange, onDataChanged }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editTarget, setEditTarget] = useState<PegawaiCoretax | null>(null)

  useEffect(() => {
    onSelectionChange([...selected])
  }, [selected, onSelectionChange])

  useEffect(() => {
    const visibleIds = new Set(pegawai.map((p) => p.id))
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [pegawai])

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === pegawai.length) {
      setSelected(new Set())
    } else {
      const all = new Set(pegawai.map((p) => p.id))
      setSelected(all)
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1600px] table-fixed text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="w-10 p-3 text-left">
                  <Checkbox
                    checked={selected.size === pegawai.length && pegawai.length > 0}
                    onCheckedChange={toggleAll}
                    className="border-slate-600"
                  />
                </th>
                <th className="w-[170px] p-3 text-left font-medium text-slate-400">NIP</th>
                <th className="w-[250px] p-3 text-left font-medium text-slate-400">Nama</th>
                <th className="w-[280px] p-3 text-left font-medium text-slate-400">SKPD</th>
                <th className="w-[250px] p-3 text-left font-medium text-slate-400">NPWP</th>
                <th className="w-[145px] p-3 text-left font-medium text-slate-400">Telepon</th>
                <th className="w-[230px] p-3 text-left font-medium text-slate-400">Email</th>
                <th className="w-[100px] p-3 text-left font-medium text-slate-400">Jenis</th>
                <th className="w-[155px] p-3 text-left font-medium text-slate-400">Status</th>
                <th className="w-16 p-3 text-right font-medium text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pegawai.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">Tidak ada data</td>
                </tr>
              )}
              {pegawai.map((p) => {
                const npwpState = getNpwpState(p.npwp_pegawai)

                return (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-800/50 transition-colors ${
                      p.is_final ? 'bg-slate-900/80 opacity-75'
                      : selected.has(p.id) ? 'bg-indigo-950/40'
                      : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="p-3">
                      <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleRow(p.id)} disabled={p.is_final} className="border-slate-600" />
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-300">{p.nip_pegawai}</td>
                    <td className="p-3 text-slate-200">
                      <span className="block truncate font-medium" title={p.nama_pegawai}>
                        {p.nama_pegawai}
                      </span>
                      {p.is_final && <Lock className="inline w-3 h-3 ml-1.5 text-slate-500" />}
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      <span className="block truncate" title={p.ref_skpd?.nama_skpd ?? p.skpd_raw ?? 'Belum dipetakan'}>
                        {p.ref_skpd?.nama_skpd ?? p.skpd_raw ?? 'Belum dipetakan'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      <span className={`block truncate ${npwpState.className}`} title={npwpState.detail}>
                        {npwpState.label}
                      </span>
                      {npwpState.needsRepair && (
                        <span className="mt-0.5 block truncate font-sans text-[11px] leading-4 text-red-300/80" title={npwpState.detail}>
                          {npwpState.detail}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-400">
                      <span className={p.no_telp ? '' : 'text-amber-300/80'}>{p.no_telp || 'Belum diisi'}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      <span
                        className={p.email ? 'block truncate' : 'text-amber-300/80'}
                        title={p.email ?? 'Belum diisi'}
                      >
                        {p.email || 'Belum diisi'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${jenisBadge[p.jenis_pegawai] ?? jenisBadge.PNS}`}>
                        {p.jenis_pegawai}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[p.status_aktivasi]}`}>
                        {p.status_aktivasi}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {!p.is_final && (
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(p)} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget && (
        <EditDialog
          pegawai={editTarget}
          skpdList={skpdList}
          role={role}
          onClose={() => setEditTarget(null)}
          onSaved={(options) => {
            onDataChanged()
            if (!options?.keepOpen) setEditTarget(null)
          }}
        />
      )}
    </>
  )
}
