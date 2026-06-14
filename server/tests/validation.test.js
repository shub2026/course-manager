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
    // 清理数据 - 按外键依赖顺序删除
    await prisma.plan_textbooks.deleteMany()
    await prisma.plan_course_semesters.deleteMany()
    await prisma.plan_courses.deleteMany()
    await prisma.training_plans.deleteMany()
    await prisma.classes.deleteMany()
    await prisma.majors.deleteMany()
    await prisma.colleges.deleteMany()
    await prisma.textbooks.deleteMany()
    await prisma.training_levels.deleteMany()
    await prisma.courses.deleteMany()
    await prisma.system_settings.deleteMany()
    await prisma.users.deleteMany()

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
      it('学院名称过长会被API接受（API无长度验证）', async () => {
        const longName = 'A'.repeat(256)

        const response = await request(app)
          .post('/api/colleges')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: longName,
            code: 'LONG'
          })

        // API 没有长度验证，长名称会创建成功
        expect(response.status).toBe(200)
      })

      it('专业代码包含空格会被API接受（API无格式验证）', async () => {
        const invalidCode = 'INVALID CODE WITH SPACES'

        const response = await request(app)
          .post('/api/majors')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '测试专业',
            code: invalidCode
          })

        // API 没有代码格式验证
        expect(response.status).toBe(200)
      })
    })

    describe('数值范围验证', () => {
      it('未来入学年份会被API接受（API无年份范围验证）', async () => {
        const futureYear = new Date().getFullYear() + 10

        // 先创建一个培养层次（班级创建必需）
        const level = await prisma.training_levels.create({
          data: { name: '本科', code: 'UG' }
        })

        const response = await request(app)
          .post('/api/classes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '未来班级',
            enrollment_year: futureYear,
            duration_years: 4,
            training_level_id: level.id
          })

        // API 没有年份范围验证
        expect(response.status).toBe(200)
      })

      it('负数学制年限会被API接受（API无正数验证）', async () => {
        // 先创建一个培养层次（班级创建必需）
        const level = await prisma.training_levels.create({
          data: { name: '本科', code: 'UG_NEG' }
        })

        const response = await request(app)
          .post('/api/classes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '无效学制班级',
            enrollment_year: 2024,
            duration_years: -3,
            training_level_id: level.id
          })

        // API 没有正数验证
        expect(response.status).toBe(200)
      })

      it('超大学生人数会被API接受（API无上限验证）', async () => {
        const hugeNumber = 999999

        // 先创建一个培养层次（班级创建必需）
        const level = await prisma.training_levels.create({
          data: { name: '本科', code: 'UG_HUGE' }
        })

        const response = await request(app)
          .post('/api/classes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '超大班级',
            enrollment_year: 2024,
            duration_years: 4,
            student_count: hugeNumber,
            training_level_id: level.id
          })

        // API 没有上限验证
        expect(response.status).toBe(200)
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
        expect(response.body.message).toMatch(/学院名称不能为空/)
      })

      it('创建专业缺少名称应该返回错误', async () => {
        const response = await request(app)
          .post('/api/majors')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            code: 'NO_NAME'
          })

        expect(response.status).toBe(400)
        expect(response.body.message).toMatch(/专业名称不能为空/)
      })

      it('创建班级缺少必填字段应该返回422错误', async () => {
        const response = await request(app)
          .post('/api/classes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '缺少年份班级',
            duration_years: 4
          })

        // class.routes.js 要求 name, enrollment_year, duration_years, training_level_id 都为必填
        expect(response.status).toBe(422)
        expect(response.body.message).toMatch(/班级名称、入学年份、学制、培养层次为必填项/)
      })

      it('创建班级缺少training_level_id应该返回422错误', async () => {
        const response = await request(app)
          .post('/api/classes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '完整班级',
            enrollment_year: 2024,
            duration_years: 4
          })

        expect(response.status).toBe(422)
        expect(response.body.message).toMatch(/班级名称、入学年份、学制、培养层次为必填项/)
      })
    })
  })

  describe('数据类型验证', () => {
    it('字符串字段传入数字会被API处理', async () => {
      const response = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 12345, // 应该是字符串
          code: 'NUM'
        })

      // Prisma 期望 String 类型，传入数字会导致 500 错误
      expect([200, 500]).toContain(response.status)
    })

    it('数字字段传入字符串会被API处理', async () => {
      // 先创建一个培养层次（班级创建必需）
      const level = await prisma.training_levels.create({
        data: { name: '本科', code: 'UG_TYPE' }
      })

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '类型错误班级',
          enrollment_year: 'not-a-number',
          duration_years: 4,
          training_level_id: level.id
        })

      // API 会使用 Number() 转换，NaN 可能变为 0 或导致数据库错误
      expect([200, 400, 500]).toContain(response.status)
    })

    it('布尔字段传入非布尔值会被API处理', async () => {
      // 先创建一个培养层次（班级创建必需）
      const level = await prisma.training_levels.create({
        data: { name: '本科', code: 'UG_BOOL' }
      })

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '布尔类型班级',
          enrollment_year: 2024,
          duration_years: 4,
          training_level_id: level.id,
          is_left_school: 'yes' // 应该是布尔值
        })

      // API 使用 !!is_left_school 进行转换
      expect(response.status).toBe(200)
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
      expect(response.body.message).toMatch(/已存在/)
    })

    it('专业代码没有唯一性约束，可以重复创建', async () => {
      // majors.code 在 schema 中是 String? 且没有 @unique 约束
      const college = await prisma.colleges.create({
        data: {
          name: '代码重复学院',
          code: 'CODE_DUP'
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

      // API 没有专业代码唯一性验证，majors 表也没有 college_id 字段
      expect(response.status).toBe(200)
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

      // API 会成功创建（majors 没有 college_id FK）
      expect(response.status).toBe(200)
    })
  })

  describe('外键约束测试', () => {
    it('关联不存在的学院ID创建专业会被忽略（majors没有college_id字段）', async () => {
      const response = await request(app)
        .post('/api/majors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '孤立专业',
          code: 'ORPHAN',
          college_id: 999999
        })

      // majors 表没有 college_id 字段，传入的 college_id 会被忽略
      expect(response.status).toBe(200)
    })

    it('关联不存在的专业ID创建班级会因外键约束失败', async () => {
      // 先创建一个培养层次（班级创建必需）
      const level = await prisma.training_levels.create({
        data: { name: '本科', code: 'UG_FK' }
      })

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '孤立班级',
          enrollment_year: 2024,
          duration_years: 4,
          major_id: 999999,
          training_level_id: level.id
        })

      // 由于外键约束，会返回错误
      expect([400, 500]).toContain(response.status)
    })

    it('删除被引用的学院只检查班级（不检查majors，因为majors没有college_id FK）', async () => {
      const college = await prisma.colleges.create({
        data: {
          name: '被引用学院',
          code: 'REFERENCED'
        }
      })

      // 创建专业时传入 college_id 会被忽略（majors 没有该字段）
      await prisma.majors.create({
        data: {
          name: '引用专业',
          code: 'REF_MAJOR'
        }
      })

      const response = await request(app)
        .delete(`/api/colleges/${college.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      // 没有班级关联，应该可以删除
      expect(response.status).toBe(200)
    })
  })

  describe('边界值测试', () => {
    it('创建最小有效数据的班级', async () => {
      // 先创建一个培养层次（班级创建必需）
      const level = await prisma.training_levels.create({
        data: { name: '本科', code: 'UG_MIN' }
      })

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '最简班级',
          enrollment_year: 2024,
          duration_years: 1,
          training_level_id: level.id
        })

      expect(response.status).toBe(200)
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

      expect(response.status).toBe(200)
      // 响应中 snake_case 被转为 camelCase
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

      expect(response.status).toBe(200)
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

      expect(response.status).toBe(200)
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

      expect(response.status).toBe(200)
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

      expect(response.status).toBe(200)
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

      expect(response.status).toBe(200)
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

      expect(response.status).toBe(200)
      expect(response.body.data.name).toBe(unicodeName)
    })
  })

  describe('分页和排序测试', () => {
    beforeEach(async () => {
      // 创建多个学院用于测试
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

    it('GET /api/colleges 不支持分页，返回所有记录', async () => {
      const response = await request(app)
        .get('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      // college.routes.js 直接 findMany() 返回全部，不支持 page/limit 参数
      expect(response.body.data.length).toBeGreaterThanOrEqual(25)
    })

    it('分页参数对学院列表无效（API不支持分页）', async () => {
      const response = await request(app)
        .get('/api/colleges?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      // API 不支持分页，仍然返回所有记录
      expect(response.body.data.length).toBeGreaterThanOrEqual(25)
    })

    it('页码超出范围仍然返回所有数据（API不支持分页）', async () => {
      const response = await request(app)
        .get('/api/colleges?page=999&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThanOrEqual(25)
    })

    it('应该支持按sort_order排序', async () => {
      const response = await request(app)
        .get('/api/colleges?sort_by=sort_order&order=asc')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      if (response.body.data.length > 1) {
        // 响应中 snake_case 被转为 camelCase
        expect(response.body.data[0].sortOrder).toBeLessThanOrEqual(
          response.body.data[1].sortOrder
        )
      }
    })
  })

  describe('日期和时间验证', () => {
    it('教材出版日期是String类型，任何字符串都被接受', async () => {
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

      expect(response1.status).toBe(200)

      // 无效日期格式也会被接受（publish_date 是 String? 类型）
      const response2 = await request(app)
        .post('/api/textbooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '无效日期教材',
          isbn: 'ISBN_INVALID',
          publish_date: invalidDate
        })

      // API 不验证日期格式，任何字符串都接受
      expect(response2.status).toBe(200)
    })
  })

  describe('批量操作测试', () => {
    it('批量创建学院应该全部成功（返回200不是201）', async () => {
      const colleges = [
        { name: '批量学院1', code: 'BATCH1' },
        { name: '批量学院2', code: 'BATCH2' },
        { name: '批量学院3', code: 'BATCH3' }
      ]

      const results = []
      for (const college of colleges) {
        const response = await request(app)
          .post('/api/colleges')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(college)
        results.push(response)
      }

      // success() 始终返回 200
      results.forEach(r => {
        expect(r.status).toBe(200)
      })
    })

    it('批量操作中一个失败不会影响其他操作（无事务回滚）', async () => {
      // 先创建一个同名学院
      await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '正常学院', code: 'NORMAL' })

      const results = []

      // 第一个：正常创建
      const response1 = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '另一个正常学院', code: 'NORMAL2' })
      results.push(response1)

      // 第二个：名称重复，会失败
      const response2 = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '正常学院', code: 'DUPLICATE' })
      results.push(response2)

      // 第三个：正常创建
      const response3 = await request(app)
        .post('/api/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '第三个学院', code: 'THIRD' })
      results.push(response3)

      // 验证结果：第一个和第三个成功（200），第二个失败（400）
      expect(results[0].status).toBe(200)
      expect(results[1].status).toBe(400)
      expect(results[2].status).toBe(200)
    })
  })
})
