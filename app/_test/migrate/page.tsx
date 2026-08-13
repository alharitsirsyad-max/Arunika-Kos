'use client'

/**
 * Halaman migrasi database sementara.
 * Hapus setelah migrasi berhasil dijalankan.
 */

import { useState } from 'react'

export default function MigratePage() {
  const [status, setStatus] = useState<string>('')
  const [running, setRunning] = useState(false)
  const [secret, setSecret] = useState('')

  const runMigration = async () => {
    if (!secret) { setStatus('❌ Masukkan AUTH_SECRET dulu'); return }
    setRunning(true)
    setStatus('⏳ Menjalankan migrasi...')

    try {
      const res = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-migrate-secret': secret,
        },
      })
      const data = await res.json()

      if (res.ok) {
        const results = data.data?.results as string[] ?? []
        setStatus('✅ BERHASIL!\n\n' + results.join('\n'))
      } else {
        setStatus('❌ GAGAL: ' + (data.error?.message ?? JSON.stringify(data)))
      }
    } catch (e) {
      setStatus('❌ Error: ' + String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Database Migration</h1>
      <p className="text-sm text-gray-600 mb-6">
        Migrasi untuk fitur OTP + Google OAuth. Jalankan sekali saja.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            AUTH_SECRET (dari .env)
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Masukkan nilai AUTH_SECRET dari file .env"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={runMigration}
          disabled={running}
          className="w-full bg-black text-white py-2 px-4 rounded text-sm font-medium disabled:opacity-50"
        >
          {running ? 'Menjalankan...' : 'Jalankan Migrasi'}
        </button>

        {status && (
          <pre className="bg-gray-100 rounded p-4 text-xs whitespace-pre-wrap">
            {status}
          </pre>
        )}
      </div>
    </div>
  )
}
