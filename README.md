# Arunika Kos

Sistem manajemen kos-kosan berbasis web — dibangun dengan Next.js, Prisma, Midtrans, dan Cloudinary.

## Tech Stack

| Layer | Tools |
|---|---|
| Framework | Next.js 14+ (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| ORM | Prisma |
| Database | PostgreSQL (Supabase/Neon) |
| Auth | Auth.js v5 (NextAuth) |
| Payment | Midtrans Snap |
| Storage | Cloudinary |
| Validasi | Zod + React Hook Form |

## Setup Awal

### 1. Clone & Install

```bash
git clone <repo-url>
cd arunika-kos
npm install
```

### 2. Konfigurasi Environment

```bash
cp .env.example .env
```

Edit `.env` dan isi semua variabel yang diperlukan:
- `DATABASE_URL` — connection string PostgreSQL dari Supabase/Neon
- `AUTH_SECRET` — random string (`openssl rand -base64 32`)
- `MIDTRANS_SERVER_KEY` & `MIDTRANS_CLIENT_KEY` — dari dashboard Midtrans Sandbox
- `CLOUDINARY_*` — dari dashboard Cloudinary

### 3. Setup Database

```bash
# Push skema ke database
npm run db:push

# Atau gunakan migration (direkomendasikan untuk production)
npm run db:migrate

# Buat data awal (admin account + contoh kamar)
npm run db:seed
```

### 4. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

**Login Admin Default:**
- Email: `admin@arunikakos.com`
- Password: `admin123!`

## Struktur Project

```
arunika-kos/
├── app/
│   ├── (public)/          # Landing, katalog kamar, login, register
│   ├── (user)/dashboard/  # Dashboard penyewa
│   ├── (admin)/admin/     # Dashboard admin
│   └── api/               # Route handlers (backend)
├── lib/
│   ├── auth.ts            # Konfigurasi Auth.js
│   ├── prisma.ts          # Prisma client singleton
│   ├── midtrans.ts        # Midtrans Snap client
│   ├── utils.ts           # Helper functions
│   └── validations/       # Zod schemas
├── prisma/
│   ├── schema.prisma      # Skema database
│   └── seed.ts            # Data awal
├── types/
│   └── next-auth.d.ts     # Type augmentation untuk session
└── middleware.ts          # Proteksi route admin/user
```

## API Endpoints

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/rooms` | Publik | Daftar tipe kamar |
| POST | `/api/rooms` | Admin | Buat tipe kamar |
| GET | `/api/rooms/:id` | Publik | Detail tipe kamar |
| PUT | `/api/rooms/:id` | Admin | Update tipe kamar |
| DELETE | `/api/rooms/:id` | Admin | Hapus tipe kamar |
| GET | `/api/rooms/:id/units` | Publik | List unit kamar |
| POST | `/api/rooms/:id/units` | Admin | Tambah unit kamar |
| POST | `/api/rooms/:id/images` | Admin | Upload foto kamar |
| DELETE | `/api/rooms/:id/images` | Admin | Hapus foto kamar |
| GET | `/api/bookings` | Auth | Daftar booking |
| POST | `/api/bookings` | User | Buat booking |
| GET | `/api/bookings/:id` | Auth | Detail booking |
| PUT | `/api/bookings/:id` | Admin | Approve/reject |
| POST | `/api/auth/register` | Publik | Registrasi |
| POST | `/api/payments` | User | Buat Snap token |
| POST | `/api/payments/notification` | Midtrans | Webhook |
| POST | `/api/reviews` | User | Kirim review |
| GET | `/api/users` | Admin | Daftar pengguna |
| GET | `/api/reports` | Admin | Laporan pendapatan |

## Scripts

```bash
npm run dev          # Development server
npm run build        # Build production
npm run start        # Jalankan production build
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Jalankan migration database
npm run db:push      # Push skema ke database (tanpa migration)
npm run db:studio    # Buka Prisma Studio (GUI database)
npm run db:seed      # Isi data awal
```

## Deployment

1. Push ke GitHub
2. Connect repo di [Vercel](https://vercel.com)
3. Tambahkan semua environment variables di Vercel dashboard
4. Vercel otomatis deploy saat push ke `main`

> Pastikan `NEXTAUTH_URL` diubah ke URL production saat deploy.
