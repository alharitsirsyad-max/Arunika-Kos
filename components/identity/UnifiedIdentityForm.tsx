'use client'

import { PersonalDataSection } from '@/components/identity/PersonalDataSection'
import { CombinedVerificationForm } from '@/components/identity/CombinedVerificationForm'
import { IdentityDocumentList } from '@/components/identity/IdentityDocumentList'
import { EmergencyContactsForm } from '@/components/user/EmergencyContactsForm'
import { useIdentityStatus } from '@/hooks/useIdentity'
import { CheckCircle } from 'lucide-react'

export function UnifiedIdentityForm() {
  const { data: status } = useIdentityStatus()
  const isVerified = status?.is_verified ?? false

  return (
    <div className="space-y-8">
      <PersonalDataSection />

      {/* Hanya tampilkan form upload jika belum verified */}
      {isVerified ? (
        <section className="rounded-lg border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="size-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Identitas Anda Sudah Terverifikasi</p>
              <p className="text-xs text-green-700 mt-0.5">
                Dokumen identitas Anda telah diverifikasi oleh admin. Jika perlu memperbarui (ganti KTP dll), hubungi admin.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border bg-card p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Verifikasi Identitas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Upload dokumen identitas dan tambahkan kontak darurat sekaligus.
            </p>
          </div>
          <CombinedVerificationForm />
        </section>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Dokumen Tersimpan</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dokumen identitas yang sudah pernah diupload.
          </p>
        </div>
        <IdentityDocumentList />
      </section>

      <EmergencyContactsForm />
    </div>
  )
}
