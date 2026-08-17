'use client'

import { useState } from 'react'
import { ExternalLink, X, Trash2, ShieldOff, ShieldCheck } from 'lucide-react'
import { useUserDetail } from '@/hooks/useUsers'
import { useQueryClient } from '@tanstack/react-query'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { apiRequest, ApiError } from '@/lib/api'

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
  const { data: user, isLoading, isError, refetch } = useUserDetail(userId)
  const queryClient = useQueryClient()

  const [blockReason, setBlockReason] = useState('')
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null)
  const [deleteDocLoading, setDeleteDocLoading] = useState(false)

  const isBlocked = (user as { is_blocked?: boolean } | undefined)?.is_blocked ?? false

  const handleBlock = async () => {
    if (!blockReason.trim()) { toast.error('Alasan wajib diisi'); return }
    setBlockLoading(true)
    try {
      await apiRequest(`/api/admin/users/${userId}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: blockReason }),
      })
      toast.success('User berhasil diblokir')
      setShowBlockConfirm(false)
      setBlockReason('')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memblokir user')
    } finally {
      setBlockLoading(false)
    }
  }

  const handleUnblock = async () => {
    setBlockLoading(true)
    try {
      await apiRequest(`/api/admin/users/${userId}/block`, { method: 'DELETE' })
      toast.success('User berhasil dibuka blokirnya')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal membuka blokir')
    } finally {
      setBlockLoading(false)
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    setDeleteDocLoading(true)
    try {
      await apiRequest(`/api/identity-documents/${docId}`, { method: 'DELETE' })
      toast.success('Dokumen berhasil dihapus')
      setDeleteDocId(null)
      refetch()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus dokumen')
    } finally {
      setDeleteDocLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-background shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4">
          <h2 className="text-base font-semibold">Detail Pengguna</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors" aria-label="Tutup">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {isLoading && <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>}
          {isError && <p className="text-sm text-destructive text-center py-8">Gagal memuat data pengguna.</p>}

          {user && (
            <>
              {/* Status blokir */}
              {isBlocked && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <p className="font-semibold">⛔ User ini diblokir</p>
                  {(user as { blocked_reason?: string }).blocked_reason && (
                    <p className="text-xs mt-0.5">Alasan: {(user as { blocked_reason?: string }).blocked_reason}</p>
                  )}
                </div>
              )}

              {/* Info dasar */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informasi Dasar</h3>
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <Row label="Nama" value={user.name} />
                  <Row label="Email" value={user.email} />
                  <Row label="Telepon" value={user.phone || '-'} />
                  <Row label="Alamat" value={(user as { address?: string }).address || '-'} />
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
                      <div key={doc.id} className="rounded-lg border p-3 text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}</span>
                          <StatusBadge variant="identity" status={doc.verification_status} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Upload: {formatDate(doc.created_at)}</span>
                          {doc.verified_at && <span>Verifikasi: {formatDate(doc.verified_at)}</span>}
                        </div>
                        {doc.document_url && (
                          <a href={doc.document_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <ExternalLink className="size-3" />Lihat Dokumen
                          </a>
                        )}
                        {/* Tombol hapus dokumen */}
                        {deleteDocId === doc.id ? (
                          <div className="space-y-2 pt-1 border-t">
                            <p className="text-xs text-destructive font-medium">⚠️ Hapus dokumen ini? Dokumen akan dihapus dari Cloudinary dan status verifikasi user di-reset ke PENDING.</p>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setDeleteDocId(null)} disabled={deleteDocLoading}>Batal</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteDoc(doc.id)} disabled={deleteDocLoading}>
                                {deleteDocLoading ? 'Menghapus...' : 'Hapus'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteDocId(doc.id)}>
                            <Trash2 className="size-3" />Hapus Dokumen
                          </Button>
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
                          <span className="text-xs text-muted-foreground">{RELATIONSHIP_LABELS[c.relationship] ?? c.relationship}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.phone_number}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Blokir / Buka blokir */}
              <section className="space-y-2 border-t pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aksi Admin</h3>
                {isBlocked ? (
                  <Button size="sm" variant="outline" className="gap-2" onClick={handleUnblock} disabled={blockLoading}>
                    <ShieldCheck className="size-4" />
                    {blockLoading ? 'Memproses...' : 'Buka Blokir User'}
                  </Button>
                ) : showBlockConfirm ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <p className="font-semibold">⚠️ Blokir user ini?</p>
                      <p className="text-xs mt-0.5">Semua booking pending akan dibatalkan otomatis. User tidak bisa mengakses website.</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium">Alasan pemblokiran <span className="text-destructive">*</span></label>
                      <textarea rows={2} value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                        maxLength={500} placeholder="Contoh: Melanggar aturan kos..."
                        className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm outline-none resize-none" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setShowBlockConfirm(false); setBlockReason('') }} disabled={blockLoading}>Batal</Button>
                      <Button size="sm" variant="destructive" onClick={handleBlock} disabled={blockLoading || !blockReason.trim()}>
                        {blockLoading ? 'Memproses...' : 'Blokir User'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="destructive" className="gap-2" onClick={() => setShowBlockConfirm(true)}>
                    <ShieldOff className="size-4" />
                    Blokir User
                  </Button>
                )}
              </section>
            </>
          )}
        </div>

        <div className="sticky bottom-0 border-t bg-background px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full">Tutup</Button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
