'use client'

import { useState, useEffect } from 'react'

interface Booking {
  id: string
  status: string
  duration_months: number
  total_price: number
  start_date: string
  user?: { name?: string; email?: string }
}

export default function TestAdminActionsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [response, setResponse] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  async function loadBookings() {
    try {
      const res = await fetch('/api/bookings')
      const data = await res.json()
      setResponse(data)
      if (data.success && Array.isArray(data.data)) {
        setBookings(data.data)
      }
    } catch (err) {
      setResponse({ error: String(err) })
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  async function handleUpdateStatus(bookingId: string, status: 'APPROVED' | 'REJECTED') {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      setResponse(data)
      await loadBookings()
    } catch (err) {
      setResponse({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '1000px' }}>
      <h1>Test: Admin Actions</h1>
      <a href="/_test">← Kembali ke index</a>
      <p style={{ color: '#888', marginTop: '0.5rem' }}>Membutuhkan sesi dengan role ADMIN.</p>

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Daftar Booking</h2>
        <button onClick={loadBookings} disabled={loading}>Refresh</button>
        <table style={{ marginTop: '0.75rem', borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>User</th>
              <th style={th}>Tanggal Mulai</th>
              <th style={th}>Durasi</th>
              <th style={th}>Total</th>
              <th style={th}>Status</th>
              <th style={th}>Aksi Admin</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && (
              <tr><td colSpan={7} style={td}>Belum ada booking</td></tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id}>
                <td style={td}>{b.id.slice(0, 8)}…</td>
                <td style={td}>{b.user?.name ?? b.user?.email ?? '-'}</td>
                <td style={td}>{b.start_date ? new Date(b.start_date).toLocaleDateString('id-ID') : '-'}</td>
                <td style={td}>{b.duration_months} bulan</td>
                <td style={td}>{b.total_price?.toLocaleString('id-ID') ?? '-'}</td>
                <td style={td}><strong>{b.status}</strong></td>
                <td style={td}>
                  <button
                    onClick={() => handleUpdateStatus(b.id, 'APPROVED')}
                    disabled={loading || b.status !== 'PENDING'}
                    style={{ marginRight: '0.25rem', background: b.status === 'PENDING' ? '#d4edda' : undefined }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(b.id, 'REJECTED')}
                    disabled={loading || b.status !== 'PENDING'}
                    style={{ background: b.status === 'PENDING' ? '#f8d7da' : undefined }}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>JSON Response</h2>
        <pre style={{ background: '#f4f4f4', padding: '0.75rem', overflow: 'auto', minHeight: '3rem' }}>
          {response !== null ? JSON.stringify(response) : '— belum ada response —'}
        </pre>
      </section>
    </div>
  )
}

const th: React.CSSProperties = { border: '1px solid #ccc', padding: '0.4rem 0.75rem', textAlign: 'left', background: '#eee' }
const td: React.CSSProperties = { border: '1px solid #ccc', padding: '0.4rem 0.75rem' }
