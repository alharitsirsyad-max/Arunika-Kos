import Link from 'next/link'

export default function TestIndexPage() {
  const pages = [
    { href: '/_test/auth', label: 'Auth', desc: 'Form register + login, status sesi' },
    { href: '/_test/rooms', label: 'Rooms', desc: 'Tambah, daftar, edit, hapus kamar' },
    { href: '/_test/bookings', label: 'Bookings', desc: 'Buat booking, daftar booking' },
    { href: '/_test/payment', label: 'Payment', desc: 'Midtrans Snap popup sandbox' },
    { href: '/_test/admin-actions', label: 'Admin Actions', desc: 'Approve / reject booking' },
    { href: '/_test/upload', label: 'Upload', desc: 'Upload gambar ke Cloudinary' },
  ]

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Frontend Uji Coba — Arunika Kos</h1>
      <p style={{ color: '#888' }}>Halaman ini hanya tersedia di development.</p>
      <ul style={{ marginTop: '1.5rem', listStyle: 'none', padding: 0 }}>
        {pages.map((p) => (
          <li key={p.href} style={{ marginBottom: '0.75rem' }}>
            <Link href={p.href} style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              {p.label}
            </Link>
            <span style={{ marginLeft: '0.75rem', color: '#555' }}>{p.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
