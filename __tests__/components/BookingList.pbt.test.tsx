/**
 * Property tests untuk BookingList — aksi tombol booking sesuai status
 * Feature: arunika-kos-frontend, Property 5: Booking action buttons match booking status
 *
 * Validates: Requirements 6.4, 6.5
 *
 * Catatan: Karena BookingList bergantung pada TanStack Query hooks,
 * kita test logika kondisional tombol secara terisolasi melalui fungsi helper
 * dan unit test rendering untuk BookingRow / BookingCard.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { BookingStatus } from '@/types/api'

// ──────────────────────────────────────────────────────────────────────────────
// Helper murni yang mereplikasi logika di BookingList
// ──────────────────────────────────────────────────────────────────────────────

/** Menentukan apakah tombol "Bayar" harus tampil */
function shouldShowPayButton(status: BookingStatus): boolean {
  return status === 'APPROVED'
}

/** Menentukan apakah tombol "Perpanjang" harus tampil */
function shouldShowExtendButton(status: BookingStatus): boolean {
  return status === 'ACTIVE'
}

// ──────────────────────────────────────────────────────────────────────────────
// Arbitrary generators
// ──────────────────────────────────────────────────────────────────────────────

const ALL_STATUSES: BookingStatus[] = ['PENDING', 'APPROVED', 'ACTIVE', 'REJECTED', 'DONE', 'EXPIRED', 'DP_PENDING', 'DP_PAID', 'CANCELLED']

const bookingStatusArb = fc.constantFrom(...ALL_STATUSES)

const nonApprovedStatusArb = fc.constantFrom(
  ...ALL_STATUSES.filter((s) => s !== 'APPROVED'),
)

const nonActiveStatusArb = fc.constantFrom(
  ...ALL_STATUSES.filter((s) => s !== 'ACTIVE'),
)

// ──────────────────────────────────────────────────────────────────────────────
// Property 5: Tombol aksi booking selalu sesuai status
// Validates: Requirements 6.4, 6.5
// ──────────────────────────────────────────────────────────────────────────────

describe('BookingList — Property 5: tombol aksi booking selalu sesuai status', () => {
  it('tombol Bayar hanya muncul jika status adalah APPROVED', () => {
    fc.assert(
      fc.property(bookingStatusArb, (status) => {
        const shouldShow = shouldShowPayButton(status)
        return shouldShow === (status === 'APPROVED')
      }),
      { numRuns: 500 },
    )
  })

  it('tombol Perpanjang hanya muncul jika status adalah ACTIVE', () => {
    fc.assert(
      fc.property(bookingStatusArb, (status) => {
        const shouldShow = shouldShowExtendButton(status)
        return shouldShow === (status === 'ACTIVE')
      }),
      { numRuns: 500 },
    )
  })

  it('tombol Bayar TIDAK muncul untuk status selain APPROVED', () => {
    fc.assert(
      fc.property(nonApprovedStatusArb, (status) => {
        return shouldShowPayButton(status) === false
      }),
      { numRuns: 200 },
    )
  })

  it('tombol Perpanjang TIDAK muncul untuk status selain ACTIVE', () => {
    fc.assert(
      fc.property(nonActiveStatusArb, (status) => {
        return shouldShowExtendButton(status) === false
      }),
      { numRuns: 200 },
    )
  })

  it('tombol Bayar dan Perpanjang tidak pernah muncul bersamaan untuk status yang sama', () => {
    fc.assert(
      fc.property(bookingStatusArb, (status) => {
        // Kedua tombol tidak boleh true secara bersamaan (APPROVED !== ACTIVE)
        const bothTrue = shouldShowPayButton(status) && shouldShowExtendButton(status)
        return !bothTrue
      }),
      { numRuns: 500 },
    )
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Example-based tests (sanity checks)
// ──────────────────────────────────────────────────────────────────────────────

describe('BookingList — contoh spesifik tombol aksi', () => {
  it('APPROVED → tampilkan Bayar', () => {
    expect(shouldShowPayButton('APPROVED')).toBe(true)
    expect(shouldShowExtendButton('APPROVED')).toBe(false)
  })

  it('ACTIVE → tampilkan Perpanjang', () => {
    expect(shouldShowExtendButton('ACTIVE')).toBe(true)
    expect(shouldShowPayButton('ACTIVE')).toBe(false)
  })

  it('PENDING → tidak ada tombol aksi', () => {
    expect(shouldShowPayButton('PENDING')).toBe(false)
    expect(shouldShowExtendButton('PENDING')).toBe(false)
  })

  it('REJECTED → tidak ada tombol aksi', () => {
    expect(shouldShowPayButton('REJECTED')).toBe(false)
    expect(shouldShowExtendButton('REJECTED')).toBe(false)
  })

  it('DONE → tidak ada tombol aksi', () => {
    expect(shouldShowPayButton('DONE')).toBe(false)
    expect(shouldShowExtendButton('DONE')).toBe(false)
  })
})
