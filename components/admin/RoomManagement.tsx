'use client'

/**
 * components/admin/RoomManagement.tsx
 * Daftar kamar dengan CRUD: tambah, edit, hapus untuk admin.
 */

import React, { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, Trash2Icon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { useRooms, useDeleteRoom } from '@/hooks/useRooms'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RoomForm } from '@/components/admin/RoomForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ApiError } from '@/lib/api'
import type { Room, UnitStatus } from '@/types/api'

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n)

type Mode = 'list' | 'add' | 'edit'

// ── Unit Status Badge ─────────────────────────────────────────────────────

const UNIT_STATUS_LABEL: Record<UnitStatus, string> = {
  AVAILABLE: 'Tersedia',
  RESERVED: 'Dipesan',
  OCCUPIED: 'Terisi',
}

const UNIT_STATUS_CLASS: Record<UnitStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
  RESERVED: 'bg-amber-100 text-amber-800 border-amber-200',
  OCCUPIED: 'bg-red-100 text-red-800 border-red-200',
}

const UNIT_DOT_CLASS: Record<UnitStatus, string> = {
  AVAILABLE: 'bg-green-500',
  RESERVED: 'bg-amber-500',
  OCCUPIED: 'bg-red-500',
}

function UnitStatusBadge({ status }: { status: UnitStatus }) {
  return (
    <Badge variant="outline" className={`font-medium ${UNIT_STATUS_CLASS[status] ?? ''}`}>
      <span className={`size-1.5 rounded-full mr-1.5 inline-block ${UNIT_DOT_CLASS[status] ?? 'bg-gray-400'}`} />
      {UNIT_STATUS_LABEL[status] ?? status}
    </Badge>
  )
}

// ── Unit Detail Row ───────────────────────────────────────────────────────

interface UnitRowProps {
  unit: {
    id: string
    room_id: string
    room_number: string
    status: string
    tenant_name?: string | null
    tenant_phone?: string | null
  }
}

