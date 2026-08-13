'use client'

/**
 * components/reports/ReportForm.tsx
 * Form laporan masalah user dengan validasi React Hook Form + Zod.
 * Req 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { createReportSchemaFrontend, type CreateReportFrontendInput } from '@/lib/validations/report'
import { useCreateReport } from '@/hooks/useReports'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Type labels (Indonesian)
// ---------------------------------------------------------------------------

const REPORT_TYPE_LABELS: Record<string, string> = {
  WEBSITE_ISSUE: 'Masalah Website',
  ROOM_ISSUE: 'Masalah Kamar',
}

// ---------------------------------------------------------------------------
// ReportForm
// ---------------------------------------------------------------------------

export function ReportForm() {
  const createReport = useCreateReport()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateReportFrontendInput>({
    resolver: zodResolver(createReportSchemaFrontend),
    defaultValues: {
      type: undefined,
      title: '',
      description: '',
    },
  })

  const isLoading = isSubmitting || createReport.isPending

  const onSubmit = async (data: CreateReportFrontendInput) => {
    try {
      await createReport.mutateAsync(data)

      // Req 9.4: notifikasi sukses dan reset form bersamaan
      toast.success('Laporan berhasil dikirim. Tim kami akan segera menindaklanjutinya.')
      reset()
    } catch (error) {
      if (error instanceof ApiError) {
        // Req 9.5: error NO_ACTIVE_BOOKING
        if (error.code === 'NO_ACTIVE_BOOKING') {
          toast.error('Anda tidak memiliki kamar aktif untuk dilaporkan')
          return
        }
        // Req 9.6: error RATE_LIMIT_EXCEEDED
        if (error.code === 'RATE_LIMIT_EXCEEDED') {
          toast.error('Terlalu banyak laporan. Coba lagi dalam 1 jam')
          return
        }
        toast.error(error.message)
      } else {
        toast.error('Terjadi kesalahan. Silakan coba lagi.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

      {/* Tipe Laporan */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className="text-sm font-medium">
          Jenis Laporan <span className="text-destructive">*</span>
        </label>
        <select
          id="type"
          aria-invalid={!!errors.type}
          defaultValue=""
          className={cn(
            'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors appearance-none',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            errors.type
              ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
              : 'border-input',
          )}
          {...register('type')}
        >
          <option value="" disabled>
            — Pilih jenis laporan —
          </option>
          {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.type && (
          <p role="alert" className="text-xs text-destructive">
            {errors.type.message}
          </p>
        )}
      </div>

      {/* Judul */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Judul <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          type="text"
          placeholder="Ringkasan singkat masalah Anda"
          aria-invalid={!!errors.title}
          className={cn(
            'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            errors.title
              ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
              : 'border-input',
          )}
          {...register('title')}
        />
        {errors.title && (
          <p role="alert" className="text-xs text-destructive">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Deskripsi */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Deskripsi <span className="text-destructive">*</span>
        </label>
        <textarea
          id="description"
          rows={5}
          placeholder="Jelaskan masalah Anda secara detail..."
          aria-invalid={!!errors.description}
          className={cn(
            'w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors resize-none',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            errors.description
              ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
              : 'border-input',
          )}
          {...register('description')}
        />
        {errors.description && (
          <p role="alert" className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            Mengirim...
          </span>
        ) : (
          'Kirim Laporan'
        )}
      </Button>
    </form>
  )
}
