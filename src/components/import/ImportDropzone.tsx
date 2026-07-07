'use client'

import { useState, useTransition } from 'react'
import { parseExcelPreview, importExcel, ImportPreview, ImportResult } from '@/actions/import'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react'

export function ImportDropzone() {
  const [previews, setPreviews] = useState<ImportPreview[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [buffer, setBuffer] = useState<number[] | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const arr = Array.from(new Uint8Array(e.target!.result as ArrayBuffer))
      setBuffer(arr); setResult(null)
      startTransition(async () => { setPreviews(await parseExcelPreview(arr)) })
    }
    reader.readAsArrayBuffer(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.xlsx')) handleFile(file)
  }

  function handleImport() {
    if (!buffer) return
    startTransition(async () => {
      const r = await importExcel(buffer)
      setResult(r); setPreviews([]); setBuffer(null)
    })
  }

  const totalRows = previews.reduce((s, p) => s + p.totalRows, 0)

  return (
    <div className="space-y-6">
      {!previews.length && !result && (
        <div
          onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-indigo-500/50 transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Seret file Excel ke sini</p>
          <p className="text-sm text-slate-500 mt-1">atau klik untuk memilih file .xlsx</p>
          <input id="file-input" type="file" accept=".xlsx" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      )}

      {isPending && <div className="text-center py-8 text-slate-400">Memproses file...</div>}

      {previews.length > 0 && !isPending && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-200 font-medium">{previews.length} sheet · {totalRows.toLocaleString('id-ID')} pegawai</p>
              <p className="text-sm text-slate-400">Preview 20 baris pertama per sheet</p>
            </div>
            <Button onClick={handleImport} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              Impor Semua ({totalRows.toLocaleString('id-ID')})
            </Button>
          </div>
          {previews.map((p) => (
            <div key={p.sheet} className="glass-card rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-slate-200">{p.skpdName}</span>
                <span className="text-xs text-slate-500 ml-auto">{p.totalRows} pegawai</span>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-slate-800">
                  <th className="p-2 text-left text-slate-500 font-normal">NIP</th>
                  <th className="p-2 text-left text-slate-500 font-normal">Nama</th>
                </tr></thead>
                <tbody>
                  {p.rows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td className="p-2 font-mono text-slate-400">{r.nip}</td>
                      <td className="p-2 text-slate-300">{r.nama}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="glass-card rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <p className="font-medium text-slate-200">Import selesai</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              { label: 'Ditambahkan/Diperbarui', value: result.inserted, color: 'text-emerald-400' },
              { label: 'Dilewati (Terkunci)', value: result.skipped_final, color: 'text-amber-400' },
              { label: 'Gagal', value: result.failed, color: 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800/50 rounded-lg p-3">
                <p className={`text-lg font-bold ${color}`}>{value.toLocaleString('id-ID')}</p>
                <p className="text-slate-400 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {result.errors.map((e, i) => <p key={i} className="text-xs text-red-300">{e}</p>)}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setResult(null)} className="border-slate-700 text-slate-300">
            Import file lain
          </Button>
        </div>
      )}
    </div>
  )
}
