'use client'

import { useState, useEffect } from 'react'

interface Room {
  id: string
  name: string
  price: number
  description: string
  capacity: number
  facilities: string[]
}

export default function TestRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [response, setResponse] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const emptyForm = { name: '', price: '', description: '', capacity: '', facilities: '' }
  const [form, setForm] = useState(emptyForm)

  async function loadRooms() {
    try {
      const res = await fetch('/api/rooms')
      const data = await res.json()
      setResponse(data)
      if (data.success && Array.isArray(data.data)) {
        setRooms(data.data)
      }
    } catch (err) {
      setResponse({ error: String(err) })
    }
  }

  useEffect(() => {
    loadRooms()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      name: form.name,
      price: Number(form.price),
      description: form.description,
      capacity: Number(form.capacity),
      facilities: form.facilities.split(',').map((f) => f.trim()).filter(Boolean),
    }
    try {
      const url = editId ? `/api/rooms/${editId}` : '/api/rooms'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setResponse(data)
      setForm(emptyForm)
      setEditId(null)
      await loadRooms()
    } catch (err) {
      setResponse({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus kamar ini?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' })
      const data = await res.json()
      setResponse(data)
      await loadRooms()
    } catch (err) {
      setResponse({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(room: Room) {
    setEditId(room.id)
    setForm({
      name: room.name,
      price: String(room.price),
      description: room.description,
      capacity: String(room.capacity),
      facilities: room.facilities.join(', '),
    })
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '900px' }}>
      <h1>Test: Rooms</h1>
      <a href="/_test">← Kembali ke index</a>

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>{editId ? `Edit Kamar (ID: ${editId})` : 'Tambah Kamar'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Name: </label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Price (Rp): </label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Description: </label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Capacity: </label>
            <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Facilities (pisah koma): </label>
            <input value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} />
          </div>
          <button type="submit" disabled={loading}>{editId ? 'Update' : 'Tambah'}</button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm(emptyForm) }} style={{ marginLeft: '0.5rem' }}>
              Batal
            </button>
          )}
        </form>
      </section>

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Daftar Kamar</h2>
        <button onClick={loadRooms} disabled={loading}>Refresh</button>
        <table style={{ marginTop: '0.75rem', borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Nama</th>
              <th style={th}>Harga</th>
              <th style={th}>Kapasitas</th>
              <th style={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 && (
              <tr><td colSpan={5} style={td}>Belum ada kamar</td></tr>
            )}
            {rooms.map((r) => (
              <tr key={r.id}>
                <td style={td}>{r.id.slice(0, 8)}…</td>
                <td style={td}>{r.name}</td>
                <td style={td}>{r.price.toLocaleString('id-ID')}</td>
                <td style={td}>{r.capacity}</td>
                <td style={td}>
                  <button onClick={() => handleEdit(r)} style={{ marginRight: '0.25rem' }}>Edit</button>
                  <button onClick={() => handleDelete(r.id)}>Hapus</button>
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
