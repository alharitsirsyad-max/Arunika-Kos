import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Cari semua booking DP_PAID/ACTIVE/DONE yang belum punya agreement
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['DP_PAID', 'ACTIVE', 'DONE'] },
      agreement: null,
    },
    select: {
      id: true,
      start_date: true,
      total_price: true,
      room_unit_id: true,
      status: true,
      user: { select: { name: true } },
    },
  })

  console.log(`Ditemukan ${bookings.length} booking tanpa agreement`)

  let created = 0
  let skipped = 0

  for (const booking of bookings) {
    try {
      await prisma.agreement.create({
        data: {
          booking_id: booking.id,
          room_unit_id: booking.room_unit_id,
          agreed_start_date: booking.start_date,
          agreed_price: booking.total_price,
          status: 'CONFIRMED',
          confirmed_at: new Date(),
        },
      })
      console.log(`✓ ${booking.user?.name ?? '?'} | ${booking.status} | ${booking.id.slice(0, 8)}`)
      created++
    } catch (e) {
      console.log(`⚠ Skip: ${booking.id.slice(0, 8)} — ${e.message}`)
      skipped++
    }
  }

  console.log(`\nSelesai: ${created} dibuat, ${skipped} dilewati`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
