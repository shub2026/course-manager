import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { authConfig } from '../config/auth.config.js'

export class AuthService {
  static async login(username, password) {
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      throw new Error('用户名或密码错误')
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      throw new Error('用户名或密码错误')
    }

    if (!user.isActive) {
      throw new Error('账号已被禁用')
    }

    const token = this.generateToken(user)
    const refreshToken = this.generateRefreshToken(user)

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    await prisma.auditLog.create({
      data: {
        action: 'login',
        module: 'auth',
        operatorId: user.id,
        result: 'success',
        message: `${user.username} 登录系统`
      }
    })

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        realName: user.realName,
        email: user.email
      },
      token,
      refreshToken
    }
  }

  static async refreshToken(refreshTokenValue) {
    try {
      const decoded = jwt.verify(refreshTokenValue, authConfig.jwtSecret)

      if (decoded.type !== 'refresh') {
        throw new Error('无效的Token类型')
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      })

      if (!user || !user.isActive) {
        throw new Error('用户不存在或已被禁用')
      }

      const newToken = this.generateToken(user)
      return { token: newToken }
    } catch (error) {
      throw new Error('Refresh Token已过期或无效')
    }
  }

  static generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiresIn }
    )
  }

  static generateRefreshToken(user) {
    return jwt.sign(
      {
        id: user.id,
        type: 'refresh'
      },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtRefreshExpiresIn }
    )
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, authConfig.jwtSecret)
    } catch (error) {
      return null
    }
  }

  static async changePassword(userId, oldPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    const isValid = await bcrypt.compare(oldPassword, user.password)
    if (!isValid) {
      throw new Error('原密码错误')
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    return { message: '密码修改成功' }
  }
}
