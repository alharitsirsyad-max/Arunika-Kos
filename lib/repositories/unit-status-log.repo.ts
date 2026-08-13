import { prisma } from "@/lib/prisma";
import type { UnitStatus } from "@prisma/client";

/**
 * Data required to create a new unit status log entry.
 * Records every manual status change made by an admin for audit trail purposes.
 * Requirements: 6.4, 6.6
 */
export type CreateUnitStatusLogData = {
  unit_id: string;
  old_status: UnitStatus;
  new_status: UnitStatus;
  changed_by: string;
  note?: string;
};

/** Explicit select shape for a unit status log entry */
const unitStatusLogSelect = {
  id: true,
  unit_id: true,
  old_status: true,
  new_status: true,
  changed_by: true,
  changed_at: true,
  note: true,
} as const;

export const unitStatusLogRepo = {
  /**
   * Insert a new audit log entry for a unit status change.
   * Must be called whenever an admin manually changes a unit's status.
   * Requirements: 6.4, 6.6
   */
  async create(data: CreateUnitStatusLogData) {
    return prisma.unitStatusLog.create({
      data: {
        unit_id: data.unit_id,
        old_status: data.old_status,
        new_status: data.new_status,
        changed_by: data.changed_by,
        note: data.note,
      },
      select: unitStatusLogSelect,
    });
  },

  /**
   * Fetch all audit log entries for a specific unit.
   * Ordered from most recent to oldest.
   * Requirements: 6.6
   */
  async findByUnitId(unitId: string) {
    return prisma.unitStatusLog.findMany({
      where: { unit_id: unitId },
      select: unitStatusLogSelect,
      orderBy: { changed_at: "desc" },
    });
  },
};
