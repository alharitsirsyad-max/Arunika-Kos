import { NavbarPublic } from '@/components/layout/NavbarPublic'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <NavbarPublic />
      {children}
    </>
  )
}
