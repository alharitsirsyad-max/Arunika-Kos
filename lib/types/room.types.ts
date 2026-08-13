import type { Room, RoomUnit, RoomImage, UnitStatus } from "@prisma/client";

/**
 * Input type for creating a new room.
 */
export type CreateRoomInput = {
  name: string;
  price: number;
  period_months: number;
  facilities: string[];
  description: string;
  capacity: number;
};

/**
 * Input type for updating an existing room — all fields are optional.
 */
export type UpdateRoomInput = Partial<CreateRoomInput>;

/**
 * Full room detail including related units and images.
 * Derives base fields from the Prisma Room model.
 */
export type RoomDetail = Room & {
  units: RoomUnit[];
  images: RoomImage[];
};

/**
 * Summary of a single room unit with its current status.
 * Derives directly from the Prisma RoomUnit model.
 */
export type RoomUnitSummary = {
  id: string;
  room_id: string;
  room_number: string;
  status: UnitStatus;
};

// Re-export Prisma types for convenience
export type { Room, RoomUnit, RoomImage, UnitStatus };
