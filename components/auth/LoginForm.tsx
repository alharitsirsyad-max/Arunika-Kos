'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { loginSchemaFrontend, type LoginFrontendInput } from '@/lib/validations/auth'
import { cn } from '@/lib/utils'

// ── OTP Step (muncul setelah password berhasil diverifikasi) ───────────────

interface OtpStepProps {
  email: string
  onBack: () => void
  onSuccess: (role: 'USER' | 'ADMIN') => void
}

function OtpLoginStep({ email, onBack, onSuccess }: OtpStepProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) { setError('Masukkan 6 digit kode OTP'); return }

    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        otp_code: otp,
        redirect: false,
      })

      if (!result || result.error) {
        setError('Kode OTP salah atau sudah kadaluarsa')
        setOtp('')
        setLoading(false)
        return
      }

      const callbackUrl = searchParams.get('callbackUrl')
      if (callbackUrl) { router.push(callbackUrl); return }

      const { getSession } = await import('next-auth/react')
      const session = await getSession()
      const role = (session?.user as { role?: 'USER' | 'ADMIN' })?.role ?? 'USER'
      onSuccess(role)
      router.push(role === 'ADMIN' ? '/admin' : '/dashboard')
    } catch {
      setError('Terjadi kesalahan, coba lagi')
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'login' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.message ?? 'Gagal mengirim ulang OTP')
      } else {
        setCountdown(60)
        const interval = setInterval(() => {
          setCountdown((c) => { if (c <= 1) { clearInterval(interval); return 0 } return c - 1 })
        }, 1000)
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">Verifikasi masuk</p>
        <p className="text-sm text-muted-foreground">
          Kode OTP dikirim ke <span className="font-medium text-foreground">{email}</span>
        </p>
        <p className="text-xs text-muted-foreground">Berlaku 10 menit. Cek folder spam jika tidak muncul.</p>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleVerify} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="otp" className="text-sm font-medium">Kode OTP (6 digit)</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-center text-2xl font-mono tracking-widest outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            autoComplete="one-time-code"
            autoFocus
          />
        </div>

        <Button type="submit" disabled={loading || otp.length !== 6} className="w-full" size="lg">
          {loading ? 'Memverifikasi...' : 'Verifikasi'}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          ← Kembali
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || countdown > 0}
          className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resending ? 'Mengirim...' : countdown > 0 ? `Kirim ulang (${countdown}s)` : 'Kirim ulang OTP'}
        </button>
      </div>
    </div>
  )
}

// ── Main Login Form ────────────────────────────────────────────────────────

type LoginMode = 'password' | 'otp-verify'

interface LoginFormProps {
  onSuccess?: (role: 'USER' | 'ADMIN') => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')
  const registrationSuccess = searchParams.get('success') === 'registered'

  const [mode, setMode] = useState<LoginMode>('password')
  const [otpEmail, setOtpEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [sendingOtp, setSendingOtp] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFrontendInput>({
    resolver: zodResolver(loginSchemaFrontend),
  })

  const handleRedirect = (role: 'USER' | 'ADMIN') => {
    if (onSuccess) { onSuccess(role); return }
    if (callbackUrl) { router.push(callbackUrl); return }
    router.push(role === 'ADMIN' ? '/admin' : '/dashboard')
  }

  // Verifikasi password → kirim OTP → masuk ke OTP step
  const onPasswordSubmit = async (data: LoginFrontendInput) => {
    setServerError(null)

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (!result || result.error) {
      setServerError('Email atau password salah')
      return
    }

    // Password benar → kirim OTP
    setSendingOtp(true)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, purpose: 'login' }),
      })
      const json = await res.json()

      if (!res.ok) {
        setServerError(json.error?.message ?? 'Gagal mengirim OTP. Coba lagi.')
        return
      }

      setOtpEmail(data.email)
      setMode('otp-verify')
    } catch {
      setServerError('Terjadi kesalahan jaringan. Coba lagi.')
    } finally {
      setSendingOtp(false)
    }
  }

  const isLoading = isSubmitting || sendingOtp

  return (
    <div className="flex flex-col gap-4">
      {registrationSuccess && mode === 'password' && (
        <div role="status" className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-700">
          Akun berhasil dibuat, silakan login
        </div>
      )}

      {serverError && (
        <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* ── OTP Verify Step ── */}
      {mode === 'otp-verify' && (
        <OtpLoginStep
          email={otpEmail}
          onBack={() => { setMode('password'); setServerError(null) }}
          onSuccess={handleRedirect}
        />
      )}

      {/* ── Form Email + Password ── */}
      {mode === 'password' && (
        <>
          <form onSubmit={handleSubmit(onPasswordSubmit)} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@contoh.com"
                aria-invalid={!!errors.email}
                className={cn(
                  'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors',
                  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
                  errors.email ? 'border-destructive' : 'border-input'
                )}
                {...register('email')}
              />
              {errors.email && <p role="alert" className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                className={cn(
                  'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors',
                  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
                  errors.password ? 'border-destructive' : 'border-input'
                )}
                {...register('password')}
              />
              {errors.password && <p role="alert" className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full" size="lg">
              {isLoading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{' '}
            <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
              Daftar di sini
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
