import { Button } from '@/components/ui/button'
import { formatRoomPrice } from '@/lib/utils/pricing'
import type { Room } from '@/types/api'

interface RoomCardProps {
  room: Room
  onBooking: (room: Room) => void
  /** Apakah user sudah punya booking aktif */
  userHasActiveBooking?: boolean
}

export function RoomCard({ room, onBooking, userHasActiveBooking }: RoomCardProps) {
  const availableUnits = room.available_units ?? 0
  // RESERVED and OCCUPIED units are both unavailable — Requirements 10.3, 10.4
  // available_units from API already excludes RESERVED and OCCUPIED (only AVAILABLE counts)
  const isFull = availableUnits === 0
  const isDisabled = isFull || userHasActiveBooking

  let buttonLabel = 'Booking'
  let buttonTitle = ''

  if (isFull) {
    buttonLabel = 'Tidak Tersedia'
    buttonTitle = 'Semua unit kamar ini sudah terisi atau dipesan'
  } else if (userHasActiveBooking) {
    buttonLabel = 'Sudah Booking'
    buttonTitle = 'Anda sudah memiliki booking aktif. Selesaikan booking saat ini terlebih dahulu.'
  }

  return (
    <div className={`flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden ${isFull ? 'opacity-60' : ''}`}>
      {/* Room image */}
      {room.images.length > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={room.images[0].image_url}
          alt={`Foto kamar ${room.name}`}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-muted flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Tidak ada foto</span>
        </div>
      )}

      <div className="flex flex-col flex-1 gap-3 p-4">
        {/* Name + unit availability */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold leading-tight">{room.name}</h2>
          {room.total_units !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
              isFull
                ? 'bg-red-100 text-red-700'
                : availableUnits <= 2
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
            }`}>
              {isFull ? 'Penuh' : `${availableUnits} unit tersedia`}
            </span>
          )}
        </div>

        {/* Price — Requirement 1.8: format "Rp[harga] / [period_months] bulan" */}
        <p className="text-lg font-bold text-primary">
          {formatRoomPrice(room.price, room.period_months ?? 1)}
        </p>

        {/* Description */}
        {room.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>
        )}

        {/* Facilities */}
        {room.facilities.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {room.facilities.map((facility) => (
              <li
                key={facility}
                className="rounded-full border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {facility}
              </li>
            ))}
          </ul>
        )}

        {/* Booking button */}
        <div className="mt-auto pt-2">
          <Button
            className="w-full"
            disabled={isDisabled}
            variant={isDisabled ? 'outline' : 'default'}
            onClick={() => !isDisabled && onBooking(room)}
            title={buttonTitle}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
