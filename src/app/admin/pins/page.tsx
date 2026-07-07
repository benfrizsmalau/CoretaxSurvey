import { getPins } from '@/actions/pins'
import { PinManager } from '@/components/admin/PinManager'

export default async function AdminPinsPage() {
  const pins = await getPins()

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Kelola Akses Tim</h1>
        <p className="mt-1 text-sm text-slate-400">
          Tambah dan kelola PIN untuk anggota tim data BPPKAD.
        </p>
      </div>
      <PinManager initialPins={pins} />
    </main>
  )
}
