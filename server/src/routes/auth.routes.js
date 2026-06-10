import express from 'express'
import { AuthService } from '../services/auth.service.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { success, fail } from '../utils/response.js'
import { prisma } from '../lib/prisma.js'

const router = express.Router()

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return fail(res, '请输入用户名和密码')
    }

    const result = await AuthService.login(username, password)
    success(res, result, '登录成功')
  } catch (error) {
    fail(res, error.message)
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return fail(res, '请提供Refresh Token')
    }

    const result = await AuthService.refreshToken(refreshToken)
    success(res, result)
  } catch (error) {
    fail(res, error.message)
  }
})

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await prisma.audit_logs.create({
      data: {
        action: 'logout',
        module: 'auth',
        operator_id: req.user.id,
        result: 'success',
        message: `${req.user.username} 登出系统`
      }
    })

    success(res, null, '登出成功')
  } catch (error) {
    fail(res, error.message)
  }
})

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        role: true,
        real_name: true,
        email: true,
        last_login_at: true,
        created_at: true
      }
    })

    success(res, user)
  } catch (error) {
    fail(res, error.message)
  }
})

router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return fail(res, '请提供原密码和新密码')
    }

    if (newPassword.length < 8) {
      return fail(res, '新密码长度至少8位')
    }

    await AuthService.changePassword(req.user.id, oldPassword, newPassword)
    success(res, null, '密码修改成功')
  } catch (error) {
    fail(res, error.message)
  }
})

export default router
