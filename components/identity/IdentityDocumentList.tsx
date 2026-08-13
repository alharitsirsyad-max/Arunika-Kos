'use client'

/**
 * components/identity/IdentityDocumentList.tsx
 * Tabel riwayat dokumen identitas user.
 * Req 7.1, 7.7
 */

import { FileTextIcon } from 'lucide-react'
import { useMyIdentityDocuments } from '@/hooks/useIdentity'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { ApiError } from '@/lib/api'
import type { DocumentType } from '@/types/api'

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  KTP: 'KTP',
  KARTU_PELAJAR: 'Kartu Pelajar',
  KK: 'Kartu Keluarga',
}

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString))

export function IdentityDocumentList() {
  const { data: documents, isLoading, isError, error, refetch } = useMyIdentityDocuments()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (isError) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Gagal memuat riwayat dokumen.'
    return <ErrorMessage message={message} onRetry={() => refetch()} />
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
        <FileTextIcon className="size-9 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-medium">Belum ada dokumen diupload</p>
          <p className="text-xs text-muted-foreground mt-1">
            Gunakan form di atas untuk mengupload dokumen identitas Anda.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Tabel — desktop */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Jenis Dokumen
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status Verifikasi
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Tanggal Upload
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc.id}
                className="border-t hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 font-medium">
                  {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge variant="identity" status={doc.verification_status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(doc.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Kartu — mobile */}
      <div className="md:hidden space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="rounded-lg border bg-card p-4 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">
                {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
              </span>
              <StatusBadge variant="identity" status={doc.verification_status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Diupload: {formatDate(doc.created_at)}
            </p>
          </div>
        ))}
      </div>
    </>
  )
}
