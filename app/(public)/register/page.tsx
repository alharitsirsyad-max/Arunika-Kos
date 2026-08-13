import { RegisterForm } from '@/components/auth/RegisterForm'

/**
 * Halaman Register (`/register`)
 *
 * Menampilkan form registrasi. Setelah berhasil mendaftar,
 * user akan diredirect ke `/login?success=registered`.
 */
export default function RegisterPage() {
  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Daftar Akun Baru</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Isi data diri Anda untuk membuat akun
          </p>
        </div>

        <RegisterForm />
      </div>
    </main>
  )
}
