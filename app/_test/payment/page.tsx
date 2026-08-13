'use client'

import { useState, useEffect } from 'react'

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: unknown) => void
          onPending?: (result: unknown) => void
          onError?: (result: unknown) => void
          onClose?: () => void
        }
      ) => void
    }
  }
}

export default function TestPaymentPage() {
  const [bookingId, setBookingId] = useState('')
  const [snapToken, setSnapToken] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')
  const [response, setResponse] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [snapReady, setSnapReady] = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '')
    script.onload = () => setSnapReady(true)
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  async function handleGetToken(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSnapToken('')
    setRedirectUrl('')
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      const data = await res.json()
      setResponse(data)
      if (data.success && data.data) {
        setSnapToken(data.data.token ?? '')
        setRedirectUrl(data.data.redirect_url ?? '')
      }
    } catch (err) {
      setResponse({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  function handleSnapPay() {
    if (!snapToken) {
      alert('Dapatkan token dulu.')
      return
    }
    if (!snapReady || !window.snap) {
      alert('Snap.js belum siap. Coba lagi sebentar.')
      return
    }
    window.snap.pay(snapToken, {
      onSuccess: (result: unknown) => setResponse({ event: 'success', result }),
      onPending: (result: unknown) => setResponse({ event: 'pending', result }),
      onError: (result: unknown) => setResponse({ event: 'error', result }),
      onClose: () => setResponse({ event: 'closed' }),
    })
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '700px' }}>
      <h1>Test: Payment (Midtrans Snap Sandbox)</h1>
      <a href="/_test">← Kembali ke index</a>
      <p style={{ color: '#888', marginTop: '0.5rem' }}>
        Snap.js status: {snapReady ? '✅ Siap' : '⏳ Memuat...'}
      </p>

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>1. Dapatkan Snap Token</h2>
        <form onSubmit={handleGetToken}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Booking ID (status APPROVED): </label>
            <input
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="UUID booking"
              style={{ width: '320px' }}
              required
            />
          </div>
          <button type="submit" disabled={loading}>Ambil Token</button>
        </form>

        {snapToken && (
          <div style={{ marginTop: '0.75rem' }}>
            <p><strong>Token:</strong> <code>{snapToken}</code></p>
            {redirectUrl && <p><strong>Redirect URL:</strong> <a href={redirectUrl} target="_blank" rel="noreferrer">{redirectUrl}</a></p>}
          </div>
        )}
      </section>

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>2. Buka Popup Snap</h2>
        <button onClick={handleSnapPay} disabled={!snapToken || !snapReady}>
          Bayar (Snap Popup)
        </button>
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
