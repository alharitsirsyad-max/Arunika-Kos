import type { Report, ReportType, ReportStatus } from "@prisma/client";

/**
 * Input for creating a new report (from user).
 */
export type CreateReportInput = {
  type: ReportType;
  title: string;
  description: string;
  image_url?: string;
};

/**
 * Input for updating a report's status (admin only).
 */
export type UpdateReportStatusInput = {
  status: "IN_PROGRESS" | "RESOLVED";
  admin_note?: string;
};

/**
 * Internal data used by the repository when creating a report.
 * Includes server-resolved fields not provided by the user.
 */
export type CreateReportData = {
  user_id: string;
  room_unit_id: string | null;
  type: ReportType;
  title: string;
  description: string;
  image_url?: string;
};

// Re-export Prisma types for convenience
export type { Report, ReportType, ReportStatus };
