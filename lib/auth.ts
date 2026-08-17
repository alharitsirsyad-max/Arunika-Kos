import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { otpService } from "@/lib/services/otp.service";

// Google provider hanya aktif jika credentials dikonfigurasi di .env
const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    ...googleProvider,

    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp_code: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const otpCode = credentials?.otp_code as string | undefined;

        if (!email) return null;

        // ── Alur OTP login ──────────────────────────────────────────────
        if (otpCode) {
          try {
            await otpService.verifyOtp(email, otpCode, "login");
          } catch {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, role: true, email_verified: true },
          });

          if (!user) return null;

          if (!user.email_verified) {
            await prisma.user.update({
              where: { id: user.id },
              data: { email_verified: true },
            });
          }

          return { id: user.id, name: user.name, email: user.email, role: user.role };
        }

        // ── Alur password login ─────────────────────────────────────────
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, name: true, email: true, password: true, role: true },
        });

        if (!user || !user.password) return null;

        const isValid = await compare(parsed.data.password, user.password);
        if (!isValid) return null;

        // Password benar → terbitkan JWT langsung (OTP hanya untuk registrasi)
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.emailVerified) {
          console.warn(`[SECURITY] Google login ditolak: email tidak terverifikasi | email=${user.email}`);
          return false;
        }

        const email = user.email!;
        const name = user.name ?? email.split("@")[0];
        const googleId = account.providerAccountId;
        const avatarUrl = user.image ?? undefined;

        const existing = await prisma.user.findFirst({
          where: { OR: [{ email }, { google_id: googleId }] },
        });

        if (!existing) {
          await prisma.user.create({
            data: { name, email, google_id: googleId, email_verified: true, avatar_url: avatarUrl, role: "USER" },
          });
        } else if (!existing.google_id) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { google_id: googleId, email_verified: true, avatar_url: avatarUrl ?? existing.avatar_url },
          });
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // Saat pertama login: set id dan role dari user object
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }

      // Req 6.2, 6.3: Refresh role dari DB saat token di-update
      // (trigger === "update" terjadi saat session.update() dipanggil dari client)
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, role: true, is_blocked: true },
        });
        // Req 6.3: Akun dihapus → invalidate token (NextAuth akan hapus cookie sesi)
        if (!dbUser) return null;
        if (dbUser.is_blocked) return null; // Akun diblokir → invalidate token
        token.role = dbUser.role;
      }

      // Google: refresh id dan role dari DB (untuk menangani first login Google)
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, role: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
});
