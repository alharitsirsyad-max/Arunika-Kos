'use client'

/**
 * components/dashboard/ExtendModal.tsx
 * Modal untuk perpanjangan durasi booking.
 * Menggunakan React Hook Form + extendBookingSchema.
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { extendBookingSchema, type ExtendBookingInput } from '@/lib/validations/booking'
import { useExtendBooking } from '@/hooks/useBookings'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ExtendModalProps {
  bookingId: string
  open: boolean
  onClose: () => void
}

export function ExtendModal({ bookingId, open, onClose }: ExtendModalProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const extendBooking = useExtendBooking(bookingId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExtendBookingInput>({
    resolver: zodResolver(extendBookingSchema),
    defaultValues: {
      extra_duration_months: 1,
    },
  })

  const handleClose = () => {
    reset({ extra_duration_months: 1 })
    setSuccessMessage(null)
    setServerError(null)
    onClose()
  }

  const onSubmit = async (data: ExtendBookingInput) => {
    setServerError(null)
    setSuccessMessage(null)

    try {
      await extendBooking.mutateAsync(data)
      setSuccessMessage('Permintaan perpanjangan berhasil diajukan!')
      reset({ extra_duration_months: 1 })
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message)
      } else {
        setServerError('Terjadi kesalahan, silakan coba lagi.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perpanjang Booking</DialogTitle>
        </DialogHeader>

        {/* Success state */}
        {successMessage ? (
          <div className="flex flex-col gap-4">
            <div
              role="status"
              className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-3 text-sm text-green-700"
            >
              {successMessage}
            </div>
            <Button onClick={handleClose} className="w-full">
              Tutup
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            {/* Generic server error */}
            {serverError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {serverError}
              </div>
            )}

            {/* Extra duration months */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="extra_duration_months" className="text-sm font-medium">
                Tambah Durasi (bulan)
              </label>
              <input
                id="extra_duration_months"
                type="number"
                min={1}
                max={12}
                aria-invalid={!!errors.extra_duration_months}
                className={cn(
                  'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors',
                  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  errors.extra_duration_months
                    ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                    : 'border-input',
                )}
                {...register('extra_duration_months', { valueAsNumber: true })}
              />
              {errors.extra_duration_months && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.extra_duration_months.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Masukkan angka 1 hingga 12 bulan.</p>
            </div>

            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Memproses...
                  </span>
                ) : (
                  'Ajukan Perpanjangan'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
