'use client'

import { IdentityUploadForm } from '@/components/identity/IdentityUploadForm'
import { IdentityDocumentList } from '@/components/identity/IdentityDocumentList'
import { FileText } from 'lucide-react'

/**
 * DocumentUploadSection
 * Wrapper yang mengintegrasikan IdentityUploadForm dan IdentityDocumentList
 * sebagai sub-section di dalam UnifiedIdentityForm.
 * Requirements: 1.1, 1.7
 */
export function DocumentUploadSection() {
  return (
    <section className="rounded-lg border bg-card p-5 space-y-4" aria-labelledby="doc-upload-heading">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-muted-foreground" aria-hidden />
        <h2 id="doc-upload-heading" className="font-semibold text-base">
          Dokumen Identitas
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Unggah foto KTP, Kartu Pelajar, atau Kartu Keluarga Anda yang jelas dan terbaca.
        Format JPEG, PNG, atau PDF — maksimal 5 MB per file.
      </p>
      <IdentityUploadForm />
      <IdentityDocumentList />
    </section>
  )
}
