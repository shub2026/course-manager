import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

describe('认证模块测试', () => {
  let testUser

  beforeEach(async () => {
    // 清理用户表
    await prisma.users.deleteMany()
    await prisma.audit_logs.deleteMany()

    // 创建测试用户
    const hashedPassword = await bcrypt.hash('Test@123456', 12)
    testUser = await prisma.users.create({
      data: {
        username: 'testuser',
        password: hashedPassword,
        role: 'admin',
        real_name: '测试用户',
        email: 'test@example.com',
        is_active: true
      }
    })
  })

  afterEach(async () => {
    await prisma.users.deleteMany()
    await prisma.audit_logs.deleteMany()
  })

  describe('POST /api/auth/login - 用户登录', () => {
    it('应该成功登录并返回tokens', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Test@123456'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('token')
      expect(response.body.data).toHaveProperty('refreshToken')
      expect(response.body.data).toHaveProperty('user')
      expect(response.body.data.user.username).toBe('testuser')
      expect(response.body.data.user.role).toBe('admin')
    })

    it('用户名错误应该返回401', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'wronguser',
          password: 'Test@123456'
        })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('用户名或密码错误')
    })

    it('密码错误应该返回401', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'WrongPassword'
        })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('用户名或密码错误')
    })

    it('缺少用户名应该返回422', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Test@123456'
        })

      expect(response.status).toBe(422)
    })

    it('缺少密码应该返回422', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser'
        })

      expect(response.status).toBe(422)
    })

    it('禁用的用户应该拒绝登录', async () => {
      // 禁用用户
      await prisma.users.update({
        where: { id: testUser.id },
        data: { is_active: false }
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Test@123456'
        })

      expect(response.status).toBe(401)
      expect(response.body.message).toContain('账号已被禁用')
    })

    it('应该记录登录审计日志', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Test@123456'
        })

      const logs = await prisma.audit_logs.findMany({
        where: {
          module: 'auth',
          action: 'login'
        }
      })

      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].operator_id).toBe(testUser.id)
      expect(logs[0].result).toBe('success')
    })
  })

  describe('POST /api/auth/refresh - 刷新令牌', () => {
    let refreshToken

    beforeEach(() => {
      // 生成有效的刷新令牌（需要包含 type: 'refresh'）
      refreshToken = jwt.sign(
        {
          id: testUser.id,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
        { expiresIn: '7d' }
      )
    })

    it('应该使用有效的refresh token刷新access token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('token')
    })

    it('无效的refresh token应该返回401', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })

    it('过期的refresh token应该返回401', async () => {
      const expiredToken = jwt.sign(
        {
          id: testUser.id,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
        { expiresIn: '-1d' } // 已过期的token
      )

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken })

      expect(response.status).toBe(401)
    })

    it('缺少refresh token应该返回422', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})

      expect(response.status).toBe(422)
    })
  })

  describe('GET /api/auth/me - 获取当前用户信息', () => {
    let accessToken

    beforeEach(() => {
      accessToken = jwt.sign(
        {
          id: testUser.id,
          username: testUser.username,
          role: testUser.role
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '15m' }
      )
    })

    it('应该返回当前用户信息', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id', testUser.id)
      expect(response.body.data).toHaveProperty('username', 'testuser')
      expect(response.body.data).toHaveProperty('role', 'admin')
      expect(response.body.data.password).toBeUndefined() // 不应包含密码
    })

    it('没有token应该返回401', async () => {
      const response = await request(app)
        .get('/api/auth/me')

      expect(response.status).toBe(401)
    })

    it('无效的token应该返回401', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/auth/password - 修改密码', () => {
    let accessToken

    beforeEach(() => {
      accessToken = jwt.sign(
        {
          id: testUser.id,
          username: testUser.username,
          role: testUser.role
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '15m' }
      )
    })

    it('应该成功修改密码', async () => {
      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'Test@123456',
          newPassword: 'NewPassword@123'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      // 验证新密码可以登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'NewPassword@123'
        })

      expect(loginResponse.status).toBe(200)
    })

    it('旧密码错误应该返回401', async () => {
      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'WrongPassword',
          newPassword: 'NewPassword@123'
        })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })

    it('新旧密码相同应该返回200（API不校验）', async () => {
      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'Test@123456',
          newPassword: 'Test@123456'
        })

      // API 当前未实现新旧密码相同校验，会成功修改
      expect(response.status).toBe(200)
    })

    it('缺少必要参数应该返回422', async () => {
      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'Test@123456'
        })

      expect(response.status).toBe(422)
    })

    it('应该记录修改密码的审计日志', async () => {
      await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'Test@123456',
          newPassword: 'NewPassword@123'
        })

      const logs = await prisma.audit_logs.findMany({
        where: {
          module: 'auth',
          action: 'update'
        }
      })

      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].operator_id).toBe(testUser.id)
    })
  })

  describe('POST /api/auth/logout - 登出', () => {
    let accessToken

    beforeEach(() => {
      accessToken = jwt.sign(
        {
          id: testUser.id,
          username: testUser.username,
          role: testUser.role
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '15m' }
      )
    })

    it('应该成功登出', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('应该记录登出审计日志', async () => {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)

      const logs = await prisma.audit_logs.findMany({
        where: {
          module: 'auth',
          action: 'logout'
        }
      })

      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].operator_id).toBe(testUser.id)
    })
  })

  describe('速率限制测试', () => {
    it('多次登录失败应该触发速率限制', async () => {
      const attempts = []

      // 尝试多次登录（超过速率限制）
      for (let i = 0; i < 15; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testuser',
            password: 'WrongPassword'
          })
        attempts.push(response)
      }

      // 最后一次应该被速率限制
      const lastResponse = attempts[attempts.length - 1]
      expect(lastResponse.status).toBe(429)
      expect(lastResponse.body.message).toContain('过于频繁')
    })
  })
})
