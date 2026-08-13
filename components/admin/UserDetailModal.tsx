'use client'

import { ExternalLink, X } from 'lucide-react'
import { useUserDetail } from '@/hooks/useUsers'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'

const DOC_TYPE_LABELS: Record<string, string> = {
  KTP: 'KTP',
  KARTU_PELAJAR: 'Kartu Pelajar',
  KK: 'Kartu Keluarga',
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  ORANG_TUA: 'Orang Tua',
  SAUDARA: 'Saudara',
  TEMAN: 'Teman',
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

interface Props {
  userId: string
  onClose: () => void
}

export function UserDetailModal({ userId, onClose }: Props) {
  const { data: user, isLoading, isError } = useUserDetail(userId)

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-background shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4">
          <h2 className="text-base font-semibold">Detail Pengguna</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Tutup"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {isLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {isError && (
            <p className="text-sm text-destructive text-center py-8">
              Gagal memuat data pengguna.
            </p>
          )}

          {user && (
            <>
              {/* Info dasar */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Informasi Dasar
                </h3>
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <Row label="Nama" value={user.name} />
                  <Row label="Email" value={user.email} />
                  <Row label="Telepon" value={user.phone || '-'} />
                  <Row label="Role" value={user.role} />
                  <Row label="Bergabung" value={formatDate(user.created_at)} />
                </div>
              </section>

              {/* Dokumen identitas */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dokumen Identitas ({user.ownedDocuments.length})
                </h3>
                {user.ownedDocuments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada dokumen.</p>
                ) : (
                  <div className="space-y-2">
                    {user.ownedDocuments.map((doc) => (
                      <div key={doc.id} className="rounded-lg border p-3 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                          </span>
                          <StatusBadge variant="identity" status={doc.verification_status} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Upload: {formatDate(doc.created_at)}</span>
                          {doc.verified_at && (
                            <span>Verifikasi: {formatDate(doc.verified_at)}</span>
                          )}
                        </div>
                        {doc.document_url && (
                          <a
                            href={doc.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <ExternalLink className="size-3" />
                            Lihat Dokumen
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Kontak darurat */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Kontak Darurat ({user.emergency_contacts.length})
                </h3>
                {user.emergency_contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada kontak darurat.</p>
                ) : (
                  <div className="space-y-2">
                    {user.emergency_contacts.map((c) => (
                      <div key={c.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {RELATIONSHIP_LABELS[c.relationship] ?? c.relationship}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.phone_number}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <div className="sticky bottom-0 border-t bg-background px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full">
            Tutup
          </Button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
