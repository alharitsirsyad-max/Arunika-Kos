import { NavbarUser } from '@/components/layout/NavbarUser'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <NavbarUser />
      {children}
    </>
  )
}
