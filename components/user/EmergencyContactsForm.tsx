'use client'

/**
 * components/user/EmergencyContactsForm.tsx
 * Section kontak darurat pada halaman identitas user.
 *
 * Fitur:
 *  - Daftar kontak yang sudah ada (nama, jenis hubungan, nomor telepon)
 *  - Form tambah kontak baru: nama (max 100 karakter), dropdown hubungan, nomor telepon Indonesia
 *  - Tombol edit per baris — membuka form inline per baris
 *  - Tombol hapus per baris — disabled (dengan tooltip) jika hanya tersisa 1 kontak
 *
 * Requirements: 6.1, 6.3, 6.4, 6.6, 14.6
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { PlusCircle, Pencil, Trash2, ShieldAlert, X, Check, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { EmergencyContact, RelationshipType } from '@/types/api'
import {
  useEmergencyContacts,
  useAddEmergencyContact,
  useUpdateEmergencyContact,
  useDeleteEmergencyContact,
  type EmergencyContactPayload,
} from '@/hooks/useEmergencyContacts'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  ORANG_TUA: 'Orang Tua',
  SAUDARA: 'Saudara',
  TEMAN: 'Teman',
}

const RELATIONSHIP_OPTIONS: RelationshipType[] = ['ORANG_TUA', 'SAUDARA', 'TEMAN']

/**
 * Validasi nomor telepon Indonesia.
 * Menerima format 08... atau +62..., 10–13 digit angka total.
 * Requirement 6.6
 */
function validateIndonesianPhone(phone: string): boolean {
  return /^(\+62|08)\d{8,11}$/.test(phone)
}

// ---------------------------------------------------------------------------
// Types for form state
// ---------------------------------------------------------------------------

interface ContactFormValues {
  name: string
  relationship: RelationshipType
  phone_number: string
}

const EMPTY_FORM: ContactFormValues = {
  name: '',
  relationship: 'ORANG_TUA',
  phone_number: '',
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface FormErrors {
  name?: string
  phone_number?: string
}

function validateForm(values: ContactFormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.name.trim()) {
    errors.name = 'Nama wajib diisi'
  } else if (values.name.trim().length > 100) {
    errors.name = 'Nama maksimal 100 karakter'
  }

  if (!values.phone_number.trim()) {
    errors.phone_number = 'Nomor telepon wajib diisi'
  } else if (!validateIndonesianPhone(values.phone_number.trim())) {
    errors.phone_number = 'Format tidak valid. Gunakan format 08... atau +62..., 10–13 digit angka'
  }

  return errors
}

// ---------------------------------------------------------------------------
// Sub-component: ContactFormFields (shared for add & edit)
// ---------------------------------------------------------------------------

interface ContactFormFieldsProps {
  values: ContactFormValues
  errors: FormErrors
  onChange: (field: keyof ContactFormValues, value: string) => void
  disabled?: boolean
}

