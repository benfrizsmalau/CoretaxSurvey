'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Shield } from 'lucide-react'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await loginAction(pin)
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error ?? 'Terjadi kesalahan')
        setPin('')
      }
    })
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(56,189,248,0.1) 0%, transparent 60%), rgb(15 23 42)',
      }}
    >
      <div className="glass-card rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.4)',
            }}
          >
            <Shield className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-xl font-semibold text-slate-100">Pendataan Coretax</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">
            Pemerintah Kabupaten Mamberamo Raya
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin" className="text-slate-300 text-sm">
              Kode Akses
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN"
                className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending || !pin}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isPending ? 'Memverifikasi...' : 'Masuk'}
          </Button>
        </form>
      </div>
    </main>
  )
}
