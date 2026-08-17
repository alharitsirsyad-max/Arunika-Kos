'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (confirm !== 'HAPUS AKUN') {
      setError('Ketik "HAPUS AKUN" untuk konfirmasi')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error?.message ?? 'Gagal menghapus akun')
        return
      }
      await signOut({ callbackUrl: '/' })
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-destructive">Zona Berbahaya</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Hapus akun Anda secara permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
      </div>

      {!showConfirm ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 className="size-4 mr-2" />
          Hapus Akun Permanen
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive space-y-1">
            <p className="font-semibold">⚠️ Peringatan: Tindakan ini tidak dapat dibatalkan!</p>
            <p>Semua data Anda akan dihapus permanen termasuk:</p>
            <ul className="list-disc list-inside text-xs space-y-0.5 mt-1">
              <li>Profil dan informasi akun</li>
              <li>Semua riwayat booking dan invoice</li>
              <li>Dokumen identitas</li>
              <li>Kontak darurat</li>
              <li>Semua notifikasi dan laporan</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Ketik <span className="font-mono font-bold">HAPUS AKUN</span> untuk konfirmasi
            </label>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="HAPUS AKUN"
              className="h-9 w-full rounded-lg border border-destructive/50 bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowConfirm(false); setConfirm(''); setError('') }}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={loading || confirm !== 'HAPUS AKUN'}
            >
              {loading ? 'Menghapus...' : 'Hapus Akun Sekarang'}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