function ContactFormFields({ values, errors, onChange, disabled }: ContactFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Nama */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">
          Nama Lengkap <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="cth. Budi Santoso"
          maxLength={100}
          disabled={disabled}
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-60',
            errors.name && 'border-destructive focus:ring-destructive',
          )}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Jenis Hubungan */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">
          Jenis Hubungan <span className="text-destructive">*</span>
        </label>
        <select
          value={values.relationship}
          onChange={(e) => onChange('relationship', e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {RELATIONSHIP_OPTIONS.map((rel) => (
            <option key={rel} value={rel}>
              {RELATIONSHIP_LABELS[rel]}
            </option>
          ))}
        </select>
      </div>

      {/* Nomor Telepon */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">
          Nomor Telepon <span className="text-destructive">*</span>
        </label>
        <input
          type="tel"
          value={values.phone_number}
          onChange={(e) => onChange('phone_number', e.target.value)}
          placeholder="cth. 08123456789"
          disabled={disabled}
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-60',
            errors.phone_number && 'border-destructive focus:ring-destructive',
          )}
        />
        {errors.phone_number && (
          <p className="text-xs text-destructive">{errors.phone_number}</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: AddContactForm
// ---------------------------------------------------------------------------

function AddContactForm() {
  const [values, setValues] = useState<ContactFormValues>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isOpen, setIsOpen] = useState(false)
  const addMutation = useAddEmergencyContact()

  function handleChange(field: keyof ContactFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    // Clear error on change
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validateForm(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const payload: EmergencyContactPayload = {
      name: values.name.trim(),
      relationship: values.relationship,
      phone_number: values.phone_number.trim(),
    }

    addMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Kontak darurat berhasil ditambahkan')
        setValues(EMPTY_FORM)
        setErrors({})
        setIsOpen(false)
      },
      onError: (error) => {
        toast.error(error.message ?? 'Gagal menambahkan kontak darurat')
      },
    })
  }

  function handleCancel() {
    setValues(EMPTY_FORM)
    setErrors({})
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-2 rounded-md border border-dashed px-4 py-2.5',
          'text-sm text-muted-foreground hover:text-foreground hover:border-border',
          'transition-colors w-full justify-center',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        )}
      >
        <PlusCircle className="size-4" />
        Tambah Kontak Darurat
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-border bg-muted/30 p-4 space-y-4"
      aria-label="Form tambah kontak darurat"
    >
      <h4 className="text-sm font-semibold">Tambah Kontak Baru</h4>

      <ContactFormFields
        values={values}
        errors={errors}
        onChange={handleChange}
        disabled={addMutation.isPending}
      />

      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={handleCancel}
          disabled={addMutation.isPending}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm',
            'hover:bg-muted transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          )}
        >
          <X className="size-3.5" />
          Batal
        </button>
        <button
          type="submit"
          disabled={addMutation.isPending}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          )}
        >
          {addMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Simpan
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: ContactRow (single row, with inline edit)
// ---------------------------------------------------------------------------

interface ContactRowProps {
  contact: EmergencyContact
  isOnlyOne: boolean
}

function ContactRow({ contact, isOnlyOne }: ContactRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState<ContactFormValues>({
    name: contact.name,
    relationship: contact.relationship,
    phone_number: contact.phone_number,
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const updateMutation = useUpdateEmergencyContact()
  const deleteMutation = useDeleteEmergencyContact()

  function handleChange(field: keyof ContactFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validateForm(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    updateMutation.mutate(
      {
        id: contact.id,
        name: values.name.trim(),
        relationship: values.relationship,
        phone_number: values.phone_number.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Kontak darurat berhasil diperbarui')
          setIsEditing(false)
          setErrors({})
        },
        onError: (error) => {
          toast.error(error.message ?? 'Gagal memperbarui kontak darurat')
        },
      },
    )
  }

  function handleCancelEdit() {
    // Reset ke nilai awal
    setValues({
      name: contact.name,
      relationship: contact.relationship,
      phone_number: contact.phone_number,
    })
    setErrors({})
    setIsEditing(false)
  }

  function handleDelete() {
    if (isOnlyOne) return // tombol akan disabled, tapi guard tetap ada

    deleteMutation.mutate(contact.id, {
      onSuccess: () => {
        toast.success('Kontak darurat berhasil dihapus')
      },
      onError: (error) => {
        // Backend mengembalikan 400 LAST_CONTACT jika ini kontak terakhir
        toast.error(error.message ?? 'Gagal menghapus kontak darurat')
      },
    })
  }

  const isBusy = updateMutation.isPending || deleteMutation.isPending

  // ── Edit mode: inline form ──────────────────────────────────────────────
  if (isEditing) {
    return (
      <li className="rounded-md border border-primary/30 bg-muted/20 p-3 space-y-3">
        <form onSubmit={handleSaveEdit} aria-label={`Edit kontak ${contact.name}`}>
          <ContactFormFields
            values={values}
            errors={errors}
            onChange={handleChange}
            disabled={isBusy}
          />
          <div className="flex items-center gap-2 justify-end mt-3">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isBusy}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm',
                'hover:bg-muted transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-60',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              )}
            >
              <X className="size-3.5" />
              Batal
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground',
                'hover:bg-primary/90 transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-60',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              )}
            >
              {updateMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Simpan
            </button>
          </div>
        </form>
      </li>
    )
  }

  // ── View mode ─────────────────────────────────────────────────────────────
  return (
    <li className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Contact info */}
      <div className="flex-1 grid grid-cols-1 gap-0.5 sm:grid-cols-3 sm:gap-4 text-sm">
        <span className="font-medium truncate">{contact.name}</span>
        <span className="text-muted-foreground">
          {RELATIONSHIP_LABELS[contact.relationship] ?? contact.relationship}
        </span>
        <span className="text-muted-foreground">{contact.phone_number}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {/* Edit button */}
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          disabled={isBusy}
          aria-label={`Edit kontak ${contact.name}`}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs',
            'hover:bg-muted transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          )}
        >
          <Pencil className="size-3" />
          Edit
        </button>

        {/* Delete button — disabled with tooltip when only one contact */}
        <div
          className="relative group"
          title={
            isOnlyOne
              ? 'Minimal satu kontak darurat harus tersedia'
              : undefined
          }
        >
          <button
            type="button"
            onClick={handleDelete}
            disabled={isOnlyOne || isBusy}
            aria-label={`Hapus kontak ${contact.name}`}
            aria-disabled={isOnlyOne}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-2.5 py-1.5 text-xs text-destructive',
              'hover:bg-destructive/10 transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:pointer-events-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-1',
            )}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Trash2 className="size-3" />
            )}
            Hapus
          </button>

          {/* Tooltip untuk tombol hapus yang disabled */}
          {isOnlyOne && (
            <div
              role="tooltip"
              className={cn(
                'pointer-events-none absolute bottom-full right-0 mb-1.5 z-10',
                'w-max max-w-[220px] rounded-md bg-popover border shadow-md px-3 py-1.5',
                'text-xs text-popover-foreground leading-snug',
                'opacity-0 transition-opacity group-hover:opacity-100',
              )}
            >
              Minimal satu kontak darurat harus tersedia
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Main component: EmergencyContactsForm
// ---------------------------------------------------------------------------

interface EmergencyContactsFormProps {
  className?: string
}

export function EmergencyContactsForm({ className }: EmergencyContactsFormProps) {
  const { data: contacts, isLoading, isError } = useEmergencyContacts()

  return (
    <section
      className={cn('rounded-lg border bg-card p-5 space-y-5', className)}
      aria-labelledby="emergency-contacts-heading"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2
          id="emergency-contacts-heading"
          className="font-semibold text-base"
        >
          Kontak Darurat
        </h2>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" />
          <span className="text-sm">Memuat kontak darurat…</span>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Gagal memuat kontak darurat. Silakan muat ulang halaman.
        </div>
      )}

      {/* Contact list */}
      {contacts && (
        <>
          {contacts.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Belum ada kontak darurat tersimpan.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tambahkan minimal satu kontak agar Anda dapat mengajukan booking.
              </p>
            </div>
          ) : (
            <ul className="space-y-2" aria-label="Daftar kontak darurat">
              {contacts.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  isOnlyOne={contacts.length === 1}
                />
              ))}
            </ul>
          )}

          {/* Add form */}
          <AddContactForm />
        </>
      )}
    </section>
  )
}
