import express from 'express'
import { prisma } from '../lib/prisma.js'
import { roleMiddleware } from '../middleware/auth.middleware.js'
import { success, fail } from '../utils/response.js'
import bcrypt from 'bcryptjs'
import { createAuditLog } from '../services/audit.service.js'
import { NotFoundError, ValidationError, AuthorizationError } from '../utils/error.js'
import { authConfig } from '../config/auth.config.js' // M9修复：导入配置

const router = express.Router()

// #24修复：移除重复的authMiddleware（app.js挂载时已应用）

/**
 * GET /api/users
 * 获取用户列表
 */
router.get('/', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
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
    next(error)
  }
})

/**
 * POST /api/users
 * 创建用户
 */
router.post('/', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { username, password, real_name, email, role } = req.body

    // 验证必填字段
    if (!username || !password) {
      throw new ValidationError('用户名和密码为必填项')
    }

    // admin只能创建访客用户
    if (req.user.role === 'admin' && role !== 'viewer') {
      throw new AuthorizationError('权限不足，管理员只能创建访客账号')
    }

    // 验证角色
    if (!['super_admin', 'admin', 'viewer'].includes(role)) {
      throw new ValidationError('无效的角色')
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.users.findUnique({
      where: { username }
    })

    if (existingUser) {
      throw new ValidationError('用户名已存在')
    }

    // 加密密码（M9修复：使用配置的迭代次数）
    const hashedPassword = await bcrypt.hash(password, authConfig.bcryptRounds)

    // 创建用户
    const user = await prisma.users.create({
      data: {
        username,
        password: hashedPassword,
        real_name,
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
    await createAuditLog({
      action: 'create',
      module: 'user',
      userId: req.user.id,
      ip: req.ip,
      details: { id: user.id, username, role },
      result: 'success',
      message: `创建用户：${username}`,
    })

    success(res, user, '创建成功')
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/users/:id
 * 更新用户信息
 */
router.put('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params
    const { real_name, email, role } = req.body

    // 不能修改自己的角色
    if (parseInt(id) === req.user.id && role) {
      throw new AuthorizationError('不能修改自己的角色')
    }

    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) }
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    // admin只能修改访客用户
    if (req.user.role === 'admin' && user.role !== 'viewer') {
      throw new AuthorizationError('权限不足，管理员只能管理访客账号')
    }

    const updateData = { real_name, email }
    
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

    await createAuditLog({
      action: 'update',
      module: 'user',
      userId: req.user.id,
      ip: req.ip,
      details: { id: user.id, username, changes: updateData },
      result: 'success',
      message: `更新用户：${user.username}`,
    })

    success(res, updated, '更新成功')
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/users/:id/status
 * 更新用户状态（激活/禁用）
 */
router.put('/:id/status', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params
    const { isActive } = req.body

    // 不能禁用自己
    if (parseInt(id) === req.user.id) {
      throw new AuthorizationError('不能禁用自己')
    }

    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) }
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    // 不能操作超级管理员（系统唯一）
    if (user.role === 'super_admin') {
      throw new AuthorizationError('不能操作超级管理员账户')
    }

    // admin只能管理访客用户
    if (req.user.role === 'admin' && user.role !== 'viewer') {
      throw new AuthorizationError('权限不足，管理员只能管理访客账号')
    }

    await prisma.users.update({
      where: { id: parseInt(id) },
      data: { is_active: isActive }
    })

    await createAuditLog({
      action: 'update',
      module: 'user',
      userId: req.user.id,
      ip: req.ip,
      details: { id: user.id, username: user.username, is_active: isActive },
      result: 'success',
      message: `${isActive ? '激活' : '禁用'}用户：${user.username}`,
    })

    success(res, null, `${isActive ? '激活' : '禁用'}成功`)
  } catch (error) {
    console.error('[ERROR]', error)
    next(error)
  }
})

/**
 * DELETE /api/users/:id
 * 删除用户
 */
router.delete('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params

    // 不能删除自己
    if (parseInt(id) === req.user.id) {
      throw new AuthorizationError('不能删除自己')
    }

    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) }
    })

    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    // 不能删除超级管理员（系统唯一）
    if (user.role === 'super_admin') {
      throw new AuthorizationError('不能删除超级管理员账户')
    }

    // admin只能删除访客用户
    if (req.user.role === 'admin' && user.role !== 'viewer') {
      throw new AuthorizationError('权限不足，管理员只能删除访客账号')
    }

    await prisma.users.delete({
      where: { id: parseInt(id) }
    })

    await createAuditLog({
      action: 'delete',
      module: 'user',
      userId: req.user.id,
      ip: req.ip,
      details: { id: user.id, username: user.username },
      result: 'success',
      message: `删除用户：${user.username}`,
    })

    success(res, null, '删除成功')
  } catch (error) {
    next(error)
  }
})

export default router
