'use client'

import { useState, useTransition } from 'react'
import { AccessPin, RefSKPD } from '@/lib/types'
import { getPins, createPin, togglePin, deletePin, setSkpdForPin, getAssignedSkpdMap } from '@/actions/pins'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Eye, EyeOff, Power, Pencil, Check, X, Building2 } from 'lucide-react'

interface AssignedEntry {
  pinId: string
  label: string | null
}

interface Props {
  initialPins: AccessPin[]
  skpdList: RefSKPD[]
  initialAssignedMap: Record<string, AssignedEntry>
}

export function PinManager({ initialPins, skpdList, initialAssignedMap }: Props) {
  const [pins, setPins] = useState(initialPins)
  const [assignedMap, setAssignedMap] = useState(initialAssignedMap)
  const [label, setLabel] = useState('')
  const [customPin, setCustomPin] = useState('')
  const [createSkpdIds, setCreateSkpdIds] = useState<Set<string>>(new Set())
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  const [editingPinId, setEditingPinId] = useState<string | null>(null)
  const [editSkpdIds, setEditSkpdIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [newPinResult, setNewPinResult] = useState('')
  const [error, setError] = useState('')

  function reload() {
    startTransition(async () => {
      const [freshPins, freshMap] = await Promise.all([getPins(), getAssignedSkpdMap()])
      setPins(freshPins)
      setAssignedMap(freshMap)
    })
  }

  function handleCreate() {
    if (!label.trim()) return
    setError('')
    setNewPinResult('')
    startTransition(async () => {
      const result = await createPin(label, customPin, [...createSkpdIds])
      if (result.success) {
        setNewPinResult(`PIN dibuat: ${result.pin}`)
        setLabel('')
        setCustomPin('')
        setCreateSkpdIds(new Set())
        const [freshPins, freshMap] = await Promise.all([getPins(), getAssignedSkpdMap()])
        setPins(freshPins)
        setAssignedMap(freshMap)
      } else {
        setError(result.error ?? 'Gagal membuat PIN')
      }
    })
  }

  function startEditSkpd(pin: AccessPin) {
    setEditingPinId(pin.id)
    setEditSkpdIds(new Set(pin.skpd_ids ?? []))
    setError('')
  }

  function saveEditSkpd(pinId: string) {
    setError('')
    startTransition(async () => {
      const result = await setSkpdForPin(pinId, [...editSkpdIds])
      if (result.success) {
        setEditingPinId(null)
        const [freshPins, freshMap] = await Promise.all([getPins(), getAssignedSkpdMap()])
        setPins(freshPins)
        setAssignedMap(freshMap)
      } else {
        setError(result.error ?? 'Gagal menyimpan SKPD')
      }
    })
  }

  function toggleCreateSkpd(skpdId: string) {
    setCreateSkpdIds((prev) => {
      const next = new Set(prev)
      if (next.has(skpdId)) next.delete(skpdId); else next.add(skpdId)
      return next
    })
  }

  function toggleEditSkpd(skpdId: string) {
    setEditSkpdIds((prev) => {
      const next = new Set(prev)
      if (next.has(skpdId)) next.delete(skpdId); else next.add(skpdId)
      return next
    })
  }

  function toggleVisible(id: string) {
    setVisibleIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Create form ─────────────────────────────── */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-slate-200">Tambah Anggota Tim</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs text-slate-400">Nama Anggota Tim</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="contoh: Budi Santoso"
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">PIN (kosongkan = auto)</Label>
            <Input
              value={customPin}
              onChange={(e) => setCustomPin(e.target.value)}
              placeholder="6 digit"
              maxLength={10}
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* SKPD assignment when creating */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Tanggung Jawab SKPD
            <span className="text-slate-600 font-normal">— opsional, bisa diatur setelah membuat PIN</span>
          </Label>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/50 divide-y divide-slate-800">
            {skpdList.map((skpd) => {
              const assigned = assignedMap[skpd.id]
              const isDisabled = !!assigned
              return (
                <label
                  key={skpd.id}
                  className={`flex items-center gap-2.5 px-3 py-2 transition-colors ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700/40'}`}
                >
                  <Checkbox
                    checked={createSkpdIds.has(skpd.id)}
                    onCheckedChange={() => !isDisabled && toggleCreateSkpd(skpd.id)}
                    disabled={isDisabled}
                    className="border-slate-500 shrink-0"
                  />
                  <span className="text-sm text-slate-300 flex-1">{skpd.nama_skpd}</span>
                  {assigned && (
                    <span className="text-xs text-slate-500 shrink-0">{assigned.label ?? 'Operator lain'}</span>
                  )}
                </label>
              )
            })}
          </div>
          {createSkpdIds.size > 0 && (
            <p className="text-xs text-indigo-400">{createSkpdIds.size} SKPD dipilih</p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleCreate}
            disabled={isPending || !label.trim()}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
          >
            <Plus className="w-4 h-4" />Tambah
          </Button>
          {newPinResult && <p className="text-sm text-emerald-400">{newPinResult}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>

      {/* ── PIN table ───────────────────────────────── */}
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              <th className="p-3 text-left text-slate-400 font-medium">Nama</th>
              <th className="p-3 text-left text-slate-400 font-medium">PIN</th>
              <th className="p-3 text-left text-slate-400 font-medium">SKPD</th>
              <th className="p-3 text-left text-slate-400 font-medium">Status</th>
              <th className="p-3 text-left text-slate-400 font-medium">Terakhir Login</th>
              <th className="p-3 text-right text-slate-400 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pins.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">Belum ada anggota tim</td>
              </tr>
            )}
            {pins.map((p) => (
              <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 align-top">
                <td className="p-3 text-slate-200 font-medium">{p.label ?? '—'}</td>
                <td className="p-3 font-mono text-slate-300 whitespace-nowrap">
                  {visibleIds.has(p.id) ? p.pin : '••••••'}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleVisible(p.id)}
                    className="ml-2 h-6 w-6 p-0 text-slate-500 hover:text-slate-300"
                  >
                    {visibleIds.has(p.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                </td>

                {/* SKPD cell */}
                <td className="p-3 max-w-xs">
                  {editingPinId === p.id ? (
                    <div className="space-y-2">
                      <div className="max-h-40 overflow-y-auto rounded border border-slate-700 bg-slate-800 divide-y divide-slate-800/80">
                        {skpdList.map((skpd) => {
                          const assigned = assignedMap[skpd.id]
                          const isOtherPin = assigned && assigned.pinId !== p.id
                          return (
                            <label
                              key={skpd.id}
                              className={`flex items-center gap-2 px-2.5 py-1.5 text-xs transition-colors ${isOtherPin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700/40'}`}
                            >
                              <Checkbox
                                checked={editSkpdIds.has(skpd.id)}
                                onCheckedChange={() => !isOtherPin && toggleEditSkpd(skpd.id)}
                                disabled={isOtherPin}
                                className="border-slate-500 w-3.5 h-3.5 shrink-0"
                              />
                              <span className="text-slate-300 flex-1">{skpd.nama_skpd}</span>
                              {isOtherPin && (
                                <span className="text-slate-600 shrink-0">{assigned.label ?? '?'}</span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => saveEditSkpd(p.id)}
                          disabled={isPending}
                          className="h-6 px-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1"
                        >
                          <Check className="w-3 h-3" />Simpan
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPinId(null)}
                          className="h-6 px-2 text-xs text-slate-400 gap-1"
                        >
                          <X className="w-3 h-3" />Batal
                        </Button>
                      </div>
                      {error && <p className="text-xs text-red-400">{error}</p>}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex flex-wrap gap-1 flex-1">
                        {(p.skpd_ids ?? []).length === 0 ? (
                          <span className="text-slate-600 text-xs italic">Semua SKPD</span>
                        ) : (
                          (p.skpd_ids ?? []).map((sid) => {
                            const s = skpdList.find((x) => x.id === sid)
                            return s ? (
                              <span
                                key={sid}
                                className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded"
                              >
                                {s.nama_skpd}
                              </span>
                            ) : null
                          })
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditSkpd(p)}
                        className="h-5 w-5 p-0 text-slate-600 hover:text-slate-300 shrink-0 mt-0.5"
                        title="Edit SKPD"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </td>

                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                    {p.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="p-3 text-slate-400 text-xs whitespace-nowrap">
                  {p.last_used_at ? new Date(p.last_used_at).toLocaleString('id-ID') : '—'}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startTransition(async () => { await togglePin(p.id, !p.is_active); reload() })}
                    disabled={isPending}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200 mr-1"
                    title={p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startTransition(async () => { await deletePin(p.id); reload() })}
                    disabled={isPending}
                    className="h-7 w-7 p-0 text-red-500/70 hover:text-red-400"
                    title="Hapus"
                  >
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