function UnitRow({ unit }: UnitRowProps) {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<UnitStatus>(unit.status as UnitStatus)
  const [showConfirm, setShowConfirm] = useState(false)
  const [note, setNote] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const currentStatus = unit.status as UnitStatus
  const hasTenant = currentStatus === 'RESERVED' || currentStatus === 'OCCUPIED'
  const tenantName = unit.tenant_name ?? null
  const tenantPhone = unit.tenant_phone ?? null

  const handleStatusChange = (newStatus: UnitStatus) => {
    if (newStatus === currentStatus) return
    setSelectedStatus(newStatus)
    setNote('')
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/rooms/${unit.room_id}/units/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: selectedStatus, note: note || undefined }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? 'Gagal mengubah status unit.')
      }
      toast.success(`Status unit ${unit.room_number} diubah ke ${UNIT_STATUS_LABEL[selectedStatus]}.`)
      setShowConfirm(false)
      setNote('')
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah status unit.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    setShowConfirm(false)
    setSelectedStatus(currentStatus)
    setNote('')
  }

  return (
    <div className="rounded-md border bg-background text-xs space-y-2 px-3 py-2">
      <div className="flex items-center gap-3">
        {/* Room number */}
        <span className="font-mono font-semibold w-8 shrink-0">{unit.room_number}</span>

        {/* Status dropdown */}
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value as UnitStatus)}
          disabled={isUpdating}
          className="rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
          aria-label={`Ubah status unit ${unit.room_number}`}
        >
          <option value="AVAILABLE">Tersedia</option>
          <option value="OCCUPIED">Terisi</option>
        </select>

        {/* Current status badge */}
        <UnitStatusBadge status={currentStatus} />

        {/* Tenant info */}
        {hasTenant ? (
          <span className="text-muted-foreground">
            {tenantName ?? '-'}{tenantPhone ? ` · ${tenantPhone}` : ''}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>

      {/* Inline confirmation dialog */}
      {showConfirm && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 mt-1">
          <p className="font-medium text-amber-900 text-xs">
            Ubah status unit {unit.room_number} ke {UNIT_STATUS_LABEL[selectedStatus]}?
          </p>
          {selectedStatus === 'AVAILABLE' && (
            <p className="text-xs text-red-700 font-medium">
              ⚠️ Booking aktif / DP yang sudah dibayar akan diterminasi otomatis.
            </p>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">
              Catatan / alasan <span className="font-normal">(opsional)</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Contoh: Booking offline, unit dikosongkan sementara..."
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs outline-none resize-none focus:ring-2 focus:ring-ring/50"
            />
            <p className="text-xs text-muted-foreground text-right">{note.length}/500</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={isUpdating}>
              Batal
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={isUpdating}>
              {isUpdating ? (
                <span className="flex items-center gap-1.5">
                  <LoadingSpinner size="sm" />
                  Memproses...
                </span>
              ) : 'Konfirmasi'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Unit Manager ───────────────────────────────────────────────────────────

interface UnitManagerProps {
  room: Room
}

function UnitManager({ room }: UnitManagerProps) {
  const units = (room as unknown as {
    units?: {
      id: string
      room_number: string
      status: string
      tenant_name?: string | null
      tenant_phone?: string | null
    }[]
  }).units ?? []

  if (units.length === 0) {
    return <p className="text-xs text-muted-foreground px-2">Belum ada unit.</p>
  }

  return (
    <div className="space-y-1.5 px-2 pb-2">
      {units.map((unit) => (
        <UnitRow key={unit.id} unit={{ ...unit, room_id: room.id }} />
      ))}
    </div>
  )
}

export function RoomManagement() {
  const { data: rooms, isLoading, isError, error, refetch } = useRooms()
  const deleteRoom = useDeleteRoom()

  const [mode, setMode] = useState<Mode>('list')
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null)
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null)

  const handleEdit = (room: Room) => {
    setEditRoom(room)
    setMode('edit')
  }

  const handleFormSuccess = () => {
    setMode('list')
    setEditRoom(null)
  }

  const handleFormCancel = () => {
    setMode('list')
    setEditRoom(null)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteRoom.mutateAsync(deleteTarget.id)
      toast.success(`Kamar "${deleteTarget.name}" berhasil dihapus.`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus kamar.')
    } finally {
      setDeleteTarget(null)
    }
  }

  // ── Form mode ────────────────────────────────────────────────────────────

  if (mode === 'add' || mode === 'edit') {
    return (
      <div className="rounded-lg border bg-card p-5 max-w-2xl">
        <h2 className="font-semibold mb-4">
          {mode === 'add' ? 'Tambah Kamar Baru' : `Edit Kamar — ${editRoom?.name}`}
        </h2>
        <RoomForm
          room={editRoom ?? undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    )
  }

  // ── List mode ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorMessage
        message={error instanceof ApiError ? error.message : 'Gagal memuat kamar.'}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {rooms?.length ?? 0} kamar terdaftar
        </p>
        <Button size="sm" onClick={() => setMode('add')}>
          <PlusIcon className="size-4" />
          Tambah Kamar
        </Button>
      </div>

      {!rooms || rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">Belum ada kamar.</p>
          <Button size="sm" className="mt-3" onClick={() => setMode('add')}>
            Tambah Kamar Pertama
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Harga / Periode</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fasilitas</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <React.Fragment key={room.id}>
                    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{room.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatRupiah(room.price)}
                        {room.period_months ? ` / ${room.period_months} bln` : ' / bulan'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap gap-1">
                            {room.facilities.slice(0, 3).map((f) => (
                              <span key={f} className="rounded-full border bg-muted px-2 py-0.5 text-xs">{f}</span>
                            ))}
                            {room.facilities.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{room.facilities.length - 3}</span>
                            )}
                          </div>
                          {room.available_units !== undefined && (
                            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full shrink-0 ${
                              room.available_units === 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {room.available_units}/{room.total_units} tersedia
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedRoomId(expandedRoomId === room.id ? null : room.id)}
                          >
                            {expandedRoomId === room.id
                              ? <ChevronUpIcon className="size-3.5" />
                              : <ChevronDownIcon className="size-3.5" />}
                            Unit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(room)}>
                            <PencilIcon className="size-3.5" />
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(room)}>
                            <Trash2Icon className="size-3.5" />
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedRoomId === room.id && (
                      <tr className="border-b bg-muted/20">
                        <td colSpan={4} className="py-3">
                          <p className="text-xs font-medium text-muted-foreground px-4 mb-2">
                            Status tiap unit — nomor, status, dan penyewa aktif (nama · telepon):
                          </p>
                          <UnitManager room={room} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {rooms.map((room) => (
              <div key={room.id} className="rounded-lg border bg-card overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{room.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {formatRupiah(room.price)}
                        {room.period_months ? ` / ${room.period_months} bln` : ' / bulan'}
                      </p>
                    </div>
                    {room.available_units !== undefined && (
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        room.available_units === 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {room.available_units}/{room.total_units}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {room.facilities.slice(0, 4).map((f) => (
                      <span key={f} className="rounded-full border bg-muted px-2 py-0.5 text-xs">{f}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setExpandedRoomId(expandedRoomId === room.id ? null : room.id)}
                    >
                      {expandedRoomId === room.id
                        ? <ChevronUpIcon className="size-3.5" />
                        : <ChevronDownIcon className="size-3.5" />}
                      Unit
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(room)}>
                      <PencilIcon className="size-3.5" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => setDeleteTarget(room)}>
                      <Trash2Icon className="size-3.5" />
                      Hapus
                    </Button>
                  </div>
                </div>
                {expandedRoomId === room.id && (
                  <div className="border-t bg-muted/20 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Status tiap unit (nama · telepon):
                    </p>
                    <UnitManager room={room} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Kamar?"
        description={`Kamar "${deleteTarget?.name}" akan dihapus permanen beserta semua unitnya. Aksi ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        destructive
        isLoading={deleteRoom.isPending}
      />
    </>
  )
}
