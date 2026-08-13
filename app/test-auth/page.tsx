'use client'

import { useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'

export default function TestAuthPage() {
  const { data: session, status } = useSession()

  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '', phone: '' })
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

  const style = {
    section: { marginTop: '1.5rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '6px' } as React.CSSProperties,
    input: { marginLeft: '0.5rem', padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px' } as React.CSSProperties,
    button: { marginTop: '0.75rem', padding: '6px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' } as React.CSSProperties,
    row: { marginBottom: '0.5rem' } as React.CSSProperties,
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '700px', margin: '0 auto' }}>
      <h1>🧪 Test: Auth</h1>
      <p style={{ color: '#666', fontSize: '0.875rem' }}>
        Seed accounts: <code>siti@example.com</code> / <code>user1234</code> &nbsp;|&nbsp;
        <code>admin@arunikakos.com</code> / <code>admin123!</code>
      </p>

      <div style={style.section}>
        <h2>Status Sesi</h2>
        <p>Status: <strong>{status}</strong></p>
        {session && (
          <>
            <pre style={{ background: '#f4f4f4', padding: '0.75rem', overflow: 'auto', fontSize: '0.8rem' }}>
              {JSON.stringify(session, null, 2)}
            </pre>
            <button style={style.button} onClick={() => { signOut({ redirect: false }); setResponse({ message: 'Signed out' }) }}>
              Sign Out
            </button>
          </>
        )}
      </div>

      <div style={style.section}>
        <h2>Register</h2>
        <form onSubmit={handleRegister}>
          <div style={style.row}><label>Nama:<input style={style.input} type="text" value={registerData.name} onChange={e => setRegisterData({ ...registerData, name: e.target.value })} required /></label></div>
          <div style={style.row}><label>Email:<input style={style.input} type="email" value={registerData.email} onChange={e => setRegisterData({ ...registerData, email: e.target.value })} required /></label></div>
          <div style={style.row}><label>Password:<input style={style.input} type="password" value={registerData.password} onChange={e => setRegisterData({ ...registerData, password: e.target.value })} required /></label></div>
          <div style={style.row}><label>Telepon:<input style={style.input} type="text" value={registerData.phone} onChange={e => setRegisterData({ ...registerData, phone: e.target.value })} required /></label></div>
          <button style={style.button} type="submit" disabled={loading}>Register</button>
        </form>
      </div>

      <div style={style.section}>
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <div style={style.row}><label>Email:<input style={style.input} type="email" value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} required /></label></div>
          <div style={style.row}><label>Password:<input style={style.input} type="password" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} required /></label></div>
          <button style={style.button} type="submit" disabled={loading}>Login</button>
        </form>
      </div>

      <div style={style.section}>
        <h2>Response</h2>
        <pre style={{ background: '#f4f4f4', padding: '0.75rem', overflow: 'auto', minHeight: '3rem', fontSize: '0.8rem' }}>
          {response !== null ? JSON.stringify(response, null, 2) : '— belum ada response —'}
        </pre>
      </div>
    </div>
  )
}
