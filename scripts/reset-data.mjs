/**
 * Reset semua data kecuali 3 akun yang dipertahankan:
 * - siti@example.com
 * - budi@example.com
 * - admin@arunikakos.com
 *
 * Data yang dihapus:
 * - UnitStatusLog, Agreement, Payment, InvoiceItem, Invoice, Booking
 * - Report, Review, Notification, OtpCode
 * - IdentityDocument, EmergencyContact
 * - User selain 3 akun di atas
 * - RoomUnit status direset ke AVAILABLE
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const KEEP_EMAILS = [
  'siti@example.com',
  'budi@example.com',
  'admin@arunikakos.com',
]

async function main() {
  console.log('🔍 Mencari akun yang dipertahankan...')

  const keepUsers = await prisma.user.findMany({
    where: { email: { in: KEEP_EMAILS } },
    select: { id: true, email: true, name: true },
  })

  console.log('✓ Akun yang dipertahankan:')
  keepUsers.forEach(u => console.log(`  - ${u.name} (${u.email})`))

  if (keepUsers.length !== 3) {
    console.warn(`⚠ Ditemukan ${keepUsers.length} dari 3 akun yang diharapkan`)
  }

  const keepIds = keepUsers.map(u => u.id)

  console.log('\n🗑 Mulai reset data...')

  // 1. UnitStatusLog
  const { count: ulCount } = await prisma.unitStatusLog.deleteMany()
  console.log(`✓ UnitStatusLog: ${ulCount} dihapus`)

  // 2. Payment (via invoice)
  const { count: payCount } = await prisma.payment.deleteMany()
  console.log(`✓ Payment: ${payCount} dihapus`)

  // 3. InvoiceItem
  const { count: iiCount } = await prisma.invoiceItem.deleteMany()
  console.log(`✓ InvoiceItem: ${iiCount} dihapus`)

  // 4. Invoice
  const { count: invCount } = await prisma.invoice.deleteMany()
  console.log(`✓ Invoice: ${invCount} dihapus`)

  // 5. Agreement
  const { count: agCount } = await prisma.agreement.deleteMany()
  console.log(`✓ Agreement: ${agCount} dihapus`)

  // 6. Booking
  const { count: bkCount } = await prisma.booking.deleteMany()
  console.log(`✓ Booking: ${bkCount} dihapus`)

  // 7. Report
  const { count: rpCount } = await prisma.report.deleteMany()
  console.log(`✓ Report: ${rpCount} dihapus`)

  // 8. Review
  const { count: rvCount } = await prisma.review.deleteMany()
  console.log(`✓ Review: ${rvCount} dihapus`)

  // 9. Notification
  const { count: ntCount } = await prisma.notification.deleteMany()
  console.log(`✓ Notification: ${ntCount} dihapus`)

  // 10. OtpCode
  const { count: otpCount } = await prisma.otpCode.deleteMany()
  console.log(`✓ OtpCode: ${otpCount} dihapus`)

  // 11. IdentityDocument (semua user)
  const { count: idCount } = await prisma.identityDocument.deleteMany()
  console.log(`✓ IdentityDocument: ${idCount} dihapus`)

  // 12. EmergencyContact (semua user)
  const { count: ecCount } = await prisma.emergencyContact.deleteMany()
  console.log(`✓ EmergencyContact: ${ecCount} dihapus`)

  // 13. User selain yang dipertahankan
  const { count: userCount } = await prisma.user.deleteMany({
    where: { id: { notIn: keepIds } },
  })
  console.log(`✓ User lain: ${userCount} dihapus`)

  // 14. Reset verification_status semua user yang dipertahankan ke PENDING
  await prisma.user.updateMany({
    where: { id: { in: keepIds }, role: 'USER' },
    data: { verification_status: 'PENDING' },
  })
  console.log(`✓ verification_status user direset ke PENDING`)

  // 15. Reset semua RoomUnit ke AVAILABLE
  const { count: ruCount } = await prisma.roomUnit.updateMany({
    data: { status: 'AVAILABLE' },
  })
  console.log(`✓ RoomUnit: ${ruCount} unit direset ke AVAILABLE`)

  console.log('\n✅ Reset selesai! Database bersih.')
  console.log('Akun yang tersisa:')
  keepUsers.forEach(u => console.log(`  - ${u.email}`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
