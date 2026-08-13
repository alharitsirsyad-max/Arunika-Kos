import { prisma } from "@/lib/prisma";
import type { ReportStatus } from "@prisma/client";
import type { CreateReportData } from "@/lib/types/report.types";

/** Explicit select for a report row */
const reportSelect = {
  id: true,
  user_id: true,
  room_unit_id: true,
  type: true,
  title: true,
  description: true,
  image_url: true,
  status: true,
  admin_note: true,
  created_at: true,
  updated_at: true,
} as const;

/** Extended select that includes user and room_unit for admin view */
const reportWithRelationsSelect = {
  ...reportSelect,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  room_unit: {
    select: {
      id: true,
      room_number: true,
      room: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

export const reportRepo = {
  /**
   * Find a single report by ID.
   */
  async findById(id: string) {
    return prisma.report.findUnique({
      where: { id },
      select: reportWithRelationsSelect,
    });
  },

  /**
   * Find all reports belonging to a specific user.
   * Always applies WHERE user_id = userId — never returns other users' reports.
   */
  async findByUserId(userId: string) {
    return prisma.report.findMany({
      where: { user_id: userId },
      select: reportSelect,
      orderBy: { created_at: "desc" },
    });
  },

  /**
   * Find all reports without ownership filter.
   * For admin use only — includes user and room_unit data.
   */
  async findAll() {
    return prisma.report.findMany({
      select: reportWithRelationsSelect,
      orderBy: { created_at: "desc" },
    });
  },

  /**
   * Create a new report record.
   */
  async create(data: CreateReportData) {
    return prisma.report.create({
      data: {
        user_id: data.user_id,
        room_unit_id: data.room_unit_id,
        type: data.type,
        title: data.title,
        description: data.description,
        image_url: data.image_url,
        status: "OPEN",
      },
      select: reportSelect,
    });
  },

  /**
   * Update the status of a report. Optionally sets admin_note.
   * updated_at is managed automatically by Prisma (@updatedAt).
   */
  async updateStatus(id: string, status: ReportStatus, adminNote?: string) {
    return prisma.report.update({
      where: { id },
      data: {
        status,
        ...(adminNote !== undefined && { admin_note: adminNote }),
      },
      select: reportSelect,
    });
  },

  /**
   * Count reports created by a user in the last hour.
   * Used for DB-based rate limiting in ReportService.
   */
  async countByUserIdInLastHour(userId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return prisma.report.count({
      where: {
        user_id: userId,
        created_at: { gte: oneHourAgo },
      },
    });
  },
};
