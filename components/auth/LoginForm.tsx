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

interface LoginFormProps {
  onSuccess?: (role: 'USER' | 'ADMIN') => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')
  const registrationSuccess = searchParams.get('success') === 'registered'

  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFrontendInput>({
    resolver: zodResolver(loginSchemaFrontend),
  })

  const onSubmit = async (data: LoginFrontendInput) => {
    setServerError(null)

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (!result?.ok) {
      setServerError('Email atau password salah')
      return
    }

    if (onSuccess) {
      const { getSession } = await import('next-auth/react')
      const session = await getSession()
      const role = (session?.user as { role?: 'USER' | 'ADMIN' })?.role ?? 'USER'
      onSuccess(role)
      return
    }

    if (callbackUrl) {
      router.push(callbackUrl)
      return
    }

    const { getSession } = await import('next-auth/react')
    const session = await getSession()
    const role = (session?.user as { role?: 'USER' | 'ADMIN' })?.role ?? 'USER'
    router.push(role === 'ADMIN' ? '/admin' : '/dashboard')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      {registrationSuccess && (
        <div role="status" className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-700">
          Akun berhasil dibuat, silakan login
        </div>
      )}

      {serverError && (
        <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
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

        <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
          {isSubmitting ? 'Memproses...' : 'Masuk'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Belum punya akun?{' '}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Daftar di sini
        </Link>
      </p>
    </div>
  )
}
