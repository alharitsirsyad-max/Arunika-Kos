'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useCreateBooking } from '@/hooks/useBookings'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Room } from '@/types/api'

interface BookingModalProps {
  room: Room
  open: boolean
  onClose: () => void
}

export function BookingModal({ room, open, onClose }: BookingModalProps) {
  // Form state — dikontrol manual (tidak pakai RHF agar lebih transparan)
  const [startDate, setStartDate] = useState('')
  const [durationPeriods, setDurationPeriods] = useState(1)

  // Error state
  const [startDateError, setStartDateError] = useState('')
  const [durationError, setDurationError] = useState('')
  const [identityError, setIdentityError] = useState(false)
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const createBooking = useCreateBooking()
  const isPending = createBooking.isPending

  const handleClose = () => {
    setStartDate('')
    setDurationPeriods(1)
    setStartDateError('')
    setDurationError('')
    setIdentityError(false)
    setServerError('')
    setSuccessMessage('')
    onClose()
  }

  const validate = (): boolean => {
    let valid = true

    if (!startDate) {
      setStartDateError('Tanggal mulai harus diisi')
      valid = false
    } else {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (new Date(startDate) < today) {
        setStartDateError('Tanggal mulai tidak boleh di masa lalu')
        valid = false
      } else {
        setStartDateError('')
      }
    }

    if (!durationPeriods || durationPeriods < 1) {
      setDurationError('Durasi minimal 1 periode')
      valid = false
    } else if (durationPeriods > 24) {
      setDurationError('Durasi maksimal 24 periode')
      valid = false
    } else {
      setDurationError('')
    }

    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIdentityError(false)
    setServerError('')
    setSuccessMessage('')

    if (!validate()) return

    // Guard: pastikan room.id valid sebelum kirim
    if (!room.id || room.id.trim() === '') {
      setServerError('Data kamar tidak valid. Coba refresh halaman.')
      return
    }

    try {
      await createBooking.mutateAsync({
        room_id: room.id,
        start_date: startDate,
        duration_periods: durationPeriods,
      })
      setSuccessMessage(`Booking kamar ${room.name} berhasil diajukan! Menunggu persetujuan admin.`)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'IDENTITY_NOT_VERIFIED') {
          setIdentityError(true)
        } else if (error.code === 'ALREADY_HAS_ACTIVE_BOOKING') {
          setServerError('Anda sudah memiliki booking aktif. Selesaikan booking tersebut sebelum membooking kamar lain.')
        } else {
          setServerError(error.message)
        }
      } else {
        setServerError('Terjadi kesalahan, silakan coba lagi.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen, _details) => { if (!isOpen) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Booking Kamar — {room.name}</DialogTitle>
        </DialogHeader>

        {/* Success */}
        {successMessage ? (
          <div className="flex flex-col gap-4">
            <div
              role="status"
              className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-3 text-sm text-green-700"
            >
              {successMessage}
            </div>
            <Button onClick={handleClose} className="w-full">Tutup</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Identity error */}
            {identityError && (
              <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-3 text-sm text-destructive">
                Identitas kamu belum terverifikasi. Silakan{' '}
                <Link href="/dashboard/identity" className="font-medium underline underline-offset-4 hover:opacity-80" onClick={handleClose}>
                  verifikasi identitas
                </Link>{' '}
                terlebih dahulu.
              </div>
            )}

            {/* Server error */}
            {serverError && (
              <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </div>
            )}

            {/* Tanggal Mulai */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="start_date" className="text-sm font-medium">
                Tanggal Mulai <span className="text-destructive">*</span>
              </label>
              <input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setStartDateError('') }}
                aria-invalid={!!startDateError}
                className={cn(
                  'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors',
                  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
                  startDateError
                    ? 'border-destructive focus-visible:ring-destructive/20'
                    : 'border-input'
                )}
              />
              {startDateError && <p role="alert" className="text-xs text-destructive">{startDateError}</p>}
            </div>

            {/* Durasi */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="duration_periods" className="text-sm font-medium">
                Durasi (periode) <span className="text-destructive">*</span>
              </label>
              <input
                id="duration_periods"
                type="number"
                min={1}
                max={24}
                value={durationPeriods}
                onChange={(e) => { setDurationPeriods(Number(e.target.value)); setDurationError('') }}
                aria-invalid={!!durationError}
                className={cn(
                  'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors',
                  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
                  durationError
                    ? 'border-destructive focus-visible:ring-destructive/20'
                    : 'border-input'
                )}
              />
              {room.period_months && (
                <p className="text-xs text-muted-foreground">
                  1 periode = {room.period_months} bulan
                </p>
              )}
              {durationError && <p role="alert" className="text-xs text-destructive">{durationError}</p>}
            </div>

            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Memproses...
                  </span>
                ) : (
                  'Ajukan Booking'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
