/**
 * Hapus semua kamar lama dan tambahkan 10 kamar baru.
 * Setiap kamar memiliki 1 unit dengan nomor sama.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DESCRIPTION = `Kamar berukuran 3×3,5 m yang dirancang nyaman dan fungsional untuk kehidupan sehari-hari. Setiap kamar dilengkapi dengan tata letak yang efisien sehingga memberikan suasana lapang meski berukuran kompak. Sirkulasi udara terjaga baik berkat AC yang terpasang, sementara pencahayaan alami menerangi ruangan di siang hari. Kamar mandi dalam dengan closet duduk dan shower memberikan privasi serta kenyamanan tanpa perlu berbagi fasilitas. Tersedia meja dan kursi belajar yang ideal untuk bekerja maupun belajar, serta almari pakaian yang cukup luas. Cocok untuk mahasiswa atau pekerja yang membutuhkan hunian bersih, aman, dan nyaman dengan harga terjangkau.`

const FACILITIES = [
  'Kasur 100×200 cm (bantal, guling, sprei)',
  'Meja & kursi belajar',
  'Almari pakaian',
  'AC',
  'Kamar mandi dalam',
  'Closet duduk',
  'Shower',
]

async function main() {
  console.log('🗑 Menghapus semua kamar lama...')

  // Hapus data terkait terlebih dahulu karena ada foreign key
  await prisma.unitStatusLog.deleteMany()
  await prisma.roomImage.deleteMany()
  await prisma.roomUnit.deleteMany()
  await prisma.room.deleteMany()

  console.log('✓ Semua kamar lama dihapus')
  console.log('\n🏠 Membuat 10 kamar baru...')

  for (let i = 1; i <= 10; i++) {
    const roomNumber = String(i).padStart(2, '0')
    const roomName = `Kamar ${roomNumber}`

    const room = await prisma.room.create({
      data: {
        name: roomName,
        price: 3900000,
        period_months: 3,
        description: DESCRIPTION,
        facilities: FACILITIES,
        capacity: 1,
        units: {
          create: {
            room_number: roomNumber,
            status: 'AVAILABLE',
          },
        },
      },
    })

    console.log(`✓ ${roomName} (ID: ${room.id.slice(0, 8)})`)
  }

  console.log('\n✅ Selesai! 10 kamar berhasil dibuat.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
