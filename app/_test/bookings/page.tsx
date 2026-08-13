'use client'

import { useState, useEffect } from 'react'

interface Room {
  id: string
  name: string
  price: number
}

interface Booking {
  id: string
  room_unit_id?: string
  start_date: string
  duration_months: number
  total_price: number
  status: string
}

export default function TestBookingsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [response, setResponse] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({ room_id: '', start_date: '', duration_months: '1' })

  async function loadRooms() {
    try {
      const res = await fetch('/api/rooms')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setRooms(data.data)
      }
    } catch {
      // ignore
    }
  }

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
    loadRooms()
    loadBookings()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: form.room_id,
          start_date: form.start_date,
          duration_months: Number(form.duration_months),
        }),
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
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '900px' }}>
      <h1>Test: Bookings</h1>
      <a href="/_test">← Kembali ke index</a>

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Buat Booking</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Kamar: </label>
            <select
              value={form.room_id}
              onChange={(e) => setForm({ ...form, room_id: e.target.value })}
              required
            >
              <option value="">— pilih kamar —</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Rp {r.price.toLocaleString('id-ID')}/bulan)
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Tanggal Mulai: </label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Durasi (bulan): </label>
            <input
              type="number"
              min="1"
              value={form.duration_months}
              onChange={(e) => setForm({ ...form, duration_months: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={loading}>Buat Booking</button>
        </form>
      </section>

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Daftar Booking</h2>
        <button onClick={loadBookings} disabled={loading}>Refresh</button>
        <table style={{ marginTop: '0.75rem', borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Tanggal Mulai</th>
              <th style={th}>Durasi</th>
              <th style={th}>Total</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && (
              <tr><td colSpan={5} style={td}>Belum ada booking</td></tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id}>
                <td style={td}>{b.id.slice(0, 8)}…</td>
                <td style={td}>{b.start_date ? new Date(b.start_date).toLocaleDateString('id-ID') : '-'}</td>
                <td style={td}>{b.duration_months} bulan</td>
                <td style={td}>{b.total_price?.toLocaleString('id-ID') ?? '-'}</td>
                <td style={td}>{b.status}</td>
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
