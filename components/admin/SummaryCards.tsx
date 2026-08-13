'use client'

/**
 * components/admin/SummaryCards.tsx
 * Kartu ringkasan statistik untuk dashboard admin.
 * Req 10.1, 10.2, 10.4
 */

import Link from 'next/link'
import { ClipboardListIcon, FileTextIcon, ShieldCheckIcon, ReceiptIcon } from 'lucide-react'
import { useBookings } from '@/hooks/useBookings'
import { useAllReports } from '@/hooks/useReports'
import { useAllIdentityDocuments } from '@/hooks/useIdentity'
import { useMyInvoices } from '@/hooks/useInvoices'

function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card p-5 animate-pulse">
      <div className="h-4 w-24 bg-muted rounded mb-3" />
      <div className="h-8 w-12 bg-muted rounded mb-1" />
      <div className="h-3 w-32 bg-muted rounded" />
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  count: number
  description: string
  href: string
}

function StatCard({ icon, label, count, description, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="rounded-lg border bg-card p-5 hover:bg-muted/40 transition-colors block"
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-3xl font-bold">{count}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </Link>
  )
}

export function SummaryCards() {
  const bookings = useBookings()
  const reports = useAllReports()
  const identity = useAllIdentityDocuments()
  const invoices = useMyInvoices()

  const isLoading =
    bookings.isLoading || reports.isLoading || identity.isLoading || invoices.isLoading

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  const pendingBookings = (bookings.data ?? []).filter((b) => b.status === 'PENDING').length
  const openReports = (reports.data ?? []).filter((r) => r.status === 'OPEN').length
  const pendingIdentity = (identity.data ?? []).filter(
    (d) => d.verification_status === 'PENDING'
  ).length
  const pendingInvoices = (invoices.data ?? []).filter(
    (inv) => inv.type === 'EXTENSION' && inv.status === 'PAID'
  ).length

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<ClipboardListIcon className="size-4" />}
        label="Booking"
        count={pendingBookings}
        description="Menunggu persetujuan"
        href="/admin/bookings"
      />
      <StatCard
        icon={<FileTextIcon className="size-4" />}
        label="Laporan"
        count={openReports}
        description="Laporan terbuka"
        href="/admin/reports"
      />
      <StatCard
        icon={<ShieldCheckIcon className="size-4" />}
        label="Identitas"
        count={pendingIdentity}
        description="Menunggu verifikasi"
        href="/admin/identity"
      />
      <StatCard
        icon={<ReceiptIcon className="size-4" />}
        label="Invoice"
        count={pendingInvoices}
        description="Perpanjangan perlu disetujui"
        href="/admin/invoices"
      />
    </div>
  )
}
