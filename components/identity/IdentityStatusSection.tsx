'use client'

/**
 * components/identity/IdentityStatusSection.tsx
 * Menampilkan status verifikasi identitas dan kontak darurat user.
 * Req 7.2, 6.1
 */

import { ShieldCheckIcon, ShieldAlertIcon, ClockIcon, ShieldOffIcon, PhoneIcon, PhoneOffIcon } from 'lucide-react'
import { useIdentityStatus } from '@/hooks/useIdentity'
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { cn } from '@/lib/utils'

interface StatusConfig {
  label: string
  description: string
  colorClass: string
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

function getStatusConfig(
  is_verified: boolean,
  has_pending: boolean,
  has_rejected: boolean,
): StatusConfig {
  if (is_verified) {
    return {
      label: 'VERIFIED',
      description: 'Identitas Anda telah diverifikasi. Anda dapat melakukan booking.',
      colorClass: 'border-green-300 bg-green-50 text-green-800',
      Icon: ShieldCheckIcon,
    }
  }
  if (has_pending) {
    return {
      label: 'PENDING',
      description: 'Dokumen Anda sedang menunggu verifikasi oleh admin.',
      colorClass: 'border-yellow-300 bg-yellow-50 text-yellow-800',
      Icon: ClockIcon,
    }
  }
  if (has_rejected) {
    return {
      label: 'REJECTED',
      description: 'Dokumen identitas Anda ditolak. Silakan upload dokumen baru di bawah.',
      colorClass: 'border-red-300 bg-red-50 text-red-800',
      Icon: ShieldAlertIcon,
    }
  }
  // Belum pernah upload
  return {
    label: 'BELUM UPLOAD',
    description: 'Anda belum mengupload dokumen identitas. Silakan upload di bawah.',
    colorClass: 'border-orange-300 bg-orange-50 text-orange-800',
    Icon: ShieldOffIcon,
  }
}

export function IdentityStatusSection() {
  const { data: status, isLoading: loadingIdentity } = useIdentityStatus()
  const { data: contacts, isLoading: loadingContacts } = useEmergencyContacts()

  const isLoading = loadingIdentity || loadingContacts

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-muted-foreground">Memuat status verifikasi...</span>
      </div>
    )
  }

  if (!status) return null

  const { label, description, colorClass, Icon } = getStatusConfig(
    status.is_verified,
    status.has_pending,
    status.has_rejected,
  )

  const hasEmergencyContact = (contacts?.length ?? 0) > 0

  return (
    <div className="space-y-3">
      {/* Status Verifikasi Identitas */}
      <div
        role="status"
        aria-label={`Status verifikasi: ${label}`}
        className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
          colorClass,
        )}
      >
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="space-y-0.5">
          <p className="font-semibold">
            Verifikasi Identitas:{' '}
            <span className="font-bold">{label}</span>
          </p>
          <p>{description}</p>
        </div>
      </div>

      {/* Status Kontak Darurat */}
      <div
        role="status"
        aria-label={`Status kontak darurat: ${hasEmergencyContact ? 'Ada' : 'Belum diisi'}`}
        className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
          hasEmergencyContact
            ? 'border-green-300 bg-green-50 text-green-800'
            : 'border-orange-300 bg-orange-50 text-orange-800',
        )}
      >
        {hasEmergencyContact ? (
          <PhoneIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
        ) : (
          <PhoneOffIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
        )}
        <div className="space-y-0.5">
          <p className="font-semibold">
            Kontak Darurat:{' '}
            <span className="font-bold">
              {hasEmergencyContact
                ? `${contacts!.length} kontak tersimpan`
                : 'BELUM DIISI'}
            </span>
          </p>
          <p>
            {hasEmergencyContact
              ? 'Kontak darurat sudah diisi. Anda memenuhi syarat booking.'
              : 'Anda belum mengisi kontak darurat. Wajib diisi sebelum dapat melakukan booking. Isi di bawah.'}
          </p>
        </div>
      </div>
    </div>
  )
}
