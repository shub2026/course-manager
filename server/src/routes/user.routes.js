import express from 'express'
import { roleMiddleware } from '../middleware/auth.middleware.js'
import { sanitizeBody } from '../middleware/xss.js'
import {
  listUsers,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
} from '../controllers/user.controller.js'

const router = express.Router()

/**
 * GET /api/users
 * 获取用户列表
 */
router.get('/', roleMiddleware('admin', 'super_admin'), listUsers)

/**
 * POST /api/users
 * 创建用户
 */
router.post('/', roleMiddleware('admin', 'super_admin'), sanitizeBody, createUser)

/**
 * PUT /api/users/:id
 * 更新用户信息
 */
router.put('/:id', roleMiddleware('admin', 'super_admin'), sanitizeBody, updateUser)

/**
 * PUT /api/users/:id/status
 * 更新用户状态（激活/禁用）
 */
router.put('/:id/status', roleMiddleware('admin', 'super_admin'), updateUserStatus)

/**
 * DELETE /api/users/:id
 * 删除用户
 */
router.delete('/:id', roleMiddleware('admin', 'super_admin'), deleteUser)

export default router
