import { getPins, getAssignedSkpdMap } from '@/actions/pins'
import { getSkpdList } from '@/actions/pegawai'
import { PinManager } from '@/components/admin/PinManager'

export default async function AdminPinsPage() {
  const [pins, skpdList, assignedMap] = await Promise.all([
    getPins(),
    getSkpdList(),
    getAssignedSkpdMap(),
  ])

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Kelola Akses Tim</h1>
        <p className="mt-1 text-sm text-slate-400">
          Tambah dan kelola PIN serta tanggung jawab SKPD untuk anggota tim data Coretax.
        </p>
      </div>
      <PinManager initialPins={pins} skpdList={skpdList} initialAssignedMap={assignedMap} />
    </main>
  )
}
