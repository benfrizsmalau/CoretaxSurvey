'use client'

import { useState, useTransition } from 'react'
import { PegawaiCoretax, RefSKPD, Role } from '@/lib/types'
import { updatePegawai, finalizePegawai } from '@/actions/pegawai'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Lock } from 'lucide-react'
import { getPegawaiDataIssues } from '@/lib/data-quality'

interface Props {
  pegawai: PegawaiCoretax
  skpdList: RefSKPD[]
  role: Role
  onClose: () => void
  onSaved: (options?: { keepOpen?: boolean }) => void
}

export function EditDialog({ pegawai, role, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    nik_pegawai: pegawai.nik_pegawai ?? '',
    no_kk: pegawai.no_kk ?? '',
    nama_ibu_kandung: pegawai.nama_ibu_kandung ?? '',
    npwp_pegawai: pegawai.npwp_pegawai ?? '',
    no_telp: pegawai.no_telp ?? '',
    email: pegawai.email ?? '',
    status_aktivasi: pegawai.status_aktivasi,
    jenis_pegawai: pegawai.jenis_pegawai,
  })
  const [lastUpdatedAt, setLastUpdatedAt] = useState(pegawai.updated_at)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [savedWarnings, setSavedWarnings] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const currentIssues = getPegawaiDataIssues(form)
  const visibleIssues = savedWarnings.length > 0 ? savedWarnings : currentIssues

  function field(key: keyof typeof form, value: string) {
    setError('')
    setSavedMessage('')
    setSavedWarnings([])
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSave() {
    setError('')
    setSavedMessage('')
    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await updatePegawai(pegawai.id, lastUpdatedAt, form as any)
      if (result.conflict) {
        setError('Data telah diperbarui oleh anggota tim lain. Tutup dan coba lagi.')
        return
      }
      if (!result.success) { setError(result.error ?? 'Gagal menyimpan'); return }
      if (result.updatedAt) setLastUpdatedAt(result.updatedAt)
      if (result.warnings?.length) {
        setSavedWarnings(result.warnings)
        setSavedMessage('Data tersimpan, namun masih ada kekurangan:')
        onSaved({ keepOpen: true })
        return
      }
      onSaved()
    })
  }

  function handleFinalize() {
    startTransition(async () => {
      const result = await finalizePegawai(pegawai.id)
      if (!result.success) { setError(result.error ?? 'Gagal mengunci data'); return }
      onSaved()
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Edit Data Pegawai</DialogTitle>
          <p className="text-sm text-slate-400">{pegawai.nama_pegawai} · {pegawai.nip_pegawai}</p>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {[
            { key: 'nik_pegawai', label: 'NIK KTP (16 digit)', placeholder: '3200...' },
            { key: 'no_kk', label: 'No. Kartu Keluarga (16 digit)', placeholder: '3200...' },
            { key: 'nama_ibu_kandung', label: 'Nama Ibu Kandung', placeholder: 'Nama ibu kandung' },
            { key: 'npwp_pegawai', label: 'NPWP (16 digit)', placeholder: '16 digit angka' },
            { key: 'no_telp', label: 'No. Telepon', placeholder: '0812...' },
            { key: 'email', label: 'Email', placeholder: 'nama@domain.com' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="grid grid-cols-3 gap-3 items-center">
              <Label className="text-slate-300 text-right text-sm">{label}</Label>
              <Input
                value={form[key as keyof typeof form]}
                onChange={(e) => field(key as keyof typeof form, e.target.value)}
                placeholder={placeholder}
                className="col-span-2 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
              />
            </div>
          ))}

          <div className="grid grid-cols-3 gap-3 items-center">
            <Label className="text-slate-300 text-right text-sm">Status Aktivasi</Label>
            <Select value={form.status_aktivasi} onValueChange={(v) => v && field('status_aktivasi', v)}>
              <SelectTrigger className="col-span-2 bg-slate-800 border-slate-700 text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {['Belum Terdaftar', 'Aktivasi Akun', 'Pembuatan KO DJP', 'Validasi Sukses'].map((s) => (
                  <SelectItem key={s} value={s} className="text-slate-300">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3 items-center">
            <Label className="text-slate-300 text-right text-sm">Jenis Pegawai</Label>
            <Select value={form.jenis_pegawai} onValueChange={(v) => v && field('jenis_pegawai', v)}>
              <SelectTrigger className="col-span-2 bg-slate-800 border-slate-700 text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="PNS" className="text-slate-300">PNS – Pegawai Negeri Sipil</SelectItem>
                <SelectItem value="P3K" className="text-slate-300">P3K – Peg. Pemerintah Perjanjian Kerja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {visibleIssues.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" />
              {savedMessage || 'Kekurangan data yang perlu diperbaiki:'}
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-6 text-xs text-amber-100/85">
              {visibleIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          {role === 'admin' && (
            <AlertDialog>
              <AlertDialogTrigger className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors mr-auto">
                <Lock className="w-3.5 h-3.5" />Verifikasi &amp; Kunci
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-slate-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-slate-100">Kunci Data Permanen?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    Tindakan ini akan mengunci data <strong className="text-slate-200">{pegawai.nama_pegawai}</strong> secara permanen dan tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFinalize} disabled={isPending} className="bg-amber-600 hover:bg-amber-500 text-white">
                    Ya, Kunci Permanen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="ghost" onClick={onClose} className="text-slate-400">Batal</Button>
          <Button onClick={handleSave} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
