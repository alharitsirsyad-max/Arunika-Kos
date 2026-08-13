'use client'

import { useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'

export default function TestAuthPage() {
  const { data: session, status } = useSession()

  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' })
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [response, setResponse] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      })
      const data = await res.json()
      setResponse(data)
    } catch (err) {
      setResponse({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: loginData.email,
        password: loginData.password,
        redirect: false,
      })
      setResponse(result)
    } catch (err) {
      setResponse({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await signOut({ redirect: false })
    setResponse({ message: 'Signed out' })
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '700px' }}>
      <h1>Test: Auth</h1>
      <a href="/_test">← Kembali ke index</a>

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Status Sesi</h2>
        <p>Status: <strong>{status}</strong></p>
        {session && (
          <pre style={{ background: '#f4f4f4', padding: '0.75rem', overflow: 'auto' }}>
            {JSON.stringify(session, null, 2)}
          </pre>
        )}
        {session && (
          <button onClick={handleSignOut} style={{ marginTop: '0.5rem' }}>
            Sign Out
          </button>
        )}
      </section>

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Register</h2>
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Name: </label>
            <input
              type="text"
              value={registerData.name}
              onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
              required
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Email: </label>
            <input
              type="email"
              value={registerData.email}
              onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              required
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Password: </label>
            <input
              type="password"
              value={registerData.password}
              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={loading}>Register</button>
        </form>
      </section>

      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Email: </label>
            <input
              type="email"
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              required
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Password: </label>
            <input
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={loading}>Login</button>
        </form>
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
