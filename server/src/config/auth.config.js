// JWT密钥必须通过环境变量配置，生产环境禁止使用默认值
// 如果 dotenv 已正确加载，process.env.JWT_SECRET 应该存在
const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
  // 尝试动态加载 dotenv（作为后备方案）
  try {
    const dotenv = await import('dotenv')
    dotenv.config()
    const retrySecret = process.env.JWT_SECRET
    if (retrySecret) {
      console.warn('⚠️  JWT_SECRET 通过动态加载 dotenv 获取成功')
      console.warn('   建议在入口文件顶部添加: import "dotenv/config"')
    } else {
      throw new Error('JWT_SECRET not found in environment variables')
    }
  } catch (e) {
    console.error('❌ 错误: JWT_SECRET 环境变量未配置！')
    console.error('请在 .env 文件中设置 JWT_SECRET，例如：')
    console.error('JWT_SECRET=your-super-secret-key-here')
    console.error('\n生成随机密钥示例：')
    console.error('node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"')
    throw new Error('JWT_SECRET 环境变量未配置')
  }
}

export const authConfig = {
  jwtSecret,
  jwtExpiresIn: '24h',
  jwtRefreshExpiresIn: '7d'
}
