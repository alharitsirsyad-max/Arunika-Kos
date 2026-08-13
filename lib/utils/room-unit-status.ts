import type { BookingStatus, UnitStatus } from "@prisma/client";

/**
 * Tipe Booking minimal yang diperlukan untuk derivasi status Room_Unit.
 */
export type BookingForUnitStatus = {
  status: BookingStatus;
};

/**
 * Menurunkan status Room_Unit yang seharusnya berdasarkan daftar booking
 * yang ada untuk unit tersebut.
 *
 * Aturan prioritas (Req 4.5, 4.7, 10.2):
 * 1. `OCCUPIED`  — jika ada minimal satu booking berstatus `ACTIVE`
 * 2. `RESERVED`  — jika ada minimal satu booking berstatus `DP_PAID`
 *                  (dan tidak ada yang `ACTIVE`)
 * 3. `AVAILABLE` — jika tidak ada booking `ACTIVE` maupun `DP_PAID`
 *
 * @param bookings - Daftar booking untuk sebuah Room_Unit
 * @returns Status Room_Unit yang sesuai: `OCCUPIED`, `RESERVED`, atau `AVAILABLE`
 *
 * @example
 * deriveRoomUnitStatus([])                                      // "AVAILABLE"
 * deriveRoomUnitStatus([{ status: "PENDING" }])                 // "AVAILABLE"
 * deriveRoomUnitStatus([{ status: "DP_PAID" }])                 // "RESERVED"
 * deriveRoomUnitStatus([{ status: "DP_PAID" }, { status: "ACTIVE" }]) // "OCCUPIED"
 * deriveRoomUnitStatus([{ status: "ACTIVE" }])                  // "OCCUPIED"
 */
export function deriveRoomUnitStatus(
  bookings: BookingForUnitStatus[]
): UnitStatus {
  // Prioritas tertinggi: ada booking ACTIVE → OCCUPIED
  if (bookings.some((b) => b.status === "ACTIVE")) {
    return "OCCUPIED";
  }

  // Prioritas kedua: ada booking DP_PAID (tanpa ACTIVE) → RESERVED
  if (bookings.some((b) => b.status === "DP_PAID")) {
    return "RESERVED";
  }

  // Default: tidak ada booking aktif atau DP_PAID → AVAILABLE
  return "AVAILABLE";
}
