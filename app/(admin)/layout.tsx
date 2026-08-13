import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { NavbarAdmin } from '@/components/layout/NavbarAdmin'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fallback server-side role check in case middleware is bypassed
  const session = await auth()
  const userRole = (session?.user as { role?: string } | undefined)?.role

  if (!session || userRole !== 'ADMIN') {
    redirect('/forbidden')
  }

  return (
    <>
      <NavbarAdmin />
      {children}
    </>
  )
}
