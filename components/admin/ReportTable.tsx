'use client'

/**
 * components/admin/ReportTable.tsx
 * Tabel laporan untuk admin: lihat detail, update status, tambah catatan.
 * Req 12.1 – 12.6
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { useAllReports, useUpdateReportStatus } from '@/hooks/useReports'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import type { Report, ReportStatus } from '@/types/api'

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

const REPORT_TYPE_LABELS: Record<string, string> = {
  WEBSITE_ISSUE: 'Masalah Website',
  ROOM_ISSUE: 'Masalah Kamar',
}

// ── Detail panel ───────────────────────────────────────────────────────────

interface DetailPanelProps {
  report: Report
  onClose: () => void
}

function DetailPanel({ report, onClose }: DetailPanelProps) {
  const [status, setStatus] = useState<ReportStatus>(report.status)
  const [adminNote, setAdminNote] = useState(report.admin_note ?? '')
  const updateStatus = useUpdateReportStatus(report.id)

  const handleSave = async () => {
    try {
      await updateStatus.mutateAsync({ status, admin_note: adminNote || undefined })
      toast.success('Status laporan diperbarui.')
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memperbarui laporan.')
    }
  }

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{REPORT_TYPE_LABELS[report.type] ?? report.type}</p>
          <h3 className="font-semibold mt-0.5">{report.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            oleh {report.user.name} · {formatDate(report.created_at)}
          </p>
        </div>
        <StatusBadge variant="report" status={report.status} />
      </div>

      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.description}</p>

      <div className="space-y-3 border-t pt-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-status" className="text-sm font-medium">
            Ubah Status
          </label>
          <select
            id="report-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ReportStatus)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="OPEN">Terbuka</option>
            <option value="IN_PROGRESS">Sedang Diproses</option>
            <option value="RESOLVED">Selesai</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-note" className="text-sm font-medium">
            Catatan Admin <span className="text-muted-foreground font-normal">(opsional)</span>
          </label>
          <textarea
            id="admin-note"
            rows={3}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Tulis catatan penanganan..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={updateStatus.isPending}>
            Batal
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateStatus.isPending}>
            {updateStatus.isPending ? (
              <span className="flex items-center gap-1.5">
                <LoadingSpinner size="sm" />
                Menyimpan...
              </span>
            ) : (
              'Simpan'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Row ────────────────────────────────────────────────────────────────────

interface RowProps {
  report: Report
  isSelected: boolean
  onSelect: () => void
}

function ReportRow({ report, isSelected, onSelect }: RowProps) {
  return (
    <tr
      className={`border-b last:border-0 cursor-pointer transition-colors ${
        isSelected ? 'bg-muted/60' : 'hover:bg-muted/30'
      }`}
      onClick={onSelect}
    >
      <td className="px-4 py-3 text-sm font-medium">{report.user.name}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {REPORT_TYPE_LABELS[report.type] ?? report.type}
      </td>
      <td className="px-4 py-3 text-sm max-w-[200px] truncate">{report.title}</td>
      <td className="px-4 py-3">
        <StatusBadge variant="report" status={report.status} />
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(report.created_at)}</td>
    </tr>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function ReportTable() {
  const { data: reports, isLoading, isError, error, refetch } = useAllReports()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedReport = reports?.find((r) => r.id === selectedId) ?? null

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorMessage
        message={error instanceof ApiError ? error.message : 'Gagal memuat data laporan.'}
        onRetry={() => refetch()}
      />
    )
  }

  if (!reports || reports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Belum ada laporan masuk.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pelapor</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jenis</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Judul</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                isSelected={selectedId === report.id}
                onSelect={() => setSelectedId(selectedId === report.id ? null : report.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {reports.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => setSelectedId(selectedId === report.id ? null : report.id)}
            className={`w-full rounded-lg border bg-card p-4 text-left space-y-2 transition-colors ${
              selectedId === report.id ? 'bg-muted/60' : 'hover:bg-muted/30'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-sm">{report.title}</span>
              <StatusBadge variant="report" status={report.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {report.user.name} · {REPORT_TYPE_LABELS[report.type]} · {formatDate(report.created_at)}
            </p>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selectedReport && (
        <DetailPanel
          report={selectedReport}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
