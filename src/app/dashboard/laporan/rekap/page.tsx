import { getRekapPerSKPD } from '@/actions/pegawai'
import { LaporanRekapTable } from '@/components/laporan/LaporanRekapTable'

export default async function RekapPage() {
  const data = await getRekapPerSKPD()
  const tanggal = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100 print:text-black">
          Rekapitulasi Pendataan Coretax
        </h1>
        <p className="mt-1 text-sm text-slate-400 print:text-gray-600">
          Pemerintah Kabupaten Mamberamo Raya · Per {tanggal}
        </p>
      </div>
      <LaporanRekapTable data={data} />
    </div>
  )
}
