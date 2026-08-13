'use client'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'

export function ReVerificationBanner() {
  const { data } = useQuery({
    queryKey: ['user-profile-me'],
    queryFn: () =>
      fetch('/api/users/me', { credentials: 'include' })
        .then(r => r.json()).then(r => r.data),
    staleTime: 30 * 1000,
  })
  if (data?.verification_status !== 'PENDING') return null
  return (
    <div className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
      <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden />
      <p>Data Anda sedang dalam proses verifikasi ulang. Anda tetap dapat menggunakan layanan selama proses berlangsung.</p>
    </div>
  )
}
