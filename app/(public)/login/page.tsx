import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

/**
 * Halaman Login (`/login`)
 *
 * LoginForm dibungkus Suspense karena useSearchParams() di dalamnya
 * memerlukan Suspense boundary saat rendering.
 *
 * Setelah login berhasil, redirect ditentukan di dalam LoginForm:
 * - callbackUrl (query param) → prioritas utama
 * - role ADMIN → /admin
 * - role USER  → /dashboard
 */
export default function LoginPage() {
  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Masuk ke Akun</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masukkan email dan password Anda
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex flex-col gap-4">
              <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
