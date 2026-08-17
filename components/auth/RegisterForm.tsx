'use client'

/**
 * RegisterForm.tsx
 * Alur registrasi WAJIB dengan verifikasi OTP via email (Brevo).
 * Step 1: Isi data → kirim OTP ke email
 * Step 2: Masukkan OTP → akun dibuat → auto-login langsung ke dashboard
 */

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { registerSchemaFrontend, type RegisterFrontendInput } from '@/lib/validations/auth'
import { cn } from '@/lib/utils'

type Step = 'form' | 'otp'

export function RegisterForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [serverError, setServerError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [formData, setFormData] = useState<RegisterFrontendInput | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFrontendInput>({
    resolver: zodResolver(registerSchemaFrontend),
  })

  // ── Step 1: Kirim OTP ─────────────────────────────────────────────────────

  const onFormSubmit = async (data: RegisterFrontendInput) => {
    setServerError(null)
    setSending(true)

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, purpose: 'register', name: data.name }),
      })
      const json = await res.json()

      if (res.ok) {
        setFormData(data)
        setStep('otp')
        startCountdown()
        return
      }

      // Tampilkan error spesifik dari API
      const errorMsg = json.error?.message ?? json.message ?? 'Gagal mengirim kode OTP. Coba lagi.'
      setServerError(errorMsg)
    } catch {
      setServerError('Terjadi kesalahan jaringan. Coba lagi.')
    } finally {
      setSending(false)
    }
  }

  // ── Step 2: Verifikasi OTP + buat akun ────────────────────────────────────

  const onOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData) return
    if (otp.length !== 6) { setOtpError('Masukkan 6 digit kode OTP'); return }

    setVerifying(true)
    setOtpError('')

    try {
      const res = await fetch('/api/auth/otp/verify-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code: otp,
          name: formData.name,
          password: formData.password,
          phone: formData.phone,
          address: formData.address,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setOtpError(json.error?.message ?? 'Kode OTP salah atau kadaluarsa')
        return
      }

      // Akun berhasil dibuat — arahkan ke login dengan pesan sukses
      // Auto-login via password tidak lagi tersedia (2FA hardening: JWT hanya dari OTP)
      router.push('/login?success=registered')
    } catch {
      setOtpError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setVerifying(false)
    }
  }

  // ── Kirim ulang OTP ───────────────────────────────────────────────────────

  const handleResend = async () => {
    if (!formData) return
    setSending(true)
    setOtpError('')
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, purpose: 'register', name: formData.name }),
      })
      const json = await res.json()
      if (!res.ok) setOtpError(json.error?.message ?? 'Gagal kirim ulang')
      else startCountdown()
    } finally {
      setSending(false)
    }
  }

  const startCountdown = () => {
    setCountdown(60)
    const interval = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(interval); return 0 } return c - 1 })
    }, 1000)
  }

  // ── Render: OTP Step ───────────────────────────────────────────────────────

  if (step === 'otp') {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Kode OTP dikirim ke</p>
          <p className="font-semibold">{formData?.email}</p>
          <p className="text-xs text-muted-foreground">Berlaku 10 menit. Cek folder spam jika tidak muncul.</p>
        </div>

        {otpError && (
          <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {otpError}
          </div>
        )}

        <form onSubmit={onOtpVerify} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="otp-code" className="text-sm font-medium">Kode OTP (6 digit)</label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-center text-2xl font-mono tracking-widest outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
          <Button type="submit" disabled={verifying || otp.length !== 6} className="w-full" size="lg">
            {verifying ? 'Memverifikasi...' : 'Verifikasi & Buat Akun'}
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={() => { setStep('form'); setOtp(''); setOtpError('') }}
            className="text-muted-foreground hover:text-foreground transition-colors">← Kembali</button>
          <button type="button" onClick={handleResend} disabled={sending || countdown > 0}
            className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
            {sending ? 'Mengirim...' : countdown > 0 ? `Kirim ulang (${countdown}s)` : 'Kirim ulang OTP'}
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Form Step ─────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} noValidate className="flex flex-col gap-4">
      {serverError && (
        <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Field label="Nama Lengkap" error={errors.name?.message}>
        <input id="name" type="text" autoComplete="name" placeholder="Nama lengkap Anda"
          aria-invalid={!!errors.name} className={inputCls(!!errors.name)} {...register('name')} />
      </Field>

      <Field label="Email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" placeholder="nama@contoh.com"
          aria-invalid={!!errors.email} className={inputCls(!!errors.email)} {...register('email')} />
      </Field>

      <Field label="Password" error={errors.password?.message}>
        <input id="password" type="password" autoComplete="new-password" placeholder="Minimal 8 karakter"
          aria-invalid={!!errors.password} className={inputCls(!!errors.password)} {...register('password')} />
      </Field>

      <Field label="Konfirmasi Password" error={errors.confirmPassword?.message}>
        <input id="confirmPassword" type="password" autoComplete="new-password" placeholder="Ulangi password"
          aria-invalid={!!errors.confirmPassword} className={inputCls(!!errors.confirmPassword)} {...register('confirmPassword')} />
      </Field>

      <Field label="Nomor Telepon" error={errors.phone?.message}>
        <input id="phone" type="tel" autoComplete="tel" placeholder="08xxxxxxxxxx"
          aria-invalid={!!errors.phone} className={inputCls(!!errors.phone)} {...register('phone')} />
      </Field>

      <Field label="Alamat Domisili" error={errors.address?.message}>
        <textarea id="address" autoComplete="street-address" placeholder="Jl. Contoh No. 1, Kota, Provinsi"
          rows={2}
          aria-invalid={!!errors.address}
          className={cn(inputCls(!!errors.address), 'h-auto py-2 resize-none')}
          {...register('address')} />
      </Field>

      <Button type="submit" disabled={isSubmitting || sending} className="w-full" size="lg">
        {isSubmitting || sending ? 'Mengirim OTP...' : 'Daftar & Verifikasi Email'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{' '}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Masuk</Link>
      </p>
    </form>
  )
}

function inputCls(hasError: boolean) {
  return cn(
    'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors',
    'placeholder:text-muted-foreground',
    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
    hasError ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20' : 'border-input'
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
