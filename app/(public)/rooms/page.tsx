import { RoomList } from '@/components/rooms/RoomList'

export const metadata = {
  title: 'Katalog Kamar — Arunika Kos',
  description: 'Temukan kamar yang sesuai dengan kebutuhan kamu.',
}

export default function RoomsPage() {
  return (
    <main className="min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Katalog Kamar</h1>
          <p className="mt-2 text-muted-foreground">
            Pilih kamar yang sesuai dengan kebutuhan kamu dan ajukan booking.
          </p>
        </div>

        <RoomList />
      </div>
    </main>
  )
}
