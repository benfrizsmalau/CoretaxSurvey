'use client'

import { useEffect, useState, useTransition } from 'react'
import { generateDaftarPdf } from '@/actions/export'
import { getSkpdList } from '@/actions/pegawai'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefSKPD } from '@/lib/types'
import { FileText } from 'lucide-react'

const statusOptions = ['Belum Terdaftar', 'Aktivasi Akun', 'Pembuatan KO DJP', 'Validasi Sukses']
const SEMUA_SKPD = '__semua__'

export default function DaftarPage() {
  const [skpdList, setSkpdList] = useState<RefSKPD[]>([])
  const [skpdId, setSkpdId] = useState(SEMUA_SKPD)
  const [filterStatus, setFilterStatus] = useState('semua')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getSkpdList().then(setSkpdList)
  }, [])

  function handleGenerate() {
    const targetSkpdId = skpdId === SEMUA_SKPD ? null : skpdId
    startTransition(async () => {
      const { data, filename } = await generateDaftarPdf(targetSkpdId, filterStatus)
      const blob = new Blob([new Uint8Array(data)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.target = '_blank'
      anchor.click()
      URL.revokeObjectURL(url)
    })
  }

  const isSemuaSkpd = skpdId === SEMUA_SKPD

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Daftar Pegawai Per SKPD</h1>
        <p className="mt-1 text-sm text-slate-400">
          Format F4 Landscape, siap dicetak. Pilih SKPD tertentu atau cetak seluruh SKPD sekaligus.
        </p>
      </div>

      <div className="glass-card space-y-4 rounded-xl p-5">
        <div className="space-y-1.5">
          <Label className="text-sm text-slate-300">Pilih SKPD</Label>
          <Select value={skpdId} onValueChange={(value) => value && setSkpdId(value)}>
            <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64 w-[min(44rem,calc(100vw-2rem))] border-slate-700 bg-slate-800">
              <SelectItem value={SEMUA_SKPD} className="font-medium text-indigo-300">
                Semua SKPD (seluruh pegawai)
              </SelectItem>
              {skpdList.map((skpd) => (
                <SelectItem key={skpd.id} value={skpd.id} className="text-slate-300">
                  {skpd.nama_skpd}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isSemuaSkpd && (
            <p className="text-xs text-indigo-300/70">
              PDF akan memuat kolom SKPD untuk setiap baris pegawai.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm text-slate-300">Filter Status</Label>
          <Select value={filterStatus} onValueChange={(value) => value && setFilterStatus(value)}>
            <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-800">
              <SelectItem value="semua" className="text-slate-300">
                Semua Status
              </SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status} className="text-slate-300">
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
        >
          <FileText className="h-4 w-4" />
          {isPending ? 'Membuat PDF...' : 'Buat PDF'}
        </Button>
      </div>
    </div>
  )
}
