'use client'

/**
 * components/admin/IdentityTable.tsx
 * Tabel dokumen identitas untuk admin: lihat nama penyewa, dokumen, verifikasi / tolak.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Trash2 } from 'lucide-react'
import { useAllIdentityDocuments, useVerifyIdentityDocument, type AdminIdentityDoc } from '@/hooks/useIdentity'
import { useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { UserDetailModal } from '@/components/admin/UserDetailModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ApiError, apiRequest } from '@/lib/api'

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

const DOC_TYPE_LABELS: Record<string, string> = {
  KTP: 'KTP',
  KARTU_PELAJAR: 'Kartu Pelajar',
  KK: 'Kartu Keluarga',
}

interface ActionState {
  documentId: string
  action: 'VERIFIED' | 'REJECTED' | 'DELETE'
}

// ── Row ────────────────────────────────────────────────────────────────────

interface RowProps {
  doc: AdminIdentityDoc
  onAction: (state: ActionState) => void
  onUserClick: (userId: string) => void
}

function IdentityRow({ doc, onAction, onUserClick }: RowProps) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      {/* Penyewa */}
      <td className="px-4 py-3 text-sm">
        <div>
          <button type="button" onClick={() => onUserClick(doc.user_id)} className="font-medium text-primary hover:underline text-left">
            {doc.user?.name ?? '-'}
          </button>
          {doc.user?.email && <p className="text-xs text-muted-foreground">{doc.user.email}</p>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-medium">{DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge variant="identity" status={doc.verification_status} />
          {doc.verification_status === 'PENDING' && (
            <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50">Verifikasi Ulang</Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(doc.created_at)}</td>
      <td className="px-4 py-3">
        {doc.document_url ? (
          <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
            <ExternalLink className="size-3" />Lihat
          </a>
        ) : <span className="text-xs text-muted-foreground">-</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 flex-wrap">
          {doc.verification_status === 'PENDING' && (
            <>
              <Button size="sm" onClick={() => onAction({ documentId: doc.id, action: 'VERIFIED' })}>Verifikasi</Button>
              <Button size="sm" variant="destructive" onClick={() => onAction({ documentId: doc.id, action: 'REJECTED' })}>Tolak</Button>
            </>
          )}
          <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive"
            onClick={() => onAction({ documentId: doc.id, action: 'DELETE' })}>
            <Trash2 className="size-3" />Hapus
          </Button>
        </div>
      </td>
    </tr>
  )
}

function IdentityCard({ doc, onAction, onUserClick }: RowProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header: nama penyewa + status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <button
            type="button"
            onClick={() => onUserClick(doc.user_id)}
            className="font-medium text-sm text-primary hover:underline text-left"
          >
            {doc.user?.name ?? '-'}
          </button>
          {doc.user?.email && (
            <p className="text-xs text-muted-foreground">{doc.user.email}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StatusBadge variant="identity" status={doc.verification_status} />
          {doc.verification_status === 'PENDING' && (
            <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50">
              Verifikasi Ulang
            </Badge>
          )}
        </div>
      </div>

      {/* Jenis dokumen + tanggal */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}</span>
        <span className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</span>
      </div>

      {/* Link dokumen */}
      {doc.document_url && (
        <a
          href={doc.document_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <ExternalLink className="size-3" aria-hidden />
          Lihat Dokumen
        </a>
      )}

      {doc.verification_status === 'PENDING' && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1" onClick={() => onAction({ documentId: doc.id, action: 'VERIFIED' })}>Verifikasi</Button>
          <Button size="sm" variant="destructive" className="flex-1" onClick={() => onAction({ documentId: doc.id, action: 'REJECTED' })}>Tolak</Button>
        </div>
      )}
      <Button size="sm" variant="outline" className="w-full gap-1 text-destructive hover:text-destructive mt-1"
        onClick={() => onAction({ documentId: doc.id, action: 'DELETE' })}>
        <Trash2 className="size-3" />Hapus Dokumen
      </Button>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function IdentityTable() {
  const { data: docs, isLoading, isError, error, refetch } = useAllIdentityDocuments()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<ActionState | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const verify = useVerifyIdentityDocument(pending?.documentId ?? '')

  const handleConfirm = async () => {
    if (!pending) return

    if (pending.action === 'DELETE') {
      setDeleteLoading(true)
      try {
        await apiRequest(`/api/identity-documents/${pending.documentId}`, { method: 'DELETE' })
        toast.success('Dokumen berhasil dihapus.')
        queryClient.invalidateQueries({ queryKey: ['identity-documents', 'all'] })
        refetch()
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus dokumen.')
      } finally {
        setDeleteLoading(false)
        setPending(null)
      }
      return
    }

    try {
      await verify.mutateAsync({ verification_status: pending.action })
      toast.success(pending.action === 'VERIFIED' ? 'Dokumen berhasil diverifikasi.' : 'Dokumen ditolak.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memproses dokumen.')
    } finally {
      setPending(null)
    }
  }

  const isActing = verify.isPending || deleteLoading

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  if (isError) {
    return (
      <ErrorMessage
        message={error instanceof ApiError ? error.message : 'Gagal memuat data dokumen.'}
        onRetry={() => refetch()}
      />
    )
  }

  if (!docs || docs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">Belum ada dokumen identitas.</p>
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Penyewa</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jenis Dokumen</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal Upload</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dokumen</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <IdentityRow key={doc.id} doc={doc} onAction={setPending} onUserClick={setSelectedUserId} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {docs.map((doc) => (
          <IdentityCard key={doc.id} doc={doc} onAction={setPending} onUserClick={setSelectedUserId} />
        ))}
      </div>

      <ConfirmDialog
        open={!!pending}
        onCancel={() => setPending(null)}
        onConfirm={handleConfirm}
        title={
          pending?.action === 'VERIFIED' ? 'Verifikasi Dokumen?' :
          pending?.action === 'DELETE' ? 'Hapus Dokumen?' :
          'Tolak Dokumen?'
        }
        description={
          pending?.action === 'VERIFIED' ? 'Dokumen ini akan ditandai sebagai terverifikasi.' :
          pending?.action === 'DELETE' ? '⚠️ Dokumen akan dihapus permanen dari Cloudinary dan database. Status verifikasi user di-reset ke PENDING. Tindakan ini tidak dapat dibatalkan.' :
          'Dokumen ini akan ditolak dan pengguna perlu mengupload ulang.'
        }
        confirmLabel={pending?.action === 'VERIFIED' ? 'Verifikasi' : pending?.action === 'DELETE' ? 'Hapus' : 'Tolak'}
        destructive={pending?.action === 'REJECTED' || pending?.action === 'DELETE'}
        isLoading={isActing}
      />

      {/* Modal detail user */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  )
}
