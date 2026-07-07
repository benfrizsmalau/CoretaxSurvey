'use client'

import { useState, useTransition } from 'react'
import { AccessPin } from '@/lib/types'
import { getPins, createPin, togglePin, deletePin } from '@/actions/pins'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Eye, EyeOff, Power } from 'lucide-react'

export function PinManager({ initialPins }: { initialPins: AccessPin[] }) {
  const [pins, setPins] = useState(initialPins)
  const [label, setLabel] = useState('')
  const [customPin, setCustomPin] = useState('')
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [newPinResult, setNewPinResult] = useState('')

  function reload() { startTransition(async () => { setPins(await getPins()) }) }

  function handleCreate() {
    if (!label.trim()) return
    startTransition(async () => {
      const result = await createPin(label, customPin)
      if (result.success) {
        setNewPinResult(`PIN dibuat: ${result.pin}`)
        setLabel(''); setCustomPin(''); reload()
      }
    })
  }

  function toggleVisible(id: string) {
    setVisibleIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-slate-200">Tambah Anggota Tim</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs text-slate-400">Nama Anggota Tim</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="contoh: Budi Santoso"
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">PIN (kosongkan = auto)</Label>
            <Input value={customPin} onChange={(e) => setCustomPin(e.target.value)} placeholder="6 digit" maxLength={10}
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleCreate} disabled={isPending || !label.trim()} size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5">
            <Plus className="w-4 h-4" />Tambah
          </Button>
          {newPinResult && <p className="text-sm text-emerald-400">{newPinResult}</p>}
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-800 bg-slate-900/60">
            <th className="p-3 text-left text-slate-400 font-medium">Nama</th>
            <th className="p-3 text-left text-slate-400 font-medium">PIN</th>
            <th className="p-3 text-left text-slate-400 font-medium">Status</th>
            <th className="p-3 text-left text-slate-400 font-medium">Terakhir Digunakan</th>
            <th className="p-3 text-right text-slate-400 font-medium">Aksi</th>
          </tr></thead>
          <tbody>
            {pins.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Belum ada anggota tim</td></tr>
            )}
            {pins.map((p) => (
              <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="p-3 text-slate-200">{p.label ?? '—'}</td>
                <td className="p-3 font-mono text-slate-300">
                  {visibleIds.has(p.id) ? p.pin : '••••••'}
                  <Button variant="ghost" size="sm" onClick={() => toggleVisible(p.id)}
                    className="ml-2 h-6 w-6 p-0 text-slate-500 hover:text-slate-300">
                    {visibleIds.has(p.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                    {p.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="p-3 text-slate-400 text-xs">
                  {p.last_used_at ? new Date(p.last_used_at).toLocaleString('id-ID') : '—'}
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => startTransition(async () => { await togglePin(p.id, !p.is_active); reload() })}
                    disabled={isPending} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200 mr-1">
                    <Power className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startTransition(async () => { await deletePin(p.id); reload() })}
                    disabled={isPending} className="h-7 w-7 p-0 text-red-500/70 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
