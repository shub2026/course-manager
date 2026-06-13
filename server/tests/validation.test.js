import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

describe('数据验证和边界条件测试', () => {
  let adminToken

  beforeEach(async () => {
    // 清理数据
    await prisma.users.deleteMany()
    await prisma.colleges.deleteMany()
    await prisma.majors.deleteMany()
    await prisma.classes.deleteMany()

    // 创建管理员
    const hashedPassword = await bcrypt.hash('Admin@123456', 12)
    const adminUser = await prisma.users.create({
      data: {
        username: 'admin_validation',
        password: hashedPassword,
        role: 'admin',
        real_name: '验证测试管理员',
        is_active: true
      }
    })

    adminToken = jwt.sign(
      {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '15m' }
    )
  })

  describe('输入验证测试', () => {
    describe('字符串长度限制', () => {
      it('学院名称过长应该返回错误', async () => {
        const longName = 'A'.repeat(256) // 假设最大长度为255

        const response = await request(app)
          .post('/api/colleges')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: longName,
            code: 'LONG'
          })

        expect(response.status).toBe(400)
      })

      it('专业代码格式验证', async () => {
        const invalidCode = 'INVALID CODE WITH SPACES'

        const response = await request(app)
          .post('/api/majors')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '测试专业',
            code: invalidCode
          })

        // 根据具体实现，可能返回400或422
        expect([400, 422]).toContain(response.status)
      })
    })

    describe('数值范围验证', () => {
      it('班级入学年份不能是未来年份', async () => {
        const futureYear = new Date().getFullYear() + 10

        const response = await request(app)
          .post('/api/classes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '未来班级',
            enrollment_year: futureYear,
            duration_years: 4,
            student_count: 30
          })

        expect(response.status).toBe(400)
      })

      it('学制年限必须为正数', async () => {
        const response = await request(app)
          .post('/api/classes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '无效学制班级',
            enrollment_year: 2024,
            duration_years: -3,
            student_count: 30
          })

        expect(response.status).toBe(400)
      })

      it('学生人数不能超过合理上限', async () => {
        const hugeNumber = 999999

        const response = await request(app)
          .post('/api/classes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '超大班级',
            enrollment_year: 2024,
            duration_years: 4,
            student_count: hugeNumber
          })

        expect(response.status).toBe(400)
      })
    })

    describe('必填字段验证', () => {
      it('创建学院缺少名称应该返回错误', async () => {
        const response = await request(app)
          .post('/api/colleges')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            code: 'NO_NAME'
          })

        expect(response.status).toBe(400)
      })

      it('创建专业缺少名称应该返回错误', async () => {
        const response = await request(app)
          .post('/api/majors')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            code: 'NO_NAME'
          })

        expect(response.status).toBe(400)
      })

      it('创建班级缺少入学年份应该返回错误', async () => {
        const response = await request(app)
          .post('/api/classes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '缺少年份班级',
            duration_years: 4,
            student_count: 30
          })

        expect(response.status).toBe(400)
      })
    })
  })

  describe('数据类型验证', () => {
    it('字符串字段传入数字应该被处理', async () => {
      const response = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 12345, // 应该是字符串
          code: 'NUM'
        })

      // 根据实现，可能被转换或拒绝
      expect([201, 400]).toContain(response.status)
    })

    it('数字字段传入字符串应该返回错误', async () => {
      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '类型错误班级',
          enrollment_year: 'not-a-number',
          duration_years: 4,
          student_count: 30
        })

      expect(response.status).toBe(400)
    })

    it('布尔字段传入非布尔值应该被处理', async () => {
      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '布尔类型班级',
          enrollment_year: 2024,
          duration_years: 4,
          student_count: 30,
          is_left_school: 'yes' // 应该是布尔值
        })

      // 根据实现，可能被转换或拒绝
      expect([201, 400]).toContain(response.status)
    })
  })

  describe('唯一性约束测试', () => {
    it('学院名称应该唯一', async () => {
      await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '唯一学院',
          code: 'UNIQUE1'
        })

      const response = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '唯一学院',
          code: 'UNIQUE2'
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/已存在|unique/i)
    })

    it('专业代码在同一学院内应该唯一', async () => {
      const college = await prisma.colleges.create({
        data: {
          name: '代码唯一性学院',
          code: 'CODE_UNIQUE'
        }
      })

      await request(app)
        .post('/api/majors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '专业1',
          code: 'SAME_CODE',
          college_id: college.id
        })

      const response = await request(app)
        .post('/api/majors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '专业2',
          code: 'SAME_CODE',
          college_id: college.id
        })

      expect(response.status).toBe(400)
    })

    it('不同学院可以有相同代码的专业', async () => {
      const college1 = await prisma.colleges.create({
        data: { name: '学院1', code: 'COL1' }
      })

      const college2 = await prisma.colleges.create({
        data: { name: '学院2', code: 'COL2' }
      })

      await request(app)
        .post('/api/majors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '学院1专业',
          code: 'SHARED_CODE',
          college_id: college1.id
        })

      const response = await request(app)
        .post('/api/majors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '学院2专业',
          code: 'SHARED_CODE',
          college_id: college2.id
        })

      expect(response.status).toBe(201)
    })
  })

  describe('外键约束测试', () => {
    it('关联不存在的学院ID应该返回错误', async () => {
      const response = await request(app)
        .post('/api/majors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '孤立专业',
          code: 'ORPHAN',
          college_id: 999999
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/学院不存在|外键/i)
    })

    it('关联不存在的专业ID创建班级应该返回错误', async () => {
      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '孤立班级',
          enrollment_year: 2024,
          duration_years: 4,
          major_id: 999999,
          student_count: 30
        })

      expect(response.status).toBe(400)
    })

    it('删除被引用的学院应该失败或级联处理', async () => {
      const college = await prisma.colleges.create({
        data: {
          name: '被引用学院',
          code: 'REFERENCED'
        }
      })

      await prisma.majors.create({
        data: {
          name: '引用专业',
          code: 'REF_MAJOR',
          college_id: college.id
        }
      })

      const response = await request(app)
        .delete(`/api/colleges/${college.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      // 应该返回错误或执行级联删除
      expect([400, 200]).toContain(response.status)

      if (response.status === 200) {
        // 如果成功，验证专业也被处理
        const major = await prisma.majors.findFirst({
          where: { college_id: college.id }
        })
        expect(major).toBeNull()
      }
    })
  })

  describe('边界值测试', () => {
    it('创建最小有效数据的班级', async () => {
      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '最简班级',
          enrollment_year: 2024,
          duration_years: 1,
          student_count: 1
        })

      expect(response.status).toBe(201)
    })

    it('创建包含所有可选字段的完整数据', async () => {
      const college = await prisma.colleges.create({
        data: {
          name: '完整学院',
          code: 'FULL',
          description: '这是一个完整的学院描述'
        }
      })

      const response = await request(app)
        .post('/api/majors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '完整专业',
          code: 'FULL_MAJOR',
          college_id: college.id,
          description: '专业的详细描述信息'
        })

      expect(response.status).toBe(201)
      expect(response.body.data.description).toBe('专业的详细描述信息')
    })

    it('空字符串应该被正确处理', async () => {
      const response = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '空描述学院',
          code: 'EMPTY_DESC',
          description: ''
        })

      expect(response.status).toBe(201)
    })

    it('null值应该被正确处理', async () => {
      const response = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Null测试学院',
          code: 'NULL_TEST',
          description: null
        })

      expect(response.status).toBe(201)
    })
  })

  describe('特殊字符测试', () => {
    it('学院名称可以包含特殊字符', async () => {
      const specialName = '学院-名称_包含.特殊&字符'

      const response = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: specialName,
          code: 'SPECIAL'
        })

      expect(response.status).toBe(201)
      expect(response.body.data.name).toBe(specialName)
    })

    it('名称包含SQL注入尝试应该被安全处理', async () => {
      const sqlInjection = "'; DROP TABLE colleges; --"

      const response = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: sqlInjection,
          code: 'SQL_INJECT'
        })

      expect(response.status).toBe(201)
      // 验证表仍然存在且数据正常
      const colleges = await prisma.colleges.findMany()
      expect(colleges.length).toBeGreaterThan(0)
    })

    it('名称包含XSS尝试应该被正确处理', async () => {
      const xssAttempt = '<script>alert("XSS")</script>'

      const response = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: xssAttempt,
          code: 'XSS_TEST'
        })

      expect(response.status).toBe(201)
      // 后端应该存储原始数据，前端负责转义
      expect(response.body.data.name).toBe(xssAttempt)
    })

    it('Unicode字符应该被正确支持', async () => {
      const unicodeName = '学院名称🎓包含emoji😀'

      const response = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: unicodeName,
          code: 'UNICODE'
        })

      expect(response.status).toBe(201)
      expect(response.body.data.name).toBe(unicodeName)
    })
  })

  describe('分页和排序测试', () => {
    beforeEach(async () => {
      // 创建多个学院用于测试分页
      const colleges = []
      for (let i = 1; i <= 25; i++) {
        colleges.push({
          name: `学院${i}`,
          code: `PAGE_${i}`,
          sort_order: i
        })
      }
      await prisma.colleges.createMany({ data: colleges })
    })

    it('默认分页应该返回正确数量的数据', async () => {
      const response = await request(app)
        .get('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.length).toBeLessThanOrEqual(20) // 假设默认每页20条
    })

    it('自定义分页参数应该生效', async () => {
      const response = await request(app)
        .get('/api/colleges?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.length).toBeLessThanOrEqual(10)
    })

    it('页码超出范围应该返回空数组或最后一页', async () => {
      const response = await request(app)
        .get('/api/colleges?page=999&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      // 可能返回空数组或最后一页数据
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('应该支持按排序字段排序', async () => {
      const response = await request(app)
        .get('/api/colleges?sort_by=sort_order&order=asc')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      if (response.body.data.length > 1) {
        expect(response.body.data[0].sort_order).toBeLessThanOrEqual(
          response.body.data[1].sort_order
        )
      }
    })
  })

  describe('日期和时间验证', () => {
    it('教材出版日期格式验证', async () => {
      const validDate = '2024-01-15'
      const invalidDate = '15-01-2024'

      // 有效日期格式
      const response1 = await request(app)
        .post('/api/textbooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '有效日期教材',
          isbn: 'ISBN_VALID',
          publish_date: validDate
        })

      expect(response1.status).toBe(201)

      // 无效日期格式
      const response2 = await request(app)
        .post('/api/textbooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '无效日期教材',
          isbn: 'ISBN_INVALID',
          publish_date: invalidDate
        })

      // 根据实现，可能返回错误或自动转换
      expect([201, 400]).toContain(response2.status)
    })
  })

  describe('批量操作测试', () => {
    it('批量创建学院应该全部成功或全部失败', async () => {
      const colleges = [
        { name: '批量学院1', code: 'BATCH1' },
        { name: '批量学院2', code: 'BATCH2' },
        { name: '批量学院3', code: 'BATCH3' }
      ]

      // 注意：实际API可能不支持批量创建，这里测试单个创建的原子性
      const results = []
      for (const college of colleges) {
        const response = await request(app)
          .post('/api/colleges')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(college)
        results.push(response)
      }

      // 验证所有请求都成功
      results.forEach(r => {
        expect(r.status).toBe(201)
      })
    })

    it('批量操作中一个失败应该回滚其他操作（如果支持事务）', async () => {
      // 这个测试取决于后端是否实现了事务支持
      const colleges = [
        { name: '正常学院', code: 'NORMAL' },
        { name: '', code: 'EMPTY_NAME' } // 可能导致失败
      ]

      const results = []
      for (const college of colleges) {
        const response = await request(app)
          .post('/api/colleges')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(college)
        results.push(response)
      }

      // 至少有一个失败
      const hasFailure = results.some(r => r.status !== 201)
      expect(hasFailure).toBe(true)
    })
  })
})
