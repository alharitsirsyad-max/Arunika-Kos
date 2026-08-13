/**
 * Unit tests untuk NavbarPublic conditional rendering
 * Validates: Requirements 1.1, 1.2
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NavbarPublic } from '@/components/layout/NavbarPublic'

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

// Mock next/link sebagai komponen passthrough
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock komponen Button agar render children-nya langsung
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean; [key: string]: unknown }) => (
    <div data-testid="button" {...props}>{children}</div>
  ),
}))

import { useSession } from 'next-auth/react'

const mockUseSession = useSession as ReturnType<typeof vi.fn>

describe('NavbarPublic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Visitor (tidak login / unauthenticated)', () => {
    beforeEach(() => {
      // Requirements 1.1: Visitor tidak memiliki sesi
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })
    })

    it('menampilkan tombol Masuk', () => {
      render(<NavbarPublic />)
      expect(screen.getByText('Masuk')).toBeInTheDocument()
    })

    it('menampilkan tombol Daftar', () => {
      render(<NavbarPublic />)
      expect(screen.getByText('Daftar')).toBeInTheDocument()
    })

    it('tidak menampilkan tombol Dashboard', () => {
      render(<NavbarPublic />)
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    })

    it('tidak menampilkan nama user', () => {
      render(<NavbarPublic />)
      // Tidak ada teks nama user
      expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument()
    })

    it('menampilkan link Kamar dan logo Arunika Kos', () => {
      render(<NavbarPublic />)
      expect(screen.getByText('Arunika Kos')).toBeInTheDocument()
      expect(screen.getByText('Kamar')).toBeInTheDocument()
    })
  })

  describe('User login (authenticated)', () => {
    beforeEach(() => {
      // Requirements 1.2: User login memiliki sesi dengan data user
      mockUseSession.mockReturnValue({
        data: {
          user: { name: 'Budi Santoso', email: 'budi@example.com' },
        },
        status: 'authenticated',
      })
    })

    it('menampilkan nama user', () => {
      render(<NavbarPublic />)
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    it('menampilkan tombol Dashboard', () => {
      render(<NavbarPublic />)
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('tidak menampilkan tombol Masuk', () => {
      render(<NavbarPublic />)
      expect(screen.queryByText('Masuk')).not.toBeInTheDocument()
    })

    it('tidak menampilkan tombol Daftar', () => {
      render(<NavbarPublic />)
      expect(screen.queryByText('Daftar')).not.toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })
    })

    it('tidak menampilkan tombol Masuk saat loading', () => {
      render(<NavbarPublic />)
      expect(screen.queryByText('Masuk')).not.toBeInTheDocument()
    })

    it('tidak menampilkan tombol Daftar saat loading', () => {
      render(<NavbarPublic />)
      expect(screen.queryByText('Daftar')).not.toBeInTheDocument()
    })

    it('tidak menampilkan tombol Dashboard saat loading', () => {
      render(<NavbarPublic />)
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    })

    it('merender skeleton placeholder (div dengan animate-pulse)', () => {
      const { container } = render(<NavbarPublic />)
      // Loading state menampilkan div skeleton dengan class animate-pulse
      const skeleton = container.querySelector('.animate-pulse')
      expect(skeleton).toBeInTheDocument()
    })

    it('tidak melempar error saat loading', () => {
      // Render tidak boleh throw
      expect(() => render(<NavbarPublic />)).not.toThrow()
    })
  })
})
