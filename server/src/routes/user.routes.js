import express from 'express'
import { prisma } from '../lib/prisma.js'
import { roleMiddleware } from '../middleware/auth.middleware.js'
import { success, fail } from '../utils/response.js'
import bcrypt from 'bcryptjs'

const router = express.Router()

// #24修复：移除重复的authMiddleware（app.js挂载时已应用）

/**
 * GET /api/users
 * 获取用户列表
 */
router.get('/', roleMiddleware('admin', 'super_admin'), async (req, res) => {
  try {
    // admin只能看到访客用户，super_admin可以看到所有用户
    const where = {}
    if (req.user.role === 'admin') {
      where.role = 'viewer'
    }

    const users = await prisma.users.findMany({
      where,
      select: {
        id: true,
        username: true,
        real_name: true,
        email: true,
        role: true,
        is_active: true,
        last_login_at: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    })

    success(res, users)
  } catch (error) {
    fail(res, error.message)
  }
})

/**
 * POST /api/users
 * 创建用户
 */
router.post('/', roleMiddleware('admin', 'super_admin'), async (req, res) => {
  try {
    const { username, password, realName, email, role } = req.body

    // 验证必填字段
    if (!username || !password) {
      return fail(res, '用户名和密码为必填项')
    }

    // admin只能创建访客用户
    if (req.user.role === 'admin' && role !== 'viewer') {
      return fail(res, '权限不足，管理员只能创建访客账号')
    }

    // 验证角色
    if (!['super_admin', 'admin', 'viewer'].includes(role)) {
      return fail(res, '无效的角色')
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.users.findUnique({
      where: { username }
    })

    if (existingUser) {
      return fail(res, '用户名已存在')
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await prisma.users.create({
      data: {
        username,
        password: hashedPassword,
        real_name: realName,
        email,
        role
      },
      select: {
        id: true,
        username: true,
        real_name: true,
        email: true,
        role: true,
        is_active: true
      }
    })

    // 记录操作日志
    await prisma.audit_logs.create({
      data: {
        action: 'create',
        module: 'user',
        operator_id: req.user.id,
        result: 'success',
        message: `创建用户：${username}`
      }
    })

    success(res, user, '创建成功')
  } catch (error) {
    fail(res, error.message)
  }
})

/**
 * PUT /api/users/:id
 * 更新用户信息
 */
router.put('/:id', roleMiddleware('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { realName, email, role } = req.body

    // 不能修改自己的角色
    if (parseInt(id) === req.user.id && role) {
      return fail(res, '不能修改自己的角色')
    }

    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) }
    })

    if (!user) {
      return fail(res, '用户不存在', 404)
    }

    // admin只能修改访客用户
    if (req.user.role === 'admin' && user.role !== 'viewer') {
      return fail(res, '权限不足，管理员只能管理访客账号')
    }

    const updateData = { real_name: realName, email }
    
    // admin不能修改用户角色，只有super_admin可以
    if (req.user.role === 'super_admin' && role) {
      updateData.role = role
    }

    const updated = await prisma.users.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        real_name: true,
        email: true,
        role: true
      }
    })

    await prisma.audit_logs.create({
      data: {
        action: 'update',
        module: 'user',
        operator_id: req.user.id,
        result: 'success',
        message: `更新用户：${user.username}`
      }
    })

    success(res, updated, '更新成功')
  } catch (error) {
    fail(res, error.message)
  }
})

/**
 * PUT /api/users/:id/status
 * 更新用户状态（激活/禁用）
 */
router.put('/:id/status', roleMiddleware('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { isActive } = req.body

    // 不能禁用自己
    if (parseInt(id) === req.user.id) {
      return fail(res, '不能禁用自己')
    }

    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) }
    })

    if (!user) {
      return fail(res, '用户不存在', 404)
    }

    // admin只能管理访客用户
    if (req.user.role === 'admin' && user.role !== 'viewer') {
      return fail(res, '权限不足，管理员只能管理访客账号')
    }

    await prisma.users.update({
      where: { id: parseInt(id) },
      data: { is_active: isActive }
    })

    await prisma.audit_logs.create({
      data: {
        action: 'update',
        module: 'user',
        operator_id: req.user.id,
        result: 'success',
        message: `${isActive ? '激活' : '禁用'}用户：${user.username}`
      }
    })

    success(res, null, `${isActive ? '激活' : '禁用'}成功`)
  } catch (error) {
    fail(res, error.message)
  }
})

/**
 * DELETE /api/users/:id
 * 删除用户
 */
router.delete('/:id', roleMiddleware('admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params

    // 不能删除自己
    if (parseInt(id) === req.user.id) {
      return fail(res, '不能删除自己')
    }

    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) }
    })

    if (!user) {
      return fail(res, '用户不存在', 404)
    }

    // admin只能删除访客用户
    if (req.user.role === 'admin' && user.role !== 'viewer') {
      return fail(res, '权限不足，管理员只能删除访客账号')
    }

    await prisma.users.delete({
      where: { id: parseInt(id) }
    })

    await prisma.audit_logs.create({
      data: {
        action: 'delete',
        module: 'user',
        operator_id: req.user.id,
        result: 'success',
        message: `删除用户：${user.username}`
      }
    })

    success(res, null, '删除成功')
  } catch (error) {
    fail(res, error.message)
  }
})

export default router
