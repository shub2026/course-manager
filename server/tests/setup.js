import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

// 测试数据库配置
const TEST_DB_PATH = path.join(process.cwd(), 'test-kec.db')

// 设置测试环境变量
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = `file:${TEST_DB_PATH}`
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
process.env.JWT_DOWNLOAD_SECRET = 'test-download-secret'
process.env.LOG_LEVEL = 'error' // 减少测试日志输出

// 创建全局测试工具
global.testUtils = {
  // 重置数据库到干净状态
  async resetDatabase() {
    const prisma = new PrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_URL }
      }
    })

    try {
      // 删除所有表数据（按依赖顺序）
      await prisma.plan_textbooks.deleteMany()
      await prisma.plan_course_semesters.deleteMany()
      await prisma.plan_courses.deleteMany()
      await prisma.training_plans.deleteMany()
      await prisma.classes.deleteMany()
      await prisma.textbooks.deleteMany()
      await prisma.courses.deleteMany()
      await prisma.training_levels.deleteMany()
      await prisma.majors.deleteMany()
      await prisma.colleges.deleteMany()
      await prisma.audit_logs.deleteMany()
      await prisma.system_settings.deleteMany()
      await prisma.users.deleteMany()
    } finally {
      await prisma.$disconnect()
    }
  },

  // 创建测试用户
  async createTestUser(userData = {}) {
    const prisma = new PrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_URL }
      }
    })

    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash(userData.password || 'Test@123456', 12)

    const user = await prisma.users.create({
      data: {
        username: userData.username || `testuser_${Date.now()}`,
        password: hashedPassword,
        role: userData.role || 'viewer',
        real_name: userData.real_name || 'Test User',
        email: userData.email || 'test@example.com',
        is_active: userData.is_active !== undefined ? userData.is_active : true
      }
    })

    await prisma.$disconnect()
    return user
  },

  // 创建基础测试数据
  async seedTestData() {
    const prisma = new PrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_URL }
      }
    })

    // 创建学院
    const college = await prisma.colleges.create({
      data: {
        name: '测试学院',
        code: 'TEST001',
        description: '用于测试的学院'
      }
    })

    // 创建专业
    const major = await prisma.majors.create({
      data: {
        name: '计算机科学与技术',
        code: 'CS001',
        college_id: college.id
      }
    })

    // 创建培养层次
    const level = await prisma.training_levels.create({
      data: {
        name: '本科',
        code: 'UG',
        duration_years: 4
      }
    })

    // 创建课程
    const course = await prisma.courses.create({
      data: {
        name: '数据结构',
        code: 'CS201',
        type: 'professional'
      }
    })

    // 创建教材
    const textbook = await prisma.textbooks.create({
      data: {
        title: '数据结构教程',
        isbn: '978-7-111-12345-6',
        publisher: '测试出版社',
        author: '测试作者',
        price: 45.00
      }
    })

    await prisma.$disconnect()

    return { college, major, level, course, textbook }
  }
}

// 在每个测试套件前重置数据库
export default async function setup() {
  console.log('🧪 初始化测试环境...')

  // 确保测试数据库文件存在并包含正确的表结构
  if (!fs.existsSync(TEST_DB_PATH) || fs.statSync(TEST_DB_PATH).size === 0) {
    console.log('📦 创建测试数据库...')
    // 清理可能存在的空文件
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
    // 使用 prisma db push 创建测试数据库表结构
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` }
    })
  }

  // 重置数据库状态
  await global.testUtils.resetDatabase()
  console.log('✅ 测试环境准备完成')
}
