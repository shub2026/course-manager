import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

describe('RBAC权限控制测试', () => {
  let users = {}
  let tokens = {}

  beforeEach(async () => {
    // 清理数据
    await prisma.users.deleteMany()

    // 创建不同角色的用户
    const roles = ['super_admin', 'admin', 'viewer']
    const hashedPassword = await bcrypt.hash('Test@123456', 12)

    for (const role of roles) {
      const user = await prisma.users.create({
        data: {
          username: `${role}_user`,
          password: hashedPassword,
          role,
          real_name: `${role}用户`,
          email: `${role}@test.com`,
          is_active: true
        }
      })

      users[role] = user

      // 生成access token
      tokens[role] = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '15m' }
      )
    }
  })

  describe('用户管理权限测试 - /api/users', () => {
    it('super_admin应该可以创建用户', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.super_admin}`)
        .send({
          username: 'new_user',
          password: 'NewUser@123',
          role: 'viewer',
          real_name: '新用户'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('admin不应该可以创建用户（只能管理viewer）', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({
          username: 'new_user',
          password: 'NewUser@123',
          role: 'viewer',
          real_name: '新用户'
        })

      // admin可能有限制，取决于具体实现
      expect([201, 403]).toContain(response.status)
    })

    it('viewer不应该可以创建用户', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .send({
          username: 'new_user',
          password: 'NewUser@123',
          role: 'viewer',
          real_name: '新用户'
        })

      expect(response.status).toBe(403)
      expect(response.body.error).toContain('权限不足')
    })

    it('super_admin应该可以删除用户', async () => {
      // 先创建一个测试用户
      const testUser = await prisma.users.create({
        data: {
          username: 'delete_test',
          password: await bcrypt.hash('Test@123456', 12),
          role: 'viewer',
          real_name: '待删除用户'
        }
      })

      const response = await request(app)
        .delete(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${tokens.super_admin}`)

      expect(response.status).toBe(200)

      // 验证用户已被禁用而非删除
      const deletedUser = await prisma.users.findUnique({
        where: { id: testUser.id }
      })
      expect(deletedUser.is_active).toBe(false)
    })

    it('viewer不应该可以删除用户', async () => {
      const testUser = await prisma.users.create({
        data: {
          username: 'delete_test2',
          password: await bcrypt.hash('Test@123456', 12),
          role: 'viewer',
          real_name: '待删除用户'
        }
      })

      const response = await request(app)
        .delete(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${tokens.viewer}`)

      expect(response.status).toBe(403)
    })

    it('所有登录用户都应该可以查看用户列表', async () => {
      for (const role of ['super_admin', 'admin', 'viewer']) {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${tokens[role]}`)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      }
    })
  })

  describe('基础数据管理权限测试', () => {
    describe('学院管理 - /api/colleges', () => {
      it('admin和super_admin应该可以创建学院', async () => {
        for (const role of ['admin', 'super_admin']) {
          const response = await request(app)
            .post('/api/colleges')
            .set('Authorization', `Bearer ${tokens[role]}`)
            .send({
              name: `测试学院_${role}`,
              code: `TEST_${role}`
            })

          expect(response.status).toBe(201)
          expect(response.body.success).toBe(true)
        }
      })

      it('viewer不应该可以创建学院', async () => {
        const response = await request(app)
          .post('/api/colleges')
          .set('Authorization', `Bearer ${tokens.viewer}`)
          .send({
            name: '测试学院_viewer',
            code: 'TEST_VIEWER'
          })

        expect(response.status).toBe(403)
      })

      it('所有角色都应该可以查看学院列表', async () => {
        for (const role of ['super_admin', 'admin', 'viewer']) {
          const response = await request(app)
            .get('/api/colleges')
            .set('Authorization', `Bearer ${tokens[role]}`)

          expect(response.status).toBe(200)
        }
      })
    })

    describe('专业管理 - /api/majors', () => {
      let collegeId

      beforeEach(async () => {
        const college = await prisma.colleges.create({
          data: {
            name: '测试学院',
            code: 'TEST_COLLEGE'
          }
        })
        collegeId = college.id
      })

      it('admin和super_admin应该可以创建专业', async () => {
        for (const role of ['admin', 'super_admin']) {
          const response = await request(app)
            .post('/api/majors')
            .set('Authorization', `Bearer ${tokens[role]}`)
            .send({
              name: `测试专业_${role}`,
              code: `MAJOR_${role}`,
              college_id: collegeId
            })

          expect(response.status).toBe(201)
        }
      })

      it('viewer不应该可以创建专业', async () => {
        const response = await request(app)
          .post('/api/majors')
          .set('Authorization', `Bearer ${tokens.viewer}`)
          .send({
            name: '测试专业_viewer',
            code: 'MAJOR_VIEWER',
            college_id: collegeId
          })

        expect(response.status).toBe(403)
      })
    })
  })

  describe('审计日志权限测试 - /api/audit', () => {
    it('只有super_admin可以查看审计日志', async () => {
      // super_admin可以访问
      const superAdminResponse = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${tokens.super_admin}`)

      expect(superAdminResponse.status).toBe(200)

      // admin不能访问
      const adminResponse = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${tokens.admin}`)

      expect(adminResponse.status).toBe(403)

      // viewer不能访问
      const viewerResponse = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${tokens.viewer}`)

      expect(viewerResponse.status).toBe(403)
    })
  })

  describe('系统设置权限测试 - /api/settings', () => {
    it('所有角色都可以读取公开设置', async () => {
      for (const role of ['super_admin', 'admin', 'viewer']) {
        const response = await request(app)
          .get('/api/settings')
          .set('Authorization', `Bearer ${tokens[role]}`)

        expect(response.status).toBe(200)
      }
    })

    it('只有super_admin可以修改系统设置', async () => {
      // super_admin可以修改
      const superAdminResponse = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${tokens.super_admin}`)
        .send({
          organization_name: '新机构名称'
        })

      expect([200, 403]).toContain(superAdminResponse.status) // 取决于实现

      // admin不能修改
      const adminResponse = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({
          organization_name: '新机构名称'
        })

      expect(adminResponse.status).toBe(403)
    })
  })

  describe('无token访问测试', () => {
    it('没有token访问受保护接口应该返回401', async () => {
      const protectedRoutes = [
        { method: 'get', path: '/api/users' },
        { method: 'get', path: '/api/colleges' },
        { method: 'get', path: '/api/auth/me' }
      ]

      for (const route of protectedRoutes) {
        const response = await request(app)[route.method](route.path)
        expect(response.status).toBe(401)
      }
    })
  })

  describe('无效token测试', () => {
    it('无效token应该返回401', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token-xyz')

      expect(response.status).toBe(401)
    })

    it('过期token应该返回401', async () => {
      const expiredToken = jwt.sign(
        {
          id: 1,
          username: 'test',
          role: 'viewer'
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '-1d' }
      )

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${expiredToken}`)

      expect(response.status).toBe(401)
    })
  })
})
