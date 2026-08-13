'use client'

/**
 * components/dashboard/IdentityBanner.tsx
 * Banner kondisional berdasarkan status verifikasi identitas dan kontak darurat user.
 * Tidak ada banner identitas jika is_verified: true.
 * Tidak ada banner kontak jika sudah ada minimal 1 kontak darurat.
 */

import Link from 'next/link'
import { AlertTriangleIcon, InfoIcon, XCircleIcon, PhoneOffIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IdentityStatus } from '@/types/api'
import { useIdentityStatus } from '@/hooks/useIdentity'
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts'

// ─────────────────────────────────────────────────────────────────────────────
// Pure presentational component — receives IdentityStatus as prop
// ─────────────────────────────────────────────────────────────────────────────

interface IdentityBannerProps {
  status: IdentityStatus
  className?: string
}

export function IdentityBanner({ status, className }: IdentityBannerProps) {
  // Tidak ada banner jika sudah terverifikasi
  if (status.is_verified) return null

  // Banner kuning: sedang diverifikasi
  if (status.has_pending) {
    return (
      <div
        role="status"
        className={cn(
          'flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800',
          className,
        )}
      >
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-yellow-600" aria-hidden />
        <p>Dokumen identitas Anda sedang diverifikasi oleh admin.</p>
      </div>
    )
  }

  // Banner merah: ditolak
  if (status.has_rejected) {
    return (
      <div
        role="alert"
        className={cn(
          'flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800',
          className,
        )}
      >
        <XCircleIcon className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
        <p>
          Dokumen identitas Anda ditolak. Silakan{' '}
          <Link
            href="/dashboard/identity"
            className="font-medium underline underline-offset-4 hover:opacity-80"
          >
            upload ulang
          </Link>
          .
        </p>
      </div>
    )
  }

  // Banner oranye: belum upload (keduanya false)
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800',
        className,
      )}
    >
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-orange-600" aria-hidden />
      <p>
        Anda belum mengupload dokumen identitas. Silakan{' '}
        <Link
          href="/dashboard/identity"
          className="font-medium underline underline-offset-4 hover:opacity-80"
        >
          upload
        </Link>{' '}
        untuk dapat melakukan booking.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Client wrapper — fetches identity status + emergency contacts, renders banners
// ─────────────────────────────────────────────────────────────────────────────

export function IdentityBannerClient({ className }: { className?: string }) {
  const { data: status, isLoading: loadingIdentity } = useIdentityStatus()
  const { data: contacts, isLoading: loadingContacts } = useEmergencyContacts()

  if (loadingIdentity || loadingContacts || !status) return null

  const hasEmergencyContact = (contacts?.length ?? 0) > 0

  return (
    <div className="space-y-2">
      {/* Banner verifikasi identitas */}
      <IdentityBanner status={status} className={className} />

      {/* Banner kontak darurat — tampil jika belum ada kontak */}
      {!hasEmergencyContact && (
        <div
          role="alert"
          className={cn(
            'flex items-start gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800',
            className,
          )}
        >
          <PhoneOffIcon className="mt-0.5 size-4 shrink-0 text-orange-600" aria-hidden />
          <p>
            Anda belum mengisi kontak darurat. Silakan{' '}
            <Link
              href="/dashboard/identity"
              className="font-medium underline underline-offset-4 hover:opacity-80"
            >
              isi kontak darurat
            </Link>{' '}
            di halaman identitas sebelum dapat melakukan booking.
          </p>
        </div>
      )}
    </div>
  )
}
