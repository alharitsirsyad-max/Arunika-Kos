export default function TestLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    return <p>Halaman ini hanya untuk development.</p>
  }
  return <>{children}</>
}
