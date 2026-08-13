'use client'

import { useState } from 'react'
import { UserDetailModal } from '@/components/admin/UserDetailModal'

interface ClickableUserNameProps {
  userId: string
  name: string
  className?: string
}

/**
 * ClickableUserName
 * Menampilkan nama user sebagai teks interaktif (underline).
 * Saat diklik, membuka UserDetailModal dengan data user lengkap.
 * Requirements: 2.1, 2.5
 */
export function ClickableUserName({ userId, name, className }: ClickableUserNameProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={[
          'underline decoration-dotted underline-offset-2',
          'text-primary hover:text-primary/80 transition-colors cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm',
          className ?? '',
        ].join(' ')}
        aria-label={`Lihat detail user ${name}`}
      >
        {name}
      </button>

      {isModalOpen && (
        <UserDetailModal
          userId={userId}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
