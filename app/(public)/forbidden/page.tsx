import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldX } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4 px-4 py-16 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldX className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="text-4xl font-bold">Akses Ditolak</h1>
      <p className="text-muted-foreground max-w-md">
        Anda tidak memiliki izin untuk mengakses halaman ini. Pastikan Anda
        masuk dengan akun yang sesuai, atau kembali ke beranda.
      </p>
      <Button render={<Link href="/" />} nativeButton={false} className="mt-2">
        Kembali ke Beranda
      </Button>
    </main>
  )
}
