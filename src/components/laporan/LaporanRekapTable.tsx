'use client'

import { useTransition } from 'react'
import { exportRekapToExcel } from '@/actions/export'
import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'

interface RekapRow {
  nama_skpd: string
  total: number
  validasi_sukses: number
  ko_djp: number
  aktivasi: number
  belum: number
}

export function LaporanRekapTable({ data }: { data: RekapRow[] }) {
  const [isPending, startTransition] = useTransition()
  const totals = data.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      validasi_sukses: acc.validasi_sukses + row.validasi_sukses,
      ko_djp: acc.ko_djp + row.ko_djp,
      aktivasi: acc.aktivasi + row.aktivasi,
      belum: acc.belum + row.belum,
    }),
    { total: 0, validasi_sukses: 0, ko_djp: 0, aktivasi: 0, belum: 0 }
  )

  function handleExport() {
    startTransition(async () => {
      const { data: buf, filename } = await exportRekapToExcel()
      const blob = new Blob([new Uint8Array(buf)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          disabled={isPending}
          className="gap-1.5 border-slate-700 text-slate-300"
        >
          <Download className="h-4 w-4" />
          Excel
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
          className="gap-1.5 border-slate-700 text-slate-300"
        >
          <Printer className="h-4 w-4" />
          Cetak
        </Button>
      </div>

      <div className="glass-card overflow-hidden rounded-xl print:border print:border-gray-300 print:bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 print:border-gray-300 print:bg-gray-100">
                <th className="p-3 text-left font-medium text-slate-400 print:text-gray-700">SKPD</th>
                <th className="p-3 text-center font-medium text-slate-400 print:text-gray-700">Total</th>
                <th className="p-3 text-center font-medium text-emerald-400 print:text-gray-700">
                  Validasi Sukses
                </th>
                <th className="p-3 text-center font-medium text-cyan-400 print:text-gray-700">KO DJP</th>
                <th className="p-3 text-center font-medium text-amber-400 print:text-gray-700">Aktivasi</th>
                <th className="p-3 text-center font-medium text-red-400 print:text-gray-700">Belum</th>
                <th className="p-3 text-center font-medium text-slate-400 print:text-gray-700">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.nama_skpd}
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 print:border-gray-200"
                >
                  <td className="p-3 text-xs text-slate-200 print:text-gray-900">{row.nama_skpd}</td>
                  <td className="p-3 text-center font-medium text-slate-300 print:text-gray-900">
                    {row.total}
                  </td>
                  <td className="p-3 text-center text-emerald-400 print:text-gray-900">
                    {row.validasi_sukses}
                  </td>
                  <td className="p-3 text-center text-cyan-400 print:text-gray-900">{row.ko_djp}</td>
                  <td className="p-3 text-center text-amber-400 print:text-gray-900">{row.aktivasi}</td>
                  <td className="p-3 text-center text-red-400 print:text-gray-900">{row.belum}</td>
                  <td className="p-3 text-center text-xs text-slate-400 print:text-gray-900">
                    {row.total > 0 ? ((row.validasi_sukses / row.total) * 100).toFixed(0) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700 bg-slate-900/80 font-semibold print:border-gray-400 print:bg-gray-100">
                <td className="p-3 text-slate-200 print:text-gray-900">TOTAL</td>
                <td className="p-3 text-center text-slate-100 print:text-gray-900">{totals.total}</td>
                <td className="p-3 text-center text-emerald-300 print:text-gray-900">
                  {totals.validasi_sukses}
                </td>
                <td className="p-3 text-center text-cyan-300 print:text-gray-900">{totals.ko_djp}</td>
                <td className="p-3 text-center text-amber-300 print:text-gray-900">{totals.aktivasi}</td>
                <td className="p-3 text-center text-red-300 print:text-gray-900">{totals.belum}</td>
                <td className="p-3 text-center text-slate-300 print:text-gray-900">
                  {totals.total > 0 ? ((totals.validasi_sukses / totals.total) * 100).toFixed(0) : 0}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
