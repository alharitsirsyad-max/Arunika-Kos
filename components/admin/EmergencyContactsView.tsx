'use client'

/**
 * components/admin/EmergencyContactsView.tsx
 * Tampilan read-only daftar Emergency Contact untuk admin di halaman detail booking.
 * - Tabel: nama, jenis hubungan, nomor telepon
 * - Empty state jika tidak ada kontak
 * Requirements: 6.7, 13.2
 */

import { ShieldAlert } from 'lucide-react'
import type { EmergencyContact, RelationshipType } from '@/types/api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  ORANG_TUA: 'Orang Tua',
  SAUDARA: 'Saudara',
  TEMAN: 'Teman',
}

// ---------------------------------------------------------------------------
// EmergencyContactsView
// ---------------------------------------------------------------------------

interface EmergencyContactsViewProps {
  contacts: EmergencyContact[]
}

export function EmergencyContactsView({ contacts }: EmergencyContactsViewProps) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-muted-foreground" />
        <h2 className="font-semibold text-base">Kontak Darurat</h2>
      </div>

      {/* Empty state */}
      {contacts.length === 0 ? (
        <div className="rounded-md border border-dashed py-8 text-center">
          <p className="text-sm text-muted-foreground">Belum ada kontak darurat</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nama</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Hubungan</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nomor Telepon</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{contact.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {RELATIONSHIP_LABELS[contact.relationship] ?? contact.relationship}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{contact.phone_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-md border bg-background p-3 space-y-1.5">
                <p className="font-medium text-sm">{contact.name}</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">Hubungan: </span>
                    {RELATIONSHIP_LABELS[contact.relationship] ?? contact.relationship}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">Telepon: </span>
                    {contact.phone_number}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
