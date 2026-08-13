'use client'

import { useState } from 'react'

export default function TestUploadPage() {
  const [roomId, setRoomId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [response, setResponse] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    if (!roomId.trim()) {
      alert('Masukkan Room ID terlebih dahulu.')
      return
    }
    setLoading(true)
    setImageUrl('')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/rooms/${roomId.trim()}/images`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setResponse(data)
      if (data.success && data.data?.image_url) {
        setImageUrl(data.data.image_url)
      }
    } catch (err) {
      setResponse({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '700px' }}>
      <h1>Test: Upload Gambar</h1>
      <a href="/_test">← Kembali ke index</a>
      <p style={{ color: '#888', marginTop: '0.5rem' }}>
        Hanya JPEG/PNG, maks 5 MB. Membutuhkan sesi login dan Room ID yang valid.
      </p>

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Form Upload</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Room ID: </label>
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="UUID kamar"
              style={{ width: '320px' }}
              required
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label>File Gambar: </label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <button type="submit" disabled={loading || !file}>
            {loading ? 'Mengupload…' : 'Upload'}
          </button>
        </form>
      </section>

      {imageUrl && (
        <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
          <h2>Hasil Upload</h2>
          <p>URL: <a href={imageUrl} target="_blank" rel="noreferrer">{imageUrl}</a></p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Hasil upload" style={{ marginTop: '0.5rem', maxWidth: '100%', maxHeight: '300px' }} />
        </section>
      )}

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>JSON Response</h2>
        <pre style={{ background: '#f4f4f4', padding: '0.75rem', overflow: 'auto', minHeight: '3rem' }}>
          {response !== null ? JSON.stringify(response) : '— belum ada response —'}
        </pre>
      </section>
    </div>
  )
}
