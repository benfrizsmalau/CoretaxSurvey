'use client'

import { useState, useEffect, useTransition, useCallback, useMemo } from 'react'
import { PegawaiCoretax, RefSKPD, Role, SessionData, StatDashboard } from '@/lib/types'
import { getAllPegawai, getSkpdList } from '@/actions/pegawai'
import { getSession } from '@/actions/auth'
import { StatCards } from '@/components/dashboard/StatCards'
import { PegawaiTable } from '@/components/dashboard/PegawaiTable'
import { FloatingActionPanel } from '@/components/dashboard/FloatingActionPanel'
import { AddPegawaiDialog } from '@/components/dashboard/AddPegawaiDialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight, Plus, Building2 } from 'lucide-react'

const PAGE_SIZE = 50

export default function DashboardPage() {
  const [allPegawai, setAllPegawai] = useState<PegawaiCoretax[]>([])
  const [skpdList, setSkpdList] = useState<RefSKPD[]>([])
  const [role, setRole] = useState<Role>('operator')
  const [operatorSession, setOperatorSession] = useState<SessionData | null>(null)
  const [search, setSearch] = useState('')
  const [skpdFilter, setSkpdFilter] = useState('')
  const [jenisFilter, setJenisFilter] = useState<'' | 'PNS' | 'P3K'>('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Load semua data sekali — pencarian & filter setelah ini tidak perlu ke server
  const loadData = useCallback(() => {
    startTransition(async () => {
      const [allData, skpd, session] = await Promise.all([
        getAllPegawai(),
        getSkpdList(),
        getSession(),
      ])
      setAllPegawai(allData)
      setSkpdList(skpd)
      if (session) { setRole(session.role); setOperatorSession(session) }
    })
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Statistik dihitung di browser — langsung, tanpa request
  const stats = useMemo((): StatDashboard => {
    const base = jenisFilter
      ? allPegawai.filter((p) => p.jenis_pegawai === jenisFilter)
      : allPegawai
    return {
      total: base.length,
      validasi_sukses: base.filter((p) => p.status_aktivasi === 'Validasi Sukses').length,
      sedang_proses: base.filter((p) =>
        p.status_aktivasi === 'Aktivasi Akun' || p.status_aktivasi === 'Pembuatan KO DJP'
      ).length,
      belum_terdaftar: base.filter((p) => p.status_aktivasi === 'Belum Terdaftar').length,
      pns_total: allPegawai.filter((p) => p.jenis_pegawai === 'PNS').length,
      p3k_total: allPegawai.filter((p) => p.jenis_pegawai === 'P3K').length,
    }
  }, [allPegawai, jenisFilter])

  // Filter di browser — pencarian nama < 5ms, tanpa debounce, tanpa server
  const filtered = useMemo(() => {
    let result = allPegawai
    if (jenisFilter) result = result.filter((p) => p.jenis_pegawai === jenisFilter)
    if (skpdFilter) result = result.filter((p) => p.skpd_id === skpdFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.nama_pegawai.toLowerCase().includes(q) ||
          p.nip_pegawai.toLowerCase().includes(q)
      )
    }
    return result
  }, [allPegawai, jenisFilter, skpdFilter, search])

  const totalCount = filtered.length
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const pegawai = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  const selectedSkpdName =
    skpdFilter ? skpdList.find((s) => s.id === skpdFilter)?.nama_skpd ?? 'SKPD dipilih' : 'Semua SKPD'

  return (
    <div className="space-y-6">
      <StatCards stats={stats} />

      {role === 'operator' && operatorSession?.skpd_ids && operatorSession.skpd_ids.length > 0 && skpdList.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-2.5 text-sm text-indigo-300">
          <Building2 className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
          <div>
            <span className="font-medium">Tanggung jawab Anda:</span>
            <span className="ml-2 text-indigo-200/80">{skpdList.map((s) => s.nama_skpd).join(' · ')}</span>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 p-1 bg-slate-800/60 rounded-lg border border-slate-700/50 w-fit">
        {([['', 'Semua'], ['PNS', 'PNS'], ['P3K', 'P3K']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => { setJenisFilter(val); setPage(1) }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              jenisFilter === val
                ? val === 'PNS'
                  ? 'bg-blue-600 text-white shadow'
                  : val === 'P3K'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Cari NIP atau Nama..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <Select
          value={skpdFilter || 'all'}
          onValueChange={(v) => { setSkpdFilter(v === 'all' || !v ? '' : v); setPage(1) }}
        >
          <SelectTrigger className="h-10 w-full min-w-0 bg-slate-800/50 text-slate-300 border-slate-700 sm:w-[32rem] lg:w-[40rem]">
            <span className="block min-w-0 flex-1 truncate text-left" title={selectedSkpdName}>
              {selectedSkpdName}
            </span>
          </SelectTrigger>
          <SelectContent className="w-[min(44rem,calc(100vw-2rem))] bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-slate-300 py-2">Semua SKPD</SelectItem>
            {skpdList.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-slate-300 py-2">
                {s.nama_skpd}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="h-10 bg-indigo-600 text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Tambah Pegawai
        </Button>
      </div>

      {isPending ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Memuat data...</div>
      ) : (
        <PegawaiTable
          pegawai={pegawai}
          skpdList={skpdList}
          role={role}
          onSelectionChange={setSelectedIds}
          onDataChanged={loadData}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>{totalCount.toLocaleString('id-ID')} pegawai · Hal {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-slate-700 text-slate-300 h-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="border-slate-700 text-slate-300 h-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <FloatingActionPanel
          selectedIds={selectedIds}
          role={role}
          onActionDone={() => { setSelectedIds([]); loadData() }}
        />
      )}

      <AddPegawaiDialog
        open={isAddOpen}
        skpdList={skpdList}
        onClose={() => setIsAddOpen(false)}
        onCreated={(options) => {
          loadData()
          if (!options?.keepOpen) setIsAddOpen(false)
        }}
      />
    </div>
  )
}
