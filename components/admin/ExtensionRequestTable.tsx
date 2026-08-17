'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest, ApiError } from '@/lib/api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'

interface ExtensionRequest {
  id: string
  booking_id: string
  extra_months: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  admin_note: string | null
  created_at: string
  booking: {
    id: string
    duration_periods: number
    status: string
    user: { id: string; name: string; email: string }
    room_unit: {
      room_number: string
      room: { name: string; period_months: number }
    }
  }
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

function StatusBadge({ status }: { status: string }) {
  const cls = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }[status] ?? 'bg-gray-100 text-gray-800'

  const label = { PENDING: 'Menunggu', APPROVED: 'Disetujui', REJECTED: 'Ditolak' }[status] ?? status

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

export function ExtensionRequestTable() {
  const queryClient = useQueryClient()
  const [actionId, setActionId] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [pendingAction, setPendingAction] = useState<'APPROVED' | 'REJECTED' | null>(null)

  const { data: requests, isLoading, isError, refetch } = useQuery<ExtensionRequest[]>({
    queryKey: ['extension-requests'],
    queryFn: () => apiRequest('/api/admin/extensions'),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: 'APPROVED' | 'REJECTED'; note?: string }) =>
      apiRequest(`/api/admin/extensions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_note: note }),
      }),
    onSuccess: (_, vars) => {
      toast.success(vars.action === 'APPROVED' ? 'Perpanjangan disetujui.' : 'Perpanjangan ditolak.')
      queryClient.invalidateQueries({ queryKey: ['extension-requests'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setActionId(null)
      setAdminNote('')
      setPendingAction(null)
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memproses aksi.')
    },
  })

  const handleConfirm = () => {
    if (!actionId || !pendingAction) return
    reviewMutation.mutate({ id: actionId, action: pendingAction, note: adminNote || undefined })
  }

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
  if (isError) return <p className="text-sm text-destructive text-center py-8">Gagal memuat data. <button onClick={() => refetch()} className="underline">Coba lagi</button></p>
  if (!requests || requests.length === 0) return <p className="text-sm text-muted-foreground text-center py-12">Belum ada permintaan perpanjangan.</p>

  const pending = requests.filter((r) => r.status === 'PENDING')
  const processed = requests.filter((r) => r.status !== 'PENDING')

  return (
    <div className="space-y-6">
      {/* Action panel */}
      {actionId && pendingAction && (
        <div className={`rounded-lg border p-4 space-y-3 ${pendingAction === 'APPROVED' ? 'border-green-200 bg-green-50/50' : 'border-destructive/30 bg-destructive/5'}`}>
          <p className="text-sm font-medium">
            {pendingAction === 'APPROVED' ? '✅ Setujui perpanjangan ini?' : '❌ Tolak perpanjangan ini?'}
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Catatan untuk penyewa (opsional)</label>
            <textarea
              rows={2}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              maxLength={500}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => { setActionId(null); setPendingAction(null); setAdminNote('') }} disabled={reviewMutation.isPending}>Batal</Button>
            <Button size="sm" variant={pendingAction === 'APPROVED' ? 'default' : 'destructive'} onClick={handleConfirm} disabled={reviewMutation.isPending}>
              {reviewMutation.isPending ? <span className="flex items-center gap-1.5"><LoadingSpinner size="sm" />Memproses...</span>
                : pendingAction === 'APPROVED' ? 'Setujui' : 'Tolak'}
            </Button>
          </div>
        </div>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-amber-700">Menunggu Persetujuan ({pending.length})</h3>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Penyewa</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kamar</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tambah Durasi</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal Ajuan</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.booking.user.name}</p>
                      <p className="text-xs text-muted-foreground">{r.booking.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.booking.room_unit.room.name} — Unit {r.booking.room_unit.room_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-primary">
                      +{r.extra_months} bulan
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => { setActionId(r.id); setPendingAction('APPROVED'); setAdminNote('') }}>Setujui</Button>
                        <Button size="sm" variant="destructive" onClick={() => { setActionId(r.id); setPendingAction('REJECTED'); setAdminNote('') }}>Tolak</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Processed requests */}
      {processed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Riwayat</h3>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Penyewa</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kamar</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tambah Durasi</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {processed.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{r.booking.user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.booking.room_unit.room.name} — Unit {r.booking.room_unit.room_number}
                    </td>
                    <td className="px-4 py-3">+{r.extra_months} bulan</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
