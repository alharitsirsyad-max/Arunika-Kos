/**
 * Property tests untuk IdentityBanner
 * Feature: arunika-kos-frontend, Property 4: IdentityBanner renders correct banner for any status combination
 *
 * Validates: Requirements 6.2
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fc from 'fast-check'
import { IdentityBanner } from '@/components/dashboard/IdentityBanner'
import type { IdentityStatus } from '@/types/api'

// Mock next/link agar tidak butuh router
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Arbitrary untuk semua kombinasi IdentityStatus yang valid.
 * Kita generate semua 8 kombinasi boolean, termasuk yang "tidak masuk akal" secara logika
 * (misalnya is_verified: true & has_rejected: true) karena komponen harus menanganinya.
 */
const identityStatusArb = fc.record({
  is_verified: fc.boolean(),
  has_pending: fc.boolean(),
  has_rejected: fc.boolean(),
})

function renderBanner(status: IdentityStatus) {
  const { unmount } = render(<IdentityBanner status={status} />)
  return unmount
}

// ──────────────────────────────────────────────────────────────────────────────
// Property 4: Banner identitas selalu sesuai kombinasi status
// Validates: Requirements 6.2
// ──────────────────────────────────────────────────────────────────────────────

describe('IdentityBanner — Property 4: banner selalu sesuai kombinasi status', () => {
  it('tidak merender banner sama sekali jika is_verified: true', () => {
    fc.assert(
      fc.property(
        fc.record({
          is_verified: fc.constant(true),
          has_pending: fc.boolean(),
          has_rejected: fc.boolean(),
        }),
        (status) => {
          const { container, unmount } = render(<IdentityBanner status={status} />)
          const isEmpty = container.firstChild === null
          unmount()
          return isEmpty
        },
      ),
      { numRuns: 100 },
    )
  })

  it('merender banner kuning "sedang diverifikasi" jika is_verified: false dan has_pending: true', () => {
    fc.assert(
      fc.property(
        fc.record({
          is_verified: fc.constant(false),
          has_pending: fc.constant(true),
          has_rejected: fc.boolean(),
        }),
        (status) => {
          const unmount = renderBanner(status)
          const text = screen.queryByText(/sedang diverifikasi/i)
          unmount()
          return text !== null
        },
      ),
      { numRuns: 100 },
    )
  })

  it('merender banner merah "ditolak" dengan link ke /dashboard/identity jika is_verified: false, has_pending: false, has_rejected: true', () => {
    fc.assert(
      fc.property(
        fc.constant({ is_verified: false, has_pending: false, has_rejected: true }),
        (status) => {
          const unmount = renderBanner(status)
          const textEl = screen.queryByText(/ditolak/i)
          const link = screen.queryByRole('link', { name: /upload ulang/i })
          unmount()
          return textEl !== null && link !== null && (link as HTMLAnchorElement).href.includes('/dashboard/identity')
        },
      ),
      { numRuns: 10 },
    )
  })

  it('merender banner oranye "belum upload" dengan link ke /dashboard/identity jika is_verified: false, has_pending: false, has_rejected: false', () => {
    fc.assert(
      fc.property(
        fc.constant({ is_verified: false, has_pending: false, has_rejected: false }),
        (status) => {
          const unmount = renderBanner(status)
          const textEl = screen.queryByText(/belum mengupload/i)
          const link = screen.queryByRole('link', { name: /upload/i })
          unmount()
          return textEl !== null && link !== null && (link as HTMLAnchorElement).href.includes('/dashboard/identity')
        },
      ),
      { numRuns: 10 },
    )
  })

  it('tidak melempar error untuk semua kombinasi status yang mungkin', () => {
    fc.assert(
      fc.property(identityStatusArb, (status) => {
        expect(() => {
          const { unmount } = render(<IdentityBanner status={status} />)
          unmount()
        }).not.toThrow()
      }),
      { numRuns: 100 },
    )
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Example-based tests (sanity checks)
// ──────────────────────────────────────────────────────────────────────────────

describe('IdentityBanner — contoh spesifik', () => {
  it('tidak merender apapun jika is_verified: true', () => {
    const { container } = render(
      <IdentityBanner status={{ is_verified: true, has_pending: false, has_rejected: false }} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('merender teks "sedang diverifikasi" jika has_pending: true', () => {
    render(
      <IdentityBanner status={{ is_verified: false, has_pending: true, has_rejected: false }} />,
    )
    expect(screen.getByText(/sedang diverifikasi/i)).toBeInTheDocument()
  })

  it('merender teks "ditolak" dan link /dashboard/identity jika has_rejected: true', () => {
    render(
      <IdentityBanner status={{ is_verified: false, has_pending: false, has_rejected: true }} />,
    )
    expect(screen.getByText(/ditolak/i)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /upload ulang/i })
    expect(link).toHaveAttribute('href', '/dashboard/identity')
  })

  it('merender teks "belum mengupload" dan link /dashboard/identity jika keduanya false', () => {
    render(
      <IdentityBanner status={{ is_verified: false, has_pending: false, has_rejected: false }} />,
    )
    expect(screen.getByText(/belum mengupload/i)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /upload/i })
    expect(link).toHaveAttribute('href', '/dashboard/identity')
  })
})
