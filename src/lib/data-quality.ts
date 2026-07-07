export interface PegawaiQualityInput {
  nik_pegawai?: string | null
  npwp_pegawai?: string | null
  no_telp?: string | null
  email?: string | null
}

function countDigits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '').length
}

export function getNpwpState(value: string | null | undefined) {
  const npwp = value?.trim() ?? ''
  if (!npwp) {
    return {
      label: 'Belum diisi',
      detail: 'NPWP belum tersedia',
      className: 'text-amber-300/80',
      needsRepair: true,
    }
  }

  const digits = countDigits(npwp)
  if (digits !== 16) {
    return {
      label: npwp,
      detail: `NPWP belum 16 digit (${digits} digit)`,
      className: 'text-red-300',
      needsRepair: true,
    }
  }

  return {
    label: npwp,
    detail: 'Valid 16 digit',
    className: 'text-slate-400',
    needsRepair: false,
  }
}

export function getPegawaiDataIssues(input: PegawaiQualityInput) {
  const issues: string[] = []
  const nik = input.nik_pegawai?.trim() ?? ''
  const npwp = input.npwp_pegawai?.trim() ?? ''
  const phone = input.no_telp?.trim() ?? ''
  const email = input.email?.trim() ?? ''

  if (!nik) {
    issues.push('NIK belum diisi')
  } else {
    const digits = countDigits(nik)
    if (digits !== 16) issues.push(`NIK belum 16 digit (${digits} digit)`)
  }

  if (!npwp) {
    issues.push('NPWP belum diisi')
  } else {
    const digits = countDigits(npwp)
    if (digits !== 16) issues.push(`NPWP belum 16 digit (${digits} digit)`)
  }

  if (!phone) {
    issues.push('No. telepon belum diisi')
  } else {
    const digits = countDigits(phone)
    if (digits < 8 || digits > 15) issues.push(`No. telepon belum valid (${digits} digit)`)
  }

  if (!email) {
    issues.push('Email belum diisi')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push('Format email belum valid')
  }

  return issues
}
