import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Create sample banners
  const banners = await Promise.all([
    prisma.banner.create({
      data: {
        title: 'Christmas Service',
        imageUrl: 'https://images.unsplash.com/photo-1512819485746-6efb4c23b479?w=800&h=400&fit=crop',
        linkUrl: 'https://example.com/christmas',
        active: true,
        order: 1
      }
    }),
    prisma.banner.create({
      data: {
        title: 'New Year Prayer',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
        active: true,
        order: 2
      }
    }),
    prisma.banner.create({
      data: {
        title: 'Community Outreach',
        imageUrl: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&h=400&fit=crop',
        linkUrl: 'https://example.com/outreach',
        active: true,
        order: 3
      }
    })
  ])

  // Create sample services
  const services = await Promise.all([
    prisma.service.create({
      data: {
        title: 'Sunday Morning Service',
        description: 'Join us for worship and the Word of God',
        date: new Date(),
        hlsUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        isActive: true
      }
    }),
    prisma.service.create({
      data: {
        title: 'Wednesday Bible Study',
        description: 'Deep dive into Scripture',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    })
  ])

  // Create admin user
  await prisma.user.create({
    data: {
      title: 'Pastor',
      name: 'John',
      lastName: 'Doe',
      email: 'admin@church.com',
      phone: '+1234567890',
      approved: true,
      role: 'ADMIN'
    }
  })

  // Create sample users
  const sampleUsers = await Promise.all([
    prisma.user.create({
      data: {
        title: 'Mr.',
        name: 'James',
        lastName: 'Smith',
        email: 'james.smith@email.com',
        phone: '+1234567891',
        approved: true
      }
    }),
    prisma.user.create({
      data: {
        title: 'Mrs.',
        name: 'Mary',
        lastName: 'Johnson',
        email: 'mary.johnson@email.com',
        phone: '+1234567892',
        approved: true
      }
    }),
    prisma.user.create({
      data: {
        title: 'Dr.',
        name: 'Robert',
        lastName: 'Williams',
        email: 'robert.williams@email.com',
        phone: '+1234567893',
        approved: false
      }
    })
  ])

  // Create sample attendance records
  const attendance = await Promise.all([
    prisma.attendance.create({
      data: {
        userId: sampleUsers[0].id,
        serviceId: services[0].id
      }
    }),
    prisma.attendance.create({
      data: {
        userId: sampleUsers[1].id,
        serviceId: services[0].id
      }
    }),
    prisma.attendance.create({
      data: {
        userId: sampleUsers[0].id,
        serviceId: services[1].id
      }
    })
  ])

  // Create default service settings
  await prisma.serviceSettings.create({
    data: {
      appName: 'Church App',
      headerTitle: 'Church Service',
      sundayLabel: 'Sunday',
      sundayTime: '10:00 AM',
      wednesdayLabel: 'Wednesday',
      wednesdayTime: '7:00 PM',
      prayerLabel: 'Prayer',
      prayerTime: 'Daily 6:00 AM',
      authBackgroundUrl: null,
    }
  }).catch(() => {/* ignore if already seeded */})

  console.log('✅ Database seeded successfully!')
  console.log('👤 Admin user: admin@church.com (pending email setup)')
  console.log('📊 Created:', banners.length, 'banners')
  console.log('⛪ Created:', services.length, 'services')
  console.log('👥 Created:', sampleUsers.length + 1, 'users')
  console.log('📈 Created:', attendance.length, 'attendance records')
  console.log('⚙️  Service settings seeded')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
