'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, X, Check, Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: string
  name: string
  phone: string
  address?: string
}

export function PersonalDataSection() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['user-profile-me'],
    queryFn: () =>
      fetch('/api/users/me', { credentials: 'include' })
        .then(r => r.json())
        .then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; address?: string }) =>
      fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      }).then(async r => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error?.message ?? 'Gagal memperbarui profil')
        return json.data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile-me'] })
      toast.success('Profil berhasil diperbarui. Data Anda dalam proses verifikasi ulang.')
      setIsEditing(false)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  function handleEdit() {
    setForm({ name: profile?.name ?? '', phone: profile?.phone ?? '', address: profile?.address ?? '' })
    setErrors({})
    setIsEditing(true)
  }

  function validate() {
    const errs: { name?: string; phone?: string } = {}
    if (!form.name.trim() || form.name.length > 100) errs.name = 'Nama wajib diisi (maks 100 karakter)'
    if (!/^\d{10,15}$/.test(form.phone)) errs.phone = 'Nomor telepon harus 10–15 digit angka'
    return errs
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    updateMutation.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address || undefined,
    })
  }

  return (
    <section className="rounded-lg border bg-card p-5 space-y-4" aria-labelledby="personal-data-heading">
      <div className="flex items-center justify-between">
        <h2 id="personal-data-heading" className="font-semibold text-base flex items-center gap-2">
          <User className="size-4 text-muted-foreground" aria-hidden />
          Data Diri
        </h2>
        {!isEditing && !isLoading && (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <Pencil className="size-3.5" />
            Edit
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Memuat data diri...</p>}

      {!isLoading && !isEditing && profile && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Nama</dt>
            <dd className="font-medium">{profile.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Telepon</dt>
            <dd>{profile.phone}</dd>
          </div>
          {profile.address && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Alamat</dt>
              <dd>{profile.address}</dd>
            </div>
          )}
        </dl>
      )}

      {isEditing && (
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="space-y-1">
            <label className="text-xs font-medium">
              Nama <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              maxLength={100}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                errors.name && 'border-destructive',
              )}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">
              Nomor Telepon <span className="text-destructive">*</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="contoh: 08123456789"
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                errors.phone && 'border-destructive',
              )}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">
              Alamat <span className="text-muted-foreground text-xs">(opsional)</span>
            </label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-60"
            >
              <X className="size-3.5" />
              Batal
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {updateMutation.isPending
                ? <Loader2 className="size-3.5 animate-spin" />
                : <Check className="size-3.5" />
              }
              Simpan
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
