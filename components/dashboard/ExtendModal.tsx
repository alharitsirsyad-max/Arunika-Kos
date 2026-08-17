'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ExtendModalProps {
  bookingId: string
  open: boolean
  onClose: () => void
}

export function ExtendModal({ bookingId, open, onClose }: ExtendModalProps) {
  const [extraMonths, setExtraMonths] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    setExtraMonths(1)
    setError(null)
    setSuccess(false)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/bookings/${bookingId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extra_months: extraMonths }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Gagal mengajukan perpanjangan')
        return
      }
      setSuccess(true)
    } catch {
      setError('Terjadi kesalahan, silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perpanjang Sewa</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col gap-4">
            <div role="status" className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-3 text-sm text-green-700">
              Permintaan perpanjangan berhasil diajukan! Admin akan meninjau dan menyetujuinya.
            </div>
            <Button onClick={handleClose} className="w-full">Tutup</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="extra_months" className="text-sm font-medium">
                Tambah Durasi (bulan)
              </label>
              <input
                id="extra_months"
                type="number"
                min={1}
                max={24}
                value={extraMonths}
                onChange={(e) => setExtraMonths(Number(e.target.value))}
                className={cn(
                  'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors',
                  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 border-input',
                )}
              />
              <p className="text-xs text-muted-foreground">Masukkan angka 1 hingga 24 bulan.</p>
            </div>

            <div className="rounded-md border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-700">
              Perpanjangan perlu disetujui admin terlebih dahulu. Durasi akan bertambah otomatis setelah disetujui.
            </div>

            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Batal</Button>
              <Button type="submit" disabled={loading || extraMonths < 1 || extraMonths > 24}>
                {loading ? (
                  <span className="flex items-center gap-2"><LoadingSpinner size="sm" />Memproses...</span>
                ) : 'Ajukan Perpanjangan'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
