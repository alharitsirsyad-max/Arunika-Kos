/**
 * app/(admin)/admin/rooms/page.tsx
 * Halaman kelola kamar untuk admin.
 */

import { RoomManagement } from '@/components/admin/RoomManagement'

export default function AdminRoomsPage() {
  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kelola Kamar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tambah, edit, atau hapus kamar yang tersedia.
        </p>
      </div>

      <RoomManagement />
    </main>
  )
}
