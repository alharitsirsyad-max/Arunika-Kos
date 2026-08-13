'use client'

import { PersonalDataSection } from '@/components/identity/PersonalDataSection'
import { CombinedVerificationForm } from '@/components/identity/CombinedVerificationForm'
import { IdentityDocumentList } from '@/components/identity/IdentityDocumentList'
import { EmergencyContactsForm } from '@/components/user/EmergencyContactsForm'

/**
 * UnifiedIdentityForm
 * Menampilkan halaman identitas dengan:
 *  1. Data Diri (edit profil)
 *  2. Form Verifikasi Gabungan (upload dokumen + tambah kontak darurat, satu tombol)
 *  3. Daftar dokumen yang sudah diupload
 *  4. Daftar kontak darurat yang sudah ada (edit/hapus)
 */
export function UnifiedIdentityForm() {
  return (
    <div className="space-y-8">
      {/* Section 1: Data Diri */}
      <PersonalDataSection />

      {/* Section 2: Form Verifikasi Gabungan */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Verifikasi Identitas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload dokumen identitas dan tambahkan kontak darurat sekaligus.
          </p>
        </div>
        <CombinedVerificationForm />
      </section>

      {/* Section 3: Daftar dokumen yang sudah diupload */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Dokumen Tersimpan</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dokumen identitas yang sudah pernah diupload.
          </p>
        </div>
        <IdentityDocumentList />
      </section>

      {/* Section 4: Daftar kontak darurat (edit/hapus) */}
      <EmergencyContactsForm />
    </div>
  )
}
