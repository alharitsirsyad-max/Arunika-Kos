'use client'

/**
 * components/identity/CombinedVerificationForm.tsx
 *
 * Form verifikasi identitas gabungan:
 *  - Upload dokumen identitas (KTP/Kartu Pelajar/KK)
 *  - Tambah kontak darurat
 * Satu form, satu tombol Kirim — kedua request dikirim bersamaan (parallel).
 */

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UploadIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useUploadIdentityDocument } from '@/hooks/useIdentity'
import { useAddEmergencyContact } from '@/hooks/useEmergencyContacts'
import type { RelationshipType } from '@/types/api'

// ── Validasi ─────────────────────────────────────────────────────────────────

const DOCUMENT_TYPES = ['KTP', 'KARTU_PELAJAR', 'KK'] as const
const RELATIONSHIP_TYPES = ['ORANG_TUA', 'SAUDARA', 'TEMAN'] as const

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  KTP: 'KTP (Kartu Tanda Penduduk)',
  KARTU_PELAJAR: 'Kartu Pelajar',
  KK: 'KK (Kartu Keluarga)',
}

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  ORANG_TUA: 'Orang Tua',
  SAUDARA: 'Saudara',
  TEMAN: 'Teman',
}

const combinedSchema = z.object({
  // Dokumen identitas
  document_type: z.enum(DOCUMENT_TYPES, {
    errorMap: () => ({ message: 'Pilih jenis dokumen' }),
  }),
  file: z
    .instanceof(File, { message: 'Pilih file dokumen' })
    .refine((f) => f.size <= 5 * 1024 * 1024, 'Ukuran file maksimal 5 MB')
    .refine(
      (f) => ['image/jpeg', 'image/png'].includes(f.type),
      'Format harus JPEG atau PNG'
    ),

  // Kontak darurat
  contact_name: z
    .string()
    .min(1, 'Nama kontak wajib diisi')
    .max(100, 'Nama maksimal 100 karakter'),
  contact_relationship: z.enum(RELATIONSHIP_TYPES, {
    errorMap: () => ({ message: 'Pilih hubungan' }),
  }),
  contact_phone: z
    .string()
    .min(1, 'Nomor telepon wajib diisi')
    .regex(/^(\+62|08)\d{8,11}$/, 'Format nomor tidak valid (contoh: 081234567890)'),
})

type CombinedFormValues = z.infer<typeof combinedSchema>

// ── Komponen ──────────────────────────────────────────────────────────────────

export function CombinedVerificationForm() {
  const uploadMutation = useUploadIdentityDocument()
  const addContactMutation = useAddEmergencyContact()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CombinedFormValues>({
    resolver: zodResolver(combinedSchema),
  })

  const { ref: rhfFileRef, ...fileRegisterRest } = register('file')

  const isLoading = isSubmitting || uploadMutation.isPending || addContactMutation.isPending

  const onSubmit = async (data: CombinedFormValues) => {
    const formData = new FormData()
    formData.append('document_type', data.document_type)
    formData.append('file', data.file)

    try {
      // Kirim kedua request secara parallel
      await Promise.all([
        uploadMutation.mutateAsync(formData),
        addContactMutation.mutateAsync({
          name: data.contact_name,
          relationship: data.contact_relationship,
          phone_number: data.contact_phone,
        }),
      ])

      toast.success('Dokumen dan kontak darurat berhasil disimpan. Dokumen menunggu verifikasi admin.')
      reset()
      setSelectedFileName(null)
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.message
          : 'Terjadi kesalahan. Silakan coba lagi.'
      toast.error(msg)
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

      {/* ── Bagian: Dokumen Identitas ───────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Dokumen Identitas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unggah foto KTP, Kartu Pelajar, atau Kartu Keluarga yang jelas dan terbaca.
          </p>
        </div>

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
                : 'border-input'
            )}
            defaultValue=""
            {...register('document_type')}
          >
            <option value="" disabled>— Pilih jenis dokumen —</option>
            {DOCUMENT_TYPES.map((val) => (
              <option key={val} value={val}>{DOCUMENT_TYPE_LABELS[val]}</option>
            ))}
          </select>
          {errors.document_type && (
            <p role="alert" className="text-xs text-destructive">{errors.document_type.message}</p>
          )}
        </div>

        {/* File Upload */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="file" className="text-sm font-medium">
            File Dokumen <span className="text-destructive">*</span>
          </label>
          <p className="text-xs text-muted-foreground">Format: JPEG atau PNG. Ukuran maksimal 5 MB.</p>

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

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm transition-colors',
              'hover:border-ring hover:bg-muted/30',
              errors.file ? 'border-destructive bg-destructive/5' : 'border-input bg-background'
            )}
          >
            <UploadIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className={selectedFileName ? 'text-foreground' : 'text-muted-foreground'}>
              {selectedFileName ?? 'Klik untuk memilih file...'}
            </span>
          </button>

          {errors.file && (
            <p role="alert" className="text-xs text-destructive">
              {typeof errors.file.message === 'string' ? errors.file.message : 'File tidak valid'}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* ── Bagian: Kontak Darurat ──────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Kontak Darurat</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tambahkan kontak yang bisa dihubungi dalam keadaan darurat.
          </p>
        </div>

        {/* Nama Kontak */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact_name" className="text-sm font-medium">
            Nama <span className="text-destructive">*</span>
          </label>
          <input
            id="contact_name"
            type="text"
            placeholder="Nama lengkap kontak"
            aria-invalid={!!errors.contact_name}
            className={cn(
              'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              errors.contact_name
                ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                : 'border-input'
            )}
            {...register('contact_name')}
          />
          {errors.contact_name && (
            <p role="alert" className="text-xs text-destructive">{errors.contact_name.message}</p>
          )}
        </div>

        {/* Hubungan */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact_relationship" className="text-sm font-medium">
            Hubungan <span className="text-destructive">*</span>
          </label>
          <select
            id="contact_relationship"
            aria-invalid={!!errors.contact_relationship}
            className={cn(
              'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors appearance-none',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              errors.contact_relationship
                ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                : 'border-input'
            )}
            defaultValue=""
            {...register('contact_relationship')}
          >
            <option value="" disabled>— Pilih hubungan —</option>
            {RELATIONSHIP_TYPES.map((val) => (
              <option key={val} value={val}>{RELATIONSHIP_LABELS[val]}</option>
            ))}
          </select>
          {errors.contact_relationship && (
            <p role="alert" className="text-xs text-destructive">{errors.contact_relationship.message}</p>
          )}
        </div>

        {/* Nomor Telepon */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact_phone" className="text-sm font-medium">
            Nomor Telepon <span className="text-destructive">*</span>
          </label>
          <input
            id="contact_phone"
            type="tel"
            placeholder="081234567890"
            aria-invalid={!!errors.contact_phone}
            className={cn(
              'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              errors.contact_phone
                ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                : 'border-input'
            )}
            {...register('contact_phone')}
          />
          {errors.contact_phone && (
            <p role="alert" className="text-xs text-destructive">{errors.contact_phone.message}</p>
          )}
        </div>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            Menyimpan...
          </span>
        ) : (
          'Kirim Verifikasi'
        )}
      </Button>
    </form>
  )
}
