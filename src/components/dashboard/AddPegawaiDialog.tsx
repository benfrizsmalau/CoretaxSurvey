'use client'

import { useState, useTransition } from 'react'
import { createPegawai } from '@/actions/pegawai'
import { RefSKPD, StatusAktivasi, JenisPegawai } from '@/lib/types'
import { getPegawaiDataIssues } from '@/lib/data-quality'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  open: boolean
  skpdList: RefSKPD[]
  onClose: () => void
  onCreated: (options?: { keepOpen?: boolean }) => void
}

interface AddPegawaiForm {
  nip_pegawai: string
  nama_pegawai: string
  skpd_id: string
  nik_pegawai: string
  no_kk: string
  nama_ibu_kandung: string
  npwp_pegawai: string
  no_telp: string
  email: string
  status_aktivasi: StatusAktivasi
  jenis_pegawai: JenisPegawai
}

const emptyForm: AddPegawaiForm = {
  nip_pegawai: '',
  nama_pegawai: '',
  skpd_id: '',
  nik_pegawai: '',
  no_kk: '',
  nama_ibu_kandung: '',
  npwp_pegawai: '',
  no_telp: '',
  email: '',
  status_aktivasi: 'Belum Terdaftar',
  jenis_pegawai: 'PNS',
}

export function AddPegawaiDialog({ open, skpdList, onClose, onCreated }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [savedWarnings, setSavedWarnings] = useState<string[]>([])
  const [created, setCreated] = useState(false)
  const [isPending, startTransition] = useTransition()

  const currentIssues = getPegawaiDataIssues(form)
  const visibleIssues = savedWarnings.length > 0 ? savedWarnings : currentIssues

  function field(key: keyof typeof form, value: string) {
    setError('')
    setSavedMessage('')
    setSavedWarnings([])
    setCreated(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  function resetForm() {
    setForm(emptyForm)
    setError('')
    setSavedMessage('')
    setSavedWarnings([])
    setCreated(false)
  }

  function handleSave() {
    setError('')
    setSavedMessage('')
    startTransition(async () => {
      const result = await createPegawai(form)
      if (!result.success) {
        setError(result.error ?? 'Gagal menyimpan data pegawai')
        return
      }

      setCreated(true)
      onCreated({ keepOpen: true })
      if (result.warnings?.length) {
        setSavedWarnings(result.warnings)
        setSavedMessage('Data tersimpan, namun masih ada kekurangan:')
        return
      }
      onCreated()
      onClose()
    })
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose() }}>
      <DialogContent className="max-h-[min(90vh,760px)] overflow-y-auto bg-slate-900 border-slate-700 text-slate-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Input Data Pegawai</DialogTitle>
          <p className="text-sm text-slate-400">Tambah pegawai manual ke daftar pendataan Coretax.</p>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">NIP</Label>
              <Input
                value={form.nip_pegawai}
                onChange={(e) => field('nip_pegawai', e.target.value)}
                placeholder="Maks. 18 digit angka"
                disabled={created}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Nama Pegawai</Label>
              <Input
                value={form.nama_pegawai}
                onChange={(e) => field('nama_pegawai', e.target.value)}
                placeholder="Nama lengkap"
                disabled={created}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">SKPD</Label>
            <Select value={form.skpd_id || 'none'} onValueChange={(v) => field('skpd_id', !v || v === 'none' ? '' : v)} disabled={created}>
              <SelectTrigger className="h-10 w-full bg-slate-800 border-slate-700 text-slate-300">
                <SelectValue placeholder="Pilih SKPD" />
              </SelectTrigger>
              <SelectContent className="w-[min(44rem,calc(100vw-2rem))] bg-slate-800 border-slate-700">
                <SelectItem value="none" className="text-slate-300 py-2">Belum dipilih</SelectItem>
                {skpdList.map((skpd) => (
                  <SelectItem key={skpd.id} value={skpd.id} className="text-slate-300 py-2">
                    {skpd.nama_skpd}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: 'nik_pegawai', label: 'NIK KTP (16 digit)', placeholder: '16 digit angka' },
              { key: 'no_kk', label: 'No. Kartu Keluarga (16 digit)', placeholder: '16 digit angka' },
              { key: 'nama_ibu_kandung', label: 'Nama Ibu Kandung', placeholder: 'Nama ibu kandung' },
              { key: 'npwp_pegawai', label: 'NPWP (16 digit)', placeholder: '16 digit angka' },
              { key: 'no_telp', label: 'No. Telepon', placeholder: '0812...' },
              { key: 'email', label: 'Email', placeholder: 'nama@domain.com' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-slate-300 text-sm">{label}</Label>
                <Input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => field(key as keyof typeof form, e.target.value)}
                  placeholder={placeholder}
                  disabled={created}
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Status Aktivasi</Label>
              <Select value={form.status_aktivasi} onValueChange={(v) => v && field('status_aktivasi', v as StatusAktivasi)} disabled={created}>
                <SelectTrigger className="h-10 w-full bg-slate-800 border-slate-700 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {['Belum Terdaftar', 'Aktivasi Akun', 'Pembuatan KO DJP', 'Validasi Sukses'].map((status) => (
                    <SelectItem key={status} value={status} className="text-slate-300">{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Jenis Pegawai</Label>
              <Select value={form.jenis_pegawai} onValueChange={(v) => v && field('jenis_pegawai', v as JenisPegawai)} disabled={created}>
                <SelectTrigger className="h-10 w-full bg-slate-800 border-slate-700 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="PNS" className="text-slate-300">PNS</SelectItem>
                  <SelectItem value="P3K" className="text-slate-300">P3K</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          {created && (
            <Button variant="outline" onClick={resetForm} className="mr-auto border-slate-700 text-slate-300 hover:bg-slate-800">
              <RotateCcw className="h-4 w-4" />Input Lagi
            </Button>
          )}
          <Button variant="ghost" onClick={handleClose} className="text-slate-400">Tutup</Button>
          <Button onClick={handleSave} disabled={isPending || created} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            {isPending ? 'Menyimpan...' : created ? 'Tersimpan' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
