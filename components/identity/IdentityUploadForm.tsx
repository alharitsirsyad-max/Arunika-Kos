'use client'

/**
 * components/identity/IdentityUploadForm.tsx
 * Form upload dokumen identitas dengan validasi React Hook Form + Zod.
 * Req 7.3, 7.4, 7.5, 7.6, 7.8
 */

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UploadIcon } from 'lucide-react'
import { uploadIdentitySchema, type UploadIdentityFrontendInput } from '@/lib/validations/identity'
import { useUploadIdentityDocument } from '@/hooks/useIdentity'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  KTP: 'KTP (Kartu Tanda Penduduk)',
  KARTU_PELAJAR: 'Kartu Pelajar',
  KK: 'KK (Kartu Keluarga)',
}

export function IdentityUploadForm() {
  const uploadMutation = useUploadIdentityDocument()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UploadIdentityFrontendInput>({
    resolver: zodResolver(uploadIdentitySchema),
  })

  // Register the file field so RHF knows about it
  const { ref: rhfFileRef, ...fileRegisterRest } = register('file')

  const onSubmit = async (data: UploadIdentityFrontendInput) => {
    setSuccessMessage(null)
    setServerError(null)

    const formData = new FormData()
    formData.append('document_type', data.document_type)
    formData.append('file', data.file)

    try {
      await uploadMutation.mutateAsync(formData)

      // Req 7.6: sukses → notifikasi + refresh daftar dokumen & status
      // The mutation's onSuccess already invalidates ['identity-documents'] (covers 'me' + 'status')
      setSuccessMessage('Dokumen berhasil diupload. Menunggu verifikasi admin.')
      reset()
      setSelectedFileName(null)
    } catch (error) {
      // Req 7.6 & 7.8: gagal → hanya tampilkan error, tidak refresh
      if (error instanceof ApiError) {
        setServerError(error.message)
      } else {
        setServerError('Terjadi kesalahan saat upload. Silakan coba lagi.')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setValue('file', file, { shouldValidate: true })
      setSelectedFileName(file.name)
    } else {
      setSelectedFileName(null)
    }
  }

  const isLoading = isSubmitting || uploadMutation.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Pesan sukses */}
      {successMessage && (
        <div
          role="status"
          className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2.5 text-sm text-green-700"
        >
          {successMessage}
        </div>
      )}

      {/* Error dari API */}
      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      {/* Jenis Dokumen */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="document_type" className="text-sm font-medium">
          Jenis Dokumen <span className="text-destructive">*</span>
        </label>
        <select
          id="document_type"
          aria-invalid={!!errors.document_type}
          className={cn(
            'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors appearance-none',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            errors.document_type
              ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
              : 'border-input',
          )}
          defaultValue=""
          {...register('document_type')}
        >
          <option value="" disabled>
            — Pilih jenis dokumen —
          </option>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.document_type && (
          <p role="alert" className="text-xs text-destructive">
            {errors.document_type.message}
          </p>
        )}
      </div>

      {/* File Upload */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="file" className="text-sm font-medium">
          File Dokumen <span className="text-destructive">*</span>
        </label>
        <p className="text-xs text-muted-foreground">
          Format: JPEG atau PNG. Ukuran maksimal 5 MB.
        </p>

        {/* Hidden native input — managed by RHF via setValue */}
        <input
          id="file"
          type="file"
          accept="image/jpeg,image/png"
          aria-invalid={!!errors.file}
          className="sr-only"
          ref={(el) => {
            rhfFileRef(el)
            fileInputRef.current = el
          }}
          {...fileRegisterRest}
          onChange={handleFileChange}
        />

        {/* Custom file trigger button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm transition-colors',
            'hover:border-ring hover:bg-muted/30',
            errors.file
              ? 'border-destructive bg-destructive/5'
              : 'border-input bg-background',
          )}
        >
          <UploadIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className={selectedFileName ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedFileName ?? 'Klik untuk memilih file...'}
          </span>
        </button>

        {errors.file && (
          <p role="alert" className="text-xs text-destructive">
            {/* Zod refinement errors come as array; pick the first message */}
            {typeof errors.file.message === 'string'
              ? errors.file.message
              : 'File tidak valid'}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            Mengupload...
          </span>
        ) : (
          'Upload Dokumen'
        )}
      </Button>
    </form>
  )
}
