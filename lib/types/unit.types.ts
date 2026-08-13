import type { UnitStatus } from "@prisma/client";

/**
 * Input for manually changing a unit's status (admin only).
 * note is optional — admin may add context for the audit log.
 * Requirements: 6.1
 */
export type UnitStatusChangeInput = {
  newStatus: UnitStatus;
  note?: string;
};

/**
 * Public-facing audit log entry for a unit status change.
 * Returned when listing status history for a unit.
 * Requirements: 6.4, 6.6
 */
export type UnitStatusLogPublic = {
  id: string;
  unit_id: string;
  old_status: UnitStatus;
  new_status: UnitStatus;
  changed_by: string;
  changed_at: Date;
  note?: string;
};

// Re-export Prisma types for convenience
export type { UnitStatus };
