'use client'

/**
 * components/admin/RoomForm.tsx
 * Form tambah/edit kamar untuk admin.
 * Saat tambah kamar baru, otomatis membuat unit berdasarkan jumlah yang diisi.
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PlusIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useCreateRoom, useUpdateRoom, type CreateRoomPayload } from '@/hooks/useRooms'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Room } from '@/types/api'

const roomSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  price: z.number({ error: 'Harga harus angka' }).int().min(1, 'Minimal Rp 1'),
  period_months: z.number({ error: 'Periode harus angka' }).int().min(1, 'Minimal 1 bulan').max(24, 'Maksimal 24 bulan'),
  description: z.string().min(1, 'Deskripsi wajib diisi').max(2000),
  capacity: z.number({ error: 'Kapasitas harus angka' }).int().min(1, 'Minimal 1'),
  unitCount: z.number({ error: 'Jumlah unit harus angka' }).int().min(1, 'Minimal 1 unit').max(50, 'Maksimal 50 unit'),
})

type RoomFormValues = z.infer<typeof roomSchema>

interface RoomFormProps {
  room?: Room
  onSuccess: () => void
  onCancel: () => void
}

export function RoomForm({ room, onSuccess, onCancel }: RoomFormProps) {
  const isEdit = !!room

  const [facilities, setFacilities] = useState<string[]>(room?.facilities ?? [])
  const [facilityInput, setFacilityInput] = useState('')
  const [facilityError, setFacilityError] = useState('')

  const createRoom = useCreateRoom()
  const updateRoom = useUpdateRoom(room?.id ?? '')

  const isPending = createRoom.isPending || updateRoom.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: room?.name ?? '',
      price: room?.price ?? 0,
      period_months: room?.period_months ?? 3,
      description: room?.description ?? '',
      capacity: 1,
      unitCount: 1,
    },
  })

  const addFacility = () => {
    const trimmed = facilityInput.trim()
    if (!trimmed) return
    if (facilities.includes(trimmed)) { setFacilityError('Fasilitas sudah ada'); return }
    if (facilities.length >= 20) { setFacilityError('Maksimal 20 fasilitas'); return }
    setFacilities((prev) => [...prev, trimmed])
    setFacilityInput('')
    setFacilityError('')
  }

  const removeFacility = (item: string) =>
    setFacilities((prev) => prev.filter((f) => f !== item))

  const onSubmit = async (values: RoomFormValues) => {
    if (facilities.length === 0) {
      setFacilityError('Minimal 1 fasilitas')
      return
    }

    try {
      if (isEdit) {
        const payload: CreateRoomPayload = {
          name: values.name,
          price: values.price,
          period_months: values.period_months,
          description: values.description,
          facilities,
          capacity: values.capacity,
        }
        await updateRoom.mutateAsync(payload)
        toast.success('Kamar berhasil diperbarui.')
      } else {
        const payload: CreateRoomPayload = {
          name: values.name,
          price: values.price,
          period_months: values.period_months,
          description: values.description,
          facilities,
          capacity: values.capacity,
          unit_count: values.unitCount,
        }
        await createRoom.mutateAsync(payload)
        toast.success(`Kamar berhasil ditambahkan dengan ${values.unitCount} unit.`)
      }
      onSuccess()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan kamar.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Nama */}
      <Field label="Nama Kamar" error={errors.name?.message}>
        <input
          type="text"
          placeholder="contoh: Kamar Deluxe AC"
          className={inputCls(!!errors.name)}
          {...register('name')}
        />
      </Field>

      {/* Harga */}
      <Field label="Harga / Periode (Rp)" error={errors.price?.message}>
        <input
          type="number"
          min={1}
          placeholder="contoh: 1500000"
          className={inputCls(!!errors.price)}
          {...register('price', { valueAsNumber: true })}
        />
      </Field>

      {/* Periode */}
      <Field label="Periode Harga (bulan)" error={errors.period_months?.message}>
        <input
          type="number"
          min={1}
          max={24}
          placeholder="contoh: 3 (artinya harga per 3 bulan)"
          className={inputCls(!!errors.period_months)}
          {...register('period_months', { valueAsNumber: true })}
        />
        <p className="text-xs text-muted-foreground -mt-1">
          Jumlah bulan dalam satu periode harga. Default: 3 bulan.
        </p>
      </Field>

      {/* Kapasitas & Jumlah Unit — 2 kolom */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kapasitas (orang/unit)" error={errors.capacity?.message}>
          <input
            type="number"
            min={1}
            className={inputCls(!!errors.capacity)}
            {...register('capacity', { valueAsNumber: true })}
          />
        </Field>

        {/* Jumlah unit hanya tampil saat tambah baru */}
        {!isEdit && (
          <Field label="Jumlah Unit" error={errors.unitCount?.message}>
            <input
              type="number"
              min={1}
              max={50}
              placeholder="contoh: 3"
              className={inputCls(!!errors.unitCount)}
              {...register('unitCount', { valueAsNumber: true })}
            />
          </Field>
        )}
      </div>

      {/* Deskripsi */}
      <Field label="Deskripsi" error={errors.description?.message}>
        <textarea
          rows={3}
          placeholder="Deskripsi singkat kamar..."
          className={cn(inputCls(!!errors.description), 'resize-none')}
          {...register('description')}
        />
      </Field>

      {/* Fasilitas */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Fasilitas</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={facilityInput}
            onChange={(e) => { setFacilityInput(e.target.value); setFacilityError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFacility() } }}
            placeholder="contoh: WiFi — tekan Enter atau klik +"
            className={inputCls(!!facilityError)}
          />
          <Button type="button" size="sm" variant="outline" onClick={addFacility}>
            <PlusIcon className="size-4" />
          </Button>
        </div>
        {facilityError && <p className="text-xs text-destructive">{facilityError}</p>}
        {facilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {facilities.map((f) => (
              <span key={f} className="flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs">
                {f}
                <button type="button" onClick={() => removeFacility(f)} className="text-muted-foreground hover:text-destructive">
                  <XIcon className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {!isEdit && (
        <p className="text-xs text-muted-foreground">
          Unit akan diberi nama otomatis: huruf pertama nama kamar + nomor (contoh: K1, K2, K3).
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
          Batal
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? (
            <span className="flex items-center gap-1.5">
              <LoadingSpinner size="sm" />
              Menyimpan...
            </span>
          ) : isEdit ? 'Simpan Perubahan' : 'Tambah Kamar'}
        </Button>
      </div>
    </form>
  )
}

function inputCls(hasError: boolean) {
  return cn(
    'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors',
    'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
    hasError
      ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
      : 'border-input'
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
