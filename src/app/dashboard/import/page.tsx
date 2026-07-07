import { ImportDropzone } from '@/components/import/ImportDropzone'

export default function ImportPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Import Data Pegawai</h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload file Excel format <code className="text-indigo-400">DATA PEGAWAI PER OPD.xlsx</code> — semua sheet diproses otomatis.
        </p>
      </div>
      <ImportDropzone />
    </div>
  )
}
