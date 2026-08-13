import { prisma } from "@/lib/prisma";
import type { Role, VerificationStatus } from "@prisma/client";
import type { UpdateProfileInput } from "@/lib/types/user.types";

/**
 * Data required to create a new user.
 * Password must already be hashed (bcrypt) before passing here.
 */
export type CreateUserData = {
  name: string;
  email: string;
  password: string; // pre-hashed
  phone: string;
  role?: Role;
  avatar_url?: string;
};

/**
 * Safe user select — never returns the password field.
 * Use this for all public-facing queries.
 */
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  avatar_url: true,
  created_at: true,
} as const;

export const userRepo = {
  /**
   * Find a user by ID.
   * Never returns the password field.
   */
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
  },

  /**
   * Find a user by email, including the hashed password.
   * This is the ONLY method that returns password — for bcrypt comparison during login.
   * Do NOT use this outside of the auth service.
   */
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true, // intentional — needed for bcrypt.compare in auth
        role: true,
        phone: true,
        avatar_url: true,
        created_at: true,
      },
    });
  },

  /**
   * Find all users, with optional search by name or email.
   * Never returns the password field.
   */
  async findAll(search?: string) {
    return prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: safeUserSelect,
      orderBy: { created_at: "desc" },
    });
  },

  /**
   * Create a new user.
   * Returns the created user without the password field.
   */
  async create(data: CreateUserData) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: data.role ?? "USER",
        avatar_url: data.avatar_url,
      },
      select: safeUserSelect,
    });
  },

  /**
   * Find a user by ID along with their identity documents and emergency contacts.
   * Used by admin to view full user detail (Fitur 2).
   * Requirements: 2.2
   */
  async findByIdWithDetails(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        verification_status: true,
        role: true,
        created_at: true,
        ownedDocuments: {
          select: {
            id: true,
            document_type: true,
            document_url: true,
            verification_status: true,
            verified_at: true,
            created_at: true,
          },
        },
        emergency_contacts: {
          select: {
            id: true,
            name: true,
            relationship: true,
            phone_number: true,
            created_at: true,
          },
          orderBy: { created_at: "asc" },
        },
      },
    });
  },

  /**
   * Update a user's personal profile (name, phone).
   * Simultaneously resets verification_status to PENDING to trigger re-verification.
   * Requirements: 8.2
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        verification_status: "PENDING" as VerificationStatus,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        verification_status: true,
      },
    });
  },
};
