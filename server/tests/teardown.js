import fs from 'fs'
import path from 'path'

// 测试结束后清理测试数据库
export default async function teardown() {
  const TEST_DB_PATH = path.join(process.cwd(), 'test-kec.db')
  const TEST_DB_DIR = path.join(process.cwd(), 'prisma/test-migrations')

  console.log('🧹 清理测试环境...')

  // 删除测试数据库文件
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH)
    console.log('🗑️  删除测试数据库文件')
  }

  // 删除相关的journal文件
  const journalFile = `${TEST_DB_PATH}-journal`
  if (fs.existsSync(journalFile)) {
    fs.unlinkSync(journalFile)
  }

  console.log('✅ 测试环境清理完成')
}
