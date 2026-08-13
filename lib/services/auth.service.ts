import bcrypt from "bcryptjs";

import { ConflictError } from "@/lib/errors/AppError";
import { userRepo } from "@/lib/repositories/user.repo";
import type { RegisterInput } from "@/lib/validations/auth";

/**
 * bcrypt cost factor — minimum 12 per requirements (8.1).
 * Increasing this value increases hashing time exponentially.
 */
const BCRYPT_COST_FACTOR = 12;

/**
 * Safe user type returned by auth operations.
 * Never includes the password field (Requirement 8.2).
 */
export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: Date;
};

export const authService = {
  /**
   * Register a new user account.
   *
   * Steps:
   * 1. Check for duplicate email — throw ConflictError if already registered.
   * 2. Hash the password with bcrypt (cost factor ≥ 12).
   * 3. Persist the user via userRepo — password hash stored, never plain-text.
   * 4. Return the created user without the password field.
   *
   * Requirements: 8.1, 8.2, 8.3
   */
  async register(input: RegisterInput): Promise<SafeUser> {
    // 1. Cek duplikat email (Requirement 8.3 — generic error surface, but conflict is raised here)
    const existing = await userRepo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("Email sudah terdaftar");
    }

    // 2. Hash password dengan bcrypt cost factor ≥ 12 (Requirement 8.1)
    // CATATAN: password plain-text tidak pernah di-log atau disimpan
    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_COST_FACTOR);

    // 3. Simpan user — password yang disimpan adalah hash, bukan plain-text (Requirement 8.2)
    const user = await userRepo.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      phone: input.phone,
    });

    // 4. userRepo.create() sudah menggunakan safeUserSelect — tidak pernah return field password
    return user;
  },
};
