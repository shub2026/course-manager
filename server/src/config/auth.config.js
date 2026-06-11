// JWT密钥必须通过环境变量配置，生产环境禁止使用默认值
const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
  console.error('❌ 错误: JWT_SECRET 环境变量未配置！')
  console.error('请在 .env 文件中设置 JWT_SECRET，例如：')
  console.error('JWT_SECRET=your-super-secret-key-here')
  console.error('\n生成随机密钥示例：')
  console.error('node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"')
  throw new Error('JWT_SECRET 环境变量未配置')
}

export const authConfig = {
  jwtSecret,
  jwtExpiresIn: '24h',
  jwtRefreshExpiresIn: '7d'
}
