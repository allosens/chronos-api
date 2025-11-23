// Test script to verify database connection and schema
import { PrismaClient } from '@prisma/client'

// Initialize Prisma client (will use config from prisma.config.ts)
const prisma = new PrismaClient()

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test 1: Count companies
    const companies = await prisma.company.count()
    console.log(`✅ Companies in database: ${companies}`)
    
    // Test 2: Count users by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    })
    console.log('✅ Users by role:', usersByRole)
    
    // Test 3: Get company with users
    const companyWithUsers = await prisma.company.findFirst({
      include: {
        users: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })
    console.log('✅ Company with users:', JSON.stringify(companyWithUsers, null, 2))
    
    console.log('🎉 Database connection and schema are working perfectly!')
  } catch (error) {
    console.error('❌ Database test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()