export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'kec-course-management-secret-key-2026',
  jwtExpiresIn: '24h',
  jwtRefreshExpiresIn: '7d'
}
