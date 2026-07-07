'use client'

import { useTransition } from 'react'
import { Role } from '@/lib/types'
import { bulkFinalizePegawai } from '@/actions/pegawai'
import { exportSelectedToExcel } from '@/actions/export'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Download, Lock } from 'lucide-react'

interface Props { selectedIds: string[]; role: Role; onActionDone: () => void }

export function FloatingActionPanel({ selectedIds, role, onActionDone }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleExport() {
    startTransition(async () => {
      const { data, filename } = await exportSelectedToExcel(selectedIds)
      const blob = new Blob([new Uint8Array(data)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    })
  }

  function handleBulkFinalize() {
    startTransition(async () => {
      await bulkFinalizePegawai(selectedIds)
      onActionDone()
    })
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl border border-slate-700">
        <span className="text-sm text-slate-300 font-medium">{selectedIds.length} dipilih</span>
        <div className="w-px h-5 bg-slate-700" />
        <Button size="sm" variant="ghost" onClick={handleExport} disabled={isPending} className="text-slate-300 hover:text-white gap-1.5">
          <Download className="w-4 h-4" />Ekspor Excel
        </Button>
        {role === 'admin' && (
          <AlertDialog>
            <AlertDialogTrigger className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50">
              <Lock className="w-4 h-4" />Verifikasi Massal
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-slate-100">Kunci {selectedIds.length} data?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Tindakan ini akan mengunci {selectedIds.length} data pegawai secara permanen dan tidak dapat dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkFinalize} className="bg-amber-600 hover:bg-amber-500 text-white">
                  Ya, Kunci Semua
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
