'use client'

import { useState } from 'react'
import { useUsers } from '@/hooks/useUsers'
import { UserDetailModal } from '@/components/admin/UserDetailModal'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { ApiError } from '@/lib/api'
import { StatusBadge } from '@/components/shared/StatusBadge'

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data: users, isLoading, isError, error, refetch } = useUsers(search || undefined)

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Daftar Pengguna</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Semua pengguna terdaftar. Klik nama untuk melihat detail.
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Cari nama atau email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9 w-full max-w-sm rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {isError && (
        <ErrorMessage
          message={error instanceof ApiError ? error.message : 'Gagal memuat pengguna.'}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && users && users.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          {search ? 'Tidak ada pengguna yang cocok.' : 'Belum ada pengguna.'}
        </p>
      )}

      {users && users.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telepon</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bergabung</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <td className="px-4 py-3 font-medium text-primary hover:underline">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs rounded-full px-2 py-0.5 bg-muted">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className="w-full rounded-lg border bg-card p-4 text-left space-y-1 hover:bg-muted/30 transition-colors"
              >
                <p className="font-medium text-primary">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{user.phone || '-'}</span>
                  <span>·</span>
                  <span>{user.role}</span>
                  <span>·</span>
                  <span>{formatDate(user.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Modal detail */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </main>
  )
}
